from datetime import timedelta

from django.db import migrations, models
from django.utils import timezone
import django.core.validators


def copy_old_skill_names(apps, schema_editor):
    ExchangePost = apps.get_model("exchanges", "ExchangePost")

    for post in ExchangePost.objects.select_related(
        "offered_skill",
        "requested_skill",
    ).all():
        offered_name = (
            post.offered_skill.name
            if post.offered_skill_id and post.offered_skill
            else "Unknown Skill"
        )

        requested_name = (
            post.requested_skill.name
            if post.requested_skill_id and post.requested_skill
            else "Unknown Skill"
        )

        post.offered_skill_name = offered_name
        post.requested_skill_name = requested_name

        # Existing exchanges did not have a scheduled_at field.
        # Preserve them by assigning a safe future date.
        post.scheduled_at = timezone.now() + timedelta(days=1)

        if not post.duration_minutes:
            post.duration_minutes = 60

        post.save(
            update_fields=[
                "offered_skill_name",
                "requested_skill_name",
                "scheduled_at",
                "duration_minutes",
            ]
        )


class Migration(migrations.Migration):

    dependencies = [
        ("exchanges", "0004_exchangepost_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="exchangepost",
            name="offered_skill_name",
            field=models.CharField(
                max_length=150,
                null=True,
                blank=True,
            ),
        ),

        migrations.AddField(
            model_name="exchangepost",
            name="requested_skill_name",
            field=models.CharField(
                max_length=150,
                null=True,
                blank=True,
            ),
        ),

        migrations.AddField(
            model_name="exchangepost",
            name="scheduled_at",
            field=models.DateTimeField(
                null=True,
                blank=True,
            ),
        ),

        migrations.AddField(
            model_name="exchangepost",
            name="duration_minutes",
            field=models.PositiveIntegerField(
                default=60,
                validators=[
                    django.core.validators.MinValueValidator(1),
                ],
            ),
        ),

        migrations.RunPython(
            copy_old_skill_names,
            migrations.RunPython.noop,
        ),

        migrations.RemoveField(
            model_name="exchangepost",
            name="offered_skill",
        ),

        migrations.RemoveField(
            model_name="exchangepost",
            name="requested_skill",
        ),

        migrations.AlterField(
            model_name="exchangepost",
            name="offered_skill_name",
            field=models.CharField(
                max_length=150,
            ),
        ),

        migrations.AlterField(
            model_name="exchangepost",
            name="requested_skill_name",
            field=models.CharField(
                max_length=150,
            ),
        ),

        migrations.AlterField(
            model_name="exchangepost",
            name="scheduled_at",
            field=models.DateTimeField(),
        ),
    ]