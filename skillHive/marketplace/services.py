from django.db import transaction
from django.db.models import F

from rest_framework.exceptions import PermissionDenied, ValidationError

from gamification.services import get_total_xp, spend_xp

from .models import (
    MarketplaceContent,
    MarketplaceContentUnlock,
    MarketplaceReview,
)


class MarketplaceServiceError(Exception):
    pass


def can_access_content(user, content):
    if content.unlock_type == MarketplaceContent.UNLOCK_FREE:
        return True

    if not user or not user.is_authenticated:
        return False

    if content.creator_id == user.id:
        return True

    return MarketplaceContentUnlock.objects.filter(
        content=content,
        user=user,
    ).exists()


@transaction.atomic
def increment_content_view(content):
    """
    Increment the content view count safely.

    Once content reaches 50 views, fee_due becomes True.
    The content remains active so users can continue
    accessing it until the creator/admin handles the fee.
    """

    if not content.is_active:
        return content

    updated = (
        MarketplaceContent.objects
        .filter(
            pk=content.pk,
            is_active=True,
        )
        .update(
            view_count=F("view_count") + 1,
        )
    )

    if not updated:
        return content

    content.refresh_from_db(
        fields=[
            "view_count",
            "fee_due",
            "is_active",
        ]
    )

    if content.view_count >= 50 and not content.fee_due:
        MarketplaceContent.objects.filter(
            pk=content.pk,
        ).update(
            fee_due=True,
        )

        content.fee_due = True

    return content


def validate_unlock_method(content, method):
    if method == MarketplaceContentUnlock.METHOD_MONEY:
        if content.unlock_type not in (
            MarketplaceContent.UNLOCK_MONEY,
            MarketplaceContent.UNLOCK_MONEY_OR_XP,
        ):
            raise ValidationError(
                "Money is not a valid unlock method for this content."
            )

    elif method == MarketplaceContentUnlock.METHOD_XP:
        if content.unlock_type not in (
            MarketplaceContent.UNLOCK_XP,
            MarketplaceContent.UNLOCK_MONEY_OR_XP,
        ):
            raise ValidationError(
                "XP is not a valid unlock method for this content."
            )

    else:
        raise ValidationError(
            "Invalid unlock method."
        )


@transaction.atomic
def unlock_content(user, content_id, method):
    content = (
        MarketplaceContent.objects
        .select_for_update()
        .get(
            pk=content_id,
            is_active=True,
        )
    )

    if content.creator_id == user.id:
        return {
            "content": content,
            "unlocked": True,
            "created": False,
        }

    if content.unlock_type == MarketplaceContent.UNLOCK_FREE:
        return {
            "content": content,
            "unlocked": True,
            "created": False,
        }

    existing = (
        MarketplaceContentUnlock.objects
        .filter(
            content=content,
            user=user,
        )
        .first()
    )

    if existing:
        return {
            "content": content,
            "unlocked": True,
            "created": False,
        }

    validate_unlock_method(
        content,
        method,
    )

    if method == MarketplaceContentUnlock.METHOD_MONEY:
        # Actual payment processing belongs to the payment integration.
        # No fake successful payment is created here.
        raise ValidationError(
            {
                "detail": "Money unlock requires a payment provider.",
                "amount": str(content.price),
            }
        )

    if content.xp_unlock_cost <= 0:
        raise ValidationError(
            "This content does not have a valid XP unlock cost."
        )

    # Check the balance before attempting to spend.
    # spend_xp() performs the same check atomically,
    # but this lets us return a useful message containing
    # the user's current and required XP.
    current_xp = get_total_xp(user)
    required_xp = content.xp_unlock_cost

    if current_xp < required_xp:
        shortage = required_xp - current_xp

        raise ValidationError(
            {
                "detail": (
                    f"Insufficient XP. "
                    f"You have {current_xp} XP, "
                    f"but {required_xp} XP is required. "
                    f"You need {shortage} more XP."
                ),
                "current_xp": current_xp,
                "required_xp": required_xp,
                "xp_shortage": shortage,
            }
        )

    spend_xp(
        user=user,
        amount=required_xp,
        reason="marketplace_content_unlock",
        event_id=content.id,
    )

    unlock = MarketplaceContentUnlock.objects.create(
        content=content,
        user=user,
        unlock_method=MarketplaceContentUnlock.METHOD_XP,
        xp_spent=required_xp,
        amount_paid=0,
    )

    return {
        "content": content,
        "unlocked": True,
        "created": True,
        "unlock": unlock,
    }


def create_review(user, content, rating, comment=""):
    if content.creator_id == user.id:
        raise PermissionDenied(
            "You cannot review your own content."
        )

    if not can_access_content(user, content):
        raise PermissionDenied(
            "Unlock or access the content before reviewing it."
        )

    if MarketplaceReview.objects.filter(
        content=content,
        reviewer=user,
    ).exists():
        raise ValidationError(
            "You have already reviewed this content."
        )

    return MarketplaceReview.objects.create(
        content=content,
        reviewer=user,
        rating=rating,
        comment=comment,
    )

