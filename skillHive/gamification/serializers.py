from django.contrib.auth.models import User
from django.db.models import Sum
from rest_framework import serializers

from .models import Badge, UserBadge, XPTransaction
from .services import calculate_level


class UserBasicSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "id",
            "username",
        ]

        read_only_fields = fields


class BadgeSerializer(serializers.ModelSerializer):

    class Meta:
        model = Badge
        fields = [
            "id",
            "name",
            "description",
            "icon",
            "required_xp",
        ]

        read_only_fields = fields


class UserBadgeSerializer(serializers.ModelSerializer):

    badge = BadgeSerializer(
        read_only=True
    )

    class Meta:
        model = UserBadge
        fields = [
            "id",
            "badge",
            "earned_at",
        ]

        read_only_fields = fields


class XPTransactionSerializer(serializers.ModelSerializer):

    class Meta:
        model = XPTransaction
        fields = [
            "id",
            "points",
            "reason",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "points",
            "reason",
            "created_at",
        ]


class LeaderboardSerializer(serializers.ModelSerializer):

    total_xp = serializers.SerializerMethodField()
    level = serializers.SerializerMethodField()

    class Meta:
        model = User

        fields = [
            "id",
            "username",
            "total_xp",
            "level",
        ]

        read_only_fields = fields

    def get_total_xp(self, obj):
        return max(
            int(obj.total_xp or 0),
            0,
        )

    def get_level(self, obj):
        return calculate_level(
            obj.total_xp or 0
        )


class GamificationProfileSerializer(
    serializers.ModelSerializer
):

    total_xp = serializers.SerializerMethodField()
    level = serializers.SerializerMethodField()
    badges = serializers.SerializerMethodField()

    class Meta:
        model = User

        fields = [
            "id",
            "username",
            "total_xp",
            "level",
            "badges",
        ]

        read_only_fields = fields

    def get_total_xp(self, obj):
        total_xp = (
            XPTransaction.objects
            .filter(user=obj)
            .aggregate(
                total=Sum("points")
            )
            ["total"]
        )

        return max(
            int(total_xp or 0),
            0,
        )

    def get_level(self, obj):
        total_xp = (
            XPTransaction.objects
            .filter(user=obj)
            .aggregate(
                total=Sum("points")
            )
            ["total"]
        )

        return calculate_level(
            total_xp or 0
        )

    def get_badges(self, obj):
        badges = (
            UserBadge.objects
            .filter(
                user=obj,
                badge__is_active=True,
            )
            .select_related("badge")
            .order_by("-earned_at")
        )

        return UserBadgeSerializer(
            badges,
            many=True,
        ).data