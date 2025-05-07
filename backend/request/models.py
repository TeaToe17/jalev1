from django.db import models
from datetime import timedelta
from django.utils.timezone import now

class Request(models.Model):
    owner = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name="requests", null=True)
    name = models.CharField(max_length=200)
    image = models.ImageField(upload_to="book_images/", null=True, blank=True)
    level = models.CharField(max_length=20)
    description = models.CharField(max_length=250, null=True, blank=True)
    course = models.CharField(max_length=100)
    buyer_name = models.CharField(max_length=200)
    buyer_whatsapp_contact = models.CharField(max_length=25)
    buyer_call_contact = models.CharField(max_length=25, null=True, blank=True)  
    date_created = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    @staticmethod
    def delete_old_requests():
        threshold_date = now() - timedelta(days=30)
        old_requests = Request.objects.filter(date_created__lt=threshold_date)
        old_requests.delete()

    def __str__(self):
        return f"{self.name} - {self.level}"