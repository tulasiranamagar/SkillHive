from django.contrib import admin

from .models import Conversation, Message


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "display_participants",
        "created_at",
        "updated_at",
    )

    search_fields = (
        "participants__username",
        "participants__email",
    )

    filter_horizontal = (
        "participants",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    def display_participants(self, obj):
        return ", ".join(
            obj.participants.values_list(
                "username",
                flat=True,
            )
        )

    display_participants.short_description = "Participants"


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "conversation",
        "sender",
        "short_content",
        "is_read",
        "created_at",
    )

    list_filter = (
        "is_read",
        "created_at",
    )

    search_fields = (
        "content",
        "sender__username",
        "sender__email",
    )

    readonly_fields = (
        "created_at",
    )

    def short_content(self, obj):
        return obj.content[:50]

    short_content.short_description = "Message"