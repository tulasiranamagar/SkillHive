from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from goals.models import CareerGoal

from .question_generator import generate_questions
from .serializers import (
    QuestionGenerationSerializer,
    RecommendationQuerySerializer,
    SkillGapRequestSerializer,
)
from .services import (
    AIEngineError,
    analyze_user_skill_gap,
    get_personalized_recommendations,
)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def skill_gap_analysis(request):
    serializer = SkillGapRequestSerializer(
        data=request.data
    )
    serializer.is_valid(
        raise_exception=True
    )

    goal_id = serializer.validated_data["goal_id"]

    try:
        career_goal = CareerGoal.objects.get(
            id=goal_id
        )
    except CareerGoal.DoesNotExist:
        return Response(
            {
                "error": "Career goal not found."
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    user_goal = (
        request.user.career_goals
        .filter(
            goal=career_goal,
            is_active=True,
        )
        .first()
    )

    if not user_goal:
        return Response(
            {
                "error": (
                    "This career goal is not your active "
                    "career goal."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = analyze_user_skill_gap(
            user=request.user,
            user_goal=user_goal,
        )
    except AIEngineError as exc:
        return Response(
            {"error": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "goal_id": career_goal.id,
            "goal": career_goal.title,
            "analysis": result,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_questions_view(request):
    serializer = QuestionGenerationSerializer(
        data=request.data
    )
    serializer.is_valid(
        raise_exception=True
    )

    skill_name = serializer.validated_data[
        "skill_name"
    ]

    count = serializer.validated_data[
        "count"
    ]

    try:
        questions = generate_questions(
            skill_name=skill_name,
            count=count,
        )
    except ValueError as exc:
        return Response(
            {"error": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "skill": skill_name,
            "count": len(questions),
            "questions": questions,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def personalized_recommendations(request):
    serializer = RecommendationQuerySerializer(
        data=request.query_params
    )
    serializer.is_valid(
        raise_exception=True
    )

    recommendation_type = serializer.validated_data[
        "type"
    ]

    general_limit = serializer.validated_data[
        "limit"
    ]

    content_limit = serializer.validated_data.get(
        "content_limit",
        general_limit,
    )

    exchange_limit = serializer.validated_data.get(
        "exchange_limit",
        general_limit,
    )

    try:
        result = get_personalized_recommendations(
            user=request.user,
            content_limit=content_limit,
            exchange_limit=exchange_limit,
        )
    except AIEngineError as exc:
        return Response(
            {"error": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if recommendation_type == "content":
        return Response(
            {
                "content": result["content"],
                "interests": result["interests"],
                "active_goal": result["active_goal"],
                "ai_recommended_skills": result[
                    "ai_recommended_skills"
                ],
                "skill_gap": result["skill_gap"],
                "method": result["method"],
            }
        )

    if recommendation_type == "exchange":
        return Response(
            {
                "exchange": result["exchange"],
                "interests": result["interests"],
                "active_goal": result["active_goal"],
                "ai_recommended_skills": result[
                    "ai_recommended_skills"
                ],
                "skill_gap": result["skill_gap"],
                "method": result["method"],
            }
        )

    return Response(result)