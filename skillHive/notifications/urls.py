from django.urls import path

from .views import (
    delete_notification_view,
    get_notifications,
    read_all_notifications,
    read_notification,
    unread_count,
)


urlpatterns = [
    path(
        "",
        get_notifications,
        name="notifications",
    ),

    path(
        "unread-count/",
        unread_count,
        name="notification-unread-count",
    ),

    path(
        "<int:pk>/read/",
        read_notification,
        name="notification-read",
    ),

    path(
        "mark-all-read/",
        read_all_notifications,
        name="notification-mark-all-read",
    ),

    path(
        "<int:pk>/",
        delete_notification_view,
        name="notification-delete",
    ),
]