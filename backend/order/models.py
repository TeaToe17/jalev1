from django.db import models
from django.core.exceptions import ValidationError
from product.models import ProductVariant

class Order(models.Model):
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name="orders", null=True)
    buyer_name = models.CharField(max_length=200)
    buyer_whatsapp_contact = models.CharField(max_length=25)
    buyer_call_contact = models.CharField(max_length=25, null=True, blank=True) 
    agreed_price = models.IntegerField(null=True, blank=True)
    quantity = models.IntegerField(default=1)
    size = models.CharField(max_length=50, null=True, blank=True)
    date_created = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    completed = models.BooleanField(default=False)

    def clean(self):
        super().clean()
        if not self.completed and self.variant.stock < self.quantity:
            raise ValidationError(f"Insufficient stock available. Only {self.variant.stock} units remaining.")

    def save(self, *args, **kwargs):
        old_completed = False
        if self.pk:
            old_completed = Order.objects.get(pk=self.pk).completed

        super().save(*args, **kwargs)

        if self.completed and not old_completed:
            variant = self.variant
            new_stock = max(0, variant.stock - self.quantity)
            is_sold_now = True if new_stock == 0 else variant.sold
            
            ProductVariant.objects.filter(id=variant.id).update(
                stock=new_stock,
                sold=is_sold_now
            )
            
            variant.refresh_from_db()
            if (is_sold_now or new_stock == 0) and variant.product:
                variant.product.auto_switch_preferred_variant()

    def delete(self, *args, **kwargs):
        variant = self.variant

        if variant:
            if self.completed:
                new_stock = variant.stock + self.quantity
                ProductVariant.objects.filter(id=variant.id).update(
                    stock=new_stock,
                    sold=False if new_stock > 0 else variant.sold
                )

            if variant.request:
                variant.request.delete()

        super().delete(*args, **kwargs)

    def __str__(self) -> str:
        product_name = self.variant.product.name if self.variant.product else "Unknown Product"
        return f"{product_name} ({self.variant.sku}) - {self.buyer_name}"
    

class CartItem(models.Model):
    owner = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name="userItems")
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name="productCartItems", null=True)
    quantity = models.IntegerField(default=1)
    size = models.CharField(max_length=20, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    def __str__(self):
        product_name = self.variant.product.name if self.variant.product else "Unknown"
        return f"{self.owner.username} - {product_name} ({self.variant.sku}) x {self.quantity}"
