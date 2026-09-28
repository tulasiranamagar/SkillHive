from django.contrib.auth import get_user_model
from django.db import transaction

from .models import Notification


User = get_user_model()


def create_notification(
    user,
    message,
    notification_type,
):
    """
    Create a notification for one user.
    """

    return Notification.objects.create(
        user=user,
        message=message,
        type=notification_type,
    )


def create_notifications_for_users(
    users,
    message,
    notification_type,
):
    """
    Create the same notification for multiple users.
    """

    notifications = [
        Notification(
            user=user,
            message=message,
            type=notification_type,
        )
        for user in users
    ]

    if notifications:
        return Notification.objects.bulk_create(
            notifications
        )

    return []


def create_admin_notification(
    message,
    notification_type,
):
    """
    Send a notification to every active SkillHive
    administrator.
    """

    admin_users = (
        User.objects
        .filter(
            is_active=True,
        )
        .filter(
            profile__role="admin",
        )
        .distinct()
    )

    return create_notifications_for_users(
        users=admin_users,
        message=message,
        notification_type=notification_type,
    )


def get_user_notifications(user):
    """
    Return notifications belonging to the user.
    """

    return (
        Notification.objects
        .filter(user=user)
        .order_by("-created_at")
    )


def get_unread_notification_count(user):
    """
    Return the number of unread notifications
    belonging to the user.
    """

    return (
        Notification.objects
        .filter(
            user=user,
            is_read=False,
        )
        .count()
    )


def mark_as_read(user, notification_id):
    """
    Mark one notification as read.
    Only the owner of the notification can
    modify it.
    """

    notification = (
        Notification.objects
        .get(
            id=notification_id,
            user=user,
        )
    )

    if not notification.is_read:
        notification.is_read = True
        notification.save(
            update_fields=["is_read"]
        )

    return notification


def mark_all_as_read(user):
    """
    Mark all notifications belonging to the
    authenticated user as read.
    """

    return (
        Notification.objects
        .filter(
            user=user,
            is_read=False,
        )
        .update(is_read=True)
    )


def delete_notification(
    user,
    notification_id,
):
    """
    Delete one notification belonging to
    the authenticated user.
    """

    notification = (
        Notification.objects
        .get(
            id=notification_id,
            user=user,
        )
    )

    notification_id = notification.id

    notification.delete()

    return notification_id