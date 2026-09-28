from django.urls import path

from .views import (
    generate_my_certificate,
    my_certificates,
    verify_certificate,
)


urlpatterns = [
    path(
        "generate/",
        generate_my_certificate,
        name="generate-certificate",
    ),
    path(
        "my/",
        my_certificates,
        name="my-certificates",
    ),
    path(
        "verify/<str:certificate_id>/",
        verify_certificate,
        name="verify-certificate",
    ),
]