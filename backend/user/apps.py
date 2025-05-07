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
        if not firebase_admin._apps:  # prevents double initialization
            try:
                cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
                cred_dict = json.loads(cred_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                logger.info("Firebase Admin initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize Firebase Admin: {e}")

