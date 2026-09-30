from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone

from rest_framework import serializers

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

class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
        ]


class UserPublicSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "full_name",
        ]

    def get_full_name(self, obj):
        return (
            obj.get_full_name().strip()
            or obj.username
        )


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "date_joined",
        ]
        read_only_fields = [
            "id",
            "date_joined",
        ]


class ProfileLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileLink
        fields = [
            "id",
            "url",
            "label",
            "ordering",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_url(self, value):
        return value.strip()



class ProfileSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)

    full_name = serializers.CharField(
        read_only=True,
    )

    links = ProfileLinkSerializer(
        many=True,
        read_only=True,
    )

    followers_count = serializers.IntegerField(
        read_only=True,
    )

    following_count = serializers.IntegerField(
        read_only=True,
    )

    class Meta:
        model = Profile
        fields = [
            "id",
            "user",
            "full_name",
            "profile_picture",
            "cover_picture",
            "bio",
            "country",
            "city",
            "date_of_birth",
            "github_url",
            "linkedin_url",
            "portfolio_url",
            "role",
            "is_verified",
            "verification_requested_at",
            "verification_approved_at",
            "verification_note",
            "onboarding_completed",
            "onboarding_skipped",
            "onboarding_completed_at",
            "deactivation_requested_at",
            "deactivation_scheduled_for",
            "permanently_deactivated",
            "is_active",
            "followers_count",
            "following_count",
            "links",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "full_name",
            "role",
            "is_verified",
            "verification_requested_at",
            "verification_approved_at",
            "verification_note",
            "onboarding_completed",
            "onboarding_skipped",
            "onboarding_completed_at",
            "deactivation_requested_at",
            "deactivation_scheduled_for",
            "permanently_deactivated",
            "is_active",
            "followers_count",
            "following_count",
            "links",
            "created_at",
            "updated_at",
        ]



class PublicProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )

    first_name = serializers.CharField(
        source="user.first_name",
        read_only=True,
    )

    last_name = serializers.CharField(
        source="user.last_name",
        read_only=True,
    )

    full_name = serializers.CharField(
        read_only=True,
    )

    links = ProfileLinkSerializer(
        many=True,
        read_only=True,
    )

    followers_count = serializers.IntegerField(
        read_only=True,
    )

    following_count = serializers.IntegerField(
        read_only=True,
    )

    class Meta:
        model = Profile
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "profile_picture",
            "cover_picture",
            "bio",
            "country",
            "city",
            "github_url",
            "linkedin_url",
            "portfolio_url",
            "role",
            "is_verified",
            "followers_count",
            "following_count",
            "links",
            "created_at",
        ]
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        validators=[validate_password],
    )

    password_confirm = serializers.CharField(
        write_only=True,
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "first_name",
            "last_name",
            "password",
            "password_confirm",
        ]

    def validate_username(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Username is required."
            )

        if User.objects.filter(
            username__iexact=value
        ).exists():
            raise serializers.ValidationError(
                "A user with this username already exists."
            )

        return value

    def validate_email(self, value):
        value = value.strip().lower()

        if not value:
            raise serializers.ValidationError(
                "Email is required."
            )

        if User.objects.filter(
            email__iexact=value
        ).exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )

        now = timezone.now()

        banned = (
            BannedIdentifier.objects.filter(
                identifier_type=BannedIdentifier.TYPE_EMAIL,
                identifier__iexact=value,
                is_active=True,
                starts_at__lte=now,
            )
            .filter(
                models_q_expiry()
            )
        )

        if banned.exists():
            raise serializers.ValidationError(
                "This email address cannot be used to create an account."
            )

        return value

    def validate(self, attrs):
        password = attrs.get("password")
        password_confirm = attrs.pop(
            "password_confirm",
            None,
        )

        if password != password_confirm:
            raise serializers.ValidationError({
                "password_confirm": "Passwords do not match."
            })

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")

        
        user = User.objects.create_user(
            password=password,
            **validated_data,
        )

        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
        ]

    def validate_email(self, value):
        value = value.strip().lower()

        queryset = User.objects.filter(
            email__iexact=value
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )

        return value

class PasswordResetRequestSerializer(
    serializers.Serializer
):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()


class PasswordResetConfirmSerializer(
    serializers.Serializer
):
    uid = serializers.CharField()
    token = serializers.CharField()

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        validators=[validate_password],
    )

    password_confirm = serializers.CharField(
        write_only=True,
    )

    def validate(self, attrs):
        password = attrs.get("password")
        password_confirm = attrs.get(
            "password_confirm"
        )

        if password != password_confirm:
            raise serializers.ValidationError({
                "password_confirm": "Passwords do not match."
            })

        return attrs

    def save(self, **kwargs):
        from django.contrib.auth.tokens import (
            default_token_generator,
        )
        from django.utils.http import (
            urlsafe_base64_decode,
        )

        uid = self.validated_data["uid"]
        token = self.validated_data["token"]
        password = self.validated_data["password"]

        try:
            uid_int = urlsafe_base64_decode(uid).decode()
            user = User.objects.get(pk=uid_int)
        except (
            TypeError,
            ValueError,
            OverflowError,
            User.DoesNotExist,
        ):
            raise serializers.ValidationError({
                "detail": "Invalid password reset link."
            })

        if not default_token_generator.check_token(
            user,
            token,
        ):
            raise serializers.ValidationError({
                "detail": "Invalid or expired password reset link."
            })

        user.set_password(password)

        user.save(
            update_fields=["password"]
        )

        return user


class FollowSerializer(serializers.ModelSerializer):
    follower = UserBasicSerializer(
        read_only=True
    )

    following = UserBasicSerializer(
        read_only=True
    )

    class Meta:
        model = Follow
        fields = [
            "id",
            "follower",
            "following",
            "created_at",
        ]
        read_only_fields = fields


class VerificationRequestCreateSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = VerificationRequest
        fields = [
            "reason",
        ]

    def validate_reason(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Please provide a reason for verification."
            )

        return value


class VerificationRequestSerializer(
    serializers.ModelSerializer
):
    user = UserBasicSerializer(
        read_only=True
    )

    reviewed_by = UserBasicSerializer(
        read_only=True
    )

    class Meta:
        model = VerificationRequest
        fields = [
            "id",
            "user",
            "status",
            "reason",
            "admin_note",
            "reviewed_by",
            "requested_at",
            "reviewed_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "status",
            "admin_note",
            "reviewed_by",
            "requested_at",
            "reviewed_at",
        ]


class VerificationReviewSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = VerificationRequest
        fields = [
            "status",
            "admin_note",
        ]

    def validate_status(self, value):
        allowed = [
            VerificationRequest.STATUS_APPROVED,
            VerificationRequest.STATUS_REJECTED,
        ]

        if value not in allowed:
            raise serializers.ValidationError(
                "Status must be approved or rejected."
            )

        return value

    def validate_admin_note(self, value):
        return value.strip()


class ReportCreateSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = Report
        fields = [
            "target_type",
            "target_id",
            "reason",
            "description",
        ]

    def validate_target_id(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Target ID must be greater than zero."
            )

        return value

    def validate_reason(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Report reason is required."
            )

        return value

    def validate_description(self, value):
        return value.strip()


class ReportSerializer(serializers.ModelSerializer):
    reporter = UserBasicSerializer(
        read_only=True
    )

    reviewed_by = UserBasicSerializer(
        read_only=True
    )

    class Meta:
        model = Report
        fields = [
            "id",
            "reporter",
            "target_type",
            "target_id",
            "reason",
            "description",
            "status",
            "reviewed_by",
            "admin_note",
            "created_at",
            "reviewed_at",
        ]
        read_only_fields = [
            "id",
            "reporter",
            "status",
            "reviewed_by",
            "admin_note",
            "created_at",
            "reviewed_at",
        ]


class ReportReviewSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = Report
        fields = [
            "status",
            "admin_note",
        ]

    def validate_status(self, value):
        allowed = [
            Report.STATUS_PENDING,
            Report.STATUS_UNDER_REVIEW,
            Report.STATUS_RESOLVED,
            Report.STATUS_DISMISSED,
        ]

        if value not in allowed:
            raise serializers.ValidationError(
                "Invalid report status."
            )

        return value

    def validate_admin_note(self, value):
        return value.strip()


class UserRestrictionCreateSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = UserRestriction
        fields = [
            "restriction_type",
            "reason",
            "starts_at",
            "expires_at",
        ]

    def validate_restriction_type(self, value):
        allowed = [
            UserRestriction.TYPE_WARNING,
            UserRestriction.TYPE_SUSPENSION,
            UserRestriction.TYPE_BAN,
        ]

        if value not in allowed:
            raise serializers.ValidationError(
                "Invalid restriction type."
            )

        return value

    def validate_reason(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Restriction reason is required."
            )

        return value

    def validate(self, attrs):
        starts_at = attrs.get("starts_at")
        expires_at = attrs.get("expires_at")

        if (
            starts_at
            and expires_at
            and expires_at <= starts_at
        ):
            raise serializers.ValidationError({
                "expires_at":
                    "Expiration time must be after the start time."
            })

        return attrs


class UserRestrictionSerializer(
    serializers.ModelSerializer
):
    user = UserBasicSerializer(
        read_only=True
    )

    created_by = UserBasicSerializer(
        read_only=True
    )

    class Meta:
        model = UserRestriction
        fields = [
            "id",
            "user",
            "restriction_type",
            "reason",
            "created_by",
            "starts_at",
            "expires_at",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "created_by",
            "is_active",
            "created_at",
            "updated_at",
        ]

class BannedIdentifierCreateSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = BannedIdentifier
        fields = [
            "identifier_type",
            "identifier",
            "reason",
            "starts_at",
            "expires_at",
        ]

    def validate_identifier_type(self, value):
        if value != BannedIdentifier.TYPE_EMAIL:
            raise serializers.ValidationError(
                "Only email identifiers can currently be banned."
            )

        return value

    def validate_identifier(self, value):
        return value.strip().lower()

    def validate_reason(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "A reason is required."
            )

        return value

    def validate(self, attrs):
        starts_at = attrs.get("starts_at")
        expires_at = attrs.get("expires_at")

        if (
            starts_at
            and expires_at
            and expires_at <= starts_at
        ):
            raise serializers.ValidationError({
                "expires_at":
                    "Expiration time must be after the start time."
            })

        return attrs


class BannedIdentifierSerializer(
    serializers.ModelSerializer
):
    created_by = UserBasicSerializer(
        read_only=True
    )

    class Meta:
        model = BannedIdentifier
        fields = [
            "id",
            "identifier_type",
            "identifier",
            "reason",
            "created_by",
            "starts_at",
            "expires_at",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "is_active",
            "created_at",
            "updated_at",
        ]


class AdminAuditLogSerializer(
    serializers.ModelSerializer
):
    admin = UserBasicSerializer(
        read_only=True
    )

    target_user = UserBasicSerializer(
        read_only=True
    )

    class Meta:
        model = AdminAuditLog
        fields = [
            "id",
            "admin",
            "action",
            "target_type",
            "target_id",
            "target_user",
            "reason",
            "metadata",
            "created_at",
        ]
        read_only_fields = fields



class ContactMessageCreateSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = ContactMessage
        fields = [
            "name",
            "email",
            "subject",
            "message",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Name is required."
            )

        return value

    def validate_email(self, value):
        return value.strip().lower()

    def validate_subject(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Subject is required."
            )

        return value

    def validate_message(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Message is required."
            )

        return value


class ContactMessageReviewSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = ContactMessage
        fields = [
            "status",
            "admin_note",
        ]

    def validate_status(self, value):
        allowed = [
            ContactMessage.STATUS_NEW,
            ContactMessage.STATUS_UNDER_REVIEW,
            ContactMessage.STATUS_RESOLVED,
        ]

        if value not in allowed:
            raise serializers.ValidationError(
                "Invalid contact message status."
            )

        return value

    def validate_admin_note(self, value):
        return value.strip()


class ContactMessageSerializer(
    serializers.ModelSerializer
):
    reviewed_by = UserBasicSerializer(
        read_only=True
    )

    class Meta:
        model = ContactMessage
        fields = [
            "id",
            "name",
            "email",
            "subject",
            "message",
            "status",
            "admin_note",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]