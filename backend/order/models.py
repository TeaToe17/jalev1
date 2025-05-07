from django.db import models

from product.models import Product

class Order(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="orders")
    buyer_name = models.CharField(max_length=200)
    buyer_whatsapp_contact = models.CharField(max_length=25)
    buyer_call_contact = models.CharField(max_length=25, null=True, blank=True) 
    agreed_price = models.IntegerField(null=True, blank=True)
    date_created = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    completed = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        super().save(*args,**kwargs)

        # if self.completed:
        #     self.product.sold = True
        #     self.product.save()

        product = self.product
        if self.completed:
            if product.quantity > 1:
                product.__class__.objects.filter(id=product.id).update(quantity=product.quantity - 1)
            elif product.quantity == 1:
                product.__class__.objects.filter(id=product.id).update(quantity=0, status="sold")


    def __str__(self) -> str:
        return self.product.name
     