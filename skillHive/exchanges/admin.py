from django.contrib import admin

from .models import ExchangePost, ExchangeRequest


@admin.register(ExchangePost)
class ExchangePostAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "creator",
        "title",
        "offered_skill_name",
        "requested_skill_name",
        "scheduled_at",
        "duration_minutes",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
        "scheduled_at",
        "created_at",
    )

    search_fields = (
        "title",
        "description",
        "offered_skill_name",
        "requested_skill_name",
        "creator__username",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    ordering = (
        "-created_at",
    )


@admin.register(ExchangeRequest)
class ExchangeRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "post",
        "requester",
        "recipient",
        "status",
        "created_at",
        "updated_at",
    )

    list_filter = (
        "status",
        "created_at",
        "updated_at",
    )

    search_fields = (
        "post__title",
        "post__offered_skill_name",
        "post__requested_skill_name",
        "requester__username",
        "recipient__username",
        "message",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    ordering = (
        "-created_at",
    )