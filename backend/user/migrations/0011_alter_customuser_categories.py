# Generated by Django 5.1.2 on 2025-05-20 14:24

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('product', '0011_category_icon'),
        ('user', '0010_chatpreview_unread_message_read_delete_chatroom'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='categories',
            field=models.ManyToManyField(blank=True, related_name='users', to='product.category'),
        ),
    ]
