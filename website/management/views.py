import json
from django.contrib.auth.decorators import login_required
from django.contrib import auth, messages
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_exempt


from .models import Task
from users.models import User


@login_required
def main_management(request):
    tasks = Task.objects.filter(user=request.user)
    users = User.objects.all()  # Получаем всех пользователей
    context = {
        'title': 'Management',
        'tasks': tasks,
        'users': users,  # Передаем список пользователей в контексте
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
@login_required
def save_task(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        task_id = data.get('task_id')
        title = data.get('title')
        description = data.get('description')
        tasks = data.get('tasks')

        if task_id:
            task = Task.objects.get(id=task_id, user=request.user)
            task.title = title
            task.description = description
            task.set_tasks(tasks)
        else:
            task = Task.objects.create(
                user=request.user,
                title=title,
                description=description,
                tasks=tasks
            )

        task.save()
        return JsonResponse({'status': 'success', 'task_id': task.id})
    return JsonResponse({'status': 'failed'}, status=400)

@login_required
def get_task_details(request, task_id):
    try:
        task = Task.objects.get(id=task_id, user=request.user)
        task_details = {
            'task_name': task.title,
            'task_details': task.description,
            'task_creator': task.user.username,
            'task_status': task.status,
            'task_date': task.created_at.strftime('%d.%m.%Y'),
        }
        return JsonResponse({'status': 'success', 'task': task_details})
    except Task.DoesNotExist:
        return JsonResponse({'status': 'failed', 'message': 'Task not found'}, status=404)

@csrf_exempt
@login_required
def update_subtask(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        task_id = data.get('task_id')
        subtask_index = data.get('subtask_index')
        subtask_content = data.get('content')
        subtask_details = data.get('details')
        subtask_creator = data.get('creator')
        subtask_status = data.get('status')
        subtask_date = data.get('date')

        try:
            task = Task.objects.get(id=task_id, user=request.user)
            subtasks = task.get_tasks()
            subtasks[subtask_index] = {
                'content': subtask_content,
                'details': subtask_details,
                'creator': subtask_creator,
                'status': subtask_status,
                'date': subtask_date
            }
            task.set_tasks(subtasks)
            task.save()
            return JsonResponse({'status': 'success'})
        except Task.DoesNotExist:
            return JsonResponse({'status': 'failed', 'message': 'Task not found'}, status=404)
    return JsonResponse({'status': 'failed', 'message': 'Invalid request method'}, status=400)


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
