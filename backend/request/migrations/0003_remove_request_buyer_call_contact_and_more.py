# Generated by Django 5.1.2 on 2025-05-14 19:31

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('request', '0002_request_owner'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='request',
            name='buyer_call_contact',
        ),
        migrations.RemoveField(
            model_name='request',
            name='buyer_name',
        ),
        migrations.RemoveField(
            model_name='request',
            name='buyer_whatsapp_contact',
        ),
        migrations.RemoveField(
            model_name='request',
            name='course',
        ),
        migrations.RemoveField(
            model_name='request',
            name='level',
        ),
        migrations.AddField(
            model_name='request',
            name='imagefile',
            field=models.ImageField(blank=True, null=True, upload_to='products_images/'),
        ),
        migrations.AlterField(
            model_name='request',
            name='image',
            field=models.URLField(blank=True, null=True),
        ),
    ]
