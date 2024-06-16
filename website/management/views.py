import json

from django.contrib.auth.decorators import login_required
from django.contrib import auth, messages
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render, redirect
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt

from .models import Task
from .forms import TaskForm


@login_required
def main_management(request):
    tasks = Task.objects.filter(user=request.user)
    context = {
        'title': 'Management',
        'tasks': tasks,
    }
    return render(request, 'management/main_management.html', context)

@login_required
def create_task(request):
    if request.method == 'POST':
        task = Task.objects.create(user=request.user, title="Новая задача")
        return redirect('management:main_management')
    return redirect('management:main_management')


@csrf_exempt
def save_task(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        task_id = data.get('task_id')
        title = data.get('title')
        description = data.get('description')
        tasks = data.get('tasks', [])

        task, created = Task.objects.get_or_create(id=task_id, defaults={'user': request.user, 'title': title, 'description': description})
        if not created:
            task.title = title
            task.description = description
            task.set_tasks(tasks)
            task.save()

        return JsonResponse({'status': 'success', 'task_id': task.id})
    return JsonResponse({'status': 'error'}, status=400)




# # Основное представление для управления задачами
# @login_required
# def main_management(request):
#     tasks = Task.objects.filter(user=request.user)
#     context = {
#         'title': 'Management',
#         'tasks': tasks,
#     }
#     return render(request, 'management/main_management.html', context)
#
#
# # Представление для создания новой задачи
# @login_required
# def create_task(request):
#     if request.method == 'POST':
#         # Получаем данные из POST-запроса
#         title = request.POST.get('title')
#         description = request.POST.get('description')
#         tasks = request.POST.get('tasks')  # Список задач в виде строки JSON
#
#         # Создаем новую задачу
#         task = Task.objects.create(
#             user=request.user,
#             title=title,
#             description=description,
#             tasks=tasks
#         )
#
#         return JsonResponse({'status': 'success', 'task_id': task.id})
#
#     return JsonResponse({'status': 'error', 'message': 'Invalid request method'})
