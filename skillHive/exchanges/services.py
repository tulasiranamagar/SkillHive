from django.db import transaction

from rest_framework.exceptions import PermissionDenied, ValidationError

from gamification.services import award_xp
from notifications.services import create_notification

from .models import ExchangePost, ExchangeRequest


def create_exchange_post(
    user,
    *,
    title,
    description="",
    offered_skill_name,
    requested_skill_name,
    scheduled_at,
    duration_minutes=60,
):
    offered = str(
        offered_skill_name or ""
    ).strip()

    requested = str(
        requested_skill_name or ""
    ).strip()

    if not offered:
        raise ValidationError(
            "Please enter the skill you want to share."
        )

    if not requested:
        raise ValidationError(
            "Please enter the skill you want to learn."
        )

    if offered.casefold() == requested.casefold():
        raise ValidationError(
            "Offered and requested skills must be different."
        )

    clean_title = str(title or "").strip()

    if not clean_title:
        raise ValidationError(
            "Title cannot be empty."
        )

    if len(clean_title) > 200:
        raise ValidationError(
            "Title cannot exceed 200 characters."
        )

    return ExchangePost.objects.create(
        creator=user,
        title=clean_title,
        description=str(description or "").strip(),
        offered_skill_name=offered,
        requested_skill_name=requested,
        scheduled_at=scheduled_at,
        duration_minutes=duration_minutes,
    )


def update_exchange_post(
    user,
    post,
    *,
    title=None,
    description=None,
    offered_skill_name=None,
    requested_skill_name=None,
    scheduled_at=None,
    duration_minutes=None,
):
    if post.creator_id != user.id:
        raise PermissionDenied(
            "Only the exchange creator can modify this exchange."
        )

    if post.status != ExchangePost.STATUS_OPEN:
        raise ValidationError(
            "Only an open exchange can be modified."
        )

    new_offered = (
        str(offered_skill_name).strip()
        if offered_skill_name is not None
        else post.offered_skill_name
    )

    new_requested = (
        str(requested_skill_name).strip()
        if requested_skill_name is not None
        else post.requested_skill_name
    )

    if not new_offered:
        raise ValidationError(
            "Please enter the skill you want to share."
        )

    if not new_requested:
        raise ValidationError(
            "Please enter the skill you want to learn."
        )

    if new_offered.casefold() == new_requested.casefold():
        raise ValidationError(
            "Offered and requested skills must be different."
        )

    if title is not None:
        clean_title = str(title).strip()

        if not clean_title:
            raise ValidationError(
                "Title cannot be empty."
            )

        if len(clean_title) > 200:
            raise ValidationError(
                "Title cannot exceed 200 characters."
            )

        post.title = clean_title

    if description is not None:
        post.description = str(
            description or ""
        ).strip()

    if offered_skill_name is not None:
        post.offered_skill_name = new_offered

    if requested_skill_name is not None:
        post.requested_skill_name = new_requested

    if scheduled_at is not None:
        post.scheduled_at = scheduled_at

    if duration_minutes is not None:
        post.duration_minutes = duration_minutes

    post.save()

    return post


def cancel_exchange_post(user, post):
    if post.creator_id != user.id:
        raise PermissionDenied(
            "Only the exchange creator can cancel this exchange."
        )

    if post.status == ExchangePost.STATUS_CANCELLED:
        raise ValidationError(
            "This exchange is already cancelled."
        )

    if post.status == ExchangePost.STATUS_CLOSED:
        raise ValidationError(
            "This exchange has already been accepted."
        )

    post.status = ExchangePost.STATUS_CANCELLED

    post.save(
        update_fields=[
            "status",
            "updated_at",
        ]
    )

    return post


@transaction.atomic
def send_exchange_request(
    user,
    post,
    message="",
):
    post = (
        ExchangePost.objects
        .select_for_update()
        .select_related("creator")
        .get(pk=post.pk)
    )

    if post.creator_id == user.id:
        raise ValidationError(
            "You cannot request your own exchange post."
        )

    if post.status != ExchangePost.STATUS_OPEN:
        raise ValidationError(
            "This exchange post is not open."
        )

    existing = (
        ExchangeRequest.objects
        .select_for_update()
        .filter(
            post=post,
            requester=user,
        )
        .first()
    )

    if existing:
        if existing.status not in {
            ExchangeRequest.STATUS_REJECTED,
            ExchangeRequest.STATUS_CANCELLED,
        }:
            raise ValidationError(
                "You already have an active request for this exchange."
            )

        existing.status = ExchangeRequest.STATUS_PENDING
        existing.message = str(message or "")

        existing.save(
            update_fields=[
                "status",
                "message",
                "updated_at",
            ]
        )

        exchange_request = existing

    else:
        exchange_request = ExchangeRequest.objects.create(
            post=post,
            requester=user,
            recipient=post.creator,
            message=str(message or ""),
            status=ExchangeRequest.STATUS_PENDING,
        )

    create_notification(
        post.creator,
        "exchange_request",
        (
            f"{user.username} sent an exchange request "
            f"for '{post.title}'."
        ),
    )

    return exchange_request


@transaction.atomic
def accept_exchange_request(
    exchange,
    user,
):
    exchange = (
        ExchangeRequest.objects
        .select_for_update()
        .select_related(
            "post",
            "requester",
            "recipient",
        )
        .get(pk=exchange.pk)
    )

    if exchange.recipient_id != user.id:
        raise PermissionDenied(
            "Only the exchange creator can accept this request."
        )

    if exchange.status != ExchangeRequest.STATUS_PENDING:
        raise ValidationError(
            "Only pending requests can be accepted."
        )

    post = (
        ExchangePost.objects
        .select_for_update()
        .select_related("creator")
        .get(pk=exchange.post_id)
    )

    if post.status != ExchangePost.STATUS_OPEN:
        raise ValidationError(
            "This exchange is no longer open."
        )

    from skill_sessions.services import create_session

    # Create the SkillHive session immediately when the
    # exchange request is accepted.
    
    # The session service is responsible for creating the
    # meeting room URL. The scheduled_at value is only the
    # scheduled time; it does not delay room creation.
    session = create_session(
        creator=post.creator,
        participant=exchange.requester,
        exchange_post=post,
        skill=None,
        skill_name=post.offered_skill_name,
        title=post.title,
        description=post.description,
        scheduled_at=post.scheduled_at,
        duration_minutes=post.duration_minutes,
        session_type="one_to_one",
        access_type="free",
        price=0,
        xp_unlock_cost=0,
        max_participants=2,
    )

    exchange.status = ExchangeRequest.STATUS_ACCEPTED

    exchange.save(
        update_fields=[
            "status",
            "updated_at",
        ]
    )

    post.status = ExchangePost.STATUS_CLOSED

    post.save(
        update_fields=[
            "status",
            "updated_at",
        ]
    )

    # Award XP to the requester after the exchange is accepted.
    award_xp(
        user=exchange.requester,
        event_type="exchange_accepted",
        event_id=exchange.id,
    )

    # Notify the requester that the exchange was accepted.
    create_notification(
        exchange.requester,
        "exchange_accepted",
        (
            f"Your exchange request for "
            f"'{post.title}' was accepted. "
            f"Your skill session has been created."
        ),
    )

    # Notify the requester that the session exists.
    create_notification(
        exchange.requester,
        "session",
        (
            f"Your exchange session '{session.title}' "
            f"has been created and is scheduled for "
            f"{session.scheduled_at}."
        ),
    )

    return exchange


@transaction.atomic
def reject_exchange_request(
    exchange,
    user,
):
    exchange = (
        ExchangeRequest.objects
        .select_for_update()
        .select_related("post")
        .get(pk=exchange.pk)
    )

    if exchange.recipient_id != user.id:
        raise PermissionDenied(
            "Only the exchange creator can reject this request."
        )

    if exchange.status != ExchangeRequest.STATUS_PENDING:
        raise ValidationError(
            "Only pending requests can be rejected."
        )

    exchange.status = ExchangeRequest.STATUS_REJECTED

    exchange.save(
        update_fields=[
            "status",
            "updated_at",
        ]
    )

    create_notification(
        exchange.requester,
        "exchange_rejected",
        (
            f"Your exchange request for "
            f"'{exchange.post.title}' was rejected."
        ),
    )

    return exchange


@transaction.atomic
def cancel_exchange_request(
    exchange,
    user,
):
    exchange = (
        ExchangeRequest.objects
        .select_for_update()
        .get(pk=exchange.pk)
    )

    if exchange.requester_id != user.id:
        raise PermissionDenied(
            "Only the requester can cancel this request."
        )

    if exchange.status != ExchangeRequest.STATUS_PENDING:
        raise ValidationError(
            "Only pending requests can be cancelled."
        )

    exchange.status = ExchangeRequest.STATUS_CANCELLED

    exchange.save(
        update_fields=[
            "status",
            "updated_at",
        ]
    )

    return exchange