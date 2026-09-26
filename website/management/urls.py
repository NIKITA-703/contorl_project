from django.urls import path
from . import views

app_name = 'management'
urlpatterns = [
    path('', views.workspace, name='main_management'),
    path('project/<int:project_id>/', views.workspace, name='project'),
    path('api/projects/', views.projects_api, name='projects_api'),
    path('api/projects/<int:project_id>/', views.project_api, name='project_api'),
]
