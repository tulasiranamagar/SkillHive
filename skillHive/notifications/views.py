from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .serializers import NotificationSerializer
from .services import (
    delete_notification,
    get_unread_notification_count,
    get_user_notifications,
    mark_all_as_read,
    mark_as_read,
)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    """
    Return notifications belonging to
    the authenticated user.
    """

    notifications = get_user_notifications(
        request.user
    )

    serializer = NotificationSerializer(
        notifications,
        many=True,
        context={
            "request": request,
        },
    )

    return Response(
        serializer.data
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_count(request):
    """
    Return the authenticated user's
    unread notification count.
    """

    count = get_unread_notification_count(
        request.user
    )

    return Response(
        {
            "unread_count": count,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def read_notification(request, pk):
    """
    Mark one notification as read.
    """

    notification = mark_as_read(
        request.user,
        pk,
    )

    return Response(
        {
            "message": "Notification marked as read.",
            "id": notification.id,
            "is_read": notification.is_read,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def read_all_notifications(request):
    """
    Mark all notifications belonging to
    the authenticated user as read.
    """

    updated_count = mark_all_as_read(
        request.user
    )

    return Response(
        {
            "message": "All notifications marked as read.",
            "updated_count": updated_count,
        }
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_notification_view(request, pk):
    """
    Delete one notification belonging
    to the authenticated user.
    """

    notification_id = delete_notification(
        request.user,
        pk,
    )

    return Response(
        {
            "message": "Notification deleted.",
            "id": notification_id,
        }
    )