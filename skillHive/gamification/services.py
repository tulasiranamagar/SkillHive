from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Sum
from rest_framework.exceptions import ValidationError

from .models import Badge, UserBadge, XPTransaction


XP_REWARDS = {
    "learning_activity_completed": 5,
    "learning_question_answered": 2,
    "learning_question_correct": 3,
    "session_attended": 8,
    "practical_task_completed": 7,
    "assessment_passed": 10,
    "roadmap_task_completed": 8,
    "certificate_earned": 9,
    "exchange_accepted": 6,
}


def calculate_level(total_xp):
    """
    Calculate SkillHive level from total XP.

    Every 100 positive XP = one additional level.
    Level starts at 1.
    """

    total_xp = max(int(total_xp or 0), 0)

    return (total_xp // 100) + 1


def get_total_xp(user):
    """
    Return the user's current XP balance.

    XP transactions can contain positive rewards
    and negative spending transactions.
    """

    total_xp = (
        XPTransaction.objects
        .filter(user=user)
        .aggregate(total=Sum("points"))
        ["total"]
    )

    return int(total_xp or 0)


def get_user_level(user):
    """
    Return the user's calculated level.
    """

    return calculate_level(
        get_total_xp(user)
    )


def award_eligible_badges(user, total_xp=None):
    """
    Award every active badge whose XP requirement
    has been reached.

    Existing badges are never duplicated.
    """

    if total_xp is None:
        total_xp = get_total_xp(user)

    existing_badge_ids = set(
        UserBadge.objects
        .filter(user=user)
        .values_list("badge_id", flat=True)
    )

    eligible_badges = (
        Badge.objects
        .filter(
            is_active=True,
            required_xp__lte=total_xp,
        )
        .exclude(
            id__in=existing_badge_ids
        )
        .order_by(
            "required_xp",
            "id",
        )
    )

    new_badges = []

    for badge in eligible_badges:
        user_badge, created = UserBadge.objects.get_or_create(
            user=user,
            badge=badge,
        )

        if created:
            new_badges.append(user_badge)

    return new_badges


@transaction.atomic
def award_xp(user, event_type, event_id):
    """
    Award XP for a unique SkillHive event.

    The same event cannot award XP twice for the
    same user.

    Example:

        award_xp(
            user,
            "assessment_passed",
            assessment_id,
        )
    """

    if not isinstance(user, User):
        raise ValidationError(
            "A valid user is required."
        )

    if not user.is_authenticated:
        raise ValidationError(
            "Authenticated user is required."
        )

    if not user.is_active:
        raise ValidationError(
            "Inactive users cannot receive XP."
        )

    if event_type not in XP_REWARDS:
        raise ValidationError(
            "Unknown XP event."
        )

    if event_id is None or str(event_id).strip() == "":
        raise ValidationError(
            "Event ID is required."
        )

    event_key = f"{event_type}:{event_id}"

    # Lock the user row so two simultaneous requests
    # cannot award the same event at the same time.
    locked_user = (
        User.objects
        .select_for_update()
        .get(pk=user.pk)
    )

    existing_transaction = (
        XPTransaction.objects
        .filter(
            user=locked_user,
            event_key=event_key,
        )
        .first()
    )

    if existing_transaction:
        return existing_transaction

    transaction_record = XPTransaction.objects.create(
        user=locked_user,
        points=XP_REWARDS[event_type],
        reason=event_type,
        event_key=event_key,
    )

    total_xp = get_total_xp(locked_user)

    award_eligible_badges(
        locked_user,
        total_xp=total_xp,
    )

    return transaction_record


@transaction.atomic
def spend_xp(user, amount, reason, event_id):
    """
    Spend XP for a unique event.

    Spending creates a negative XP transaction.

    The same spending event cannot be processed twice.
    """

    if not isinstance(user, User):
        raise ValidationError(
            "A valid user is required."
        )

    if not user.is_authenticated:
        raise ValidationError(
            "Authenticated user is required."
        )

    if not user.is_active:
        raise ValidationError(
            "Inactive users cannot spend XP."
        )

    try:
        amount = int(amount)
    except (TypeError, ValueError):
        raise ValidationError(
            "XP amount must be a valid integer."
        )

    if amount <= 0:
        raise ValidationError(
            "XP amount must be positive."
        )

    if not reason or not str(reason).strip():
        raise ValidationError(
            "A spending reason is required."
        )

    if event_id is None or str(event_id).strip() == "":
        raise ValidationError(
            "Event ID is required."
        )

    event_key = f"xp_spend:{reason}:{event_id}"

    # Lock user while checking the balance and creating
    # the spending transaction.
    locked_user = (
        User.objects
        .select_for_update()
        .get(pk=user.pk)
    )

    existing_transaction = (
        XPTransaction.objects
        .filter(
            user=locked_user,
            event_key=event_key,
        )
        .first()
    )

    if existing_transaction:
        return existing_transaction

    total_xp = get_total_xp(
        locked_user
    )

    if total_xp < amount:
        raise ValidationError(
            "Insufficient XP."
        )

    return XPTransaction.objects.create(
        user=locked_user,
        points=-amount,
        reason=str(reason).strip(),
        event_key=event_key,
    )