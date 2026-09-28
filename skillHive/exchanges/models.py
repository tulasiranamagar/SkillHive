from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class ExchangePost(models.Model):
    STATUS_OPEN = "open"
    STATUS_CLOSED = "closed"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = (
        (STATUS_OPEN, "Open"),
        (STATUS_CLOSED, "Closed"),
        (STATUS_CANCELLED, "Cancelled"),
    )

    MAX_DURATION_MINUTES = 480

    creator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="exchange_posts",
    )

    title = models.CharField(
        max_length=200,
    )

    description = models.TextField(
        blank=True,
    )

    offered_skill_name = models.CharField(
        max_length=150,
    )

    requested_skill_name = models.CharField(
        max_length=150,
    )

    scheduled_at = models.DateTimeField()

    duration_minutes = models.PositiveIntegerField(
        default=60,
        validators=[
            MinValueValidator(1),
        ],
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_OPEN,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["creator", "status"],
                name="ex_post_creator_status_idx",
            ),
            models.Index(
                fields=["status", "created_at"],
                name="exchange_post_status_date_idx",
            ),
            models.Index(
                fields=["scheduled_at", "status"],
                name="exchange_post_schedule_idx",
            ),
        ]

    def clean(self):
        offered = (self.offered_skill_name or "").strip()
        requested = (self.requested_skill_name or "").strip()

        if not offered:
            raise ValidationError(
                {
                    "offered_skill_name": (
                        "Please enter the skill you want to share."
                    )
                }
            )

        if not requested:
            raise ValidationError(
                {
                    "requested_skill_name": (
                        "Please enter the skill you want to learn."
                    )
                }
            )

        if offered.casefold() == requested.casefold():
            raise ValidationError(
                "Offered and requested skills must be different."
            )

        if self.duration_minutes > self.MAX_DURATION_MINUTES:
            raise ValidationError(
                {
                    "duration_minutes": (
                        f"Session duration cannot exceed "
                        f"{self.MAX_DURATION_MINUTES} minutes."
                    )
                }
            )

        if self.scheduled_at and self.scheduled_at <= timezone.now():
            raise ValidationError(
                {
                    "scheduled_at": (
                        "The exchange schedule must be in the future."
                    )
                }
            )

        self.offered_skill_name = offered
        self.requested_skill_name = requested

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.creator.username}: {self.title}"


class ExchangeRequest(models.Model):
    STATUS_PENDING = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_REJECTED = "rejected"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_CANCELLED, "Cancelled"),
    )

    post = models.ForeignKey(
        ExchangePost,
        on_delete=models.CASCADE,
        related_name="requests",
    )

    requester = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="exchange_requests_sent",
    )

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="exchange_requests_received",
    )

    message = models.TextField(
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["post", "requester"],
                name="unique_requester_per_exchange_post",
            ),
        ]

        indexes = [
            models.Index(
                fields=["requester", "status"],
                name="ex_req_requester_status_idx",
            ),
            models.Index(
                fields=["recipient", "status"],
                name="ex_req_recipient_status_idx",
            ),
            models.Index(
                fields=["post", "status"],
                name="exchange_req_post_status_idx",
            ),
        ]

    def clean(self):
        if self.requester_id == self.recipient_id:
            raise ValidationError(
                "You cannot create an exchange request with yourself."
            )

        if self.post_id:
            if self.recipient_id != self.post.creator_id:
                raise ValidationError(
                    "The request recipient must be the exchange creator."
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.requester.username} -> "
            f"{self.recipient.username} ({self.status})"
        )