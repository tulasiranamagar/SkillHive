from decimal import Decimal

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import models


class MarketplaceContent(models.Model):
    TYPE_VIDEO = "VIDEO"
    TYPE_FILE = "FILE"
    TYPE_IMAGE = "IMAGE"

    CONTENT_TYPES = (
        (TYPE_VIDEO, "Video"),
        (TYPE_FILE, "File"),
        (TYPE_IMAGE, "Image"),
    )

    UNLOCK_FREE = "FREE"
    UNLOCK_MONEY = "MONEY"
    UNLOCK_XP = "XP"
    UNLOCK_MONEY_OR_XP = "MONEY_OR_XP"

    UNLOCK_TYPES = (
        (UNLOCK_FREE, "Free"),
        (UNLOCK_MONEY, "Money"),
        (UNLOCK_XP, "XP"),
        (UNLOCK_MONEY_OR_XP, "Money or XP"),
    )

    creator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="marketplace_contents",
    )

    title = models.CharField(max_length=200)

    description = models.TextField(blank=True)

    content_type = models.CharField(
        max_length=20,
        choices=CONTENT_TYPES,
    )

    unlock_type = models.CharField(
        max_length=20,
        choices=UNLOCK_TYPES,
        default=UNLOCK_FREE,
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    xp_unlock_cost = models.PositiveIntegerField(default=0)

    video_url = models.URLField(
        blank=True,
    )

    content_file = models.FileField(
        upload_to="marketplace/content/",
        blank=True,
        null=True,
    )

    content_image = models.ImageField(
        upload_to="marketplace/images/",
        blank=True,
        null=True,
    )

    view_count = models.PositiveIntegerField(default=0)

    fee_due = models.BooleanField(default=False)

    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["creator", "is_active"],
                name="mc_content_creator_active_idx",
            ),
            models.Index(
                fields=["is_active", "created_at"],
                name="mc_content_active_created_idx",
            ),
            models.Index(
                fields=["content_type", "is_active"],
                name="market_content_type_active_idx",
            ),
            models.Index(
                fields=["unlock_type", "is_active"],
                name="mc_content_unlock_active_idx",
            ),
        ]

    def clean(self):
        if self.price < Decimal("0.00"):
            raise ValidationError(
                {"price": "Price cannot be negative."}
            )

        if self.xp_unlock_cost < 0:
            raise ValidationError(
                {"xp_unlock_cost": "XP cost cannot be negative."}
            )

        if self.unlock_type == self.UNLOCK_MONEY:
            if self.price <= Decimal("0.00"):
                raise ValidationError(
                    {
                        "price":
                        "Money content must have a positive price."
                    }
                )

        elif self.unlock_type == self.UNLOCK_XP:
            if self.xp_unlock_cost <= 0:
                raise ValidationError(
                    {
                        "xp_unlock_cost":
                        "XP content must have a positive XP cost."
                    }
                )

        elif self.unlock_type == self.UNLOCK_MONEY_OR_XP:
            if self.price <= Decimal("0.00"):
                raise ValidationError(
                    {
                        "price":
                        "Money or XP content must have a positive price."
                    }
                )

            if self.xp_unlock_cost <= 0:
                raise ValidationError(
                    {
                        "xp_unlock_cost":
                        "Money or XP content must have a positive XP cost."
                    }
                )

        if self.content_type == self.TYPE_VIDEO:
            if not self.video_url and not self.content_file:
                raise ValidationError(
                    "Video content must provide a video URL or video file."
                )

        elif self.content_type == self.TYPE_FILE:
            if not self.content_file:
                raise ValidationError(
                    "File content must provide a file."
                )

        elif self.content_type == self.TYPE_IMAGE:
            if not self.content_image:
                raise ValidationError(
                    "Image content must provide an image."
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class MarketplaceContentUnlock(models.Model):
    METHOD_MONEY = "MONEY"
    METHOD_XP = "XP"

    UNLOCK_METHODS = (
        (METHOD_MONEY, "Money"),
        (METHOD_XP, "XP"),
    )

    content = models.ForeignKey(
        MarketplaceContent,
        on_delete=models.CASCADE,
        related_name="unlocks",
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="marketplace_unlocks",
    )

    unlock_method = models.CharField(
        max_length=10,
        choices=UNLOCK_METHODS,
    )

    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    xp_spent = models.PositiveIntegerField(default=0)

    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-unlocked_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["content", "user"],
                name="unique_content_user_unlock",
            )
        ]

        indexes = [
            models.Index(
                fields=["user", "unlocked_at"],
                name="market_unlock_user_date_idx",
            ),
            models.Index(
                fields=["content", "unlocked_at"],
                name="market_unlock_content_date_idx",
            ),
        ]

    def clean(self):
        if self.amount_paid < Decimal("0.00"):
            raise ValidationError(
                {"amount_paid": "Amount paid cannot be negative."}
            )

        if self.unlock_method == self.METHOD_XP:
            if self.xp_spent <= 0:
                raise ValidationError(
                    {"xp_spent": "XP spent must be positive."}
                )

        if self.unlock_method == self.METHOD_MONEY:
            if self.amount_paid <= Decimal("0.00"):
                raise ValidationError(
                    {
                        "amount_paid":
                        "Money unlock must have a positive payment."
                    }
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class MarketplaceReview(models.Model):
    content = models.ForeignKey(
        MarketplaceContent,
        on_delete=models.CASCADE,
        related_name="reviews",
    )

    reviewer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="marketplace_reviews",
    )

    rating = models.PositiveSmallIntegerField()

    comment = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["content", "reviewer"],
                name="unique_content_reviewer",
            )
        ]

        indexes = [
            models.Index(
                fields=["content", "created_at"],
                name="market_review_content_idx",
            ),
            models.Index(
                fields=["reviewer", "created_at"],
                name="market_review_user_idx",
            ),
            models.Index(
                fields=["rating", "created_at"],
                name="market_review_rating_idx",
            ),
        ]

    def clean(self):
        if not 1 <= self.rating <= 5:
            raise ValidationError(
                {"rating": "Rating must be between 1 and 5."}
            )

        if self.content_id and self.content.creator_id == self.reviewer_id:
            raise ValidationError(
                "You cannot review your own content."
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)