from django.contrib.auth import get_user_model
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

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

User = get_user_model()


def get_safe_full_name(user):
    return (
        user.get_full_name().strip()
        or getattr(user, "username", "")
        or getattr(user, "email", "")
        or ""
    )


def get_total_xp_safe(user):
    try:
        from gamification.services import get_total_xp

        return int(get_total_xp(user))
    except Exception:
        return 0


def get_user_level_safe(user):
    try:
        from gamification.services import get_user_level

        return int(get_user_level(user))
    except Exception:
        return 1


class UserBasicSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "full_name",
        ]
        read_only_fields = fields

    def get_full_name(self, obj):
        return get_safe_full_name(obj)


class UserPublicSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "full_name",
        ]
        read_only_fields = fields

    def get_full_name(self, obj):
        return get_safe_full_name(obj)


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "full_name",
            "first_name",
            "last_name",
        ]
        read_only_fields = [
            "id",
            "username",
            "email",
            "full_name",
        ]

    def get_full_name(self, obj):
        return get_safe_full_name(obj)


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
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "URL cannot be empty."
            )

        return value

    def validate_label(self, value):
        return value.strip()


def serialize_skill_items(user, skill_type):
    from skills.models import UserSkill

    queryset = (
        UserSkill.objects
        .filter(
            user=user,
            skill_type=skill_type,
        )
        .select_related("skill")
        .order_by(
            "skill__name",
            "id",
        )
    )

    return [
        {
            "id": item.id,
            "skill": item.skill_id,
            "skill_detail": {
                "id": item.skill.id,
                "name": item.skill.name,
                "description": item.skill.description,
            },
            "skill_type": item.skill_type,
            "level": item.level,
            "experience_years": item.experience_years,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
        }
        for item in queryset
    ]


def serialize_user_interests(user):
    from skills.models import UserInterest

    queryset = (
        UserInterest.objects
        .filter(user=user)
        .select_related("skill")
        .order_by("skill__name", "id")
    )

    return [
        {
            "id": item.id,
            "skill": item.skill_id,
            "skill_detail": {
                "id": item.skill.id,
                "name": item.skill.name,
                "description": item.skill.description,
            },
            "created_at": item.created_at,
        }
        for item in queryset
    ]


def serialize_active_career_goal(user):
    from goals.models import UserGoal

    user_goal = (
        UserGoal.objects
        .filter(
            user=user,
            is_active=True,
        )
        .select_related("goal")
        .first()
    )

    if not user_goal:
        return None

    return {
        "id": user_goal.goal.id,
        "title": user_goal.goal.title,
        "description": user_goal.goal.description,
        "user_goal_id": user_goal.id,
    }


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )

    full_name = serializers.SerializerMethodField()

    links = ProfileLinkSerializer(
        many=True,
        read_only=True,
    )

    known_skills = serializers.SerializerMethodField()
    wanted_skills = serializers.SerializerMethodField()
    interests = serializers.SerializerMethodField()
    career_goal = serializers.SerializerMethodField()

    xp = serializers.SerializerMethodField()
    level = serializers.SerializerMethodField()

    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()

    class Meta:
        model = Profile

        fields = [
            "id",
            "user",
            "username",
            "email",
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
            "is_active",

            "known_skills",
            "wanted_skills",
            "interests",
            "career_goal",

            "links",
            "xp",
            "level",

            "followers_count",
            "following_count",

            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "user",
            "username",
            "email",
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
            "is_active",

            "known_skills",
            "wanted_skills",
            "interests",
            "career_goal",

            "links",
            "xp",
            "level",

            "followers_count",
            "following_count",

            "created_at",
            "updated_at",
        ]

    def get_full_name(self, obj):
        return get_safe_full_name(obj.user)

    def get_known_skills(self, obj):
        return serialize_skill_items(
            obj.user,
            "known",
        )

    def get_wanted_skills(self, obj):
        return serialize_skill_items(
            obj.user,
            "wanted",
        )

    def get_interests(self, obj):
        return serialize_user_interests(obj.user)

    def get_career_goal(self, obj):
        return serialize_active_career_goal(obj.user)

    def get_xp(self, obj):
        return get_total_xp_safe(obj.user)

    def get_level(self, obj):
        return get_user_level_safe(obj.user)

    def get_followers_count(self, obj):
        annotated = getattr(
            obj,
            "followers_count",
            None,
        )

        if annotated is not None:
            return int(annotated)

        return Follow.objects.filter(
            following=obj.user
        ).count()

    def get_following_count(self, obj):
        annotated = getattr(
            obj,
            "following_count",
            None,
        )

        if annotated is not None:
            return int(annotated)

        return Follow.objects.filter(
            follower=obj.user
        ).count()


class PublicProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    full_name = serializers.SerializerMethodField()

    links = ProfileLinkSerializer(
        many=True,
        read_only=True,
    )

    known_skills = serializers.SerializerMethodField()
    wanted_skills = serializers.SerializerMethodField()
    interests = serializers.SerializerMethodField()
    career_goal = serializers.SerializerMethodField()

    xp = serializers.SerializerMethodField()
    level = serializers.SerializerMethodField()

    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()

    class Meta:
        model = Profile

        fields = [
            "id",
            "user",
            "username",
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

            "known_skills",
            "wanted_skills",
            "interests",
            "career_goal",

            "links",

            "xp",
            "level",

            "followers_count",
            "following_count",

            "created_at",
        ]

        read_only_fields = fields

    def get_full_name(self, obj):
        return get_safe_full_name(obj.user)

    def get_known_skills(self, obj):
        return serialize_skill_items(
            obj.user,
            "known",
        )

    def get_wanted_skills(self, obj):
        return serialize_skill_items(
            obj.user,
            "wanted",
        )

    def get_interests(self, obj):
        return serialize_user_interests(obj.user)

    def get_career_goal(self, obj):
        return serialize_active_career_goal(obj.user)

    def get_xp(self, obj):
        return get_total_xp_safe(obj.user)

    def get_level(self, obj):
        return get_user_level_safe(obj.user)

    def get_followers_count(self, obj):
        annotated = getattr(
            obj,
            "followers_count",
            None,
        )

        if annotated is not None:
            return int(annotated)

        return Follow.objects.filter(
            following=obj.user
        ).count()

    def get_following_count(self, obj):
        annotated = getattr(
            obj,
            "following_count",
            None,
        )

        if annotated is not None:
            return int(annotated)

        return Follow.objects.filter(
            follower=obj.user
        ).count()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
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

        if User.objects.filter(
            email__iexact=value
        ).exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )

        from .services import is_identifier_banned

        if is_identifier_banned(
            identifier_type=BannedIdentifier.TYPE_EMAIL,
            identifier=value,
        ):
            raise serializers.ValidationError(
                "This email address cannot be used to create an account."
            )

        return value

    def validate(self, attrs):
        if (
            attrs["password"]
            != attrs["password_confirm"]
        ):
            raise serializers.ValidationError(
                {
                    "password_confirm":
                        "Passwords do not match."
                }
            )

        return attrs

    def create(self, validated_data):
        from django.db import transaction

        validated_data.pop(
            "password_confirm"
        )

        password = validated_data.pop(
            "password"
        )

        with transaction.atomic():
            user = User.objects.create_user(
                password=password,
                **validated_data,
            )

            Profile.objects.create(
                user=user
            )

        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "email",
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

        from .services import is_identifier_banned

        if is_identifier_banned(
            identifier_type=BannedIdentifier.TYPE_EMAIL,
            identifier=value,
        ):
            raise serializers.ValidationError(
                "This email address cannot be used."
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
    )

    password_confirm = serializers.CharField(
        write_only=True,
    )

    def validate(self, attrs):
        if (
            attrs["password"]
            != attrs["password_confirm"]
        ):
            raise serializers.ValidationError(
                {
                    "password_confirm":
                        "Passwords do not match."
                }
            )

        try:
            uid = force_str(
                urlsafe_base64_decode(
                    attrs["uid"]
                )
            )

            user = User.objects.get(
                pk=uid
            )
        except (
            ValueError,
            TypeError,
            OverflowError,
            User.DoesNotExist,
        ):
            raise serializers.ValidationError(
                {
                    "detail":
                        "Invalid password reset link."
                }
            )

        from django.contrib.auth.tokens import (
            default_token_generator,
        )

        if not default_token_generator.check_token(
            user,
            attrs["token"],
        ):
            raise serializers.ValidationError(
                {
                    "detail":
                        "This password reset link is invalid or expired."
                }
            )

        self.user = user

        return attrs

    def save(self, **kwargs):
        self.user.set_password(
            self.validated_data["password"]
        )

        self.user.save(
            update_fields=["password"]
        )

        return self.user


class FollowSerializer(serializers.ModelSerializer):
    follower = UserPublicSerializer(
        read_only=True
    )

    following = UserPublicSerializer(
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
        fields = ["reason"]

    def validate_reason(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Verification reason is required."
            )

        return value


class VerificationRequestSerializer(
    serializers.ModelSerializer
):
    user = UserPublicSerializer(
        read_only=True
    )

    reviewed_by = UserPublicSerializer(
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
        read_only_fields = fields


class VerificationReviewSerializer(
    serializers.Serializer
):
    status = serializers.ChoiceField(
        choices=[
            VerificationRequest.STATUS_APPROVED,
            VerificationRequest.STATUS_REJECTED,
        ]
    )

    admin_note = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=2000,
    )

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


class ReportSerializer(
    serializers.ModelSerializer
):
    reporter = UserPublicSerializer(
        read_only=True
    )

    reviewed_by = UserPublicSerializer(
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
        read_only_fields = fields


class ReportReviewSerializer(
    serializers.Serializer
):
    status = serializers.ChoiceField(
        choices=[
            Report.STATUS_UNDER_REVIEW,
            Report.STATUS_RESOLVED,
            Report.STATUS_DISMISSED,
        ]
    )

    admin_note = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=3000,
    )

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
            "expires_at",
        ]

    def validate_reason(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Restriction reason is required."
            )

        return value


class UserRestrictionSerializer(
    serializers.ModelSerializer
):
    user = UserPublicSerializer(
        read_only=True
    )

    created_by = UserPublicSerializer(
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
        read_only_fields = fields


class BannedIdentifierCreateSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = BannedIdentifier
        fields = [
            "identifier_type",
            "identifier",
            "reason",
            "expires_at",
        ]

    def validate_identifier(self, value):
        return value.strip().lower()

    def validate_reason(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Ban reason is required."
            )

        return value


class BannedIdentifierSerializer(
    serializers.ModelSerializer
):
    created_by = UserPublicSerializer(
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
        read_only_fields = fields


class AdminAuditLogSerializer(
    serializers.ModelSerializer
):
    admin = UserPublicSerializer(
        read_only=True
    )

    target_user = UserPublicSerializer(
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


# ============================================================
# CONTACT MESSAGES
# ============================================================

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
        value = value.strip().lower()

        if not value:
            raise serializers.ValidationError(
                "Email is required."
            )

        return value

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


class ContactMessageSerializer(
    serializers.ModelSerializer
):
    reviewed_by = UserPublicSerializer(
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
        read_only_fields = fields


class ContactMessageReviewSerializer(
    serializers.Serializer
):
    status = serializers.ChoiceField(
        choices=[
            ContactMessage.STATUS_NEW,
            ContactMessage.STATUS_UNDER_REVIEW,
            ContactMessage.STATUS_RESOLVED,
        ]
    )

    admin_note = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=3000,
    )

    def validate_admin_note(self, value):
        return value.strip()