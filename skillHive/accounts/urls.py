from django.urls import path

from .views import (
    AdminAuditLogListView,
    AdminBannedIdentifierListCreateView,
    AdminBannedIdentifierRemoveView,
    AdminContactMessageListView,
    AdminContactMessageReviewView,
    AdminDashboardView,
    AdminReportListView,
    AdminReportReviewView,
    AdminUserDetailView,
    AdminUserListView,
    AdminUserRestrictionRemoveView,
    AdminUserRestrictionView,
    AdminVerificationRequestListView,
    AdminVerificationReviewView,
    CancelAccountDeactivationView,
    CompleteOnboardingView,
    ContactMessageCreateView,
    DeleteMyCoverPictureView,
    DeleteMyProfilePictureView,
    ExpiredDeactivationMaintenanceView,
    FollowersView,
    FollowingView,
    FollowUserView,
    ForgotPasswordView,
    MeProfileView,
    MeUserUpdateView,
    MeView,
    MyProfileLinkDetailView,
    MyProfileLinkListCreateView,
    MyReportsView,
    MyVerificationRequestView,
    PublicProfileDetailView,
    PublicProfileListView,
    RegisterView,
    ReportCreateView,
    RequestAccountDeactivationView,
    ResetPasswordView,
    SkipOnboardingView,
    VerificationRequestCreateView,
)


urlpatterns = [
    
    path(
        "register/",
        RegisterView.as_view(),
        name="register",
    ),

    path(
        "password-reset/",
        ForgotPasswordView.as_view(),
        name="password-reset",
    ),

    path(
        "password-reset/confirm/",
        ResetPasswordView.as_view(),
        name="password-reset-confirm",
    ),

    path(
        "me/",
        MeView.as_view(),
        name="me",
    ),

    path(
        "me/profile/",
        MeProfileView.as_view(),
        name="me-profile",
    ),

    path(
        "me/user/",
        MeUserUpdateView.as_view(),
        name="me-user",
    ),

    path(
        "me/links/",
        MyProfileLinkListCreateView.as_view(),
        name="my-profile-links",
    ),

    path(
        "me/links/<int:pk>/",
        MyProfileLinkDetailView.as_view(),
        name="my-profile-link-detail",
    ),


    path(
        "me/profile-picture/",
        DeleteMyProfilePictureView.as_view(),
        name="delete-profile-picture",
    ),

    path(
        "me/cover-picture/",
        DeleteMyCoverPictureView.as_view(),
        name="delete-cover-picture",
    ),

    path(
        "onboarding/complete/",
        CompleteOnboardingView.as_view(),
        name="onboarding-complete",
    ),

    path(
        "onboarding/skip/",
        SkipOnboardingView.as_view(),
        name="onboarding-skip",
    ),

    path(
        "deactivate/",
        RequestAccountDeactivationView.as_view(),
        name="account-deactivate",
    ),

    path(
        "deactivate/cancel/",
        CancelAccountDeactivationView.as_view(),
        name="account-deactivate-cancel",
    ),

    path(
        "contact/",
        ContactMessageCreateView.as_view(),
        name="contact-message-create",
    ),

    path(
        "users/",
        PublicProfileListView.as_view(),
        name="public-profile-list",
    ),

    path(
        "users/<str:username>/",
        PublicProfileDetailView.as_view(),
        name="public-profile-detail",
    ),


    path(
        "users/<str:username>/follow/",
        FollowUserView.as_view(),
        name="follow-user",
    ),

    path(
        "users/<str:username>/followers/",
        FollowersView.as_view(),
        name="followers",
    ),

    path(
        "users/<str:username>/following/",
        FollowingView.as_view(),
        name="following",
    ),

    path(
        "verification/request/",
        VerificationRequestCreateView.as_view(),
        name="verification-request",
    ),

    path(
        "verification/my/",
        MyVerificationRequestView.as_view(),
        name="my-verification",
    ),
    
    path(
        "reports/",
        ReportCreateView.as_view(),
        name="create-report",
    ),

    path(
        "reports/my/",
        MyReportsView.as_view(),
        name="my-reports",
    ),

    path(
        "admin/dashboard/",
        AdminDashboardView.as_view(),
        name="admin-dashboard",
    ),
    
    path(
        "admin/users/",
        AdminUserListView.as_view(),
        name="admin-users",
    ),

    path(
        "admin/users/<int:pk>/",
        AdminUserDetailView.as_view(),
        name="admin-user-detail",
    ),

    path(
        "admin/users/<int:pk>/restriction/",
        AdminUserRestrictionView.as_view(),
        name="admin-user-restriction",
    ),

    path(
        "admin/restrictions/<int:restriction_id>/remove/",
        AdminUserRestrictionRemoveView.as_view(),
        name="admin-restriction-remove",
    ),
    
    path(
        "admin/verifications/",
        AdminVerificationRequestListView.as_view(),
        name="admin-verifications",
    ),

    path(
        "admin/verifications/<int:pk>/review/",
        AdminVerificationReviewView.as_view(),
        name="admin-verification-review",
    ),


    path(
        "admin/reports/",
        AdminReportListView.as_view(),
        name="admin-reports",
    ),

    path(
        "admin/reports/<int:pk>/review/",
        AdminReportReviewView.as_view(),
        name="admin-report-review",
    ),

    path(
        "admin/contact-messages/",
        AdminContactMessageListView.as_view(),
        name="admin-contact-messages",
    ),

    path(
        "admin/contact-messages/<int:pk>/review/",
        AdminContactMessageReviewView.as_view(),
        name="admin-contact-message-review",
    ),

    path(
        "admin/banned-identifiers/",
        AdminBannedIdentifierListCreateView.as_view(),
        name="admin-banned-identifiers",
    ),

    path(
        "admin/banned-identifiers/<int:pk>/remove/",
        AdminBannedIdentifierRemoveView.as_view(),
        name="admin-banned-identifier-remove",
    ),

    path(
        "admin/audit-logs/",
        AdminAuditLogListView.as_view(),
        name="admin-audit-logs",
    ),
    
    path(
        "admin/maintenance/deactivations/",
        ExpiredDeactivationMaintenanceView.as_view(),
        name="admin-process-expired-deactivations",
    ),
]