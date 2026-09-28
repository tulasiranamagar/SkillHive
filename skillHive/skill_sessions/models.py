from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.db import models

from skills.models import Skill


class Session(models.Model):
    STATUS_SCHEDULED = "scheduled"
    STATUS_ACTIVE = "active"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = (
        (STATUS_SCHEDULED, "Scheduled"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_CANCELLED, "Cancelled"),
    )

    SESSION_ONE_TO_ONE = "one_to_one"
    SESSION_GROUP = "group"

    SESSION_TYPES = (
        (SESSION_ONE_TO_ONE, "One to One"),
        (SESSION_GROUP, "Group"),
    )

    ACCESS_FREE = "free"
    ACCESS_MONEY = "money"
    ACCESS_XP = "xp"
    ACCESS_MONEY_OR_XP = "money_or_xp"

    ACCESS_TYPE_CHOICES = (
        (ACCESS_FREE, "Free"),
        (ACCESS_MONEY, "Money"),
        (ACCESS_XP, "XP"),
        (ACCESS_MONEY_OR_XP, "Money or XP"),
    )

    creator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_sessions",
    )

    participant = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="direct_sessions",
    )

    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name="sessions",
        null=True,
        blank=True,
    )

    skill_name = models.CharField(
        max_length=150,
        blank=True,
    )

    exchange_post = models.ForeignKey(
        "exchanges.ExchangePost",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sessions",
    )

    title = models.CharField(
        max_length=255,
    )

    description = models.TextField(
        blank=True,
    )

    session_type = models.CharField(
        max_length=20,
        choices=SESSION_TYPES,
        default=SESSION_ONE_TO_ONE,
    )

    access_type = models.CharField(
        max_length=20,
        choices=ACCESS_TYPE_CHOICES,
        default=ACCESS_FREE,
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )

    xp_unlock_cost = models.PositiveIntegerField(
        default=0,
    )

    max_participants = models.PositiveIntegerField(
        default=2,
        validators=[
            MinValueValidator(1),
        ],
    )

    scheduled_at = models.DateTimeField()

    duration_minutes = models.PositiveIntegerField(
        default=60,
        validators=[
            MinValueValidator(1),
        ],
    )

    meeting_url = models.URLField(
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_SCHEDULED,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["scheduled_at", "id"]

        indexes = [
            models.Index(
                fields=["creator", "status"],
                name="ss_creator_status_idx",
            ),
            models.Index(
                fields=["scheduled_at", "status"],
                name="ss_schedule_status_idx",
            ),
            models.Index(
                fields=["exchange_post"],
                name="skill_session_exchange_idx",
            ),
        ]

    def __str__(self):
        return self.title


class SessionEnrollment(models.Model):
    ACCESS_FREE = "free"
    ACCESS_MONEY = "money"
    ACCESS_XP = "xp"

    ACCESS_METHOD_CHOICES = (
        (ACCESS_FREE, "Free"),
        (ACCESS_MONEY, "Money"),
        (ACCESS_XP, "XP"),
    )

    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="session_enrollments",
    )

    access_method = models.CharField(
        max_length=10,
        choices=ACCESS_METHOD_CHOICES,
    )

    enrolled_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["enrolled_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["session", "user"],
                name="unique_session_user_enrollment",
            ),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.session.title}"


class SessionAttendance(models.Model):
    STATUS_JOINED = "joined"
    STATUS_LEFT = "left"
    STATUS_VERIFIED = "verified"

    STATUS_CHOICES = (
        (STATUS_JOINED, "Joined"),
        (STATUS_LEFT, "Left"),
        (STATUS_VERIFIED, "Verified"),
    )

    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="session_attendance",
    )

    total_duration_seconds = models.PositiveIntegerField(
        default=0,
    )

    attendance_verified = models.BooleanField(
        default=False,
    )

    xp_awarded = models.BooleanField(
        default=False,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["session", "user"],
                name="unique_session_attendance",
            ),
        ]

        indexes = [
            models.Index(
                fields=["session", "user"],
                name="sa_attendance_session_user_idx",
            ),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.session.title}"


class SessionAttendancePeriod(models.Model):
    STATUS_ACTIVE = "active"
    STATUS_COMPLETED = "completed"

    STATUS_CHOICES = (
        (STATUS_ACTIVE, "Active"),
        (STATUS_COMPLETED, "Completed"),
    )

    attendance = models.ForeignKey(
        SessionAttendance,
        on_delete=models.CASCADE,
        related_name="periods",
    )

    joined_at = models.DateTimeField()

    last_seen_at = models.DateTimeField()

    left_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    duration_seconds = models.PositiveIntegerField(
        default=0,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        indexes = [
            models.Index(
                fields=["attendance", "status"],
                name="sap_attendance_status_idx",
            ),
        ]

    def __str__(self):
        return f"{self.attendance.user.username} - {self.joined_at}"