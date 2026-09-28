from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.utils import timezone

from notifications.models import Notification
from notifications.services import create_notification

from .models import (
    AdminAuditLog,
    BannedIdentifier,
    Follow,
    Profile,
    Report,
    UserRestriction,
    VerificationRequest,
)


class AccountServiceError(Exception):
    pass


def is_skillhive_admin(user):
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    profile = getattr(user, "profile", None)

    return bool(
        user.is_staff
        and profile
        and profile.is_active
        and profile.role == Profile.ROLE_ADMIN
    )


def get_or_create_profile(user):
    profile, _ = Profile.objects.get_or_create(
        user=user
    )
    return profile


def normalize_identifier(
    identifier_type,
    identifier,
):
    value = str(identifier or "").strip()

    if identifier_type == BannedIdentifier.TYPE_EMAIL:
        return value.lower()

    return value.lower()


def is_identifier_banned(
    *,
    identifier_type,
    identifier,
):
    normalized = normalize_identifier(
        identifier_type,
        identifier,
    )

    now = timezone.now()

    queryset = BannedIdentifier.objects.filter(
        identifier_type=identifier_type,
        identifier=normalized,
        is_active=True,
        starts_at__lte=now,
    )

    active_ban = queryset.filter(
        expires_at__isnull=True
    ).exists()

    if active_ban:
        return True

    expired_bans = queryset.filter(
        expires_at__lte=now
    )

    if expired_bans.exists():
        expired_bans.update(
            is_active=False,
            updated_at=now,
        )

    return queryset.filter(
        is_active=True,
        starts_at__lte=now,
    ).filter(
        expires_at__isnull=True
    ).exists() or queryset.filter(
        is_active=True,
        starts_at__lte=now,
        expires_at__gt=now,
    ).exists()


def get_active_user_restriction(user):
    now = timezone.now()

    restrictions = (
        UserRestriction.objects
        .filter(
            user=user,
            is_active=True,
            starts_at__lte=now,
        )
        .order_by("-created_at")
    )

    for restriction in restrictions:
        if (
            restriction.expires_at
            and restriction.expires_at <= now
        ):
            restriction.is_active = False
            restriction.save(
                update_fields=[
                    "is_active",
                    "updated_at",
                ]
            )
            continue

        if restriction.restriction_type in {
            UserRestriction.TYPE_SUSPENSION,
            UserRestriction.TYPE_BAN,
        }:
            return restriction

    return None


def has_active_user_restriction(user):
    return (
        get_active_user_restriction(user)
        is not None
    )


@transaction.atomic
def create_admin_audit_log(
    *,
    admin,
    action,
    target_type="",
    target_id="",
    target_user=None,
    reason="",
    metadata=None,
):
    if not is_skillhive_admin(admin):
        raise AccountServiceError(
            "SkillHive administrator permission is required."
        )

    return AdminAuditLog.objects.create(
        admin=admin,
        action=action,
        target_type=target_type,
        target_id=str(target_id or ""),
        target_user=target_user,
        reason=(reason or "").strip(),
        metadata=metadata or {},
    )


@transaction.atomic
def follow_user(
    *,
    follower,
    target_user,
):
    if follower == target_user:
        raise AccountServiceError(
            "You cannot follow yourself."
        )

    if not follower.is_active:
        raise AccountServiceError(
            "Your account is not active."
        )

    target_profile = getattr(
        target_user,
        "profile",
        None,
    )

    if (
        not target_user.is_active
        or not target_profile
        or not target_profile.is_active
    ):
        raise AccountServiceError(
            "This user is not active."
        )

    try:
        follow, created = (
            Follow.objects.get_or_create(
                follower=follower,
                following=target_user,
            )
        )
    except IntegrityError:
        follow = Follow.objects.get(
            follower=follower,
            following=target_user,
        )
        created = False

    return follow, created


@transaction.atomic
def unfollow_user(
    *,
    follower,
    target_user,
):
    deleted, _ = Follow.objects.filter(
        follower=follower,
        following=target_user,
    ).delete()

    return deleted > 0


@transaction.atomic
def request_verification(
    *,
    user,
    reason="",
):
    profile = get_or_create_profile(user)

    if (
        not user.is_active
        or not profile.is_active
    ):
        raise AccountServiceError(
            "Your account is not active."
        )

    if profile.is_verified:
        raise AccountServiceError(
            "Your account is already verified."
        )

    existing = (
        VerificationRequest.objects
        .filter(
            user=user,
            status=(
                VerificationRequest.STATUS_PENDING
            ),
        )
        .first()
    )

    if existing:
        raise AccountServiceError(
            "You already have a pending verification request."
        )

    now = timezone.now()

    verification = (
        VerificationRequest.objects.create(
            user=user,
            reason=reason.strip(),
            requested_at=now,
        )
    )

    profile.verification_requested_at = now

    profile.save(
        update_fields=[
            "verification_requested_at",
            "updated_at",
        ]
    )

    return verification


@transaction.atomic
def review_verification(
    *,
    verification_request,
    admin_user,
    approved,
    admin_note="",
):
    if (
        verification_request.status
        != VerificationRequest.STATUS_PENDING
    ):
        raise AccountServiceError(
            "This verification request has already been reviewed."
        )

    if not is_skillhive_admin(admin_user):
        raise AccountServiceError(
            "SkillHive administrator permission is required."
        )

    user = verification_request.user
    profile = get_or_create_profile(user)
    now = timezone.now()

    verification_request.reviewed_by = admin_user
    verification_request.reviewed_at = now
    verification_request.admin_note = (
        admin_note or ""
    ).strip()

    if approved:
        verification_request.status = (
            VerificationRequest.STATUS_APPROVED
        )

        profile.is_verified = True
        profile.verification_approved_at = now
        profile.verification_note = (
            admin_note or ""
        ).strip()

        notification_message = (
            "Your SkillHive verification request "
            "has been approved."
        )

        if admin_note:
            notification_message += (
                f" Admin note: {admin_note.strip()}"
            )

    else:
        verification_request.status = (
            VerificationRequest.STATUS_REJECTED
        )

        profile.is_verified = False
        profile.verification_note = (
            admin_note or ""
        ).strip()

        notification_message = (
            "Your SkillHive verification request "
            "has been rejected."
        )

        if admin_note:
            notification_message += (
                f" Reason: {admin_note.strip()}"
            )

    verification_request.save(
        update_fields=[
            "status",
            "reviewed_by",
            "reviewed_at",
            "admin_note",
        ]
    )

    profile.save(
        update_fields=[
            "is_verified",
            "verification_approved_at",
            "verification_note",
            "updated_at",
        ]
    )

    create_admin_audit_log(
        admin=admin_user,
        action=(
            "verification_approved"
            if approved
            else "verification_rejected"
        ),
        target_type="verification",
        target_id=verification_request.pk,
        target_user=user,
        reason=admin_note,
        metadata={
            "verification_request_id":
                verification_request.pk,
        },
    )

    create_notification(
        user=user,
        notification_type=(
            Notification.TYPE_VERIFICATION
        ),
        message=notification_message,
    )

    return verification_request


@transaction.atomic
def complete_onboarding(*, user):
    profile = get_or_create_profile(user)

    profile.onboarding_completed = True
    profile.onboarding_skipped = False
    profile.onboarding_completed_at = (
        timezone.now()
    )

    profile.save(
        update_fields=[
            "onboarding_completed",
            "onboarding_skipped",
            "onboarding_completed_at",
            "updated_at",
        ]
    )

    return profile


@transaction.atomic
def skip_onboarding(*, user):
    profile = get_or_create_profile(user)

    profile.onboarding_completed = False
    profile.onboarding_skipped = True
    profile.onboarding_completed_at = None

    profile.save(
        update_fields=[
            "onboarding_completed",
            "onboarding_skipped",
            "onboarding_completed_at",
            "updated_at",
        ]
    )

    return profile


# ============================================================
# ACCOUNT DEACTIVATION / RECOVERY
# ============================================================

@transaction.atomic
def request_account_deactivation(
    *,
    user,
    current_password,
):
    profile = get_or_create_profile(user)

    if profile.permanently_deactivated:
        raise AccountServiceError(
            "Your account has already been permanently deactivated."
        )

    if (
        not user.is_active
        or not profile.is_active
    ):
        raise AccountServiceError(
            "Your account is already inactive."
        )

    if profile.deactivation_scheduled_for:
        raise AccountServiceError(
            "Your account is already scheduled for deactivation."
        )

    current_password = str(
        current_password or ""
    )

    if not current_password:
        raise AccountServiceError(
            "Current password is required."
        )

    if not user.check_password(
        current_password
    ):
        raise AccountServiceError(
            "Your current password is incorrect."
        )

    now = timezone.now()
    scheduled_for = now + timedelta(days=30)

    user.is_active = False
    user.save(
        update_fields=["is_active"]
    )

    profile.deactivation_requested_at = now
    profile.deactivation_scheduled_for = scheduled_for
    profile.permanently_deactivated = False
    profile.is_active = False

    profile.save(
        update_fields=[
            "deactivation_requested_at",
            "deactivation_scheduled_for",
            "permanently_deactivated",
            "is_active",
            "updated_at",
        ]
    )

    frontend_url = getattr(
        settings,
        "FRONTEND_URL",
        "http://localhost:5173",
    ).rstrip("/")

    login_url = f"{frontend_url}/login"

    display_name = (
        user.get_full_name().strip()
        or user.username
    )

    scheduled_date = timezone.localtime(
        scheduled_for
    ).strftime("%B %d, %Y at %I:%M %p")

    send_mail(
        subject=(
            "Your SkillHive account has been deactivated"
        ),
        message=(
            f"Hello {display_name},\n\n"
            "Your SkillHive account has been "
            "successfully deactivated.\n\n"
            f"Your account is scheduled for permanent "
            f"deactivation on {scheduled_date}.\n\n"
            "You can restore your account at any time "
            "during the 30-day recovery period by "
            "logging in to SkillHive with your existing "
            "email and password.\n\n"
            f"Log in here:\n{login_url}\n\n"
            "If you log in before the recovery period "
            "expires, your account will be automatically "
            "reactivated.\n\n"
            "After the 30-day recovery period expires, "
            "your account will be permanently deactivated "
            "and cannot be restored.\n\n"
            "If you did not request this deactivation, "
            "please log in to your account immediately "
            "or contact SkillHive support.\n\n"
            "Regards,\n"
            "SkillHive Team"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )

    return profile


@transaction.atomic
def cancel_account_deactivation(*, user):
    profile = get_or_create_profile(user)

    if profile.permanently_deactivated:
        raise AccountServiceError(
            "Your account has already been permanently deactivated."
        )

    if not profile.deactivation_scheduled_for:
        raise AccountServiceError(
            "Your account is not scheduled for deactivation."
        )

    if profile.deactivation_scheduled_for <= timezone.now():
        raise AccountServiceError(
            "The 30-day recovery period has expired."
        )

    if has_active_user_restriction(user):
        raise AccountServiceError(
            "Your account is currently restricted."
        )

    profile.deactivation_requested_at = None
    profile.deactivation_scheduled_for = None
    profile.permanently_deactivated = False
    profile.is_active = True

    profile.save(
        update_fields=[
            "deactivation_requested_at",
            "deactivation_scheduled_for",
            "permanently_deactivated",
            "is_active",
            "updated_at",
        ]
    )

    if not user.is_active:
        user.is_active = True
        user.save(
            update_fields=["is_active"]
        )

    return profile


@transaction.atomic
def restore_pending_deactivation(*, user):
    profile = getattr(
        user,
        "profile",
        None,
    )

    if not profile:
        return None

    if profile.permanently_deactivated:
        return profile

    scheduled_for = (
        profile.deactivation_scheduled_for
    )

    if not scheduled_for:
        return profile

    now = timezone.now()

    if scheduled_for <= now:
        profile.permanently_deactivated = True
        profile.is_active = False

        profile.save(
            update_fields=[
                "permanently_deactivated",
                "is_active",
                "updated_at",
            ]
        )

        if user.is_active:
            user.is_active = False
            user.save(
                update_fields=["is_active"]
            )

        return profile

    if has_active_user_restriction(user):
        return profile

    profile.deactivation_requested_at = None
    profile.deactivation_scheduled_for = None
    profile.permanently_deactivated = False
    profile.is_active = True

    profile.save(
        update_fields=[
            "deactivation_requested_at",
            "deactivation_scheduled_for",
            "permanently_deactivated",
            "is_active",
            "updated_at",
        ]
    )

    if not user.is_active:
        user.is_active = True
        user.save(
            update_fields=["is_active"]
        )

    return profile


@transaction.atomic
def permanently_deactivate_expired_accounts():
    now = timezone.now()

    profiles = (
        Profile.objects
        .select_related("user")
        .filter(
            deactivation_scheduled_for__isnull=False,
            deactivation_scheduled_for__lte=now,
            permanently_deactivated=False,
        )
    )

    count = 0

    for profile in profiles:
        user = profile.user

        user.is_active = False
        user.save(
            update_fields=["is_active"]
        )

        profile.is_active = False
        profile.permanently_deactivated = True

        profile.save(
            update_fields=[
                "is_active",
                "permanently_deactivated",
                "updated_at",
            ]
        )

        count += 1

    return count


def get_public_profile_queryset():
    return (
        Profile.objects
        .filter(
            user__is_active=True,
            is_active=True,
        )
        .select_related("user")
    )


def _validate_report_target(
    target_type,
    target_id,
):
    if target_type == Report.TARGET_USER:
        exists = User.objects.filter(
            pk=target_id
        ).exists()

    elif target_type == Report.TARGET_CONTENT:
        from marketplace.models import MarketplaceContent

        exists = MarketplaceContent.objects.filter(
            pk=target_id
        ).exists()

    elif target_type == Report.TARGET_EXCHANGE:
        from exchanges.models import SkillExchange

        exists = SkillExchange.objects.filter(
            pk=target_id
        ).exists()

    elif target_type == Report.TARGET_SESSION:
        from skill_sessions.models import SkillSession

        exists = SkillSession.objects.filter(
            pk=target_id
        ).exists()

    elif target_type == Report.TARGET_MESSAGE:
        from chat.models import Message

        exists = Message.objects.filter(
            pk=target_id
        ).exists()

    else:
        raise AccountServiceError(
            "Unsupported report target."
        )

    if not exists:
        raise AccountServiceError(
            "The reported item does not exist."
        )


@transaction.atomic
def create_report(
    *,
    reporter,
    target_type,
    target_id,
    reason,
    description="",
):
    if not reporter.is_active:
        raise AccountServiceError(
            "Your account is not active."
        )

    if (
        target_type == Report.TARGET_USER
        and int(target_id) == reporter.pk
    ):
        raise AccountServiceError(
            "You cannot report yourself."
        )

    _validate_report_target(
        target_type,
        target_id,
    )

    duplicate = (
        Report.objects
        .filter(
            reporter=reporter,
            target_type=target_type,
            target_id=target_id,
            status__in=[
                Report.STATUS_PENDING,
                Report.STATUS_UNDER_REVIEW,
            ],
        )
        .exists()
    )

    if duplicate:
        raise AccountServiceError(
            "You already have an active report for this item."
        )

    return Report.objects.create(
        reporter=reporter,
        target_type=target_type,
        target_id=target_id,
        reason=reason.strip(),
        description=description.strip(),
    )


@transaction.atomic
def review_report(
    *,
    report,
    admin_user,
    status_value,
    admin_note="",
):
    if not is_skillhive_admin(admin_user):
        raise AccountServiceError(
            "SkillHive administrator permission is required."
        )

    if report.status in {
        Report.STATUS_RESOLVED,
        Report.STATUS_DISMISSED,
    }:
        raise AccountServiceError(
            "This report has already been closed."
        )

    report.status = status_value
    report.reviewed_by = admin_user
    report.reviewed_at = timezone.now()
    report.admin_note = (
        admin_note or ""
    ).strip()

    report.save(
        update_fields=[
            "status",
            "reviewed_by",
            "reviewed_at",
            "admin_note",
        ]
    )

    create_admin_audit_log(
        admin=admin_user,
        action="report_reviewed",
        target_type=report.target_type,
        target_id=report.target_id,
        target_user=(
            report.reporter
            if report.target_type == Report.TARGET_USER
            else None
        ),
        reason=report.admin_note,
        metadata={
            "report_id": report.pk,
            "status": report.status,
        },
    )

    report_message = (
        "Your report has been reviewed by "
        "SkillHive administration."
    )

    if report.status == Report.STATUS_RESOLVED:
        report_message = (
            "Your report has been reviewed and "
            "marked as resolved by SkillHive "
            "administration."
        )
    elif report.status == Report.STATUS_DISMISSED:
        report_message = (
            "Your report has been reviewed and "
            "dismissed by SkillHive administration."
        )

    if report.admin_note:
        report_message += (
            f" Admin note: {report.admin_note}"
        )

    create_notification(
        user=report.reporter,
        notification_type=Notification.TYPE_REPORT,
        message=report_message,
    )

    return report


@transaction.atomic
def create_user_restriction(
    *,
    admin_user,
    user,
    restriction_type,
    reason,
    expires_at=None,
):
    if not is_skillhive_admin(admin_user):
        raise AccountServiceError(
            "SkillHive administrator permission is required."
        )

    if user == admin_user:
        raise AccountServiceError(
            "An administrator cannot restrict their own account."
        )

    if not user.is_active:
        raise AccountServiceError(
            "This account is already inactive."
        )

    if restriction_type not in {
        UserRestriction.TYPE_WARNING,
        UserRestriction.TYPE_SUSPENSION,
        UserRestriction.TYPE_BAN,
    }:
        raise AccountServiceError(
            "Invalid restriction type."
        )

    now = timezone.now()

    if expires_at and expires_at <= now:
        raise AccountServiceError(
            "Expiration must be in the future."
        )

    if restriction_type in {
        UserRestriction.TYPE_SUSPENSION,
        UserRestriction.TYPE_BAN,
    }:
        existing = get_active_user_restriction(
            user
        )

        if existing:
            raise AccountServiceError(
                "This user already has an active restriction."
            )

    restriction = UserRestriction.objects.create(
        user=user,
        restriction_type=restriction_type,
        reason=reason.strip(),
        created_by=admin_user,
        starts_at=now,
        expires_at=expires_at,
        is_active=True,
    )

    if restriction_type == UserRestriction.TYPE_WARNING:
        notification_message = (
            "Your SkillHive account has received "
            "an administrative warning."
        )

        if reason.strip():
            notification_message += (
                f" Reason: {reason.strip()}"
            )

        if expires_at:
            notification_message += (
                f" This warning expires on "
                f"{timezone.localtime(expires_at).strftime('%B %d, %Y at %I:%M %p')}."
            )

        create_notification(
            user=user,
            notification_type=Notification.TYPE_ACCOUNT,
            message=notification_message,
        )

    elif restriction_type == UserRestriction.TYPE_SUSPENSION:
        notification_message = (
            "Your SkillHive account has been "
            "suspended by an administrator."
        )

        if reason.strip():
            notification_message += (
                f" Reason: {reason.strip()}"
            )

        if expires_at:
            notification_message += (
                f" Your suspension expires on "
                f"{timezone.localtime(expires_at).strftime('%B %d, %Y at %I:%M %p')}."
            )

        # Create before deactivation because the
        # notification service intentionally ignores
        # inactive users.
        create_notification(
            user=user,
            notification_type=Notification.TYPE_ACCOUNT,
            message=notification_message,
        )

        user.is_active = False

        user.save(
            update_fields=["is_active"]
        )

        profile = get_or_create_profile(user)
        profile.is_active = False

        profile.save(
            update_fields=[
                "is_active",
                "updated_at",
            ]
        )

    else:
        notification_message = (
            "Your SkillHive account has been "
            "banned by an administrator."
        )

        if reason.strip():
            notification_message += (
                f" Reason: {reason.strip()}"
            )

        if expires_at:
            notification_message += (
                f" Your ban expires on "
                f"{timezone.localtime(expires_at).strftime('%B %d, %Y at %I:%M %p')}."
            )

        create_notification(
            user=user,
            notification_type=Notification.TYPE_ACCOUNT,
            message=notification_message,
        )

        user.is_active = False

        user.save(
            update_fields=["is_active"]
        )

        profile = get_or_create_profile(user)
        profile.is_active = False

        profile.save(
            update_fields=[
                "is_active",
                "updated_at",
            ]
        )

    create_admin_audit_log(
        admin=admin_user,
        action="user_restricted",
        target_type="user",
        target_id=user.pk,
        target_user=user,
        reason=reason,
        metadata={
            "restriction_type":
                restriction_type,
            "expires_at":
                expires_at.isoformat()
                if expires_at
                else None,
        },
    )

    return restriction


@transaction.atomic
def remove_user_restriction(
    *,
    admin_user,
    restriction,
):
    if not is_skillhive_admin(admin_user):
        raise AccountServiceError(
            "SkillHive administrator permission is required."
        )

    if not restriction.is_active:
        return restriction

    restriction.is_active = False

    restriction.save(
        update_fields=[
            "is_active",
            "updated_at",
        ]
    )

    user = restriction.user
    profile = get_or_create_profile(user)

    active_restriction = get_active_user_restriction(
        user
    )

    if active_restriction is None:
        if profile.permanently_deactivated:
            user.is_active = False
            profile.is_active = False

        elif profile.deactivation_scheduled_for:
            user.is_active = False
            profile.is_active = False

        else:
            user.is_active = True
            profile.is_active = True

        user.save(
            update_fields=["is_active"]
        )

        profile.save(
            update_fields=[
                "is_active",
                "updated_at",
            ]
        )

    create_admin_audit_log(
        admin=admin_user,
        action="user_restriction_removed",
        target_type="user_restriction",
        target_id=restriction.pk,
        target_user=user,
        reason="Restriction removed by administrator.",
        metadata={
            "restriction_type":
                restriction.restriction_type,
        },
    )

    # If the account is active again, notify the user.
    # If the account remains permanently/voluntarily
    # inactive, the notification service intentionally
    # does not create a notification for that account.
    if user.is_active and profile.is_active:
        create_notification(
            user=user,
            notification_type=Notification.TYPE_ACCOUNT,
            message=(
                "Your SkillHive account restriction "
                "has been removed by an administrator."
            ),
        )

    return restriction


@transaction.atomic
def ban_identifier(
    *,
    admin_user,
    identifier_type,
    identifier,
    reason,
    expires_at=None,
):
    if not is_skillhive_admin(admin_user):
        raise AccountServiceError(
            "SkillHive administrator permission is required."
        )

    normalized = normalize_identifier(
        identifier_type,
        identifier,
    )

    if not normalized:
        raise AccountServiceError(
            "Identifier is required."
        )

    now = timezone.now()

    if expires_at and expires_at <= now:
        raise AccountServiceError(
            "Expiration must be in the future."
        )

    existing = (
        BannedIdentifier.objects
        .filter(
            identifier_type=identifier_type,
            identifier=normalized,
        )
        .first()
    )

    if existing:
        if existing.is_active:
            raise AccountServiceError(
                "This identifier is already banned."
            )

        existing.is_active = True
        existing.reason = reason.strip()
        existing.created_by = admin_user
        existing.starts_at = now
        existing.expires_at = expires_at

        existing.save()

        banned = existing

    else:
        banned = BannedIdentifier.objects.create(
            identifier_type=identifier_type,
            identifier=normalized,
            reason=reason.strip(),
            created_by=admin_user,
            starts_at=now,
            expires_at=expires_at,
            is_active=True,
        )

    create_admin_audit_log(
        admin=admin_user,
        action="identifier_banned",
        target_type="banned_identifier",
        target_id=banned.pk,
        reason=reason,
        metadata={
            "identifier_type":
                identifier_type,
            "identifier":
                normalized,
            "expires_at":
                expires_at.isoformat()
                if expires_at
                else None,
        },
    )

    return banned


@transaction.atomic
def unban_identifier(
    *,
    admin_user,
    banned_identifier,
):
    if not is_skillhive_admin(admin_user):
        raise AccountServiceError(
            "SkillHive administrator permission is required."
        )

    banned_identifier.is_active = False

    banned_identifier.save(
        update_fields=[
            "is_active",
            "updated_at",
        ]
    )

    create_admin_audit_log(
        admin=admin_user,
        action="identifier_unbanned",
        target_type="banned_identifier",
        target_id=banned_identifier.pk,
        reason="Identifier ban removed.",
        metadata={
            "identifier_type":
                banned_identifier.identifier_type,
            "identifier":
                banned_identifier.identifier,
        },
    )

    return banned_identifier