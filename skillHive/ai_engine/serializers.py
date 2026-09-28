from rest_framework import serializers


class SkillGapRequestSerializer(serializers.Serializer):
    goal_id = serializers.IntegerField(
        min_value=1
    )


class QuestionGenerationSerializer(serializers.Serializer):
    skill_name = serializers.CharField(
        min_length=1,
        max_length=255,
    )

    count = serializers.IntegerField(
        min_value=1,
        max_value=20,
        default=5,
        required=False,
    )


class RecommendationQuerySerializer(serializers.Serializer):
    type = serializers.ChoiceField(
        choices=[
            "all",
            "content",
            "exchange",
        ],
        default="all",
        required=False,
    )

    limit = serializers.IntegerField(
        min_value=1,
        max_value=20,
        default=6,
        required=False,
    )

    content_limit = serializers.IntegerField(
        min_value=1,
        max_value=20,
        required=False,
    )

    exchange_limit = serializers.IntegerField(
        min_value=1,
        max_value=20,
        required=False,
    )