"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
# from django.contrib.staticfiles.handlers import StaticFilesHandler
# from channels.auth import AuthMiddlewareStack

import django


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from middleware.jwtmiddleware  import JWTAuthMiddleware  # noqa: E402
import user.routing  # noqa: E402

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(
        URLRouter(
            user.routing.websocket_urlpatterns
        )
    ),
})