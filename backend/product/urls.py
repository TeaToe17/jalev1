from django.urls import path

from .views import ProductCreateView, ProductListView, ProductUpdateView, ProductDeleteView, CategoryListView

urlpatterns = [
    path("create/", ProductCreateView.as_view(), name="product-create"),
    path("list/", ProductListView.as_view(), name="product-list"),
    path("list/<int:id>/", ProductListView.as_view(), name="product-list-by-id"),
    path("update/<int:id>/", ProductUpdateView.as_view(), name="product-update"),
    path("delete/<int:id>/", ProductDeleteView.as_view(), name="product-update"),
    path("categories/", CategoryListView.as_view(), name="categories"),
]