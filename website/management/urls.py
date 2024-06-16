from django.urls import path
from . import views
from .views import create_task, save_task

app_name = 'management'

urlpatterns = [
    path('', views.main_management, name="main_management"),
    path('tasks/create/', views.create_task, name='create_task'),
    path('save_task/', views.save_task, name='save_task'),
]