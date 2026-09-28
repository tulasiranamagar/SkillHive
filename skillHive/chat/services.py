from django.contrib.auth.models import User
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Conversation, Message


class ChatServiceError(Exception):
    """Raised when a chat operation cannot be completed."""


def get_user_for_chat(user_id):
    """
    Return an active user who is allowed to participate in chat.

    A user must have an active Django account.

    If the user has a Profile, the profile must also be active.
    However, a missing Profile should not prevent chat from working.
    """

    try:
        user = User.objects.get(
            pk=user_id,
            is_active=True,
        )
    except User.DoesNotExist:
        raise ChatServiceError(
            "The selected user does not exist or is inactive."
        )

    # Profile is optional for chat.
    # If the Profile exists and is explicitly inactive,
    # prevent the user from being contacted.
    try:
        profile = user.profile
    except Exception:
        profile = None

    if profile is not None and not profile.is_active:
        raise ChatServiceError(
            "The selected user does not exist or is inactive."
        )

    return user


def get_user_conversations(user):
    return (
        Conversation.objects
        .filter(
            participants=user,
            participants__is_active=True,
        )
        .prefetch_related("participants")
        .distinct()
    )


def get_conversation_for_user(user, conversation_id):
    return get_object_or_404(
        Conversation.objects
        .filter(participants=user)
        .prefetch_related("participants"),
        pk=conversation_id,
    )


@transaction.atomic
def get_or_create_direct_conversation(user, other_user_id):
    if not user.is_authenticated:
        raise ChatServiceError(
            "Authentication is required."
        )

    if not user.is_active:
        raise ChatServiceError(
            "Your account is inactive."
        )

    try:
        other_user = get_user_for_chat(other_user_id)
    except ChatServiceError:
        raise

    if user.id == other_user.id:
        raise ChatServiceError(
            "You cannot start a conversation with yourself."
        )

    existing = (
        Conversation.objects
        .filter(participants=user)
        .filter(participants=other_user)
        .prefetch_related("participants")
    )

    for conversation in existing:
        participant_ids = set(
            conversation.participants.values_list(
                "id",
                flat=True,
            )
        )

        if participant_ids == {
            user.id,
            other_user.id,
        }:
            return conversation, False

    conversation = Conversation.objects.create()

    conversation.participants.set(
        [user, other_user]
    )

    return conversation, True


def get_conversation_messages(user, conversation_id):
    conversation = get_conversation_for_user(
        user,
        conversation_id,
    )

    return (
        Message.objects
        .filter(conversation=conversation)
        .select_related("sender")
        .order_by("created_at")
    )


@transaction.atomic
def send_message(user, conversation_id, content):
    if not user.is_authenticated:
        raise ChatServiceError(
            "Authentication is required."
        )

    content = (content or "").strip()

    if not content:
        raise ChatServiceError(
            "Message content cannot be empty."
        )

    conversation = (
        Conversation.objects
        .filter(
            pk=conversation_id,
            participants=user,
        )
        .prefetch_related("participants")
        .first()
    )

    if conversation is None:
        raise ChatServiceError(
            "Conversation not found."
        )

    active_participants = list(
        conversation.participants.filter(
            is_active=True,
        )
    )

    if len(active_participants) != 2:
        raise ChatServiceError(
            "This conversation is unavailable."
        )

    if user not in active_participants:
        raise ChatServiceError(
            "You cannot send messages in this conversation."
        )

    message = Message.objects.create(
        conversation=conversation,
        sender=user,
        content=content,
    )

    Conversation.objects.filter(
        pk=conversation.pk,
    ).update(
        updated_at=timezone.now(),
    )

    return message


@transaction.atomic
def update_message(user, message_id, content):
    content = (content or "").strip()

    if not content:
        raise ChatServiceError(
            "Message content cannot be empty."
        )

    message = get_object_or_404(
        Message.objects.select_related("conversation"),
        pk=message_id,
        sender=user,
    )

    if not message.conversation.participants.filter(
        pk=user.pk,
        is_active=True,
    ).exists():
        raise ChatServiceError(
            "You cannot edit this message."
        )

    message.content = content

    message.save(
        update_fields=["content"],
    )

    message.conversation.updated_at = timezone.now()

    message.conversation.save(
        update_fields=["updated_at"],
    )

    return message


@transaction.atomic
def delete_message(user, message_id):
    message = get_object_or_404(
        Message.objects.select_related("conversation"),
        pk=message_id,
        sender=user,
    )

    conversation = message.conversation

    message.delete()

    conversation.updated_at = timezone.now()

    conversation.save(
        update_fields=["updated_at"],
    )


@transaction.atomic
def mark_message_as_read(user, message_id):
    message = get_object_or_404(
        Message.objects.select_related("conversation"),
        pk=message_id,
        conversation__participants=user,
    )

    if message.sender_id == user.id:
        raise ChatServiceError(
            "You cannot mark your own message as read."
        )

    if not message.is_read:
        message.is_read = True

        message.save(
            update_fields=["is_read"],
        )

    return message


@transaction.atomic
def mark_conversation_messages_as_read(user, conversation):
    Message.objects.filter(
        conversation=conversation,
        is_read=False,
    ).exclude(
        sender=user,
    ).update(
        is_read=True,
    )