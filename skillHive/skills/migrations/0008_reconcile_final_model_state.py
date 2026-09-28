from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("skills", "0007_alter_skill_reuse_level"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                # These objects existed in the historical migration
                # state but are no longer part of the final models.py.
                migrations.RemoveConstraint(
                    model_name="userskill",
                    name="user_skill_level_valid",
                ),

                migrations.RemoveConstraint(
                    model_name="userskill",
                    name="user_skill_experience_valid",
                ),

                migrations.RemoveIndex(
                    model_name="skill",
                    name="skill_category_name_idx",
                ),

                migrations.RemoveIndex(
                    model_name="skill",
                    name="skill_esco_meta_idx",
                ),

                migrations.RemoveIndex(
                    model_name="userinterest",
                    name="user_interest_skill_idx",
                ),

                migrations.RemoveIndex(
                    model_name="userskill",
                    name="skill_user_type_idx",
                ),

                # These fields already exist in MySQL.
                # Add them only to Django's migration state.
                migrations.AddField(
                    model_name="skill",
                    name="esco_code",
                    field=models.CharField(
                        blank=True,
                        max_length=100,
                    ),
                ),

                migrations.AddField(
                    model_name="skill",
                    name="updated_at",
                    field=models.DateTimeField(
                        auto_now=True,
                    ),
                ),

                migrations.AddField(
                    model_name="userskill",
                    name="updated_at",
                    field=models.DateTimeField(
                        auto_now=True,
                    ),
                ),
            ],
        ),
    ]