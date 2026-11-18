
from django.contrib import admin

from .models import Product, Category, ProductVariant, ClearancePayment, ClearancePaymentItem


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "display_categories",
        "created",
        "owner",
        "is_sticky",
        "sticky_timestamp",
        "delist",
        "request",
        "preferred_variant",
        "chargeable_clicks",
        "cleared",
        "lastclearance",
    )

    list_filter = (
        "delist",
        "is_sticky",
        "cleared",
        "created",
        "lastclearance",
    )

    search_fields = (
        "name",
        "owner__username",
        "owner__email",
        "variants__sku",
    )

    readonly_fields = ("created",)

    list_select_related = (
        "owner",
        "preferred_variant",
        "request",
    )

    filter_horizontal = ("categories",)

    def display_categories(self, obj):
        return ", ".join(category.name for category in obj.categories.all())

    display_categories.short_description = "Categories"


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "product",
        "sku",
        "price",
        "stock",
        "sold",
        "reserved",
        "is_preferred",
        "used",
        "created",
    )

    list_filter = (
        "sold",
        "reserved",
        "is_preferred",
        "used",
    )

    search_fields = (
        "sku",
        "product__name",
        "product__owner__username",
    )

    readonly_fields = ("sku", "created", "datesold")

    list_select_related = ("product",)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "icon")
    search_fields = ("name",)


admin.site.register(ClearancePayment)
admin.site.register(ClearancePaymentItem)