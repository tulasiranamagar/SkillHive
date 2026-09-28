from django.urls import path

from .views import (
    ConversationListCreateView,
    ConversationDetailView,
    MessageListCreateView,
    MessageUpdateDeleteView,
    MarkMessageReadView,
)


urlpatterns = [
    path(
        "conversations/",
        ConversationListCreateView.as_view(),
        name="conversation-list-create",
    ),

    path(
        "conversations/<int:pk>/",
        ConversationDetailView.as_view(),
        name="conversation-detail",
    ),

    path(
        "conversations/<int:conversation_id>/messages/",
        MessageListCreateView.as_view(),
        name="message-list-create",
    ),

    path(
        "messages/<int:pk>/",
        MessageUpdateDeleteView.as_view(),
        name="message-update-delete",
    ),

    path(
        "messages/<int:message_id>/read/",
        MarkMessageReadView.as_view(),
        name="message-read",
    ),
]