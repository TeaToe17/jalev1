from django.urls import path

from .views import OrderCreateView, OrderListView, OrderDeleteView

urlpatterns = [
    path("create/", OrderCreateView.as_view(), name="order-create"),
    path("list/", OrderListView.as_view(), name="order-list"),
    path("delete/<int:id>/", OrderDeleteView.as_view(), name="order-delete"),
]