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

                # cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
                # cred_dict = json.loads(cred_json)
                cred_dict = {
                    "type": os.getenv("FIREBASE_TYPE"),
                    "project_id": os.getenv("FIREBASE_PROJECT_ID"),
                    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
                    "private_key": os.getenv("FIREBASE_PRIVATE_KEY").replace("\\n", "\n"),
                    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
                    "client_id": os.getenv("FIREBASE_CLIENT_ID"),
                    "auth_uri": os.getenv("FIREBASE_AUTH_URI"),
                    "token_uri": os.getenv("FIREBASE_TOKEN_URI"),
                    "auth_provider_x509_cert_url": os.getenv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL"),
                    "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_X509_CERT_URL"),
                    "universe_domain": os.getenv("FIREBASE_UNIVERSE_DOMAIN")
                }
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                logger.info("Firebase Admin initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize Firebase Admin: {e}")

