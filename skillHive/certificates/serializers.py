from rest_framework import serializers

from .models import Certificate


class CertificateSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    career_goal = serializers.CharField(
        source="user_goal.goal.title",
        read_only=True,
    )

    class Meta:
        model = Certificate

        fields = [
            "id",
            "certificate_id",
            "title",
            "user_name",
            "career_goal",
            "issued_at",
            "completion_date",
            "assessment_score",
            "status",
        ]

        read_only_fields = fields

    def get_user_name(self, obj):
        return (
            obj.user.get_full_name().strip()
            or obj.user.username
        )