from django.contrib import admin

from .models import Follow, Profile, VerificationRequest


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "role",
        "is_verified",
        "is_active",
        "onboarding_completed",
        "onboarding_skipped",
        "deactivation_scheduled_for",
        "country",
        "city",
        "created_at",
    )

    list_filter = (
        "role",
        "is_verified",
        "is_active",
        "onboarding_completed",
        "onboarding_skipped",
    )

    search_fields = (
        "user__username",
        "user__email",
        "user__first_name",
        "user__last_name",
        "country",
        "city",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
        "verification_requested_at",
        "verification_approved_at",
        "onboarding_completed_at",
        "deactivation_requested_at",
        "deactivation_scheduled_for",
    )


@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = (
        "follower",
        "following",
        "created_at",
    )

    search_fields = (
        "follower__username",
        "following__username",
    )

    readonly_fields = (
        "created_at",
    )


@admin.register(VerificationRequest)
class VerificationRequestAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "status",
        "requested_at",
        "reviewed_by",
        "reviewed_at",
    )

    list_filter = (
        "status",
    )

    search_fields = (
        "user__username",
        "user__email",
        "reason",
        "admin_note",
    )

    readonly_fields = (
        "requested_at",
        "reviewed_at",
    )