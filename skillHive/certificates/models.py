from django.contrib.auth.models import User
from django.core.validators import MaxValueValidator
from django.db import models
from django.utils import timezone

from goals.models import UserGoal


class Certificate(models.Model):
    STATUS_ISSUED = "issued"
    STATUS_REVOKED = "revoked"

    STATUS_CHOICES = (
        (STATUS_ISSUED, "Issued"),
        (STATUS_REVOKED, "Revoked"),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="certificates",
    )

    user_goal = models.OneToOneField(
        UserGoal,
        on_delete=models.CASCADE,
        related_name="certificate",
    )

    certificate_id = models.CharField(
        max_length=50,
        unique=True,
    )

    title = models.CharField(
        max_length=255,
    )

    issued_at = models.DateTimeField(
        default=timezone.now,
    )

    completion_date = models.DateTimeField(
        null=True,
        blank=True,
    )

    assessment_score = models.PositiveIntegerField(
        default=0,
        validators=[
            MaxValueValidator(100),
        ],
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ISSUED,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-issued_at"]

        indexes = [
            models.Index(
                fields=["user", "status"],
                name="cert_user_status_idx",
            ),
            models.Index(
                fields=["user_goal", "status"],
                name="cert_goal_status_idx",
            ),
        ]

    def __str__(self):
        return f"{self.certificate_id} - {self.user.username}"