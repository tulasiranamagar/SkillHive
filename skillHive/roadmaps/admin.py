from django.contrib import admin

from .models import (
    Assessment,
    AssessmentAnswer,
    AssessmentQuestion,
    LearningActivity,
    RoadmapProgress,
    RoadmapTask,
)


@admin.register(RoadmapTask)
class RoadmapTaskAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "user_goal",
        "skill",
        "order",
        "completed",
        "created_at",
    )
    list_filter = (
        "completed",
        "skill",
    )
    search_fields = (
        "title",
        "user_goal__user__username",
        "skill__name",
    )
    ordering = (
        "user_goal",
        "order",
        "id",
    )


@admin.register(LearningActivity)
class LearningActivityAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "task",
        "activity_type",
        "duration_seconds",
        "completed",
        "created_at",
    )
    list_filter = (
        "activity_type",
        "completed",
    )
    search_fields = (
        "user__username",
        "task__title",
    )
    ordering = (
        "-created_at",
    )


@admin.register(RoadmapProgress)
class RoadmapProgressAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "task",
        "progress_percent",
        "questions_answered",
        "correct_questions",
        "practical_tasks_completed",
        "updated_at",
    )
    list_filter = (
        "progress_percent",
    )
    search_fields = (
        "user__username",
        "task__title",
    )
    ordering = (
        "-updated_at",
    )


@admin.register(AssessmentQuestion)
class AssessmentQuestionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "task",
        "question_type",
        "difficulty",
        "source",
        "status",
        "marks",
        "created_at",
    )
    list_filter = (
        "question_type",
        "difficulty",
        "source",
        "status",
    )
    search_fields = (
        "question",
        "task__title",
        "created_by__username",
    )
    ordering = (
        "-created_at",
    )


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "task",
        "status",
        "score",
        "total_marks",
        "passing_percentage",
        "started_at",
        "submitted_at",
    )
    list_filter = (
        "status",
    )
    search_fields = (
        "user__username",
        "task__title",
    )
    ordering = (
        "-created_at",
    )


@admin.register(AssessmentAnswer)
class AssessmentAnswerAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "assessment",
        "question",
        "is_correct",
        "marks_awarded",
        "submitted_at",
    )
    list_filter = (
        "is_correct",
    )
    search_fields = (
        "assessment__user__username",
        "question__question",
    )
    ordering = (
        "-submitted_at",
    )