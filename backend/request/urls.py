from django.urls import path

from .views import RequestCreateView, RequestListView

urlpatterns =[
    path("create/", RequestCreateView.as_view(), name="create-request"),
    path("list/", RequestListView.as_view(), name="list-request"),
]