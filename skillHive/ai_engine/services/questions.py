from roadmaps.models import AssessmentQuestion


class AIQuestionGenerationError(Exception):
    """
    Raised when AI assessment question generation fails.
    """

ALLOWED_QUESTION_TYPES = {
    "mcq",
    "multiple_select",
    "true_false",
    "code_output",
    "scenario",
    "practical",
}


def _validate_generated_question(question):
    """
    Validate and normalize a single generated question.

    The AI question generator returns option_a/option_b/
    option_c/option_d fields. AssessmentQuestion stores
    options as a JSON object, so we normalize them here.
    """

    if not isinstance(question, dict):
        raise AIQuestionGenerationError(
            "Generated question must be an object."
        )

    question_type = question.get("question_type")

    if question_type not in ALLOWED_QUESTION_TYPES:
        raise AIQuestionGenerationError(
            f"Unsupported question type: {question_type}"
        )

    question_text = str(
        question.get("question", "")
    ).strip()

    if not question_text:
        raise AIQuestionGenerationError(
            "Generated question text cannot be empty."
        )

    correct_answer = question.get("correct_answer")

    if not isinstance(correct_answer, list):
        raise AIQuestionGenerationError(
            "correct_answer must be a list."
        )

    options = question.get("options")

    if not isinstance(options, dict):
        options = {
            "A": str(question.get("option_a", "")).strip(),
            "B": str(question.get("option_b", "")).strip(),
            "C": str(question.get("option_c", "")).strip(),
            "D": str(question.get("option_d", "")).strip(),
        }

       
        options = {
            key: value
            for key, value in options.items()
            if value
        }

    explanation = str(
        question.get("explanation", "")
    ).strip()

    try:
        marks = int(
            question.get("marks", 1) or 1
        )
    except (TypeError, ValueError):
        marks = 1

    return {
        "question_type": question_type,
        "question": question_text,
        "options": options,
        "correct_answer": correct_answer,
        "explanation": explanation,
        "marks": max(marks, 1),
    }


def _validate_generated_questions(questions):
    """
    Validate the complete list returned by the AI generator.
    """

    if not isinstance(questions, list):
        raise AIQuestionGenerationError(
            "AI question generator must return a list."
        )

    if not questions:
        raise AIQuestionGenerationError(
            "AI question generator returned no questions."
        )

    return [
        _validate_generated_question(question)
        for question in questions
    ]


def generate_assessment_questions(
    user,
    task,
    question_count=5,
):
    """
    Generate and validate assessment questions.

    This service does NOT save questions.

    Roadmaps owns AssessmentQuestion persistence.
    """

    if user is None or not user.is_authenticated:
        raise AIQuestionGenerationError(
            "Authenticated user is required."
        )

    if task is None:
        raise AIQuestionGenerationError(
            "Roadmap task is required."
        )

    if task.user_goal.user_id != user.id:
        raise AIQuestionGenerationError(
            "This roadmap task does not belong to the user."
        )

    try:
        question_count = int(question_count)
    except (TypeError, ValueError):
        raise AIQuestionGenerationError(
            "question_count must be an integer."
        )

    if question_count < 1:
        raise AIQuestionGenerationError(
            "question_count must be at least 1."
        )

    if question_count > 20:
        raise AIQuestionGenerationError(
            "question_count cannot exceed 20."
        )

    try:
        from ai_engine.question_generator import (
            generate_questions,
        )
    except ImportError as exc:
        raise AIQuestionGenerationError(
            "AI question generator is not available."
        ) from exc

    try:
        generated = generate_questions(
            skill_name=task.skill.name,
            count=question_count,
        )
    except ValueError as exc:
        raise AIQuestionGenerationError(
            str(exc)
        ) from exc
    except Exception as exc:
        raise AIQuestionGenerationError(
            "AI question generation failed."
        ) from exc

    return _validate_generated_questions(
        generated
    )