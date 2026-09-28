from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        (
            "exchanges",
            "0002_exchangerequest_exchanges_e_request_7b61aa_idx_and_more",
        ),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("skills", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExchangePost",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "title",
                    models.CharField(max_length=200),
                ),
                (
                    "description",
                    models.TextField(blank=True),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("open", "Open"),
                            ("closed", "Closed"),
                            ("cancelled", "Cancelled"),
                        ],
                        db_index=True,
                        default="open",
                        max_length=20,
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True),
                ),
                (
                    "creator",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="exchange_posts",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "offered_skill",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="exchange_posts_offered",
                        to="skills.skill",
                    ),
                ),
                (
                    "requested_skill",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="exchange_posts_requested",
                        to="skills.skill",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]