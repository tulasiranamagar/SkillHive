from django.db import transaction
from django.http import JsonResponse
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
)
from rest_framework.response import Response

from goals.models import UserGoal

from .models import Certificate
from .serializers import CertificateSerializer
from .services import (
    CertificateServiceError,
    generate_certificate,
)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_my_certificate(request):
    user_goal = (
        UserGoal.objects
        .filter(
            user=request.user,
            is_active=True,
        )
        .select_related("goal")
        .first()
    )

    if not user_goal:
        return Response(
            {
                "eligible": False,
                "message": (
                    "You do not have an active career goal."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        certificate = generate_certificate(
            request.user,
            user_goal,
        )

    except CertificateServiceError as exc:
        return Response(
            {
                "eligible": False,
                "message": str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not certificate:
        return Response(
            {
                "eligible": False,
                "message": (
                    "You have not completed all required "
                    "roadmap tasks and assessments yet."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "eligible": True,
            "message": "Certificate is available.",
            "certificate": CertificateSerializer(
                certificate,
                context={"request": request},
            ).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_certificates(request):
    certificates = (
        Certificate.objects
        .filter(
            user=request.user,
        )
        .select_related(
            "user",
            "user_goal__goal",
        )
    )

    return Response(
        CertificateSerializer(
            certificates,
            many=True,
            context={"request": request},
        ).data
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def verify_certificate(request, certificate_id):
    certificate = (
        Certificate.objects
        .filter(
            certificate_id=certificate_id,
            status=Certificate.STATUS_ISSUED,
        )
        .select_related(
            "user",
            "user_goal__goal",
        )
        .first()
    )

    if not certificate:
        return Response(
            {
                "valid": False,
                "message": "Certificate not found or revoked.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        {
            "valid": True,
            "certificate": {
                "certificate_id": certificate.certificate_id,
                "title": certificate.title,
                "user_name": (
                    certificate.user
                    .get_full_name()
                    .strip()
                    or certificate.user.username
                ),
                "career_goal": (
                    certificate.user_goal.goal.title
                ),
                "issued_at": certificate.issued_at,
                "completion_date": certificate.completion_date,
                "assessment_score": certificate.assessment_score,
                "status": certificate.status,
            },
        },
        status=status.HTTP_200_OK,
    )