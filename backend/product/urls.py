# from django.urls import path

# from .views import ProductCreateView, ProductListView, ProductUpdateView, ProductDeleteView, CategoryListView, MakeProductStickyView, ProductDetailView

# urlpatterns = [
#     path("create/", ProductCreateView.as_view(), name="product-create"),
#     path("list/", ProductListView.as_view(), name="product-list"),
#     path("list/<int:id>/", ProductListView.as_view(), name="product-list-by-id"),
#     path("update/<int:id>/", ProductUpdateView.as_view(), name="product-update"),
#     path("delete/<int:id>/", ProductDeleteView.as_view(), name="product-update"),
#     path("make_sticky/<int:product_id>/", MakeProductStickyView.as_view(), name="make-sticky"),
#     path("categories/", CategoryListView.as_view(), name="categories"),
# ]
from django.urls import path

from .views import (
    ProductCreateView, 
    ProductListView, 
    ProductUpdateView, 
    ProductDeleteView, 
    CategoryListView, 
    MakeProductStickyView, 
    ProductDetailView,
    ProductVariantDeleteView
)

urlpatterns = [
    path("create/", ProductCreateView.as_view(), name="product-create"),
    path("list/", ProductListView.as_view(), name="product-list"),
    path("detail/<int:id>/", ProductDetailView.as_view(), name="product-detail"),
    path("update/<int:id>/", ProductUpdateView.as_view(), name="product-update"),
    path("delete/<int:id>/", ProductDeleteView.as_view(), name="product-delete"),
    path("variant/delete/<int:id>/", ProductVariantDeleteView.as_view(), name="variant-delete"),
    path("make_sticky/<int:product_id>/", MakeProductStickyView.as_view(), name="make-sticky"),
    path("categories/", CategoryListView.as_view(), name="categories"),
]
