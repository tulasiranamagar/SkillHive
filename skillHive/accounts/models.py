from django.contrib.auth.models import User
from django.db import models
from django.db.models import F, Q
from django.utils import timezone


class Profile(models.Model):
    ROLE_USER = "user"
    ROLE_ADMIN = "admin"

    ROLE_CHOICES = [
        (ROLE_USER, "User"),
        (ROLE_ADMIN, "Admin"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )

    profile_picture = models.ImageField(
        upload_to="profiles/",
        blank=True,
        null=True,
    )

    cover_picture = models.ImageField(
        upload_to="covers/",
        blank=True,
        null=True,
    )

    bio = models.TextField(
        blank=True,
        max_length=1000,
    )

    country = models.CharField(
        max_length=100,
        blank=True,
    )

    city = models.CharField(
        max_length=100,
        blank=True,
    )

    date_of_birth = models.DateField(
        blank=True,
        null=True,
    )

    # Kept for backward compatibility.
    # New frontend should prefer ProfileLink.
    github_url = models.URLField(
        blank=True,
        max_length=300,
    )

    linkedin_url = models.URLField(
        blank=True,
        max_length=300,
    )

    portfolio_url = models.URLField(
        blank=True,
        max_length=300,
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_USER,
        db_index=True,
    )

    is_verified = models.BooleanField(
        default=False,
        db_index=True,
    )

    verification_requested_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    verification_approved_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    verification_note = models.TextField(
        blank=True,
        max_length=2000,
    )

    onboarding_completed = models.BooleanField(
        default=False,
        db_index=True,
    )

    onboarding_skipped = models.BooleanField(
        default=False,
    )

    onboarding_completed_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    deactivation_requested_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
    )

    deactivation_scheduled_for = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
    )

    # False while the account is temporarily inactive during
    # the 30-day recovery period.
    #
    # True after the recovery period expires.
    # A permanently deactivated account can never log in again.
    permanently_deactivated = models.BooleanField(
        default=False,
        db_index=True,
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["is_active", "is_verified"],
                name="profile_active_verified_idx",
            ),
            models.Index(
                fields=["country", "city"],
                name="profile_country_city_idx",
            ),
            models.Index(
                fields=[
                    "deactivation_requested_at",
                    "deactivation_scheduled_for",
                ],
                name="profile_deactivation_idx",
            ),
        ]

    def __str__(self):
        return self.user.username

    @property
    def full_name(self):
        return (
            self.user.get_full_name().strip()
            or self.user.username
        )


class ProfileLink(models.Model):
    profile = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="links",
    )

    url = models.URLField(
        max_length=500,
    )

    label = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )

    ordering = models.PositiveIntegerField(
        default=0,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "ordering",
            "created_at",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["profile", "url"],
                name="unique_profile_link_url",
            ),
        ]
        indexes = [
            models.Index(
                fields=["profile", "ordering"],
                name="profile_link_order_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.profile.user.username} - {self.url}"
        )


class Follow(models.Model):
    follower = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="following_relationships",
    )

    following = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="follower_relationships",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["follower", "following"],
                name="unique_user_follow",
            ),
            models.CheckConstraint(
                condition=~Q(follower=F("following")),
                name="prevent_self_follow",
            ),
        ]
        indexes = [
            models.Index(
                fields=["follower", "created_at"],
                name="follow_follower_date_idx",
            ),
            models.Index(
                fields=["following", "created_at"],
                name="follow_following_date_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.follower.username} -> "
            f"{self.following.username}"
        )


class VerificationRequest(models.Model):
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="verification_requests",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )

    reason = models.TextField(
        blank=True,
        max_length=2000,
    )

    admin_note = models.TextField(
        blank=True,
        max_length=2000,
    )

    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_verification_requests",
    )

    requested_at = models.DateTimeField(
        default=timezone.now,
    )

    reviewed_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["-requested_at"]
        indexes = [
            models.Index(
                fields=["user", "status"],
                name="verification_user_status_idx",
            ),
            models.Index(
                fields=["status", "requested_at"],
                name="verification_status_date_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.user.username} - {self.status}"
        )


class Report(models.Model):
    TARGET_USER = "user"
    TARGET_CONTENT = "content"
    TARGET_EXCHANGE = "exchange"
    TARGET_SESSION = "session"
    TARGET_MESSAGE = "message"

    TARGET_TYPE_CHOICES = [
        (TARGET_USER, "User"),
        (TARGET_CONTENT, "Marketplace Content"),
        (TARGET_EXCHANGE, "Skill Exchange"),
        (TARGET_SESSION, "Skill Session"),
        (TARGET_MESSAGE, "Message"),
    ]

    STATUS_PENDING = "pending"
    STATUS_UNDER_REVIEW = "under_review"
    STATUS_RESOLVED = "resolved"
    STATUS_DISMISSED = "dismissed"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_UNDER_REVIEW, "Under Review"),
        (STATUS_RESOLVED, "Resolved"),
        (STATUS_DISMISSED, "Dismissed"),
    ]

    reporter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="submitted_reports",
    )

    target_type = models.CharField(
        max_length=30,
        choices=TARGET_TYPE_CHOICES,
        db_index=True,
    )

    target_id = models.PositiveBigIntegerField()

    reason = models.CharField(
        max_length=255,
    )

    description = models.TextField(
        blank=True,
        max_length=3000,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )

    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_reports",
    )

    admin_note = models.TextField(
        blank=True,
        max_length=3000,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    reviewed_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["status", "created_at"],
                name="report_status_date_idx",
            ),
            models.Index(
                fields=["target_type", "target_id"],
                name="report_target_idx",
            ),
            models.Index(
                fields=["reporter", "created_at"],
                name="report_reporter_date_idx",
            ),
        ]

    def __str__(self):
        return (
            f"Report #{self.pk} - "
            f"{self.target_type}:{self.target_id}"
        )


class UserRestriction(models.Model):
    TYPE_WARNING = "warning"
    TYPE_SUSPENSION = "suspension"
    TYPE_BAN = "ban"

    RESTRICTION_TYPE_CHOICES = [
        (TYPE_WARNING, "Warning"),
        (TYPE_SUSPENSION, "Suspension"),
        (TYPE_BAN, "Ban"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="restrictions",
    )

    restriction_type = models.CharField(
        max_length=20,
        choices=RESTRICTION_TYPE_CHOICES,
        db_index=True,
    )

    reason = models.TextField(
        max_length=3000,
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_restrictions",
    )

    starts_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
    )

    expires_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=[
                    "user",
                    "is_active",
                    "restriction_type",
                ],
                name="restrict_user_active_type_idx",
            ),
            models.Index(
                fields=[
                    "is_active",
                    "expires_at",
                ],
                name="restriction_active_expiry_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.user.username} - "
            f"{self.restriction_type}"
        )


class BannedIdentifier(models.Model):
    TYPE_EMAIL = "email"

    IDENTIFIER_TYPE_CHOICES = [
        (TYPE_EMAIL, "Email"),
    ]

    identifier_type = models.CharField(
        max_length=20,
        choices=IDENTIFIER_TYPE_CHOICES,
        default=TYPE_EMAIL,
        db_index=True,
    )

    identifier = models.CharField(
        max_length=320,
    )

    reason = models.TextField(
        max_length=3000,
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_identifier_bans",
    )

    starts_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
    )

    expires_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "identifier_type",
                    "identifier",
                ],
                name="unique_banned_identifier",
            ),
        ]
        indexes = [
            models.Index(
                fields=[
                    "identifier_type",
                    "identifier",
                ],
                name="banned_identifier_lookup_idx",
            ),
            models.Index(
                fields=[
                    "is_active",
                    "expires_at",
                ],
                name="banned_identifier_active_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.identifier_type}: "
            f"{self.identifier}"
        )


class AdminAuditLog(models.Model):
    admin = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="admin_audit_logs",
    )

    action = models.CharField(
        max_length=100,
        db_index=True,
    )

    target_type = models.CharField(
        max_length=50,
        blank=True,
        default="",
        db_index=True,
    )

    target_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )

    target_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="targeted_admin_actions",
    )

    reason = models.TextField(
        blank=True,
        max_length=3000,
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["admin", "created_at"],
                name="audit_admin_date_idx",
            ),
            models.Index(
                fields=["action", "created_at"],
                name="audit_action_date_idx",
            ),
            models.Index(
                fields=[
                    "target_type",
                    "target_id",
                ],
                name="audit_target_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.action} by "
            f"{self.admin_id}"
        )


# ============================================================
# CONTACT MESSAGES
# ============================================================

class ContactMessage(models.Model):
    STATUS_NEW = "new"
    STATUS_UNDER_REVIEW = "under_review"
    STATUS_RESOLVED = "resolved"

    STATUS_CHOICES = [
        (STATUS_NEW, "New"),
        (STATUS_UNDER_REVIEW, "Under Review"),
        (STATUS_RESOLVED, "Resolved"),
    ]

    name = models.CharField(
        max_length=150,
    )

    email = models.EmailField(
        max_length=320,
    )

    subject = models.CharField(
        max_length=255,
    )

    message = models.TextField(
        max_length=5000,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_NEW,
        db_index=True,
    )

    admin_note = models.TextField(
        blank=True,
        max_length=3000,
    )

    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_contact_messages",
    )

    reviewed_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["status", "created_at"],
                name="contact_status_date_idx",
            ),
        ]

    def __str__(self):
        return (
            f"Contact #{self.pk} - "
            f"{self.subject}"
        )