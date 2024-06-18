from django.urls import path
from . import views

app_name = 'management'

urlpatterns = [
    path('', views.main_management, name="main_management"),
    path('tasks/create/', views.create_task, name='create_task'),
    path('save_task/', views.save_task, name='save_task'),
    path('delete_task/<int:task_id>/', views.delete_task, name='delete_task'),
    path('get_task_details/<int:task_id>/', views.get_task_details, name='get_task_details'),
    path('update_subtask/', views.update_subtask, name='update_subtask'),
]
