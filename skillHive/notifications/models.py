from django.contrib.auth.models import User
from django.db import models


class Notification(models.Model):
    TYPE_EXCHANGE_REQUEST = "exchange_request"
    TYPE_EXCHANGE_ACCEPTED = "exchange_accepted"
    TYPE_EXCHANGE_REJECTED = "exchange_rejected"
    TYPE_XP_EARNED = "xp_earned"
    TYPE_ROADMAP_UPDATE = "roadmap_update"
    TYPE_SESSION = "session"
    TYPE_CONTENT = "content"
    TYPE_CERTIFICATE = "certificate"
    TYPE_BADGE = "badge"
    TYPE_VERIFICATION = "verification"
    TYPE_ACCOUNT = "account"
    TYPE_REPORT = "report"
    TYPE_CONTACT_MESSAGE = "contact_message"

    TYPE_CHOICES = [
        (
            TYPE_EXCHANGE_REQUEST,
            "Exchange Request",
        ),
        (
            TYPE_EXCHANGE_ACCEPTED,
            "Exchange Accepted",
        ),
        (
            TYPE_EXCHANGE_REJECTED,
            "Exchange Rejected",
        ),
        (
            TYPE_XP_EARNED,
            "XP Earned",
        ),
        (
            TYPE_ROADMAP_UPDATE,
            "Roadmap Update",
        ),
        (
            TYPE_SESSION,
            "Session",
        ),
        (
            TYPE_CONTENT,
            "Content",
        ),
        (
            TYPE_CERTIFICATE,
            "Certificate",
        ),
        (
            TYPE_BADGE,
            "Badge",
        ),
        (
            TYPE_VERIFICATION,
            "Verification",
        ),
        (
            TYPE_ACCOUNT,
            "Account",
        ),
        (
            TYPE_REPORT,
            "Report",
        ),
        (
            TYPE_CONTACT_MESSAGE,
            "Contact Message",
        ),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    message = models.CharField(
        max_length=500,
    )

    type = models.CharField(
        max_length=50,
        choices=TYPE_CHOICES,
        db_index=True,
    )

    is_read = models.BooleanField(
        default=False,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["user", "is_read"],
                name="notif_user_read_idx",
            ),
            models.Index(
                fields=["user", "created_at"],
                name="notif_user_date_idx",
            ),
            models.Index(
                fields=["type", "created_at"],
                name="notif_type_date_idx",
            ),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.type}"