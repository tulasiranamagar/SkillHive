from django.contrib.auth.models import User
from django.db import models


class Conversation(models.Model):
    participants = models.ManyToManyField(
        User,
        related_name="conversations",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-updated_at"]

        indexes = [
            models.Index(
                fields=["updated_at"],
                name="conversation_updated_idx",
            ),
        ]

    def __str__(self):
        usernames = ", ".join(
            self.participants.values_list(
                "username",
                flat=True,
            )
        )

        return f"Conversation: {usernames}"


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )

    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )

    content = models.TextField()

    is_read = models.BooleanField(
        default=False,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["created_at"]

        indexes = [
            models.Index(
                fields=["conversation", "created_at"],
                name="message_conversation_date_idx",
            ),
            models.Index(
                fields=["conversation", "is_read"],
                name="message_conversation_read_idx",
            ),
            models.Index(
                fields=["sender", "created_at"],
                name="message_sender_date_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.sender.username}: "
            f"{self.content[:30]}"
        )