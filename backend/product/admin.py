from django.contrib import admin


from .models import Category
from .models import Product

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    readonly_fields = ["created",]
    search_fields = ['name']


admin.site.register(Category)