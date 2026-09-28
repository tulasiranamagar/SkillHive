import secrets
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import (
    Session,
    SessionEnrollment,
    SessionAttendance,
    SessionAttendancePeriod,
)


# Exchange/session users cannot enter before the exact scheduled time.

EARLY_JOIN_MINUTES = 0

HEARTBEAT_GRACE_SECONDS = 90

MAX_SESSION_DURATION_MINUTES = 480

MIN_GROUP_PARTICIPANTS = 2

ATTENDANCE_REQUIRED_RATIO = Decimal("0.5")


def generate_jitsi_meeting_url():
    return (
        f"https://meet.jit.si/"
        f"SkillHive-{secrets.token_urlsafe(18)}"
    )


def _parse_scheduled_at(value):
    if isinstance(value, str):
        value = parse_datetime(value)

    if not value:
        raise ValidationError(
            "A valid scheduled_at value is required."
        )

    if timezone.is_naive(value):
        value = timezone.make_aware(
            value,
            timezone.get_current_timezone(),
        )

    if value <= timezone.now():
        raise ValidationError(
            "scheduled_at must be in the future."
        )

    return value


def _parse_positive_integer(
    value,
    field_name,
    minimum=1,
    maximum=None,
):
    try:
        value = int(value)
    except (TypeError, ValueError):
        raise ValidationError(
            f"{field_name} must be a valid integer."
        )

    if value < minimum:
        raise ValidationError(
            f"{field_name} must be at least {minimum}."
        )

    if maximum is not None and value > maximum:
        raise ValidationError(
            f"{field_name} must be at most {maximum}."
        )

    return value


def validate_access_configuration(
    access_type,
    price=0,
    xp_unlock_cost=0,
):
    if access_type not in dict(Session.ACCESS_TYPE_CHOICES):
        raise ValidationError(
            "Invalid access type."
        )

    try:
        price = Decimal(str(price or 0))
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError(
            "Price must be a valid number."
        )

    try:
        xp = int(xp_unlock_cost or 0)
    except (TypeError, ValueError):
        raise ValidationError(
            "XP cost must be a valid integer."
        )

    if price < 0:
        raise ValidationError(
            "Price cannot be negative."
        )

    if xp < 0:
        raise ValidationError(
            "XP cost cannot be negative."
        )

    if access_type == Session.ACCESS_FREE:
        if price != 0 or xp != 0:
            raise ValidationError(
                "Free sessions cannot have a price or XP cost."
            )

    elif access_type == Session.ACCESS_MONEY:
        if price <= 0:
            raise ValidationError(
                "Money sessions need a positive price."
            )

        if xp != 0:
            raise ValidationError(
                "Money sessions cannot have an XP cost."
            )

    elif access_type == Session.ACCESS_XP:
        if xp <= 0:
            raise ValidationError(
                "XP sessions need a positive XP cost."
            )

        if price != 0:
            raise ValidationError(
                "XP sessions cannot have a money price."
            )

    elif access_type == Session.ACCESS_MONEY_OR_XP:
        if price <= 0 or xp <= 0:
            raise ValidationError(
                "Money OR XP sessions need both costs."
            )

    return price, xp


def _get_exchange_participant(
    *,
    creator,
    participant,
    exchange_post,
):
    """
    Resolve and validate the two users participating in
    an accepted exchange.

    Exchange structure:

        exchange creator <-> accepted requester
    """

    if exchange_post.status != "open":
        raise ValidationError(
            "Only an open exchange can create a session."
        )

    exchange_creator = exchange_post.creator

    if creator.id != exchange_creator.id:
        accepted = exchange_post.requests.filter(
            requester=creator,
            recipient=exchange_creator,
            status="accepted",
        ).exists()

        if not accepted:
            raise PermissionDenied(
                "You are not an accepted participant in this exchange."
            )

        if participant is None:
            participant = exchange_creator

        if participant.id != exchange_creator.id:
            raise ValidationError(
                "An exchange requester can only create a session "
                "with the exchange creator."
            )

    else:
        if participant is None:
            raise ValidationError(
                "An exchange session requires a participant."
            )

        if participant.id == exchange_creator.id:
            raise ValidationError(
                "The exchange creator cannot be their own participant."
            )

        accepted = exchange_post.requests.filter(
            requester=participant,
            recipient=exchange_creator,
            status="pending",
        ).exists()

        # During acceptance the request is still pending when
        # create_session() is called. Therefore pending is valid
        # here. If this function is used independently later,
        # accepted is also accepted.
        if not accepted:
            accepted = exchange_post.requests.filter(
                requester=participant,
                recipient=exchange_creator,
                status="accepted",
            ).exists()

        if not accepted:
            raise ValidationError(
                "The selected participant does not have a valid "
                "request for this exchange."
            )

    if participant is None:
        raise ValidationError(
            "A valid exchange participant is required."
        )

    if participant.id == creator.id:
        raise ValidationError(
            "Creator cannot be their own exchange participant."
        )

    return participant


@transaction.atomic
def create_session(
    *,
    creator,
    skill=None,
    skill_name="",
    title,
    scheduled_at,
    description="",
    session_type=Session.SESSION_ONE_TO_ONE,
    participant=None,
    exchange_post=None,
    access_type=Session.ACCESS_FREE,
    price=0,
    xp_unlock_cost=0,
    max_participants=2,
    duration_minutes=60,
):
    scheduled_at = _parse_scheduled_at(
        scheduled_at
    )

    duration_minutes = _parse_positive_integer(
        duration_minutes,
        "duration_minutes",
        minimum=1,
        maximum=MAX_SESSION_DURATION_MINUTES,
    )

    if session_type not in dict(Session.SESSION_TYPES):
        raise ValidationError(
            "Invalid session type."
        )

    if participant and participant.id == creator.id:
        raise ValidationError(
            "Creator cannot be their own participant."
        )

    clean_skill_name = str(
        skill_name or ""
    ).strip()

    if exchange_post is None and skill is None and not clean_skill_name:
        raise ValidationError(
            "A session must have a skill."
        )

    if session_type == Session.SESSION_ONE_TO_ONE:
        # Total people, including creator.
        max_participants = 2

    else:
        max_participants = _parse_positive_integer(
            max_participants,
            "max_participants",
            minimum=MIN_GROUP_PARTICIPANTS,
        )

        if participant is not None:
            raise ValidationError(
                "Group sessions do not use a direct participant."
            )

    if exchange_post is not None:
        participant = _get_exchange_participant(
            creator=creator,
            participant=participant,
            exchange_post=exchange_post,
        )


        clean_skill_name = (
            exchange_post.offered_skill_name.strip()
        )

        if not clean_skill_name:
            raise ValidationError(
                "The exchange must have an offered skill."
            )

        skill = None

        session_type = Session.SESSION_ONE_TO_ONE
        max_participants = 2


        access_type = Session.ACCESS_FREE
        price = 0
        xp_unlock_cost = 0

    price, xp_unlock_cost = validate_access_configuration(
        access_type=access_type,
        price=price,
        xp_unlock_cost=xp_unlock_cost,
    )

    clean_title = (
        str(title).strip()
        if title
        else "SkillHive Session"
    )

    if not clean_title:
        raise ValidationError(
            "Title cannot be empty."
        )

    if len(clean_title) > 255:
        raise ValidationError(
            "Title cannot exceed 255 characters."
        )

    session = Session.objects.create(
        creator=creator,
        participant=participant,
        skill=skill,
        skill_name=clean_skill_name,
        exchange_post=exchange_post,
        title=clean_title,
        description=description or "",
        session_type=session_type,
        access_type=access_type,
        price=price,
        xp_unlock_cost=xp_unlock_cost,
        max_participants=max_participants,
        scheduled_at=scheduled_at,
        duration_minutes=duration_minutes,
        meeting_url=generate_jitsi_meeting_url(),
    )

    # Creator always occupies one seat.
    SessionEnrollment.objects.create(
        session=session,
        user=creator,
        access_method=SessionEnrollment.ACCESS_FREE,
    )

    # Exchange sessions automatically enroll the accepted
    # requester.

    # Direct free one-to-one sessions also automatically
    # enroll their designated participant.
    
    if participant and (
        exchange_post is not None
        or access_type == Session.ACCESS_FREE
    ):
        SessionEnrollment.objects.create(
            session=session,
            user=participant,
            access_method=SessionEnrollment.ACCESS_FREE,
        )

    return session


def get_session_end_time(session):
    return session.scheduled_at + timedelta(
        minutes=session.duration_minutes
    )


def get_early_join_time(session):
    return session.scheduled_at


def get_session_state(session):
    """
    Session state is determined from the current time.

    Before scheduled_at:
        scheduled

    scheduled_at <= now < end:
        active

    now >= end:
        ended
    """

    now = timezone.now()

    if session.status == Session.STATUS_CANCELLED:
        return "cancelled"

    if session.status == Session.STATUS_COMPLETED:
        return "completed"

    if now < get_early_join_time(session):
        return "scheduled"

    if now < get_session_end_time(session):
        return "active"

    return "ended"


def _is_member(session, user):
    return (
        session.creator_id == user.id
        or session.enrollments.filter(
            user=user
        ).exists()
    )


@transaction.atomic
def start_session(session, user):
    session = Session.objects.select_for_update().get(
        pk=session.pk
    )

    if session.creator_id != user.id:
        raise PermissionDenied(
            "Only the creator can start the session."
        )

    if session.status != Session.STATUS_SCHEDULED:
        raise ValidationError(
            "Only scheduled sessions can be started."
        )

    if get_session_state(session) not in {
        "active",
    }:
        raise ValidationError(
            "The session can only be started at its scheduled time."
        )

    session.status = Session.STATUS_ACTIVE

    session.save(
        update_fields=[
            "status",
            "updated_at",
        ]
    )

    return session


@transaction.atomic
def end_session(session, user):
    session = Session.objects.select_for_update().get(
        pk=session.pk
    )

    if session.creator_id != user.id:
        raise PermissionDenied(
            "Only the creator can end the session."
        )

    if session.status not in {
        Session.STATUS_ACTIVE,
        Session.STATUS_SCHEDULED,
    }:
        raise ValidationError(
            "The session is already finished."
        )

    state = get_session_state(session)

    if state not in {
        "active",
        "ended",
    }:
        raise ValidationError(
            "A session cannot be ended before it starts."
        )

    session.status = Session.STATUS_COMPLETED

    session.save(
        update_fields=[
            "status",
            "updated_at",
        ]
    )

    _finalize_attendance(session)

    return session


@transaction.atomic
def cancel_session(session, user):
    session = Session.objects.select_for_update().get(
        pk=session.pk
    )

    if session.creator_id != user.id:
        raise PermissionDenied(
            "Only the creator can cancel the session."
        )

    if session.status in {
        Session.STATUS_COMPLETED,
        Session.STATUS_CANCELLED,
    }:
        raise ValidationError(
            "The session is already finished."
        )

    session.status = Session.STATUS_CANCELLED

    session.save(
        update_fields=[
            "status",
            "updated_at",
        ]
    )

    _finalize_attendance(session)

    return session


@transaction.atomic
def update_session(
    session,
    user,
    *,
    title=None,
    description=None,
    scheduled_at=None,
    duration_minutes=None,
    max_participants=None,
):
    session = Session.objects.select_for_update().get(
        pk=session.pk
    )

    if session.creator_id != user.id:
        raise PermissionDenied(
            "Only the creator can edit the session."
        )

    if session.status in {
        Session.STATUS_COMPLETED,
        Session.STATUS_CANCELLED,
    }:
        raise ValidationError(
            "Finished sessions cannot be edited."
        )

    if session.status == Session.STATUS_ACTIVE:
        if (
            scheduled_at is not None
            or duration_minutes is not None
            or max_participants is not None
        ):
            raise ValidationError(
                "Schedule, duration, and capacity cannot be "
                "changed after the session starts."
            )

    update_fields = []

    if title is not None:
        title = str(title).strip()

        if not title:
            raise ValidationError(
                "Title cannot be empty."
            )

        if len(title) > 255:
            raise ValidationError(
                "Title cannot exceed 255 characters."
            )

        session.title = title
        update_fields.append("title")

    if description is not None:
        session.description = description or ""
        update_fields.append("description")

    if scheduled_at is not None:
        session.scheduled_at = _parse_scheduled_at(
            scheduled_at
        )
        update_fields.append("scheduled_at")

    if duration_minutes is not None:
        session.duration_minutes = _parse_positive_integer(
            duration_minutes,
            "duration_minutes",
            minimum=1,
            maximum=MAX_SESSION_DURATION_MINUTES,
        )
        update_fields.append("duration_minutes")

    if max_participants is not None:
        if session.session_type == Session.SESSION_ONE_TO_ONE:
            max_participants = 2
        else:
            max_participants = _parse_positive_integer(
                max_participants,
                "max_participants",
                minimum=MIN_GROUP_PARTICIPANTS,
            )

        enrolled_count = session.enrollments.count()

        if max_participants < enrolled_count:
            raise ValidationError(
                "Maximum participants cannot be lower "
                "than the current enrollment count."
            )

        session.max_participants = max_participants
        update_fields.append("max_participants")

    if update_fields:
        update_fields.append("updated_at")

        session.save(
            update_fields=update_fields
        )

    return session


@transaction.atomic
def enroll_session(session, user, method):
    session = Session.objects.select_for_update().get(
        pk=session.pk
    )

    if session.status in {
        Session.STATUS_COMPLETED,
        Session.STATUS_CANCELLED,
    }:
        raise ValidationError(
            "This session is no longer available."
        )

    state = get_session_state(session)

    if state in {
        "active",
        "ended",
        "completed",
        "cancelled",
    }:
        raise ValidationError(
            "Enrollment is closed because the session has started."
        )

    existing = session.enrollments.filter(
        user=user
    ).first()

    if existing:
        return existing

    enrolled_count = session.enrollments.count()

    if enrolled_count >= session.max_participants:
        raise ValidationError(
            "This session is full."
        )

    if (
        session.session_type == Session.SESSION_ONE_TO_ONE
        and session.participant_id is not None
        and session.participant_id != user.id
    ):
        raise PermissionDenied(
            "This one-to-one session is reserved for "
            "the designated participant."
        )

    if method == SessionEnrollment.ACCESS_FREE:
        if session.access_type != Session.ACCESS_FREE:
            raise ValidationError(
                "This session is not free."
            )

    elif method == SessionEnrollment.ACCESS_XP:
        if session.access_type not in {
            Session.ACCESS_XP,
            Session.ACCESS_MONEY_OR_XP,
        }:
            raise ValidationError(
                "XP is not a valid access method."
            )

        if session.xp_unlock_cost <= 0:
            raise ValidationError(
                "This session does not have a valid XP cost."
            )

        from gamification.services import spend_xp

        spend_xp(
            user=user,
            amount=session.xp_unlock_cost,
            reason="session_unlock",
            event_id=session.id,
        )

    elif method == SessionEnrollment.ACCESS_MONEY:
        raise ValidationError(
            "Money enrollment requires a payment provider."
        )

    else:
        raise ValidationError(
            "Invalid enrollment method."
        )

    enrollment = SessionEnrollment.objects.create(
        session=session,
        user=user,
        access_method=method,
    )

    if (
        session.session_type == Session.SESSION_ONE_TO_ONE
        and session.participant_id is None
    ):
        session.participant = user

        session.save(
            update_fields=[
                "participant",
                "updated_at",
            ]
        )

    return enrollment


@transaction.atomic
def leave_session(session, user):
    session = Session.objects.select_for_update().get(
        pk=session.pk
    )

    if session.creator_id == user.id:
        raise ValidationError(
            "The creator cannot leave their own session; "
            "cancel it instead."
        )

    enrollment = SessionEnrollment.objects.filter(
        session=session,
        user=user,
    ).first()

    if not enrollment:
        raise ValidationError(
            "You are not enrolled."
        )

    enrollment.delete()

    return session


@transaction.atomic
def join_attendance(session, user):
    """
    Start attendance at the exact scheduled time.

    The backend automatically changes a scheduled session
    to ACTIVE when the scheduled time has arrived.

    Before the scheduled time:
        joining is rejected.

    At/after scheduled time and before end:
        attendance can start.

    After session end:
        joining is rejected.
    """

    session = Session.objects.select_for_update().get(
        pk=session.pk
    )

    if not _is_member(session, user):
        raise PermissionDenied(
            "You must be enrolled to attend."
        )

    if session.status == Session.STATUS_CANCELLED:
        raise ValidationError(
            "The session has been cancelled."
        )

    if session.status == Session.STATUS_COMPLETED:
        raise ValidationError(
            "The session has already been completed."
        )

    state = get_session_state(session)

    if state == "scheduled":
        raise ValidationError(
            "The session has not started yet. "
            "You can join at the scheduled time."
        )

    if state == "ended":
        raise ValidationError(
            "The session has already ended."
        )

    if session.status == Session.STATUS_SCHEDULED:
        session.status = Session.STATUS_ACTIVE

        session.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

    if session.status != Session.STATUS_ACTIVE:
        raise ValidationError(
            "The session is not active."
        )

    attendance, _ = SessionAttendance.objects.get_or_create(
        session=session,
        user=user,
    )

    active_period = attendance.periods.filter(
        status=SessionAttendancePeriod.STATUS_ACTIVE
    ).first()

    now = timezone.now()

    if active_period:
        return attendance, active_period

    period = SessionAttendancePeriod.objects.create(
        attendance=attendance,
        joined_at=now,
        last_seen_at=now,
    )

    return attendance, period


def _effective_attendance_time(session):
    return min(
        timezone.now(),
        get_session_end_time(session),
    )


def _calculate_attendance_gap(period, now):
    if now <= period.last_seen_at:
        return 0

    return min(
        int(
            (
                now - period.last_seen_at
            ).total_seconds()
        ),
        HEARTBEAT_GRACE_SECONDS,
    )


@transaction.atomic
def heartbeat_attendance(session, user):
    session = Session.objects.get(
        pk=session.pk
    )

    if not _is_member(session, user):
        raise PermissionDenied(
            "You must be enrolled to attend."
        )

    attendance = SessionAttendance.objects.filter(
        session=session,
        user=user,
    ).first()

    if not attendance:
        raise ValidationError(
            "Join attendance before sending a heartbeat."
        )

    period = attendance.periods.filter(
        status=SessionAttendancePeriod.STATUS_ACTIVE
    ).first()

    if not period:
        raise ValidationError(
            "There is no active attendance period."
        )

    now = _effective_attendance_time(session)

    gap = _calculate_attendance_gap(
        period,
        now,
    )

    period.duration_seconds += gap
    period.last_seen_at = now

    if now >= get_session_end_time(session):
        period.left_at = now
        period.status = (
            SessionAttendancePeriod.STATUS_COMPLETED
        )

    period.save(
        update_fields=[
            "duration_seconds",
            "last_seen_at",
            "left_at",
            "status",
            "updated_at",
        ]
    )

    _refresh_attendance(attendance)

    return attendance


@transaction.atomic
def leave_attendance(session, user):
    attendance = SessionAttendance.objects.filter(
        session=session,
        user=user,
    ).first()

    if not attendance:
        return None

    active_period = attendance.periods.filter(
        status=SessionAttendancePeriod.STATUS_ACTIVE
    ).first()

    if active_period:
        now = _effective_attendance_time(session)

        gap = _calculate_attendance_gap(
            active_period,
            now,
        )

        active_period.duration_seconds += gap
        active_period.last_seen_at = now
        active_period.left_at = now
        active_period.status = (
            SessionAttendancePeriod.STATUS_COMPLETED
        )

        active_period.save(
            update_fields=[
                "duration_seconds",
                "last_seen_at",
                "left_at",
                "status",
                "updated_at",
            ]
        )

        _refresh_attendance(attendance)

    return attendance


def _refresh_attendance(attendance):
    required_seconds = (
        attendance.session.duration_minutes * 60
    )

    total_duration = sum(
        attendance.periods.values_list(
            "duration_seconds",
            flat=True,
        )
    )

    total_duration = min(
        total_duration,
        required_seconds,
    )

    update_fields = []

    if (
        attendance.total_duration_seconds
        != total_duration
    ):
        attendance.total_duration_seconds = (
            total_duration
        )

        update_fields.append(
            "total_duration_seconds"
        )

    required_attendance_seconds = (
        Decimal(required_seconds)
        * ATTENDANCE_REQUIRED_RATIO
    )

    if (
        Decimal(total_duration)
        >= required_attendance_seconds
        and not attendance.attendance_verified
    ):
        attendance.attendance_verified = True

        update_fields.append(
            "attendance_verified"
        )

    if update_fields:
        update_fields.append("updated_at")

        attendance.save(
            update_fields=update_fields
        )

    if (
        attendance.attendance_verified
        and not attendance.xp_awarded
    ):
        from gamification.services import award_xp

        award_xp(
            user=attendance.user,
            event_type="session_attended",
            event_id=attendance.session_id,
        )

        attendance.xp_awarded = True

        attendance.save(
            update_fields=[
                "xp_awarded",
                "updated_at",
            ]
        )


def _finalize_attendance(session):
    attendance_records = (
        SessionAttendance.objects
        .filter(session=session)
        .prefetch_related("periods")
    )

    for attendance in attendance_records:
        active_period = attendance.periods.filter(
            status=SessionAttendancePeriod.STATUS_ACTIVE
        ).first()

        if active_period:
            now = _effective_attendance_time(
                session
            )

            gap = _calculate_attendance_gap(
                active_period,
                now,
            )

            active_period.duration_seconds += gap
            active_period.last_seen_at = now
            active_period.left_at = now
            active_period.status = (
                SessionAttendancePeriod.STATUS_COMPLETED
            )

            active_period.save(
                update_fields=[
                    "duration_seconds",
                    "last_seen_at",
                    "left_at",
                    "status",
                    "updated_at",
                ]
            )

        _refresh_attendance(attendance)