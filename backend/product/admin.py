from django.contrib import admin


from .models import Product, Category, ProductVariant

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    readonly_fields = ["created",]
    search_fields = ['name']


admin.site.register(Category)

admin.site.register(ProductVariant)