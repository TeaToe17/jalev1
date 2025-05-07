# middleware.py
from django.utils import timezone
from django.shortcuts import redirect
from django.contrib import messages

class BlockSuspendedOrBlacklistedUsersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            profile = getattr(request.user, 'profile', None)

            if profile:
                if profile.is_blacklisted:
                    messages.error(request, "You have been blacklisted.")
                    return redirect('blacklist_notice')  # Create this view/template

                if profile.is_suspended and profile.suspension_until:
                    if timezone.now() < profile.suspension_until:
                        messages.error(request, f"You are suspended until {profile.suspension_until}.")
                        return redirect('suspension_notice')  # Create this view/template
                    else:
                        profile.is_suspended = False
                        profile.suspension_until = None
                        profile.save()

        return self.get_response(request)
