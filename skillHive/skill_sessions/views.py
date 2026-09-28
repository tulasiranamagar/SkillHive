from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404

from rest_framework import permissions
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.exceptions import (
    PermissionDenied,
    ValidationError,
)
from rest_framework.response import Response

from .models import (
    Session,
    SessionAttendance,
    SessionEnrollment,
)
from .serializers import (
    SessionSerializer,
    SessionAttendanceSerializer,
)
from .services import (
    create_session as create_session_service,
    enroll_session as enroll_session_service,
    leave_session as leave_session_service,
    update_session as update_session_service,
    start_session as start_session_service,
    end_session as end_session_service,
    cancel_session as cancel_session_service,
    join_attendance as join_attendance_service,
    heartbeat_attendance as heartbeat_attendance_service,
    leave_attendance as leave_attendance_service,
)


def _session_queryset():
    return (
        Session.objects
        .select_related(
            "creator",
            "participant",
            "skill",
            "exchange_post",
        )
        .prefetch_related(
            "enrollments__user"
        )
    )


def _serialize_session(session, request):
    return SessionSerializer(
        session,
        context={"request": request},
    ).data


def _is_session_member(session, user):
    """
    A user can access a private session if they are:

    1. The session creator
    2. The direct participant
    3. An enrolled participant
    """
    if not user or not user.is_authenticated:
        return False

    return (
        session.creator_id == user.id
        or session.participant_id == user.id
        or session.enrollments.filter(
            user=user
        ).exists()
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def list_sessions(request):
    """
    List scheduled and active sessions.

    This endpoint is used for session discovery.
    Private session details are still protected by
    session_detail().
    """
    sessions = (
        _session_queryset()
        .filter(
            status__in=[
                Session.STATUS_SCHEDULED,
                Session.STATUS_ACTIVE,
            ]
        )
        .order_by(
            "scheduled_at",
            "id",
        )
    )

    return Response(
        SessionSerializer(
            sessions,
            many=True,
            context={"request": request},
        ).data
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def my_sessions(request):
    """
    Return sessions belonging to the current user.

    A session belongs to the user when the user is:

    - creator
    - direct participant
    - enrolled participant
    """
    sessions = (
        _session_queryset()
        .filter(
            creator=request.user
        )
        .order_by(
            "scheduled_at",
            "id",
        )
    )

    participant_sessions = (
        _session_queryset()
        .filter(
            participant=request.user
        )
        .exclude(
            creator=request.user
        )
        .order_by(
            "scheduled_at",
            "id",
        )
    )

    enrolled_sessions = (
        _session_queryset()
        .filter(
            enrollments__user=request.user
        )
        .exclude(
            creator=request.user
        )
        .exclude(
            participant=request.user
        )
        .order_by(
            "scheduled_at",
            "id",
        )
    )

    sessions = (
        list(sessions)
        + list(participant_sessions)
        + list(enrolled_sessions)
    )

    sessions.sort(
        key=lambda session: (
            session.scheduled_at,
            session.id,
        )
    )

    return Response(
        SessionSerializer(
            sessions,
            many=True,
            context={"request": request},
        ).data
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def create_session(request):
    """
    Create a SkillHive session.

    Sessions now use a user-created skill_name.
    No skill_id is required or accepted.
    """

    skill_name = str(
        request.data.get(
            "skill_name",
            "",
        )
    ).strip()

    if not skill_name:
        raise ValidationError(
            {
                "skill_name":
                "skill_name is required."
            }
        )

    if len(skill_name) > 150:
        raise ValidationError(
            {
                "skill_name":
                "Skill name cannot exceed 150 characters."
            }
        )

    participant = None

    participant_id = request.data.get(
        "participant_id"
    )

    if participant_id:
        participant = get_object_or_404(
            User,
            pk=participant_id,
        )

    exchange_post = None

    exchange_post_id = request.data.get(
        "exchange_post_id"
    )

    if exchange_post_id:
        from exchanges.models import ExchangePost

        exchange_post = get_object_or_404(
            ExchangePost,
            pk=exchange_post_id,
        )

    session = create_session_service(
        creator=request.user,
        skill=None,
        skill_name=skill_name,
        title=request.data.get(
            "title",
            "SkillHive Session",
        ),
        description=request.data.get(
            "description",
            "",
        ),
        session_type=request.data.get(
            "session_type",
            Session.SESSION_ONE_TO_ONE,
        ),
        participant=participant,
        exchange_post=exchange_post,
        access_type=request.data.get(
            "access_type",
            Session.ACCESS_FREE,
        ),
        price=request.data.get(
            "price",
            0,
        ),
        xp_unlock_cost=request.data.get(
            "xp_unlock_cost",
            0,
        ),
        max_participants=request.data.get(
            "max_participants",
            2,
        ),
        scheduled_at=request.data.get(
            "scheduled_at"
        ),
        duration_minutes=request.data.get(
            "duration_minutes",
            60,
        ),
    )

    session = _session_queryset().get(
        pk=session.pk
    )

    return Response(
        _serialize_session(
            session,
            request,
        ),
        status=201,
    )


@api_view(["GET", "PATCH"])
@permission_classes([permissions.IsAuthenticated])
def session_detail(request, session_id):
    """
    View or update a private session.

    GET:
        Creator, direct participant, or enrolled user
        can view the session.

    PATCH:
        Only the creator can modify the session.
    """

    session = get_object_or_404(
        _session_queryset(),
        pk=session_id,
    )

    is_creator = (
        request.user.id
        == session.creator_id
    )

    is_participant = (
        request.user.id
        == session.participant_id
    )

    is_enrolled = session.enrollments.filter(
        user=request.user
    ).exists()

    is_member = (
        is_creator
        or is_participant
        or is_enrolled
    )

    if not is_member:
        raise PermissionDenied(
            "You are not a member of this session."
        )

    if request.method == "GET":
        return Response(
            _serialize_session(
                session,
                request,
            )
        )

    # PATCH is creator-only.
    if not is_creator:
        raise PermissionDenied(
            "Only the creator can edit the session."
        )

    allowed_fields = {
        "title",
        "description",
        "scheduled_at",
        "duration_minutes",
        "max_participants",
    }

    update_data = {
        key: value
        for key, value in request.data.items()
        if key in allowed_fields
    }

    session = update_session_service(
        session,
        request.user,
        title=update_data.get(
            "title"
        ),
        description=update_data.get(
            "description"
        ),
        scheduled_at=update_data.get(
            "scheduled_at"
        ),
        duration_minutes=update_data.get(
            "duration_minutes"
        ),
        max_participants=update_data.get(
            "max_participants"
        ),
    )

    session = _session_queryset().get(
        pk=session.pk
    )

    return Response(
        _serialize_session(
            session,
            request,
        )
    )


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def delete_session(request, session_id):
    """
    Cancel/delete a session.

    The service layer performs the creator
    authorization check.
    """
    session = get_object_or_404(
        Session,
        pk=session_id,
    )

    cancel_session_service(
        session,
        request.user,
    )

    return Response(
        status=204
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def enroll_session(request, session_id):
    """
    Enroll the current user into a session.
    """
    session = get_object_or_404(
        Session,
        pk=session_id,
    )

    method = request.data.get(
        "access_method",
        SessionEnrollment.ACCESS_FREE,
    )

    enrollment = enroll_session_service(
        session,
        request.user,
        method,
    )

    return Response(
        {
            "id": enrollment.id,
            "access_method": enrollment.access_method,
        },
        status=201,
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def leave_session(request, session_id):
    """
    Leave an enrolled session.
    """
    session = get_object_or_404(
        Session,
        pk=session_id,
    )

    leave_session_service(
        session,
        request.user,
    )

    return Response(
        status=204
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def start_session_view(request, session_id):
    """
    Start a session.

    The service layer controls creator authorization
    and schedule validation.
    """
    session = get_object_or_404(
        Session,
        pk=session_id,
    )

    session = start_session_service(
        session,
        request.user,
    )

    session = _session_queryset().get(
        pk=session.pk
    )

    return Response(
        _serialize_session(
            session,
            request,
        )
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def end_session_view(request, session_id):
    """
    End a session.
    """
    session = get_object_or_404(
        Session,
        pk=session_id,
    )

    session = end_session_service(
        session,
        request.user,
    )

    session = _session_queryset().get(
        pk=session.pk
    )

    return Response(
        _serialize_session(
            session,
            request,
        )
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def cancel_session_view(request, session_id):
    """
    Cancel a session.
    """
    session = get_object_or_404(
        Session,
        pk=session_id,
    )

    session = cancel_session_service(
        session,
        request.user,
    )

    session = _session_queryset().get(
        pk=session.pk
    )

    return Response(
        _serialize_session(
            session,
            request,
        )
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def join_attendance_view(request, session_id):
    """
    Start attendance for the current user.
    """
    session = get_object_or_404(
        Session,
        pk=session_id,
    )

    attendance, _ = join_attendance_service(
        session,
        request.user,
    )

    attendance = (
        SessionAttendance.objects
        .prefetch_related(
            "periods"
        )
        .get(
            pk=attendance.pk
        )
    )

    return Response(
        SessionAttendanceSerializer(
            attendance
        ).data
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def heartbeat_attendance(request, session_id):
    """
    Update attendance heartbeat.
    """
    session = get_object_or_404(
        Session,
        pk=session_id,
    )

    attendance = heartbeat_attendance_service(
        session,
        request.user,
    )

    attendance = (
        SessionAttendance.objects
        .prefetch_related(
            "periods"
        )
        .get(
            pk=attendance.pk
        )
    )

    return Response(
        SessionAttendanceSerializer(
            attendance
        ).data
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def leave_attendance_view(request, session_id):
    """
    Finish the current user's attendance.
    """
    session = get_object_or_404(
        Session,
        pk=session_id,
    )

    attendance = leave_attendance_service(
        session,
        request.user,
    )

    if attendance is None:
        raise ValidationError(
            "No attendance record exists for this session."
        )

    attendance = (
        SessionAttendance.objects
        .prefetch_related(
            "periods"
        )
        .get(
            pk=attendance.pk
        )
    )

    return Response(
        SessionAttendanceSerializer(
            attendance
        ).data
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def my_session_attendance(request, session_id):
    """
    Return the current user's attendance
    for a session.
    """
    attendance = get_object_or_404(
        SessionAttendance.objects.prefetch_related(
            "periods"
        ),
        session_id=session_id,
        user=request.user,
    )

    return Response(
        SessionAttendanceSerializer(
            attendance
        ).data
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def session_attendance_list(request, session_id):
    """
    Only the session creator can view
    all attendance records.
    """
    session = get_object_or_404(
        Session,
        pk=session_id,
    )

    if session.creator_id != request.user.id:
        raise PermissionDenied(
            "Only the creator can view attendance."
        )

    attendance = (
        SessionAttendance.objects
        .filter(
            session=session
        )
        .prefetch_related(
            "periods"
        )
        .order_by(
            "-created_at"
        )
    )

    return Response(
        SessionAttendanceSerializer(
            attendance,
            many=True,
        ).data
    )


# Compatibility aliases.
join_attendance = join_attendance_view
leave_attendance = leave_attendance_view

