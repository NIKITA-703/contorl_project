import json

from django.contrib.auth.decorators import login_required
from django.contrib import auth, messages
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_exempt

from .models import Task


@login_required
def main_management(request):
    tasks = Task.objects.filter(user=request.user)
    context = {
        'title': 'Management',
        'tasks': tasks,
    }
    return render(request, 'management/main_management.html', context)


@csrf_exempt
@login_required
def create_task(request):
    if request.method == 'POST':
        task = Task.objects.create(user=request.user, title="Новая задача")
        return redirect('management:main_management')
    return redirect('management:main_management')


@csrf_exempt
@login_required
def delete_task(request, task_id):
    try:
        task = Task.objects.get(id=task_id, user=request.user)
        task.delete()
        return JsonResponse({'status': 'success'})
    except Task.DoesNotExist:
        return JsonResponse({'status': 'failed', 'message': 'Task not found'}, status=404)

@csrf_exempt
def save_task(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        task_id = data.get('task_id')
        title = data.get('title')
        description = data.get('description')
        tasks = data.get('tasks')

        if task_id:
            task = Task.objects.get(id=task_id)
            task.title = title
            task.description = description
            task.tasks = json.dumps(tasks, ensure_ascii=False)
        else:
            task = Task.objects.create(
                user=request.user,
                title=title,
                description=description,
                tasks=json.dumps(tasks, ensure_ascii=False)
            )

        task.save()

        return JsonResponse({'status': 'success', 'task_id': task.id})
    return JsonResponse({'status': 'failed'}, status=400)




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
