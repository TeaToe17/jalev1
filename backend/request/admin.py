from django.contrib import admin

from .models import Request

@admin.register(Request)
class RequestAdmin(admin.ModelAdmin):
    ordering = ["-date_created"]