from django.contrib import admin

from .models import (
    Badge,
    UserBadge,
    XPTransaction,
)


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "name",
        "required_xp",
    )

    search_fields = (
        "name",
        "description",
    )

    ordering = (
        "required_xp",
    )


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "user",
        "badge",
        "earned_at",
    )

    search_fields = (
        "user__username",
        "badge__name",
    )

    list_filter = (
        "badge",
        "earned_at",
    )

    ordering = (
        "-earned_at",
    )

    readonly_fields = (
        "earned_at",
    )


@admin.register(XPTransaction)
class XPTransactionAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "user",
        "points",
        "reason",
        "created_at",
    )

    search_fields = (
        "user__username",
        "reason",
    )

    list_filter = (
        "created_at",
    )

    ordering = (
        "-created_at",
    )

    readonly_fields = (
        "created_at",
    )