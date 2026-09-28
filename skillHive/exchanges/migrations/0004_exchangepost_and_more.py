from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        (
            "exchanges",
            "0003_add_exchange_request_post",
        ),
    ]

    operations = [
        migrations.AddField(
            model_name="exchangerequest",
            name="post",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="requests",
                to="exchanges.exchangepost",
            ),
        ),
        migrations.AlterField(
            model_name="exchangerequest",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("accepted", "Accepted"),
                    ("rejected", "Rejected"),
                    ("cancelled", "Cancelled"),
                ],
                db_index=True,
                default="pending",
                max_length=20,
            ),
        ),
        migrations.RemoveIndex(
            model_name="exchangerequest",
            name="exchanges_e_offered_8f1954_idx",
        ),
        migrations.RemoveIndex(
            model_name="exchangerequest",
            name="exchanges_e_status_d48263_idx",
        ),
        migrations.RenameIndex(
            model_name="exchangerequest",
            new_name="ex_req_requester_status_idx",
            old_name="exchanges_e_request_7b61aa_idx",
        ),
        migrations.RenameIndex(
            model_name="exchangerequest",
            new_name="ex_req_recipient_status_idx",
            old_name="exchanges_e_recipie_ad7078_idx",
        ),
        migrations.AddConstraint(
            model_name="exchangerequest",
            constraint=models.UniqueConstraint(
                fields=("post", "requester"),
                name="unique_requester_per_exchange_post",
            ),
        ),
        migrations.AddIndex(
            model_name="exchangerequest",
            index=models.Index(
                fields=("post", "status"),
                name="exchange_req_post_status_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="exchangepost",
            index=models.Index(
                fields=("creator", "status"),
                name="ex_post_creator_status_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="exchangepost",
            index=models.Index(
                fields=("offered_skill", "requested_skill"),
                name="exchange_post_skill_pair_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="exchangepost",
            index=models.Index(
                fields=("status", "created_at"),
                name="exchange_post_status_date_idx",
            ),
        ),
    ]