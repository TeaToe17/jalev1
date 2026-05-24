# from django.contrib import admin

# from .models import Order, CartItem

# @admin.register(Order)
# class OrderAdmin(admin.ModelAdmin):
#     # list_display = ("completed",)
#     list_display = ("product","completed","date_created")
#     list_editable = ("completed",)
#     ordering = ["-date_created"]

# @admin.register(CartItem)
# class CartItemAdmin(admin.ModelAdmin):
#     list_display = ["owner", "product", "quantity", "timestamp"]
#     ordering =  ["-timestamp"]

from django.contrib import admin
from .models import Order, CartItem

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("get_product_name", "get_sku", "completed", "date_created")
    list_editable = ("completed",)
    ordering = ["-date_created"]

    @admin.display(description="Product")
    def get_product_name(self, obj):
        return obj.variant.product.name if obj.variant and obj.variant.product else "N/A"

    @admin.display(description="SKU")
    def get_sku(self, obj):
        return obj.variant.sku if obj.variant else "N/A"


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ["owner", "get_product_name", "get_sku", "quantity", "timestamp"]
    ordering = ["-timestamp"]

    @admin.display(description="Product")
    def get_product_name(self, obj):
        return obj.variant.product.name if obj.variant and obj.variant.product else "N/A"

    @admin.display(description="SKU")
    def get_sku(self, obj):
        return obj.variant.sku if obj.variant else "N/A"
