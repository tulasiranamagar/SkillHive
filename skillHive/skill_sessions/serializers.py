from rest_framework import serializers

from .models import (
    Session,
    SessionEnrollment,
    SessionAttendance,
    SessionAttendancePeriod,
)


class SessionEnrollmentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    class Meta:
        model = SessionEnrollment
        fields = [
            "id",
            "user",
            "username",
            "access_method",
            "enrolled_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "username",
            "enrolled_at",
        ]


class SessionAttendancePeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionAttendancePeriod
        fields = [
            "id",
            "joined_at",
            "last_seen_at",
            "left_at",
            "duration_seconds",
            "status",
        ]
        read_only_fields = fields


class SessionAttendanceSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    periods = SessionAttendancePeriodSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = SessionAttendance
        fields = [
            "id",
            "user",
            "username",
            "total_duration_seconds",
            "attendance_verified",
            "xp_awarded",
            "periods",
        ]
        read_only_fields = fields


class SessionSerializer(serializers.ModelSerializer):
    creator_name = serializers.CharField(
        source="creator.username",
        read_only=True,
    )

    participant_name = serializers.CharField(
        source="participant.username",
        read_only=True,
    )

    session_skill_name = serializers.SerializerMethodField()
    session_state = serializers.SerializerMethodField()
    meeting_url = serializers.SerializerMethodField()

    enrollments = SessionEnrollmentSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Session

        fields = [
            "id",
            "creator",
            "creator_name",
            "participant",
            "participant_name",
            "skill",
            "skill_name",
            "session_skill_name",
            "exchange_post",
            "title",
            "description",
            "session_type",
            "access_type",
            "price",
            "xp_unlock_cost",
            "max_participants",
            "scheduled_at",
            "duration_minutes",
            "meeting_url",
            "status",
            "session_state",
            "enrollments",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "creator",
            "creator_name",
            "participant",
            "participant_name",
            "skill_name",
            "session_skill_name",
            "exchange_post",
            "meeting_url",
            "status",
            "session_state",
            "enrollments",
            "created_at",
            "updated_at",
        ]

    def get_session_skill_name(self, obj):
        """
        Return the structured Skill name when available.

        Exchange sessions intentionally have no structured Skill,
        so use Session.skill_name instead.
        """
        if obj.skill_id:
            return obj.skill.name

        return obj.skill_name

    def get_session_state(self, obj):
        from .services import get_session_state

        return get_session_state(obj)

    def get_meeting_url(self, obj):
        """
        Return the saved meeting URL to session members.

        The meeting room is available immediately after the
        session is created.

        The scheduled_at value no longer controls when the
        meeting link becomes visible.

        Allowed users:
        - session creator
        - direct participant
        - enrolled participant

        Other authenticated users never receive the URL.
        """

        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return None

        if not obj.meeting_url:
            return None

        # Session creator.
        if obj.creator_id == request.user.id:
            return obj.meeting_url

        # Direct participant.
        if obj.participant_id == request.user.id:
            return obj.meeting_url

        # Enrolled participant.
        is_member = obj.enrollments.filter(
            user_id=request.user.id
        ).exists()

        if is_member:
            return obj.meeting_url

        return None