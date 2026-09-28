from rest_framework import serializers

from .models import (
    Assessment,
    AssessmentAnswer,
    AssessmentQuestion,
    LearningActivity,
    RoadmapProgress,
    RoadmapTask,
)


class RoadmapTaskSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(
        source="skill.name",
        read_only=True,
    )
    questions_count = serializers.SerializerMethodField()

    class Meta:
        model = RoadmapTask
        fields = [
            "id",
            "user_goal",
            "skill",
            "skill_name",
            "title",
            "order",
            "completed",
            "completed_at",
            "questions_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user_goal",
            "skill",
            "skill_name",
            "completed",
            "completed_at",
            "questions_count",
            "created_at",
            "updated_at",
        ]

    def get_questions_count(self, obj):
        return obj.assessment_questions.filter(
            status="approved"
        ).count()


class LearningActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningActivity
        fields = [
            "id",
            "user",
            "task",
            "activity_type",
            "reference_id",
            "duration_seconds",
            "completed",
            "metadata",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "created_at",
        ]


class RoadmapProgressSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(
        source="task.title",
        read_only=True,
    )
    skill_name = serializers.CharField(
        source="task.skill.name",
        read_only=True,
    )

    class Meta:
        model = RoadmapProgress
        fields = [
            "id",
            "task",
            "task_title",
            "skill_name",
            "video_seconds",
            "document_seconds",
            "sessions_attended",
            "questions_answered",
            "correct_questions",
            "practical_tasks_completed",
            "progress_percent",
            "updated_at",
        ]
        read_only_fields = fields


class AssessmentQuestionSerializer(serializers.ModelSerializer):
    """
    Internal/admin serializer.

    Never use this serializer for learner-facing question endpoints.
    """

    class Meta:
        model = AssessmentQuestion
        fields = [
            "id",
            "task",
            "created_by",
            "question_type",
            "difficulty",
            "source",
            "status",
            "question",
            "option_a",
            "option_b",
            "option_c",
            "option_d",
            "correct_answer",
            "explanation",
            "marks",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "created_at",
            "updated_at",
        ]


class AssessmentQuestionPublicSerializer(serializers.ModelSerializer):
    """
    Learner-facing serializer.

    Intentionally excludes correct_answer and explanation.
    """

    class Meta:
        model = AssessmentQuestion
        fields = [
            "id",
            "task",
            "question_type",
            "difficulty",
            "question",
            "option_a",
            "option_b",
            "option_c",
            "option_d",
            "marks",
        ]
        read_only_fields = fields


class AssessmentSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(
        source="task.title",
        read_only=True,
    )
    skill_name = serializers.CharField(
        source="task.skill.name",
        read_only=True,
    )
    questions = AssessmentQuestionPublicSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Assessment
        fields = [
            "id",
            "task",
            "task_title",
            "skill_name",
            "questions",
            "status",
            "score",
            "total_marks",
            "passing_percentage",
            "started_at",
            "submitted_at",
            "evaluated_at",
            "created_at",
        ]
        read_only_fields = fields


class AssessmentAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentAnswer
        fields = [
            "id",
            "assessment",
            "question",
            "answer",
            "is_correct",
            "marks_awarded",
            "submitted_at",
        ]
        read_only_fields = [
            "id",
            "assessment",
            "question",
            "is_correct",
            "marks_awarded",
            "submitted_at",
        ]