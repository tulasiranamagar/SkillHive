from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import (
    default_token_generator,
)
from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from rest_framework import generics, serializers, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import (
    FormParser,
    JSONParser,
    MultiPartParser,
)
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from notifications.models import Notification
from notifications.services import (
    create_admin_notification,
)

from .models import (
    AdminAuditLog,
    BannedIdentifier,
    ContactMessage,
    Follow,
    Profile,
    ProfileLink,
    Report,
    UserRestriction,
    VerificationRequest,
)
from .permissions import IsSkillHiveAdmin
from .serializers import (
    AdminAuditLogSerializer,
    BannedIdentifierCreateSerializer,
    BannedIdentifierSerializer,
    ContactMessageCreateSerializer,
    ContactMessageReviewSerializer,
    ContactMessageSerializer,
    FollowSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileLinkSerializer,
    ProfileSerializer,
    PublicProfileSerializer,
    RegisterSerializer,
    ReportCreateSerializer,
    ReportReviewSerializer,
    ReportSerializer,
    UserBasicSerializer,
    UserRestrictionCreateSerializer,
    UserRestrictionSerializer,
    UserUpdateSerializer,
    VerificationRequestCreateSerializer,
    VerificationRequestSerializer,
    VerificationReviewSerializer,
)
from .services import (
    AccountServiceError,
    ban_identifier,
    cancel_account_deactivation,
    complete_onboarding,
    create_report,
    create_user_restriction,
    follow_user,
    get_or_create_profile,
    get_public_profile_queryset,
    permanently_deactivate_expired_accounts,
    remove_user_restriction,
    request_account_deactivation,
    request_verification,
    review_report,
    review_verification,
    skip_onboarding,
    unfollow_user,
    unban_identifier,
)


User = get_user_model()


class AccountPageNumberPagination(
    PageNumberPagination
):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(
        self,
        request,
        *args,
        **kwargs,
    ):
        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = serializer.save()

        return Response(
            {
                "detail":
                    "Account created successfully.",
                "user":
                    UserBasicSerializer(
                        user,
                        context={
                            "request": request
                        },
                    ).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = (
            PasswordResetRequestSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        email = serializer.validated_data[
            "email"
        ]

        users = (
            User.objects
            .filter(
                email__iexact=email,
                is_active=True,
            )
            .exclude(password="")
        )

        for user in users:
            if not user.has_usable_password():
                continue

            uid = urlsafe_base64_encode(
                force_bytes(user.pk)
            )

            token = (
                default_token_generator
                .make_token(user)
            )

            frontend_url = getattr(
                settings,
                "FRONTEND_URL",
                "http://localhost:5173",
            ).rstrip("/")

            reset_url = (
                f"{frontend_url}"
                f"/reset-password/{uid}/{token}"
            )

            display_name = (
                user.get_full_name().strip()
                or user.username
            )

            try:
                send_mail(
                    subject=(
                        "Reset your SkillHive password"
                    ),
                    message=(
                        f"Hello {display_name},\n\n"
                        "We received a request to reset "
                        "your SkillHive password.\n\n"
                        "Use this link to create a new "
                        "password:\n\n"
                        f"{reset_url}\n\n"
                        "If you did not request this, "
                        "you can safely ignore this email.\n\n"
                        "Regards,\n"
                        "SkillHive Team"
                    ),
                    from_email=(
                        settings.DEFAULT_FROM_EMAIL
                    ),
                    recipient_list=[user.email],
                    fail_silently=False,
                )

            except Exception:
                return Response(
                    {
                        "detail":
                            (
                                "We couldn't send the "
                                "reset email right now. "
                                "Please try again later."
                            )
                    },
                    status=(
                        status.HTTP_500_INTERNAL_SERVER_ERROR
                    ),
                )

        return Response(
            {
                "detail":
                    (
                        "If an account exists for that "
                        "email, a reset link has been sent."
                    )
            },
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = (
            PasswordResetConfirmSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        return Response(
            {
                "detail":
                    (
                        "Your password has been reset "
                        "successfully. You can now sign in."
                    )
            },
            status=status.HTTP_200_OK,
        )

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = (
            User.objects
            .select_related("profile")
            .get(pk=request.user.pk)
        )

        profile = get_or_create_profile(user)

        profile.followers_count = (
            Follow.objects
            .filter(following=user)
            .count()
        )

        profile.following_count = (
            Follow.objects
            .filter(follower=user)
            .count()
        )

        return Response(
            {
                "user":
                    UserBasicSerializer(
                        user,
                        context={
                            "request": request
                        },
                    ).data,

                "profile":
                    ProfileSerializer(
                        profile,
                        context={
                            "request": request
                        },
                    ).data,

                "account_status": {
                    "is_active":
                        user.is_active,

                    "profile_active":
                        profile.is_active,

                    "onboarding_completed":
                        profile.onboarding_completed,

                    "onboarding_skipped":
                        profile.onboarding_skipped,

                    "deactivation_requested":
                        profile.deactivation_requested_at
                        is not None,

                    "deactivation_scheduled_for":
                        profile.deactivation_scheduled_for,
                },
            }
        )


class MeProfileView(
    generics.RetrieveUpdateAPIView
):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    parser_classes = [
        JSONParser,
        MultiPartParser,
        FormParser,
    ]

    def get_object(self):
        return get_or_create_profile(
            self.request.user
        )


class MeUserUpdateView(
    generics.UpdateAPIView
):
    serializer_class = UserUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class MyProfileLinkListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = ProfileLinkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            ProfileLink.objects
            .filter(
                profile__user=self.request.user
            )
            .order_by(
                "ordering",
                "created_at",
                "id",
            )
        )

    def perform_create(self, serializer):
        serializer.save(
            profile=get_or_create_profile(
                self.request.user
            )
        )


class MyProfileLinkDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = ProfileLinkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ProfileLink.objects.filter(
            profile__user=self.request.user
        )


class DeleteMyProfilePictureView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        profile = get_or_create_profile(
            request.user
        )

        if profile.profile_picture:
            profile.profile_picture.delete(
                save=False
            )

            profile.profile_picture = None

            profile.save(
                update_fields=[
                    "profile_picture",
                    "updated_at",
                ]
            )

        return Response(
            {
                "detail":
                    "Profile picture deleted successfully."
            },
            status=status.HTTP_200_OK,
        )


class DeleteMyCoverPictureView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        profile = get_or_create_profile(
            request.user
        )

        if profile.cover_picture:
            profile.cover_picture.delete(
                save=False
            )

            profile.cover_picture = None

            profile.save(
                update_fields=[
                    "cover_picture",
                    "updated_at",
                ]
            )

        return Response(
            {
                "detail":
                    "Cover picture deleted successfully."
            },
            status=status.HTTP_200_OK,
        )

class CompleteOnboardingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            profile = complete_onboarding(
                user=request.user
            )

        except AccountServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "detail":
                    "Onboarding completed successfully.",
                "onboarding_completed":
                    profile.onboarding_completed,
                "onboarding_skipped":
                    profile.onboarding_skipped,
            },
            status=status.HTTP_200_OK,
        )


class SkipOnboardingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            profile = skip_onboarding(
                user=request.user
            )

        except AccountServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "detail":
                    "Onboarding skipped.",
                "onboarding_completed":
                    profile.onboarding_completed,
                "onboarding_skipped":
                    profile.onboarding_skipped,
            },
            status=status.HTTP_200_OK,
        )

class RequestAccountDeactivationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get(
            "current_password",
            ""
        )

        try:
            profile = (
                request_account_deactivation(
                    user=request.user,
                    current_password=current_password,
                )
            )

        except AccountServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "detail":
                    (
                        "Your account has been "
                        "deactivated successfully. "
                        "A confirmation email has been "
                        "sent to your registered email."
                    ),
                "deactivation_requested":
                    True,
                "deactivation_scheduled_for":
                    profile.deactivation_scheduled_for,
            },
            status=status.HTTP_200_OK,
        )


class CancelAccountDeactivationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            profile = (
                cancel_account_deactivation(
                    user=request.user
                )
            )

        except AccountServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "detail":
                    (
                        "Your pending account "
                        "deactivation has been cancelled."
                    ),
                "deactivation_requested":
                    profile.deactivation_requested_at
                    is not None,
                "deactivation_scheduled_for":
                    profile.deactivation_scheduled_for,
            },
            status=status.HTTP_200_OK,
        )

class PublicProfileDetailView(
    generics.RetrieveAPIView
):
    serializer_class = PublicProfileSerializer
    permission_classes = [AllowAny]

    lookup_field = "user__username"
    lookup_url_kwarg = "username"

    def get_queryset(self):
        return (
            get_public_profile_queryset()
            .annotate(
                followers_count=Count(
                    "user__follower_relationships",
                    distinct=True,
                ),
                following_count=Count(
                    "user__following_relationships",
                    distinct=True,
                ),
            )
        )


class PublicProfileListView(
    generics.ListAPIView
):
    serializer_class = PublicProfileSerializer
    permission_classes = [AllowAny]
    pagination_class = AccountPageNumberPagination

    def get_queryset(self):
        queryset = (
            get_public_profile_queryset()
            .annotate(
                followers_count=Count(
                    "user__follower_relationships",
                    distinct=True,
                ),
                following_count=Count(
                    "user__following_relationships",
                    distinct=True,
                ),
            )
        )

        search = (
            self.request.query_params
            .get("search", "")
            .strip()
        )

        if search:
            queryset = queryset.filter(
                Q(
                    user__username__icontains=search
                )
                | Q(
                    user__first_name__icontains=search
                )
                | Q(
                    user__last_name__icontains=search
                )
                | Q(
                    bio__icontains=search
                )
                | Q(
                    city__icontains=search
                )
                | Q(
                    country__icontains=search
                )
            )

        verified = (
            self.request.query_params
            .get("verified")
        )

        if verified == "true":
            queryset = queryset.filter(
                is_verified=True
            )

        return queryset.order_by(
            "-is_verified",
            "-created_at",
        )

class FollowUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, username):
        try:
            target = (
                User.objects
                .select_related("profile")
                .get(
                    username=username,
                    is_active=True,
                )
            )

        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            follow, created = follow_user(
                follower=request.user,
                target_user=target,
            )

        except AccountServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "created":
                    created,
                "following":
                    FollowSerializer(
                        follow,
                        context={
                            "request": request
                        },
                    ).data,
            },
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )

    def delete(self, request, username):
        try:
            target = User.objects.get(
                username=username,
                is_active=True,
            )

        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        removed = unfollow_user(
            follower=request.user,
            target_user=target,
        )

        return Response(
            {"removed": removed},
            status=status.HTTP_200_OK,
        )


class FollowersView(
    generics.ListAPIView
):
    serializer_class = UserBasicSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = AccountPageNumberPagination

    def get_queryset(self):
        username = self.kwargs["username"]

        return (
            User.objects
            .filter(
                follower_relationships__following__username=(
                    username
                ),
                is_active=True,
            )
            .select_related("profile")
            .order_by("username")
            .distinct()
        )


class FollowingView(
    generics.ListAPIView
):
    serializer_class = UserBasicSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = AccountPageNumberPagination

    def get_queryset(self):
        username = self.kwargs["username"]

        return (
            User.objects
            .filter(
                following_relationships__follower__username=(
                    username
                ),
                is_active=True,
            )
            .select_related("profile")
            .order_by("username")
            .distinct()
        )

class VerificationRequestCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = (
            VerificationRequestCreateSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            verification = request_verification(
                user=request.user,
                reason=(
                    serializer.validated_data[
                        "reason"
                    ]
                ),
            )

        except AccountServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            VerificationRequestSerializer(
                verification,
                context={
                    "request": request
                },
            ).data,
            status=status.HTTP_201_CREATED,
        )


class MyVerificationRequestView(
    generics.ListAPIView
):
    serializer_class = VerificationRequestSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = AccountPageNumberPagination

    def get_queryset(self):
        return (
            VerificationRequest.objects
            .filter(
                user=self.request.user
            )
            .select_related(
                "user",
                "reviewed_by",
            )
        )


class AdminVerificationRequestListView(
    generics.ListAPIView
):
    serializer_class = VerificationRequestSerializer
    permission_classes = [IsSkillHiveAdmin]
    pagination_class = AccountPageNumberPagination

    def get_queryset(self):
        queryset = (
            VerificationRequest.objects
            .select_related(
                "user",
                "reviewed_by",
            )
        )

        request_status = (
            self.request.query_params
            .get("status")
        )

        if request_status:
            queryset = queryset.filter(
                status=request_status
            )

        return queryset


class AdminVerificationReviewView(APIView):
    permission_classes = [IsSkillHiveAdmin]

    def post(self, request, pk):
        try:
            verification = (
                VerificationRequest.objects
                .select_related(
                    "user",
                    "user__profile",
                )
                .get(pk=pk)
            )

        except VerificationRequest.DoesNotExist:
            return Response(
                {
                    "detail":
                        "Verification request not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = (
            VerificationReviewSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        approved = (
            serializer.validated_data["status"]
            == VerificationRequest.STATUS_APPROVED
        )

        try:
            verification = review_verification(
                verification_request=verification,
                admin_user=request.user,
                approved=approved,
                admin_note=(
                    serializer.validated_data.get(
                        "admin_note",
                        "",
                    )
                ),
            )

        except AccountServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            VerificationRequestSerializer(
                verification,
                context={
                    "request": request
                },
            ).data,
            status=status.HTTP_200_OK,
        )

class ReportCreateView(
    generics.CreateAPIView
):
    serializer_class = ReportCreateSerializer
    permission_classes = [IsAuthenticated]

    def create(
        self,
        request,
        *args,
        **kwargs,
    ):
        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            report = create_report(
                reporter=request.user,
                target_type=(
                    serializer.validated_data[
                        "target_type"
                    ]
                ),
                target_id=(
                    serializer.validated_data[
                        "target_id"
                    ]
                ),
                reason=(
                    serializer.validated_data[
                        "reason"
                    ]
                ),
                description=(
                    serializer.validated_data.get(
                        "description",
                        "",
                    )
                ),
            )

        except AccountServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            ReportSerializer(
                report,
                context={
                    "request": request
                },
            ).data,
            status=status.HTTP_201_CREATED,
        )


class MyReportsView(
    generics.ListAPIView
):
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = AccountPageNumberPagination

    def get_queryset(self):
        return (
            Report.objects
            .filter(
                reporter=self.request.user
            )
            .select_related(
                "reporter",
                "reviewed_by",
            )
        )


class AdminReportListView(
    generics.ListAPIView
):
    serializer_class = ReportSerializer
    permission_classes = [IsSkillHiveAdmin]
    pagination_class = AccountPageNumberPagination

    def get_queryset(self):
        queryset = (
            Report.objects
            .select_related(
                "reporter",
                "reviewed_by",
            )
        )

        report_status = (
            self.request.query_params
            .get("status")
        )

        target_type = (
            self.request.query_params
            .get("target_type")
        )

        if report_status:
            queryset = queryset.filter(
                status=report_status
            )

        if target_type:
            queryset = queryset.filter(
                target_type=target_type
            )

        return queryset


class AdminReportReviewView(APIView):
    permission_classes = [IsSkillHiveAdmin]

    def post(self, request, pk):
        try:
            report = (
                Report.objects
                .select_related(
                    "reporter",
                    "reviewed_by",
                )
                .get(pk=pk)
            )

        except Report.DoesNotExist:
            return Response(
                {"detail": "Report not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ReportReviewSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            report = review_report(
                report=report,
                admin_user=request.user,
                status_value=(
                    serializer.validated_data[
                        "status"
                    ]
                ),
                admin_note=(
                    serializer.validated_data.get(
                        "admin_note",
                        "",
                    )
                ),
            )

        except AccountServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            ReportSerializer(
                report,
                context={
                    "request": request
                },
            ).data,
            status=status.HTTP_200_OK,
        )

class ContactMessageCreateView(
    generics.CreateAPIView
):
    serializer_class = ContactMessageCreateSerializer
    permission_classes = [AllowAny]

    def create(
        self,
        request,
        *args,
        **kwargs,
    ):
        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        contact_message = serializer.save()

        notification_message = (
            f"New contact message from "
            f"{contact_message.name}: "
            f"{contact_message.subject}"
        )

        try:
            create_admin_notification(
                message=notification_message,
                notification_type=(
                    Notification.TYPE_CONTACT_MESSAGE
                ),
            )

        except Exception:
            # The contact message has already been saved.
            # A notification failure must not make the
            # public Contact Us form fail.
            pass

        return Response(
            {
                "detail":
                    (
                        "Your message has been sent "
                        "successfully. The SkillHive team "
                        "will review it."
                    ),
                "id":
                    contact_message.id,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminContactMessageListView(
    generics.ListAPIView
):
    serializer_class = ContactMessageSerializer
    permission_classes = [IsSkillHiveAdmin]
    pagination_class = AccountPageNumberPagination

    def get_queryset(self):
        queryset = (
            ContactMessage.objects
            .select_related("reviewed_by")
            .order_by("-created_at")
        )

        message_status = (
            self.request.query_params
            .get("status")
        )

        if message_status:
            queryset = queryset.filter(
                status=message_status
            )

        return queryset


class AdminContactMessageReviewView(APIView):
    permission_classes = [IsSkillHiveAdmin]

    def post(self, request, pk):
        try:
            contact_message = (
                ContactMessage.objects
                .select_related("reviewed_by")
                .get(pk=pk)
            )

        except ContactMessage.DoesNotExist:
            return Response(
                {
                    "detail":
                        "Contact message not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = (
            ContactMessageReviewSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        contact_message.status = (
            serializer.validated_data["status"]
        )

        contact_message.admin_note = (
            serializer.validated_data.get(
                "admin_note",
                "",
            )
        )

        if (
            contact_message.status
            != ContactMessage.STATUS_NEW
        ):
            contact_message.reviewed_by = (
                request.user
            )

            contact_message.reviewed_at = (
                timezone.now()
            )

        else:
            contact_message.reviewed_by = None
            contact_message.reviewed_at = None

        contact_message.save(
            update_fields=[
                "status",
                "admin_note",
                "reviewed_by",
                "reviewed_at",
                "updated_at",
            ]
        )

        return Response(
            ContactMessageSerializer(
                contact_message,
                context={
                    "request": request
                },
            ).data,
            status=status.HTTP_200_OK,
        )


class AdminUserListView(
    generics.ListAPIView
):
    serializer_class = UserBasicSerializer
    permission_classes = [IsSkillHiveAdmin]
    pagination_class = AccountPageNumberPagination

    def get_queryset(self):
        queryset = (
            User.objects
            .select_related("profile")
            .order_by("-date_joined")
        )

        search = (
            self.request.query_params
            .get("search", "")
            .strip()
        )

        if search:
            queryset = queryset.filter(
                Q(
                    username__icontains=search
                )
                | Q(
                    email__icontains=search
                )
                | Q(
                    first_name__icontains=search
                )
                | Q(
                    last_name__icontains=search
                )
            )

        active = (
            self.request.query_params
            .get("active")
        )

        if active == "true":
            queryset = queryset.filter(
                is_active=True
            )

        elif active == "false":
            queryset = queryset.filter(
                is_active=False
            )

        return queryset


class AdminUserDetailView(APIView):
    permission_classes = [IsSkillHiveAdmin]

    def get_user(self, pk):
        try:
            return (
                User.objects
                .select_related("profile")
                .get(pk=pk)
            )

        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self.get_user(pk)

        if user is None:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        profile = get_or_create_profile(user)

        restrictions = (
            UserRestriction.objects
            .filter(user=user)
            .select_related("created_by")
        )

        return Response(
            {
                "user":
                    UserBasicSerializer(
                        user,
                        context={
                            "request": request
                        },
                    ).data,

                "profile":
                    ProfileSerializer(
                        profile,
                        context={
                            "request": request
                        },
                    ).data,

                "restrictions":
                    UserRestrictionSerializer(
                        restrictions,
                        many=True,
                        context={
                            "request": request
                        },
                    ).data,
            }
        )


class AdminUserRestrictionView(APIView):
    permission_classes = [IsSkillHiveAdmin]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)

        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = (
            UserRestrictionCreateSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            restriction = (
                create_user_restriction(
                    admin_user=request.user,
                    user=user,
                    restriction_type=(
                        serializer.validated_data[
                            "restriction_type"
                        ]
                    ),
                    reason=(
                        serializer.validated_data[
                            "reason"
                        ]
                    ),
                    expires_at=(
                        serializer.validated_data.get(
                            "expires_at"
                        )
                    ),
                )
            )

        except AccountServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            UserRestrictionSerializer(
                restriction,
                context={
                    "request": request
                },
            ).data,
            status=status.HTTP_201_CREATED,
        )


class AdminUserRestrictionRemoveView(
    APIView
):
    permission_classes = [IsSkillHiveAdmin]

    def post(self, request, restriction_id):
        try:
            restriction = (
                UserRestriction.objects
                .select_related(
                    "user",
                    "created_by",
                )
                .get(pk=restriction_id)
            )

        except UserRestriction.DoesNotExist:
            return Response(
                {
                    "detail":
                        "Restriction not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            restriction = (
                remove_user_restriction(
                    admin_user=request.user,
                    restriction=restriction,
                )
            )

        except AccountServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            UserRestrictionSerializer(
                restriction,
                context={
                    "request": request
                },
            ).data,
            status=status.HTTP_200_OK,
        )


class AdminBannedIdentifierListCreateView(
    generics.ListCreateAPIView
):
    permission_classes = [IsSkillHiveAdmin]
    pagination_class = AccountPageNumberPagination

    def get_serializer_class(self):
        if self.request.method == "POST":
            return BannedIdentifierCreateSerializer

        return BannedIdentifierSerializer

    def get_queryset(self):
        return (
            BannedIdentifier.objects
            .select_related("created_by")
            .order_by("-created_at")
        )

    def create(
        self,
        request,
        *args,
        **kwargs,
    ):
        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            banned = ban_identifier(
                admin_user=request.user,
                identifier_type=(
                    serializer.validated_data[
                        "identifier_type"
                    ]
                ),
                identifier=(
                    serializer.validated_data[
                        "identifier"
                    ]
                ),
                reason=(
                    serializer.validated_data[
                        "reason"
                    ]
                ),
                expires_at=(
                    serializer.validated_data.get(
                        "expires_at"
                    )
                ),
            )

        except AccountServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            BannedIdentifierSerializer(
                banned,
                context={
                    "request": request
                },
            ).data,
            status=status.HTTP_201_CREATED,
        )


class AdminBannedIdentifierRemoveView(
    APIView
):
    permission_classes = [IsSkillHiveAdmin]

    def post(self, request, pk):
        try:
            banned = (
                BannedIdentifier.objects
                .select_related("created_by")
                .get(pk=pk)
            )

        except BannedIdentifier.DoesNotExist:
            return Response(
                {
                    "detail":
                        "Banned identifier not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            banned = unban_identifier(
                admin_user=request.user,
                banned_identifier=banned,
            )

        except AccountServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            BannedIdentifierSerializer(
                banned,
                context={
                    "request": request
                },
            ).data,
            status=status.HTTP_200_OK,
        )



class AdminAuditLogListView(
    generics.ListAPIView
):
    serializer_class = AdminAuditLogSerializer
    permission_classes = [IsSkillHiveAdmin]
    pagination_class = AccountPageNumberPagination

    def get_queryset(self):
        queryset = (
            AdminAuditLog.objects
            .select_related(
                "admin",
                "target_user",
            )
            .order_by("-created_at")
        )

        action = (
            self.request.query_params
            .get("action")
        )

        target_type = (
            self.request.query_params
            .get("target_type")
        )

        if action:
            queryset = queryset.filter(
                action=action
            )

        if target_type:
            queryset = queryset.filter(
                target_type=target_type
            )

        return queryset


class AdminDashboardView(APIView):
    permission_classes = [IsSkillHiveAdmin]

    def get(self, request):
        now = timezone.now()

        active_users = User.objects.filter(
            is_active=True
        ).count()

        inactive_users = User.objects.filter(
            is_active=False
        ).count()

        total_users = User.objects.count()

        verified_users = (
            Profile.objects
            .filter(
                is_verified=True,
                is_active=True,
                user__is_active=True,
            )
            .count()
        )

        pending_verifications = (
            VerificationRequest.objects
            .filter(
                status=(
                    VerificationRequest.STATUS_PENDING
                )
            )
            .count()
        )

        pending_reports = (
            Report.objects
            .filter(
                status__in=[
                    Report.STATUS_PENDING,
                    Report.STATUS_UNDER_REVIEW,
                ]
            )
            .count()
        )

        active_restrictions = (
            UserRestriction.objects
            .filter(
                is_active=True,
                starts_at__lte=now,
            )
            .exclude(
                expires_at__lte=now
            )
            .count()
        )

        active_identifier_bans = (
            BannedIdentifier.objects
            .filter(
                is_active=True,
                starts_at__lte=now,
            )
            .exclude(
                expires_at__lte=now
            )
            .count()
        )

        total_reports = Report.objects.count()

        total_audit_actions = (
            AdminAuditLog.objects.count()
        )

        new_contact_messages = (
            ContactMessage.objects
            .filter(
                status=ContactMessage.STATUS_NEW
            )
            .count()
        )

        total_contact_messages = (
            ContactMessage.objects.count()
        )

        return Response(
            {
                "users": {
                    "total":
                        total_users,
                    "active":
                        active_users,
                    "inactive":
                        inactive_users,
                    "verified":
                        verified_users,
                },

                "moderation": {
                    "pending_reports":
                        pending_reports,
                    "total_reports":
                        total_reports,
                    "active_restrictions":
                        active_restrictions,
                    "active_identifier_bans":
                        active_identifier_bans,
                },

                "verification": {
                    "pending":
                        pending_verifications,
                },

                "contact": {
                    "new":
                        new_contact_messages,
                    "total":
                        total_contact_messages,
                },

                "audit": {
                    "total_actions":
                        total_audit_actions,
                },
            }
        )



class ExpiredDeactivationMaintenanceView(
    APIView
):
    permission_classes = [IsSkillHiveAdmin]

    def post(self, request):
        count = (
            permanently_deactivate_expired_accounts()
        )

        return Response(
            {
                "detail":
                    "Expired account deactivations processed.",
                "deactivated_count":
                    count,
            },
            status=status.HTTP_200_OK,
        )