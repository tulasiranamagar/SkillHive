from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        (
            "exchanges",
            "0005_exchange_text_skills_and_schedule",
        ),
    ]

    operations = [
        migrations.RemoveField(
            model_name="exchangerequest",
            name="offered_skill",
        ),
        migrations.RemoveField(
            model_name="exchangerequest",
            name="requested_skill",
        ),
        migrations.AddIndex(
            model_name="exchangepost",
            index=models.Index(
                fields=["scheduled_at", "status"],
                name="exchange_post_schedule_idx",
            ),
        ),
    ]