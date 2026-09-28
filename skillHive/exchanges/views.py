from django.contrib.auth.models import User
from django.db.models import Q
from django.shortcuts import get_object_or_404

from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from skills.models import Skill, UserSkill
from skill_sessions.models import Session
from skill_sessions.services import get_session_state

from .models import ExchangePost, ExchangeRequest
from .serializers import (
    ExchangeMatchSerializer,
    ExchangePostSerializer,
    ExchangeRequestSerializer,
)
from .services import (
    accept_exchange_request,
    cancel_exchange_post,
    cancel_exchange_request,
    create_exchange_post,
    reject_exchange_request,
    send_exchange_request,
    update_exchange_post,
)


def _match(user, other):
    """
    Calculate the skill relationship between two users.

    This still uses the structured Skill/UserSkill system because
    it is used for recommendation and matching.

    Exchange posts themselves no longer require Skill foreign keys.
    """

    known = set(
        UserSkill.objects.filter(
            user=user,
            skill_type=UserSkill.TYPE_KNOWN,
        ).values_list(
            "skill_id",
            flat=True,
        )
    )

    wanted = set(
        UserSkill.objects.filter(
            user=user,
            skill_type=UserSkill.TYPE_WANTED,
        ).values_list(
            "skill_id",
            flat=True,
        )
    )

    other_known = set(
        UserSkill.objects.filter(
            user=other,
            skill_type=UserSkill.TYPE_KNOWN,
        ).values_list(
            "skill_id",
            flat=True,
        )
    )

    other_wanted = set(
        UserSkill.objects.filter(
            user=other,
            skill_type=UserSkill.TYPE_WANTED,
        ).values_list(
            "skill_id",
            flat=True,
        )
    )

    learn = wanted & other_known
    teach = known & other_wanted
    reciprocal = learn & teach

    return {
        "user": other,

        "known_skills": list(
            Skill.objects.filter(
                id__in=other_known,
            ).values(
                "id",
                "name",
            )
        ),

        "wanted_skills": list(
            Skill.objects.filter(
                id__in=other_wanted,
            ).values(
                "id",
                "name",
            )
        ),

        "learn_from_them": list(
            Skill.objects.filter(
                id__in=learn,
            ).values(
                "id",
                "name",
            )
        ),

        "teach_them": list(
            Skill.objects.filter(
                id__in=teach,
            ).values(
                "id",
                "name",
            )
        ),

        "match_count": len(reciprocal),

        "match_score": (
            len(reciprocal) * 2
            + len(learn)
            + len(teach)
        ),
    }


def _serialize_session(session):
    """
    Return the session information needed by the frontend
    after an exchange request is accepted.
    """

    if not session:
        return None

    return {
        "id": session.id,
        "title": session.title,
        "description": session.description,
        "scheduled_at": session.scheduled_at,
        "duration_minutes": session.duration_minutes,
        "status": session.status,
        "session_state": get_session_state(session),
        "meeting_url": session.meeting_url,
        "session_type": session.session_type,
        "access_type": session.access_type,
        "exchange_post_id": session.exchange_post_id,
    }


@api_view(["GET", "POST"])
@permission_classes([permissions.IsAuthenticated])
def exchange_posts(request):
    """
    GET:
        Return open exchange posts.

    POST:
        Create a new exchange post.
    """

    if request.method == "GET":
        queryset = (
            ExchangePost.objects
            .filter(
                status=ExchangePost.STATUS_OPEN,
            )
            .select_related(
                "creator",
            )
        )

        search = request.query_params.get(
            "search",
            "",
        ).strip()

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(
                    offered_skill_name__icontains=search
                )
                | Q(
                    requested_skill_name__icontains=search
                )
            )

        queryset = queryset.distinct()

        return Response(
            ExchangePostSerializer(
                queryset,
                many=True,
                context={
                    "request": request,
                },
            ).data
        )

    serializer = ExchangePostSerializer(
        data=request.data,
        context={
            "request": request,
        },
    )

    serializer.is_valid(
        raise_exception=True,
    )

    exchange = create_exchange_post(
        request.user,
        title=serializer.validated_data["title"],
        description=serializer.validated_data.get(
            "description",
            "",
        ),
        offered_skill_name=serializer.validated_data[
            "offered_skill_name"
        ],
        requested_skill_name=serializer.validated_data[
            "requested_skill_name"
        ],
        scheduled_at=serializer.validated_data[
            "scheduled_at"
        ],
        duration_minutes=serializer.validated_data.get(
            "duration_minutes",
            60,
        ),
    )

    return Response(
        ExchangePostSerializer(
            exchange,
            context={
                "request": request,
            },
        ).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([permissions.IsAuthenticated])
def exchange_post_detail(request, pk):
    """
    GET:
        View one exchange post.

    PATCH:
        Edit an exchange post owned by the current user.

    DELETE:
        Cancel an exchange post owned by the current user.
    """

    exchange = get_object_or_404(
        ExchangePost.objects.select_related(
            "creator",
        ),
        pk=pk,
    )

    if request.method == "GET":
        return Response(
            ExchangePostSerializer(
                exchange,
                context={
                    "request": request,
                },
            ).data
        )

    if exchange.creator_id != request.user.id:
        raise PermissionDenied(
            "Only the exchange creator can modify this exchange."
        )

    if request.method == "DELETE":
        cancel_exchange_post(
            request.user,
            exchange,
        )

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )

    serializer = ExchangePostSerializer(
        exchange,
        data=request.data,
        partial=True,
        context={
            "request": request,
        },
    )

    serializer.is_valid(
        raise_exception=True,
    )

    updated = update_exchange_post(
        request.user,
        exchange,
        title=serializer.validated_data.get(
            "title",
        ),
        description=serializer.validated_data.get(
            "description",
        ),
        offered_skill_name=serializer.validated_data.get(
            "offered_skill_name",
        ),
        requested_skill_name=serializer.validated_data.get(
            "requested_skill_name",
        ),
        scheduled_at=serializer.validated_data.get(
            "scheduled_at",
        ),
        duration_minutes=serializer.validated_data.get(
            "duration_minutes",
        ),
    )

    return Response(
        ExchangePostSerializer(
            updated,
            context={
                "request": request,
            },
        ).data
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def recommended_exchange_partners(request):
    """
    Return users ranked by compatibility of their known/wanted skills.

    This is separate from exchange-post creation.
    It supports the AI/recommendation side of SkillHive.
    """

    users = (
        User.objects
        .exclude(
            id=request.user.id,
        )
        .filter(
            profile__is_active=True,
        )
        .distinct()
    )

    data = [
        _match(
            request.user,
            user,
        )
        for user in users[:100]
    ]

    data.sort(
        key=lambda item: item["match_score"],
        reverse=True,
    )

    return Response(
        ExchangeMatchSerializer(
            data,
            many=True,
        ).data
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def exchange_match_with_user(request, user_id):
    """
    Return the skill compatibility between the current user
    and another user.
    """

    other = get_object_or_404(
        User,
        id=user_id,
    )

    if other.id == request.user.id:
        raise ValidationError(
            "You cannot match with yourself."
        )

    return Response(
        ExchangeMatchSerializer(
            _match(
                request.user,
                other,
            )
        ).data
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def create_exchange_request(request):
    """
    Send a request to participate in an exchange post.
    """

    post_id = request.data.get(
        "post_id",
    )

    if not post_id:
        raise ValidationError(
            {
                "post_id": (
                    "This field is required."
                )
            }
        )

    post = get_object_or_404(
        ExchangePost,
        pk=post_id,
    )

    exchange_request = send_exchange_request(
        request.user,
        post,
        request.data.get(
            "message",
            "",
        ),
    )

    return Response(
        ExchangeRequestSerializer(
            exchange_request,
            context={
                "request": request,
            },
        ).data,
        status=status.HTTP_201_CREATED,
    )


def _request_queryset(
    user,
    received=False,
):
    """
    Return exchange requests sent or received by a user.
    """

    field = (
        "recipient"
        if received
        else "requester"
    )

    return (
        ExchangeRequest.objects
        .filter(
            **{
                f"{field}_id": user.id,
            }
        )
        .select_related(
            "post",
            "requester",
            "recipient",
            "post__creator",
        )
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def my_exchange_requests(request):
    """
    Requests sent by the current user.
    """

    return Response(
        ExchangeRequestSerializer(
            _request_queryset(
                request.user,
            ),
            many=True,
            context={
                "request": request,
            },
        ).data
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def received_exchange_requests(request):
    """
    Requests received by the current user.
    """

    return Response(
        ExchangeRequestSerializer(
            _request_queryset(
                request.user,
                received=True,
            ),
            many=True,
            context={
                "request": request,
            },
        ).data
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def exchange_request_detail(request, pk):
    """
    View a single exchange request.

    Only the requester or exchange owner/recipient
    can view it.
    """

    exchange_request = get_object_or_404(
        ExchangeRequest.objects.select_related(
            "post",
            "requester",
            "recipient",
            "post__creator",
        ),
        pk=pk,
    )

    if request.user.id not in (
        exchange_request.requester_id,
        exchange_request.recipient_id,
    ):
        raise PermissionDenied(
            "You do not have access to this exchange request."
        )

    return Response(
        ExchangeRequestSerializer(
            exchange_request,
            context={
                "request": request,
            },
        ).data
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def accept_exchange_request_view(request, pk):
    """
    Accept an exchange request.

    The service layer handles the actual transaction:
        accepted request
            -> SkillSession
            -> Jitsi meeting URL
            -> creator/participant enrollment

    The view only returns the resulting data.
    """

    exchange_request = get_object_or_404(
        ExchangeRequest,
        pk=pk,
    )

    updated = accept_exchange_request(
        exchange_request,
        request.user,
    )

    session = (
        Session.objects
        .filter(
            exchange_post_id=updated.post_id,
        )
        .order_by("-id")
        .first()
    )

    return Response(
        {
            "exchange_request": ExchangeRequestSerializer(
                updated,
                context={
                    "request": request,
                },
            ).data,
            "session": _serialize_session(
                session,
            ),
        }
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def reject_exchange_request_view(request, pk):
    """
    Reject an exchange request.
    """

    exchange_request = get_object_or_404(
        ExchangeRequest,
        pk=pk,
    )

    updated = reject_exchange_request(
        exchange_request,
        request.user,
    )

    return Response(
        ExchangeRequestSerializer(
            updated,
            context={
                "request": request,
            },
        ).data
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def cancel_exchange_request_view(request, pk):
    """
    Cancel an exchange request created by the current user.
    """

    exchange_request = get_object_or_404(
        ExchangeRequest,
        pk=pk,
    )

    updated = cancel_exchange_request(
        exchange_request,
        request.user,
    )

    return Response(
        ExchangeRequestSerializer(
            updated,
            context={
                "request": request,
            },
        ).data
    )