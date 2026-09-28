from django.db import migrations, models


def populate_legacy_event_keys(apps, schema_editor):
    """
    Existing XP transactions may have a NULL event_key because older
    versions of SkillHive did not require one.

    Give those historical records a deterministic event key based on
    their primary key before making event_key non-nullable/unique.
    """
    XPTransaction = apps.get_model("gamification", "XPTransaction")

    for transaction in XPTransaction.objects.filter(
        event_key__isnull=True
    ).iterator():
        transaction.event_key = f"legacy:{transaction.pk}"
        transaction.save(update_fields=["event_key"])


class Migration(migrations.Migration):

    dependencies = [
        (
            "gamification",
            "0002_alter_badge_options_badge_is_active_and_more",
        ),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name="badge",
            name="gamificatio_require_02be81_idx",
        ),
        migrations.RemoveIndex(
            model_name="userbadge",
            name="gamificatio_user_id_683edb_idx",
        ),
        migrations.RemoveIndex(
            model_name="userbadge",
            name="gamificatio_badge_i_6cd8eb_idx",
        ),

        migrations.AddIndex(
            model_name="userbadge",
            index=models.Index(
                fields=["badge"],
                name="gam_userbadge_badge_idx",
            ),
        ),

        migrations.RunPython(
            populate_legacy_event_keys,
            migrations.RunPython.noop,
        ),

        migrations.AlterField(
            model_name="xptransaction",
            name="event_key",
            field=models.CharField(
                max_length=180,
                unique=True,
            ),
        ),
    ]