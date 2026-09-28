from django.urls import path

from .views import (
    admin_assessment_questions,
    approve_assessment_question_view,
    available_assessment_questions,
    create_assessment_question,
    generate_ai_assessment_questions,
    generate_my_roadmap,
    my_assessment_questions,
    my_assessments,
    my_roadmap_progress,
    my_roadmap_tasks,
    record_learning_activity_view,
    reject_assessment_question_view,
    start_assessment_view,
    submit_assessment_view,
)


urlpatterns = [
    # Roadmap
    path(
        "generate/",
        generate_my_roadmap,
        name="generate-roadmap",
    ),
    path(
        "",
        my_roadmap_tasks,
        name="my-roadmap-tasks",
    ),
    path(
        "progress/",
        my_roadmap_progress,
        name="my-roadmap-progress",
    ),

    # Learning activity
    path(
        "learning-activity/",
        record_learning_activity_view,
        name="record-learning-activity",
    ),

    # User assessment questions
    path(
        "assessment/questions/create/",
        create_assessment_question,
        name="create-assessment-question",
    ),
    path(
        "assessment/questions/<int:task_id>/mine/",
        my_assessment_questions,
        name="my-assessment-questions",
    ),
    path(
        "assessment/questions/<int:task_id>/available/",
        available_assessment_questions,
        name="available-assessment-questions",
    ),

    # Assessment
    path(
        "assessment/start/",
        start_assessment_view,
        name="start-assessment",
    ),
    path(
        "assessment/submit/",
        submit_assessment_view,
        name="submit-assessment",
    ),
    path(
        "assessments/",
        my_assessments,
        name="my-assessments",
    ),

    # AI question generation
    path(
        "assessment/questions/generate/",
        generate_ai_assessment_questions,
        name="generate-ai-assessment-questions",
    ),

    # Admin question review
    path(
        "assessment/admin/questions/",
        admin_assessment_questions,
        name="admin-assessment-questions",
    ),
    path(
        "assessment/admin/questions/<int:question_id>/approve/",
        approve_assessment_question_view,
        name="approve-assessment-question",
    ),
    path(
        "assessment/admin/questions/<int:question_id>/reject/",
        reject_assessment_question_view,
        name="reject-assessment-question",
    ),
]