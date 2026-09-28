from django.contrib import admin

from .models import (
    MarketplaceContent,
    MarketplaceContentUnlock,
    MarketplaceReview,
)


@admin.register(MarketplaceContent)
class MarketplaceContentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "creator",
        "content_type",
        "unlock_type",
        "view_count",
        "fee_due",
        "is_active",
        "created_at",
    )
    list_filter = (
        "content_type",
        "unlock_type",
        "fee_due",
        "is_active",
    )
    search_fields = (
        "title",
        "description",
        "creator__username",
        "creator__email",
    )
    readonly_fields = (
        "view_count",
        "fee_due",
        "created_at",
        "updated_at",
    )


@admin.register(MarketplaceContentUnlock)
class MarketplaceContentUnlockAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "content",
        "user",
        "unlock_method",
        "amount_paid",
        "xp_spent",
        "unlocked_at",
    )
    list_filter = ("unlock_method",)
    search_fields = (
        "content__title",
        "user__username",
        "user__email",
    )
    readonly_fields = ("unlocked_at",)


@admin.register(MarketplaceReview)
class MarketplaceReviewAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "content",
        "reviewer",
        "rating",
        "created_at",
    )
    list_filter = ("rating",)
    search_fields = (
        "content__title",
        "reviewer__username",
        "reviewer__email",
    )
    readonly_fields = ("created_at",)