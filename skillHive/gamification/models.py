from django.contrib.auth.models import User
from django.db import models


class Badge(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True,
    )

    description = models.TextField()

    icon = models.ImageField(
        upload_to="badges/",
        blank=True,
        null=True,
    )

    required_xp = models.PositiveIntegerField(
        default=0,
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    class Meta:
        ordering = ["required_xp", "id"]

        indexes = [
            models.Index(
                fields=["is_active", "required_xp"],
                name="badge_active_xp_idx",
            ),
        ]

    def __str__(self):
        return self.name


class UserBadge(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="badges",
    )

    badge = models.ForeignKey(
        Badge,
        on_delete=models.CASCADE,
        related_name="users",
    )

    earned_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-earned_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["user", "badge"],
                name="unique_user_badge",
            ),
        ]

        indexes = [
            models.Index(
                fields=["user", "earned_at"],
                name="user_badge_date_idx",
            ),
            models.Index(
                fields=["badge", "earned_at"],
                name="badge_user_date_idx",
            ),
        ]

    def __str__(self):
        return f"{self.user.username} → {self.badge.name}"


class XPTransaction(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="xp_transactions",
    )

    points = models.IntegerField()

    reason = models.CharField(
        max_length=255,
    )

    event_key = models.CharField(
        max_length=180,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["user", "event_key"],
                name="unique_user_xp_event",
            ),
        ]

        indexes = [
            models.Index(
                fields=["user", "created_at"],
                name="xp_user_date_idx",
            ),
            models.Index(
                fields=["user", "event_key"],
                name="xp_user_event_idx",
            ),
        ]

    def __str__(self):
        return f"{self.user.username}: {self.points} XP"