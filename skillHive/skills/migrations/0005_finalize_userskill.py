from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("skills", "0004_alter_skillcategory_options_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="userskill",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True,
            ),
        ),
    ]