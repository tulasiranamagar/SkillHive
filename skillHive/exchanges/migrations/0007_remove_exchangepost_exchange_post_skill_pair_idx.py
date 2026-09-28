from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        (
            "exchanges",
            "0006_remove_exchangepost_exchange_post_skill_pair_idx_and_more",
        ),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.RemoveIndex(
                    model_name="exchangepost",
                    name="exchange_post_skill_pair_idx",
                ),
            ],
        ),
    ]