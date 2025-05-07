from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import UntypedToken
from jwt import decode as jwt_decode
from django.conf import settings
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async

@database_sync_to_async
def get_user(user_id):
    try:
        return get_user_model().objects.get(id=user_id)
    except get_user_model().DoesNotExist:
        return AnonymousUser()

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope["query_string"].decode()
        params = parse_qs(query_string)
        token = params.get("token", [None])[0]

        scope['user'] = AnonymousUser()
        
        if token:
            try:
                UntypedToken(token)
                decoded_data = jwt_decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                user_id = decoded_data["user_id"]
                scope['user'] = await get_user(user_id)
                # print("scope", scope)
            except Exception as e:
                print("JWTAuthMiddleware error:", e)
                #Token is invalid or expired
                
        return await super().__call__(scope, receive, send)
