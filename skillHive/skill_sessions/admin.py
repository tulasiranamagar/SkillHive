from django.contrib import admin

from .models import (
    Session,
    SessionEnrollment,
    SessionAttendance,
    SessionAttendancePeriod,
)


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "creator",
        "skill",
        "session_type",
        "access_type",
        "price",
        "xp_unlock_cost",
        "status",
        "scheduled_at",
        "duration_minutes",
        "participant",
        "created_at",
    )

    list_filter = (
        "session_type",
        "access_type",
        "status",
        "created_at",
    )

    search_fields = (
        "title",
        "description",
        "creator__username",
        "participant__username",
        "skill__name",
    )

    ordering = ("scheduled_at",)

    readonly_fields = (
        "meeting_url",
        "created_at",
        "updated_at",
    )


@admin.register(SessionEnrollment)
class SessionEnrollmentAdmin(admin.ModelAdmin):
    list_display = (
        "session",
        "user",
        "access_method",
        "enrolled_at",
    )

    list_filter = (
        "access_method",
        "enrolled_at",
    )

    search_fields = (
        "session__title",
        "user__username",
    )

    ordering = ("-enrolled_at",)


@admin.register(SessionAttendance)
class SessionAttendanceAdmin(admin.ModelAdmin):
    list_display = (
        "session",
        "user",
        "total_duration_seconds",
        "attendance_verified",
        "xp_awarded",
        "created_at",
        "updated_at",
    )

    list_filter = (
        "attendance_verified",
        "xp_awarded",
        "created_at",
    )

    search_fields = (
        "session__title",
        "user__username",
    )

    ordering = ("-created_at",)


@admin.register(SessionAttendancePeriod)
class SessionAttendancePeriodAdmin(admin.ModelAdmin):
    list_display = (
        "attendance",
        "joined_at",
        "left_at",
        "duration_seconds",
        "status",
    )

    list_filter = (
        "status",
        "joined_at",
    )

    search_fields = (
        "attendance__session__title",
        "attendance__user__username",
    )

    ordering = ("-joined_at",)