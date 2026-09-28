from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsSkillHiveAdmin

from .serializers import (
    AssessmentAnswerSerializer,
    AssessmentQuestionPublicSerializer,
    AssessmentQuestionSerializer,
    AssessmentSerializer,
    LearningActivitySerializer,
    RoadmapProgressSerializer,
    RoadmapTaskSerializer,
)
from .services import (
    RoadmapNotFoundError,
    RoadmapServiceError,
    approve_assessment_question,
    create_user_assessment_question,
    generate_ai_questions,
    generate_roadmap,
    get_admin_assessment_questions,
    get_available_assessment_questions,
    get_roadmap_progress,
    get_user_assessment_questions,
    get_user_assessments,
    record_learning_activity,
    reject_assessment_question,
    start_assessment,
    submit_assessment,
)


def _service_error_response(exc):
    """
    Convert roadmap service exceptions into API responses.
    """
    if isinstance(exc, RoadmapNotFoundError):
        return Response(
            {
                "detail": str(exc),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        {
            "detail": str(exc),
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_my_roadmap(request):
    """
    Generate or update the authenticated user's roadmap.

    Expected payload:
    {
        "goal_id": 1
    }

    goal_id must be the CareerGoal ID, not the UserGoal ID.
    """

    goal_id = request.data.get("goal_id")

    if goal_id in (None, ""):
        return Response(
            {
                "detail": "goal_id is required."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        goal_id = int(goal_id)
    except (TypeError, ValueError):
        return Response(
            {
                "detail": "goal_id must be a valid CareerGoal ID."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = generate_roadmap(
            user=request.user,
            goal_id=goal_id,
        )

        user_goal = result.get("user_goal")
        tasks = result.get("tasks", [])
        created_count = result.get(
            "created_count",
            0,
        )
        missing_skills_count = result.get(
            "missing_skills_count",
            0,
        )

        if user_goal is None:
            return Response(
                {
                    "detail": (
                        "Roadmap generation did not return "
                        "a valid UserGoal."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": (
                    "Roadmap generated successfully."
                    if created_count
                    else "Roadmap is already up to date."
                ),
                "created_count": created_count,
                "missing_skills_count": (
                    missing_skills_count
                ),
                "user_goal": user_goal.id,
                "tasks": RoadmapTaskSerializer(
                    tasks,
                    many=True,
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    except RoadmapServiceError as exc:
        return _service_error_response(exc)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_roadmap_tasks(request):
    """
    Return roadmap tasks belonging to the user's active UserGoal.
    """

    try:
        from .services import get_active_user_goal

        user_goal = get_active_user_goal(
            request.user
        )

        tasks = (
            user_goal.roadmap_tasks
            .select_related("skill")
            .order_by("order", "id")
        )

        return Response(
            RoadmapTaskSerializer(
                tasks,
                many=True,
            ).data,
            status=status.HTTP_200_OK,
        )

    except RoadmapServiceError as exc:
        return _service_error_response(exc)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def record_learning_activity_view(request):
    """
    Record completion/progress for a roadmap learning activity.
    """

    task_id = request.data.get("task_id")

    if task_id in (None, ""):
        return Response(
            {
                "detail": "task_id is required."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        activity, progress = record_learning_activity(
            user=request.user,
            task_id=task_id,
            data=request.data,
        )

        return Response(
            {
                "activity": LearningActivitySerializer(
                    activity
                ).data,
                "progress": RoadmapProgressSerializer(
                    progress
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )

    except RoadmapServiceError as exc:
        return _service_error_response(exc)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_roadmap_progress(request):
    """
    Return roadmap progress for the user's active roadmap.
    """

    try:
        progress = get_roadmap_progress(
            request.user
        )

        return Response(
            RoadmapProgressSerializer(
                progress,
                many=True,
            ).data,
            status=status.HTTP_200_OK,
        )

    except RoadmapServiceError as exc:
        return _service_error_response(exc)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_assessment_question(request):
    """
    Create a user-submitted assessment question.
    """

    task_id = request.data.get("task_id")

    if task_id in (None, ""):
        return Response(
            {
                "detail": "task_id is required."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        question = create_user_assessment_question(
            user=request.user,
            task_id=task_id,
            data=request.data,
        )

        return Response(
            AssessmentQuestionSerializer(
                question
            ).data,
            status=status.HTTP_201_CREATED,
        )

    except RoadmapServiceError as exc:
        return _service_error_response(exc)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_assessment_questions(request, task_id):
    """
    Return questions created by the authenticated user
    for a roadmap task.
    """

    try:
        questions = get_user_assessment_questions(
            user=request.user,
            task_id=task_id,
        )

        return Response(
            AssessmentQuestionSerializer(
                questions,
                many=True,
            ).data,
            status=status.HTTP_200_OK,
        )

    except RoadmapServiceError as exc:
        return _service_error_response(exc)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def available_assessment_questions(request, task_id):
    """
    Return approved/public assessment questions available
    for a roadmap task.
    """

    try:
        questions = get_available_assessment_questions(
            user=request.user,
            task_id=task_id,
        )

        return Response(
            AssessmentQuestionPublicSerializer(
                questions,
                many=True,
            ).data,
            status=status.HTTP_200_OK,
        )

    except RoadmapServiceError as exc:
        return _service_error_response(exc)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_assessment_view(request):
    """
    Start an assessment for a roadmap task.
    """

    task_id = request.data.get("task_id")
    question_count = request.data.get(
        "question_count",
        5,
    )

    if task_id in (None, ""):
        return Response(
            {
                "detail": "task_id is required."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        assessment = start_assessment(
            user=request.user,
            task_id=task_id,
            question_count=question_count,
        )

        return Response(
            AssessmentSerializer(
                assessment
            ).data,
            status=status.HTTP_201_CREATED,
        )

    except RoadmapServiceError as exc:
        return _service_error_response(exc)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_assessment_view(request):
    """
    Submit answers for an assessment.
    """

    assessment_id = request.data.get(
        "assessment_id"
    )

    answers = request.data.get(
        "answers",
        [],
    )

    if assessment_id in (None, ""):
        return Response(
            {
                "detail": "assessment_id is required."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        assessment = submit_assessment(
            user=request.user,
            assessment_id=assessment_id,
            submitted_answers=answers,
        )

        answer_queryset = assessment.answers.all()

        return Response(
            {
                "assessment": AssessmentSerializer(
                    assessment
                ).data,
                "answers": AssessmentAnswerSerializer(
                    answer_queryset,
                    many=True,
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    except RoadmapServiceError as exc:
        return _service_error_response(exc)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_assessments(request):
    """
    Return assessments belonging to the authenticated user.
    """

    assessments = get_user_assessments(
        request.user
    )

    return Response(
        AssessmentSerializer(
            assessments,
            many=True,
        ).data,
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_ai_assessment_questions(request):
    """
    Generate AI-assisted assessment questions and submit
    them for review.
    """

    task_id = request.data.get("task_id")
    question_count = request.data.get(
        "question_count",
        5,
    )

    if task_id in (None, ""):
        return Response(
            {
                "detail": "task_id is required."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        questions = generate_ai_questions(
            user=request.user,
            task_id=task_id,
            question_count=question_count,
        )

        return Response(
            {
                "message": (
                    "AI-generated questions submitted "
                    "for review."
                ),
                "questions": AssessmentQuestionSerializer(
                    questions,
                    many=True,
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )

    except RoadmapServiceError as exc:
        return _service_error_response(exc)


@api_view(["GET"])
@permission_classes(
    [IsAuthenticated, IsSkillHiveAdmin]
)
def admin_assessment_questions(request):
    """
    Return assessment questions for SkillHive admins.
    """

    questions = get_admin_assessment_questions()

    return Response(
        AssessmentQuestionSerializer(
            questions,
            many=True,
        ).data,
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes(
    [IsAuthenticated, IsSkillHiveAdmin]
)
def approve_assessment_question_view(
    request,
    question_id,
):
    """
    Approve an assessment question.
    """

    try:
        question = approve_assessment_question(
            question_id
        )

        return Response(
            {
                "message": (
                    "Assessment question approved."
                ),
                "question": AssessmentQuestionSerializer(
                    question
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    except RoadmapServiceError as exc:
        return _service_error_response(exc)


@api_view(["POST"])
@permission_classes(
    [IsAuthenticated, IsSkillHiveAdmin]
)
def reject_assessment_question_view(
    request,
    question_id,
):
    """
    Reject an assessment question.
    """

    try:
        question = reject_assessment_question(
            question_id
        )

        return Response(
            {
                "message": (
                    "Assessment question rejected."
                ),
                "question": AssessmentQuestionSerializer(
                    question
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    except RoadmapServiceError as exc:
        return _service_error_response(exc)