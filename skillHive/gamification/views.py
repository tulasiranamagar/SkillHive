from django.contrib.auth.models import User
from django.db.models import Sum
from django.db.models.functions import Coalesce

from rest_framework import generics, permissions

from .models import Badge, UserBadge, XPTransaction
from .serializers import (
    BadgeSerializer,
    GamificationProfileSerializer,
    LeaderboardSerializer,
    UserBadgeSerializer,
    XPTransactionSerializer,
)


class LeaderboardView(generics.ListAPIView):

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = LeaderboardSerializer

    def get_queryset(self):
        return (
            User.objects
            .filter(
                is_active=True,
            )
            .annotate(
                total_xp=Coalesce(
                    Sum(
                        "xp_transactions__points"
                    ),
                    0,
                )
            )
            .order_by(
                "-total_xp",
                "username",
                "id",
            )[:100]
        )


class BadgeListView(generics.ListAPIView):

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = BadgeSerializer

    def get_queryset(self):
        return (
            Badge.objects
            .filter(
                is_active=True,
            )
            .order_by(
                "required_xp",
                "name",
            )
        )


class MyGamificationProfileView(
    generics.RetrieveAPIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = GamificationProfileSerializer

    def get_object(self):
        return self.request.user


class MyBadgesView(generics.ListAPIView):

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = UserBadgeSerializer

    def get_queryset(self):
        return (
            UserBadge.objects
            .filter(
                user=self.request.user,
                badge__is_active=True,
            )
            .select_related("badge")
            .order_by("-earned_at")
        )


class MyXPHistoryView(generics.ListAPIView):

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = XPTransactionSerializer

    def get_queryset(self):
        return (
            XPTransaction.objects
            .filter(
                user=self.request.user,
            )
            .order_by("-created_at")
        )