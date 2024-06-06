from django.urls import path
from . import views

app_name = 'management'

urlpatterns = [
    path('', views.main_management, name="main_management"),
]
