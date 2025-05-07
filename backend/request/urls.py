from django.urls import path

from .views import RequestCreateView, RequestListView, RequestDeleteView

urlpatterns =[
    path("create/", RequestCreateView.as_view(), name="create-request"),
    path("list/", RequestListView.as_view(), name="list-request"),
    path("delete/<int:id>/", RequestDeleteView.as_view(), name="delete-request"),
]