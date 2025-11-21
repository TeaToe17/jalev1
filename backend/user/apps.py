from django.apps import AppConfig


# user/apps.py
import os
import firebase_admin
from firebase_admin import credentials
from django.conf import settings
import logging
import json
from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)

class UserConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'user'

    def ready(self):
        import user.signals