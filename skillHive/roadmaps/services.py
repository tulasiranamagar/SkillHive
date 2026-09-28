from django.db import transaction
from django.utils import timezone

from goals.models import UserGoal

from .models import (
    Assessment,
    AssessmentAnswer,
    AssessmentQuestion,
    LearningActivity,
    RoadmapProgress,
    RoadmapTask,
)


class RoadmapServiceError(Exception):
    """
    Base exception for roadmap service errors.
    """


class RoadmapNotFoundError(RoadmapServiceError):
    """
    Raised when a roadmap, goal, task, or related object
    cannot be found.
    """


class RoadmapValidationError(RoadmapServiceError):
    """
    Raised when roadmap input or state is invalid.
    """

def _get_user_goal(user, career_goal_id=None):
    """
    Resolve the user's active UserGoal.

    career_goal_id refers to CareerGoal.id,
    NOT UserGoal.id.
    """

    if user is None or not user.is_authenticated:
        raise RoadmapValidationError(
            "Authenticated user is required."
        )

    queryset = (
        UserGoal.objects
        .select_related("goal")
        .filter(
            user=user,
            is_active=True,
        )
    )

    if career_goal_id is not None:
        queryset = queryset.filter(
            goal_id=career_goal_id,
        )

    user_goal = queryset.first()

    if user_goal is None:
        if career_goal_id is not None:
            raise RoadmapNotFoundError(
                "The selected career goal is not associated "
                "with your active learning goal."
            )

        raise RoadmapNotFoundError(
            "No active career goal was found for this user."
        )

    return user_goal


def get_active_user_goal(user):
    """
    Public helper used by roadmap views.
    """

    return _get_user_goal(
        user=user,
    )


def _get_task_for_user(
    user,
    task_id,
):
    """
    Resolve a roadmap task belonging to the authenticated user.
    """

    if user is None or not user.is_authenticated:
        raise RoadmapValidationError(
            "Authenticated user is required."
        )

    if task_id in (None, ""):
        raise RoadmapValidationError(
            "task_id is required."
        )

    try:
        task_id = int(task_id)
    except (
        TypeError,
        ValueError,
    ):
        raise RoadmapValidationError(
            "task_id must be a valid roadmap task ID."
        )

    task = (
        RoadmapTask.objects
        .select_related(
            "user_goal",
            "user_goal__goal",
            "skill",
        )
        .filter(
            id=task_id,
            user_goal__user=user,
        )
        .first()
    )

    if task is None:
        raise RoadmapNotFoundError(
            "Roadmap task was not found."
        )

    return task


def _get_assessment_for_user(
    user,
    assessment_id,
):
    """
    Resolve an assessment belonging to the authenticated user.
    """

    if user is None or not user.is_authenticated:
        raise RoadmapValidationError(
            "Authenticated user is required."
        )

    try:
        assessment_id = int(
            assessment_id
        )
    except (
        TypeError,
        ValueError,
    ):
        raise RoadmapValidationError(
            "assessment_id must be a valid assessment ID."
        )

    assessment = (
        Assessment.objects
        .select_related(
            "task",
            "task__skill",
            "task__user_goal",
        )
        .prefetch_related(
            "questions",
            "answers",
        )
        .filter(
            id=assessment_id,
            user=user,
        )
        .first()
    )

    if assessment is None:
        raise RoadmapNotFoundError(
            "Assessment was not found."
        )

    return assessment

_ALLOWED_QUESTION_TYPES = {
    "mcq",
    "multiple_select",
    "true_false",
    "code_output",
    "scenario",
    "practical",
}


_ALLOWED_DIFFICULTIES = {
    "beginner",
    "basic",
    "intermediate",
    "advanced",
    "expert",
}


def _normalize_question_type(value):
    value = str(
        value or ""
    ).strip().lower()

    if value not in _ALLOWED_QUESTION_TYPES:
        raise RoadmapValidationError(
            "Invalid assessment question type."
        )

    return value


def _normalize_difficulty(value):
    value = str(
        value or "basic"
    ).strip().lower()

    if value not in _ALLOWED_DIFFICULTIES:
        return "basic"

    return value


def _normalize_correct_answer(value):
    """
    Normalize correct_answer into a list because the model
    stores the answer as JSON.
    """

    if value is None:
        return []

    if isinstance(
        value,
        list,
    ):
        return value

    return [value]


def _normalize_question_options(value):
    """
    Convert different frontend/AI option formats into the
    four fields used by AssessmentQuestion.
    """

    empty = {
        "option_a": "",
        "option_b": "",
        "option_c": "",
        "option_d": "",
    }

    if value is None:
        return empty

    if isinstance(value, dict):
        return {
            "option_a": str(
                value.get(
                    "A",
                    value.get("a", ""),
                )
                or ""
            ).strip(),
            "option_b": str(
                value.get(
                    "B",
                    value.get("b", ""),
                )
                or ""
            ).strip(),
            "option_c": str(
                value.get(
                    "C",
                    value.get("c", ""),
                )
                or ""
            ).strip(),
            "option_d": str(
                value.get(
                    "D",
                    value.get("d", ""),
                )
                or ""
            ).strip(),
        }

    if isinstance(value, list):
        values = [
            str(item or "").strip()
            for item in value
        ]

        return {
            "option_a": values[0]
            if len(values) > 0
            else "",
            "option_b": values[1]
            if len(values) > 1
            else "",
            "option_c": values[2]
            if len(values) > 2
            else "",
            "option_d": values[3]
            if len(values) > 3
            else "",
        }

    return empty


def _normalize_answer_values(value):
    """
    Normalize a submitted or stored answer into a list.

    The frontend may submit:
        "B"
        ["B"]
        "True"
        ["True", "False"]

    This helper gives the evaluator one consistent format.
    """

    if value is None:
        return []

    if isinstance(value, list):
        values = value
    else:
        values = [value]

    normalized = []

    for item in values:
        if item is None:
            continue

        text = str(item).strip()

        if text:
            normalized.append(text)

    return normalized


def _answer_matches_question(
    question,
    submitted_answer,
):
    """
    Evaluate a single learning-activity question.

    Correct answers may be stored as:
        ["B"]
        ["True"]
        ["JSON.parse()"]

    Submitted answers may use either the option letter
    or the actual option text.

    Comparison is case-insensitive and ignores surrounding
    whitespace.
    """

    submitted = _normalize_answer_values(
        submitted_answer
    )

    expected = _normalize_answer_values(
        question.correct_answer
    )

    if not expected:
        return False

    option_map = {
        "a": str(
            question.option_a or ""
        ).strip().lower(),
        "b": str(
            question.option_b or ""
        ).strip().lower(),
        "c": str(
            question.option_c or ""
        ).strip().lower(),
        "d": str(
            question.option_d or ""
        ).strip().lower(),
    }

    def normalize_single(value):
        normalized = str(
            value or ""
        ).strip().lower()

        if normalized in option_map:
            return option_map[
                normalized
            ]

        return normalized

    normalized_submitted = [
        normalize_single(value)
        for value in submitted
    ]

    normalized_expected = [
        normalize_single(value)
        for value in expected
    ]

    return (
        sorted(normalized_submitted)
        == sorted(normalized_expected)
    )


def _extract_learning_question_answers(
    metadata,
):
    """
    Extract question answers submitted by Learning.jsx.

    Expected metadata format:

    {
        "source": "question_activity",
        "questions_answered": 5,
        "question_ids": [6, 7, 8, 9, 10],
        "answers": [
            {
                "question_id": 6,
                "answer": ["A"]
            },
            ...
        ]
    }

    The helper accepts both a list and a dictionary answer format.
    """

    if not isinstance(
        metadata,
        dict,
    ):
        return []

    raw_answers = metadata.get(
        "answers",
        [],
    )

    if isinstance(
        raw_answers,
        dict,
    ):
        result = []

        for question_id, answer in raw_answers.items():
            result.append(
                {
                    "question_id": question_id,
                    "answer": answer,
                }
            )

        return result

    if not isinstance(
        raw_answers,
        list,
    ):
        return []

    result = []

    for item in raw_answers:
        if not isinstance(
            item,
            dict,
        ):
            continue

        question_id = (
            item.get("question_id")
            or item.get("id")
        )

        if question_id is None:
            continue

        answer = (
            item.get("answer")
            if "answer" in item
            else item.get("answers", [])
        )

        result.append(
            {
                "question_id": question_id,
                "answer": answer,
            }
        )

    return result


def _evaluate_learning_questions(
    task,
    metadata,
):
    """
    Evaluate answers for the Question Activity.

    Question Activity is no longer part of the 100% learning
    progress calculation, but question evaluation remains
    available for learning history and the reusable question
    bank.

    Only approved questions belonging to the same Skill as
    the roadmap task may be evaluated.

    Returns:

        {
            "questions_answered": int,
            "correct_questions": int,
            "question_ids": [...],
            "answers": [...]
        }

    The returned answer records contain only submitted answers
    and evaluation results. Correct answers are never returned.
    """

    submitted_items = _extract_learning_question_answers(
        metadata
    )

    if not submitted_items:
        return {
            "questions_answered": 0,
            "correct_questions": 0,
            "question_ids": [],
            "answers": [],
        }

    question_ids = []

    for item in submitted_items:
        try:
            question_id = int(
                item["question_id"]
            )
        except (
            TypeError,
            ValueError,
        ):
            continue

        if question_id not in question_ids:
            question_ids.append(
                question_id
            )

    if not question_ids:
        return {
            "questions_answered": 0,
            "correct_questions": 0,
            "question_ids": [],
            "answers": [],
        }

    questions = list(
        AssessmentQuestion.objects
        .select_related(
            "task",
            "task__skill",
        )
        .filter(
            id__in=question_ids,
            task__skill_id=task.skill_id,
            status="approved",
        )
    )

    question_map = {
        question.id: question
        for question in questions
    }

    evaluated_answers = []
    questions_answered = 0
    correct_questions = 0

    for item in submitted_items:
        try:
            question_id = int(
                item["question_id"]
            )
        except (
            TypeError,
            ValueError,
        ):
            continue

        question = question_map.get(
            question_id
        )

        if question is None:
            continue

        submitted_answer = item.get(
            "answer",
            [],
        )

        normalized_answer = _normalize_answer_values(
            submitted_answer
        )

        if not normalized_answer:
            continue

        is_correct = _answer_matches_question(
            question=question,
            submitted_answer=normalized_answer,
        )

        questions_answered += 1

        if is_correct:
            correct_questions += 1

        evaluated_answers.append(
            {
                "question_id": question.id,
                "answer": normalized_answer,
                "is_correct": is_correct,
            }
        )

    return {
        "questions_answered": questions_answered,
        "correct_questions": correct_questions,
        "question_ids": [
            item["question_id"]
            for item in evaluated_answers
        ],
        "answers": evaluated_answers,
    }


def _get_approved_questions_for_skill(
    skill_id,
):
    """
    Return approved assessment questions belonging to
    any roadmap task that uses the supplied skill.

    This is the reusable SkillHive question bank.

    AssessmentQuestion remains attached to its original
    RoadmapTask, so no database migration is required.
    """

    if skill_id in (None, ""):
        return AssessmentQuestion.objects.none()

    return (
        AssessmentQuestion.objects
        .select_related(
            "task",
            "task__skill",
            "created_by",
        )
        .filter(
            task__skill_id=skill_id,
            status="approved",
        )
        .order_by("id")
    )


def _get_questions_for_skill(
    skill_id,
    question_count=5,
):
    """
    Return approved questions from the reusable question bank.

    Questions are selected from every roadmap task that
    represents the same Skill.
    """

    queryset = _get_approved_questions_for_skill(
        skill_id=skill_id,
    )

    return list(
        queryset.order_by("?")[
            :question_count
        ]
    )

def _get_required_skills(user_goal):
    """
    Resolve skills that should become roadmap tasks.

    The AI engine determines which required skills are
    missing or need improvement.
    """

    from ai_engine.services import (
        get_missing_skills_for_user_goal,
    )

    return list(
        get_missing_skills_for_user_goal(
            user_goal=user_goal,
        )
    )


def _create_or_update_roadmap_tasks(
    user_goal,
    skills,
):
    """
    Create roadmap tasks for supplied skills.

    Existing tasks are preserved so roadmap generation
    remains idempotent.
    """

    tasks = []

    for order, skill in enumerate(
        skills,
        start=1,
    ):
        task, created = RoadmapTask.objects.get_or_create(
            user_goal=user_goal,
            skill=skill,
            defaults={
                "title": f"Learn {skill.name}",
                "order": order,
            },
        )

        if not created:
            changed = False

            if task.order != order:
                task.order = order
                changed = True

            if not task.title:
                task.title = f"Learn {skill.name}"
                changed = True

            if changed:
                task.save(
                    update_fields=[
                        "order",
                        "title",
                        "updated_at",
                    ]
                )

        tasks.append(task)

    return tasks


@transaction.atomic
def generate_roadmap(
    user,
    goal_id=None,
):
    """
    Generate or refresh the authenticated user's roadmap.

    goal_id is the CareerGoal ID.

    The corresponding active UserGoal is resolved using:

        UserGoal.goal_id == CareerGoal.id
    """

    if user is None or not user.is_authenticated:
        raise RoadmapValidationError(
            "Authenticated user is required."
        )

    career_goal_id = None

    if goal_id not in (
        None,
        "",
    ):
        try:
            career_goal_id = int(
                goal_id
            )
        except (
            TypeError,
            ValueError,
        ):
            raise RoadmapValidationError(
                "goal_id must be a valid CareerGoal ID."
            )

        if career_goal_id <= 0:
            raise RoadmapValidationError(
                "goal_id must be a valid CareerGoal ID."
            )

    user_goal = _get_user_goal(
        user=user,
        career_goal_id=career_goal_id,
    )

    if user_goal.goal is None:
        raise RoadmapNotFoundError(
            "The selected career goal could not be resolved."
        )

    missing_skills = _get_required_skills(
        user_goal=user_goal,
    )

    existing_task_ids = set(
        RoadmapTask.objects
        .filter(
            user_goal=user_goal,
        )
        .values_list(
            "id",
            flat=True,
        )
    )

    tasks = _create_or_update_roadmap_tasks(
        user_goal=user_goal,
        skills=missing_skills,
    )

    new_task_count = sum(
        1
        for task in tasks
        if task.id not in existing_task_ids
    )

    return {
        "user_goal": user_goal,
        "career_goal": user_goal.goal,
        "tasks": tasks,
        "created_count": new_task_count,
        "missing_skills_count": len(
            missing_skills
        ),
        "task_count": len(tasks),
        "skills_count": len(missing_skills),
    }

@transaction.atomic
def record_learning_activity(
    user,
    task_id,
    data,
):
    """
    Record a learning activity and update roadmap progress.

    Learning progress is based on four activities:

        video      = 30%
        document   = 25%
        session    = 25%
        practical  = 20%

    Question Activity is still supported and evaluated, but
    it contributes 0% to the learning-progress total.

    Final assessment remains separate and is unlocked after
    learning progress reaches 100%.
    """

    task = _get_task_for_user(
        user=user,
        task_id=task_id,
    )

    data = data or {}

    activity_type = data.get(
        "activity_type"
    )

    if not activity_type:
        raise RoadmapValidationError(
            "activity_type is required."
        )

    valid_activity_types = {
        value
        for value, _label
        in LearningActivity.ACTIVITY_TYPES
    }

    if activity_type not in valid_activity_types:
        raise RoadmapValidationError(
            "Invalid learning activity type."
        )

    try:
        duration_seconds = max(
            int(
                data.get(
                    "duration_seconds",
                    0,
                )
                or 0
            ),
            0,
        )
    except (
        TypeError,
        ValueError,
    ):
        duration_seconds = 0

    completed = bool(
        data.get(
            "completed",
            False,
        )
    )

    reference_id = data.get(
        "reference_id"
    )

    metadata = data.get(
        "metadata",
        {},
    )

    if not isinstance(
        metadata,
        dict,
    ):
        metadata = {}


    if activity_type == "question":
        evaluation = _evaluate_learning_questions(
            task=task,
            metadata=metadata,
        )

        if evaluation["questions_answered"] <= 0:
            raise RoadmapValidationError(
                "Please answer at least one approved question."
            )

        completed = True

        metadata = {
            **metadata,
            "questions_answered": evaluation[
                "questions_answered"
            ],
            "correct_questions": evaluation[
                "correct_questions"
            ],
            "question_ids": evaluation[
                "question_ids"
            ],
            "answers": evaluation[
                "answers"
            ],
        }

    activity = LearningActivity.objects.create(
        user=user,
        task=task,
        activity_type=activity_type,
        reference_id=reference_id,
        duration_seconds=duration_seconds,
        completed=completed,
        metadata=metadata,
    )

    progress, _ = RoadmapProgress.objects.get_or_create(
        user=user,
        task=task,
    )

    _recalculate_task_progress(
        progress=progress,
    )

    return activity, progress


def _recalculate_task_progress(
    progress,
):
    """
    Recalculate roadmap learning progress.

    NEW LEARNING WEIGHTS:

        Video       = 30%
        Document    = 25%
        Peer Session = 25%
        Practical   = 20%

    Question Activity = 0%

    Total = 100%

    Question statistics are still calculated and stored for
    history/reporting, but they do not contribute to the
    learning-progress percentage.
    """

    activities = progress.task.learning_activities.all()

    video_seconds = 0
    document_seconds = 0
    sessions_attended = 0
    questions_answered = 0
    correct_questions = 0
    practical_tasks_completed = 0

    for activity in activities:
        if activity.activity_type == "video":
            video_seconds += activity.duration_seconds

        elif activity.activity_type == "document":
            document_seconds += activity.duration_seconds

        elif activity.activity_type == "session":
            if activity.completed:
                sessions_attended += 1

        elif activity.activity_type == "question":
            metadata = (
                activity.metadata
                if isinstance(
                    activity.metadata,
                    dict,
                )
                else {}
            )

            activity_questions = metadata.get(
                "questions_answered"
            )

            activity_correct = metadata.get(
                "correct_questions"
            )

            try:
                activity_questions = int(
                    activity_questions
                    or 0
                )
            except (
                TypeError,
                ValueError,
            ):
                activity_questions = 0

            try:
                activity_correct = int(
                    activity_correct
                    or 0
                )
            except (
                TypeError,
                ValueError,
            ):
                activity_correct = 0

            # Backward compatibility for older question
            # activities created before answer evaluation
            # was implemented.
            if (
                activity_questions <= 0
                and activity.completed
            ):
                activity_questions = 1

            questions_answered += max(
                activity_questions,
                0,
            )

            correct_questions += max(
                activity_correct,
                0,
            )

        elif activity.activity_type == "practical":
            if activity.completed:
                practical_tasks_completed += 1


    progress.video_seconds = video_seconds

    progress.document_seconds = document_seconds

    progress.sessions_attended = sessions_attended

    progress.questions_answered = questions_answered

    progress.correct_questions = correct_questions

    progress.practical_tasks_completed = (
        practical_tasks_completed
    )

    video_progress = (
        30
        if video_seconds > 0
        else 0
    )

    document_progress = (
        25
        if document_seconds > 0
        else 0
    )

    session_progress = (
        25
        if sessions_attended > 0
        else 0
    )

    practical_progress = (
        20
        if practical_tasks_completed > 0
        else 0
    )

    progress.progress_percent = min(
        100,
        video_progress
        + document_progress
        + session_progress
        + practical_progress,
    )

    progress.save()


    if progress.progress_percent >= 100:
        task = progress.task

        if not task.completed:
            task.completed = True
            task.completed_at = timezone.now()

            task.save(
                update_fields=[
                    "completed",
                    "completed_at",
                    "updated_at",
                ]
            )

    return progress


def get_roadmap_progress(
    user,
):
    """
    Return roadmap progress for the authenticated user's
    active roadmap.
    """

    if user is None or not user.is_authenticated:
        raise RoadmapValidationError(
            "Authenticated user is required."
        )

    user_goal = _get_user_goal(
        user=user,
    )

    return list(
        RoadmapProgress.objects
        .select_related(
            "task",
            "task__skill",
            "task__user_goal",
        )
        .filter(
            user=user,
            task__user_goal=user_goal,
        )
        .order_by(
            "task__order",
            "task__id",
        )
    )


def create_user_assessment_question(
    user,
    task_id,
    data,
):
    """
    Create a user-submitted assessment question.

    User questions remain pending until approved by
    a SkillHive administrator.

    Once approved, the question can be reused for
    other roadmap tasks having the same Skill.
    """

    task = _get_task_for_user(
        user=user,
        task_id=task_id,
    )

    data = data or {}

    question_text = str(
        data.get(
            "question",
            "",
        )
    ).strip()

    if not question_text:
        raise RoadmapValidationError(
            "question is required."
        )

    question_type = _normalize_question_type(
        data.get(
            "question_type"
        )
    )

    difficulty = _normalize_difficulty(
        data.get(
            "difficulty",
            "basic",
        )
    )

    option_data = data.get(
        "options"
    )

    if option_data is None:
        option_data = {
            "A": data.get("option_a", ""),
            "B": data.get("option_b", ""),
            "C": data.get("option_c", ""),
            "D": data.get("option_d", ""),
        }

    option_fields = _normalize_question_options(
        option_data
    )

    correct_answer = _normalize_correct_answer(
        data.get(
            "correct_answer"
        )
    )

    explanation = str(
        data.get(
            "explanation",
            "",
        )
        or ""
    ).strip()

    try:
        marks = int(
            data.get(
                "marks",
                1,
            )
            or 1
        )
    except (
        TypeError,
        ValueError,
    ):
        marks = 1

    marks = max(
        marks,
        1,
    )

    question = AssessmentQuestion.objects.create(
        task=task,
        created_by=user,
        question_type=question_type,
        difficulty=difficulty,
        source="user",
        status="pending",
        question=question_text,
        option_a=option_fields["option_a"],
        option_b=option_fields["option_b"],
        option_c=option_fields["option_c"],
        option_d=option_fields["option_d"],
        correct_answer=correct_answer,
        explanation=explanation,
        marks=marks,
    )

    return question


def get_user_assessment_questions(
    user,
    task_id,
):
    """
    Return assessment questions created by the authenticated
    user for a roadmap task.
    """

    task = _get_task_for_user(
        user=user,
        task_id=task_id,
    )

    return list(
        AssessmentQuestion.objects
        .filter(
            task=task,
            created_by=user,
        )
        .order_by(
            "-created_at",
        )
    )


def get_available_assessment_questions(
    user,
    task_id,
):
    """
    Return approved questions available to the user.

    IMPORTANT:
    Questions are reusable by Skill.

    Therefore, approved questions belonging to another
    user's roadmap task can be used if that task has the
    same Skill as the current user's roadmap task.
    """

    task = _get_task_for_user(
        user=user,
        task_id=task_id,
    )

    return list(
        _get_approved_questions_for_skill(
            skill_id=task.skill_id,
        ).order_by(
            "id",
        )
    )



def start_assessment(
    user,
    task_id,
    question_count=5,
):
    """
    Start an assessment using approved questions from
    the reusable Skill-based question bank.
    """

    task = _get_task_for_user(
        user=user,
        task_id=task_id,
    )

    try:
        question_count = int(
            question_count
        )
    except (
        TypeError,
        ValueError,
    ):
        question_count = 5

    question_count = max(
        1,
        min(
            question_count,
            20,
        ),
    )

    questions = _get_questions_for_skill(
        skill_id=task.skill_id,
        question_count=question_count,
    )

    if not questions:
        raise RoadmapValidationError(
            "No approved assessment questions are available "
            "for this skill yet."
        )

    assessment = Assessment.objects.create(
        user=user,
        task=task,
        status="in_progress",
        total_marks=sum(
            question.marks
            for question in questions
        ),
        passing_percentage=70,
        started_at=timezone.now(),
    )

    assessment.questions.set(
        questions
    )

    return assessment


def _normalize_submitted_answers(
    submitted_answers,
):
    """
    Normalize frontend assessment answers.
    """

    if submitted_answers is None:
        return {}

    if isinstance(
        submitted_answers,
        dict,
    ):
        return submitted_answers

    if not isinstance(
        submitted_answers,
        list,
    ):
        return {}

    answer_map = {}

    for item in submitted_answers:
        if not isinstance(
            item,
            dict,
        ):
            continue

        question_id = (
            item.get("question_id")
            or item.get("id")
        )

        if question_id is None:
            continue

        answer = (
            item.get("answer")
            if "answer" in item
            else item.get("answers", [])
        )

        answer_map[str(question_id)] = answer

    return answer_map


def evaluate_assessment(
    assessment,
    answers,
):
    """
    Evaluate an assessment submission.
    """

    if assessment is None:
        raise RoadmapNotFoundError(
            "Assessment was not found."
        )

    questions = list(
        assessment.questions.all()
    )

    if not questions:
        raise RoadmapValidationError(
            "Assessment contains no questions."
        )

    answer_map = _normalize_submitted_answers(
        answers
    )

    assessment.answers.all().delete()

    score = 0
    total_marks = 0

    for question in questions:
        total_marks += question.marks

        submitted_answer = answer_map.get(
            str(question.id),
            answer_map.get(
                question.id,
                [],
            ),
        )

        if not isinstance(
            submitted_answer,
            list,
        ):
            submitted_answer = [
                submitted_answer
            ]

        expected = (
            question.correct_answer
            or []
        )

        if not isinstance(
            expected,
            list,
        ):
            expected = [
                expected
            ]

        normalized_submitted = [
            str(value)
            .strip()
            .lower()
            for value in submitted_answer
        ]

        normalized_expected = [
            str(value)
            .strip()
            .lower()
            for value in expected
        ]

        is_correct = (
            sorted(
                normalized_submitted
            )
            == sorted(
                normalized_expected
            )
        )

        marks_awarded = (
            question.marks
            if is_correct
            else 0
        )

        if is_correct:
            score += marks_awarded

        AssessmentAnswer.objects.create(
            assessment=assessment,
            question=question,
            answer=submitted_answer,
            is_correct=is_correct,
            marks_awarded=marks_awarded,
        )

    assessment.score = score
    assessment.total_marks = total_marks
    assessment.submitted_at = timezone.now()
    assessment.evaluated_at = timezone.now()

    percentage = (
        (score / total_marks) * 100
        if total_marks
        else 0
    )

    if percentage >= assessment.passing_percentage:
        assessment.status = "passed"
    else:
        assessment.status = "failed"

    assessment.save(
        update_fields=[
            "score",
            "total_marks",
            "submitted_at",
            "evaluated_at",
            "status",
        ]
    )

    if assessment.status == "passed":
        task = assessment.task

        if not task.completed:
            task.completed = True
            task.completed_at = timezone.now()

            task.save(
                update_fields=[
                    "completed",
                    "completed_at",
                    "updated_at",
                ]
            )

    return assessment


def submit_assessment(
    user,
    assessment_id,
    submitted_answers,
):
    """
    Submit and evaluate an assessment.
    """

    assessment = _get_assessment_for_user(
        user=user,
        assessment_id=assessment_id,
    )

    if assessment.status in {
        "passed",
        "failed",
        "submitted",
    }:
        raise RoadmapValidationError(
            "This assessment has already been submitted."
        )

    return evaluate_assessment(
        assessment=assessment,
        answers=submitted_answers,
    )


def get_user_assessments(
    user,
):
    """
    Return assessments belonging to the authenticated user.
    """

    if user is None or not user.is_authenticated:
        raise RoadmapValidationError(
            "Authenticated user is required."
        )

    return list(
        Assessment.objects
        .select_related(
            "task",
            "task__skill",
            "task__user_goal",
        )
        .filter(
            user=user,
        )
        .prefetch_related(
            "questions",
            "answers",
        )
        .order_by(
            "-created_at",
        )
    )


def generate_ai_questions(
    user,
    task_id,
    question_count=5,
):
    """
    Generate AI-assisted assessment questions.

    Question-bank behavior:

    1. Check whether approved questions already exist for
       this Skill.
    2. If approved questions exist, reuse them.
    3. If none exist, generate new AI questions.
    4. New AI questions are saved as pending.
    5. After admin approval, those questions become reusable
       for every roadmap task using the same Skill.

    No database migration is required for this behavior.
    """

    task = _get_task_for_user(
        user=user,
        task_id=task_id,
    )

    try:
        question_count = int(
            question_count
        )
    except (
        TypeError,
        ValueError,
    ):
        question_count = 5

    question_count = max(
        1,
        min(
            question_count,
            20,
        ),
    )


    existing_questions = _get_questions_for_skill(
        skill_id=task.skill_id,
        question_count=question_count,
    )

    if existing_questions:
        return existing_questions


    from ai_engine.services import (
        generate_assessment_questions,
    )

    generated_questions = generate_assessment_questions(
        user=user,
        task=task,
        question_count=question_count,
    )

    if not isinstance(
        generated_questions,
        list,
    ):
        raise RoadmapValidationError(
            "AI question generator returned an invalid response."
        )

    saved_questions = []

    for item in generated_questions:
        if not isinstance(
            item,
            dict,
        ):
            continue

        question_text = str(
            item.get(
                "question",
                "",
            )
        ).strip()

        if not question_text:
            continue

        question_type = _normalize_question_type(
            item.get(
                "question_type"
            )
        )

        difficulty = _normalize_difficulty(
            item.get(
                "difficulty",
                "basic",
            )
        )

        option_data = item.get(
            "options"
        )

        # Support generators that directly return
        # option_a / option_b / option_c / option_d.
        if option_data is None:
            option_data = {
                "A": item.get("option_a", ""),
                "B": item.get("option_b", ""),
                "C": item.get("option_c", ""),
                "D": item.get("option_d", ""),
            }

        option_fields = _normalize_question_options(
            option_data
        )

        correct_answer = _normalize_correct_answer(
            item.get(
                "correct_answer"
            )
        )

        explanation = str(
            item.get(
                "explanation",
                "",
            )
            or ""
        ).strip()

        try:
            marks = int(
                item.get(
                    "marks",
                    1,
                )
                or 1
            )
        except (
            TypeError,
            ValueError,
        ):
            marks = 1

        marks = max(
            marks,
            1,
        )

        question = AssessmentQuestion.objects.create(
            task=task,
            created_by=user,
            question_type=question_type,
            difficulty=difficulty,
            source="ai",
            status="pending",
            question=question_text,
            option_a=option_fields["option_a"],
            option_b=option_fields["option_b"],
            option_c=option_fields["option_c"],
            option_d=option_fields["option_d"],
            correct_answer=correct_answer,
            explanation=explanation,
            marks=marks,
        )

        saved_questions.append(
            question
        )

    if not saved_questions:
        raise RoadmapValidationError(
            "The AI question generator did not return "
            "any valid questions."
        )

    return saved_questions


# ADMIN ASSESSMENT QUESTION MANAGEMENT

def get_admin_assessment_questions():
    """
    Return assessment questions available for SkillHive admins.
    """

    return list(
        AssessmentQuestion.objects
        .select_related(
            "task",
            "task__skill",
            "task__user_goal",
            "created_by",
        )
        .order_by(
            "status",
            "-created_at",
        )
    )


def approve_assessment_question(
    question_id,
):
    """
    Approve a pending assessment question.

    Once approved, the question becomes part of the
    reusable question bank for its Skill.
    """

    try:
        question_id = int(
            question_id
        )
    except (
        TypeError,
        ValueError,
    ):
        raise RoadmapValidationError(
            "question_id must be a valid assessment question ID."
        )

    question = (
        AssessmentQuestion.objects
        .select_related(
            "task",
            "task__skill",
        )
        .filter(
            id=question_id,
        )
        .first()
    )

    if question is None:
        raise RoadmapNotFoundError(
            "Assessment question was not found."
        )

    question.status = "approved"

    question.save(
        update_fields=[
            "status",
        ]
    )

    return question


def reject_assessment_question(
    question_id,
):
    """
    Reject a pending assessment question.
    """

    try:
        question_id = int(
            question_id
        )
    except (
        TypeError,
        ValueError,
    ):
        raise RoadmapValidationError(
            "question_id must be a valid assessment question ID."
        )

    question = (
        AssessmentQuestion.objects
        .select_related(
            "task",
            "task__skill",
        )
        .filter(
            id=question_id,
        )
        .first()
    )

    if question is None:
        raise RoadmapNotFoundError(
            "Assessment question was not found."
        )

    question.status = "rejected"

    question.save(
        update_fields=[
            "status",
        ]
    )

    return question