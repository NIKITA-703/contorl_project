let previousValue = '';
let tasknumber = 0;

function createNewColumn() {
    const template = document.querySelector('#column-template'); // Получаем шаблон колонки
    const columnsContainer = document.querySelector('.columns-container'); // Получаем контейнер для колонок
    const clone = document.importNode(template.content, true); // Клонируем содержимое шаблона

    const columnWrapper = clone.querySelector('.column-wrapper');
    columnWrapper.classList.remove('column-wrapper'); // Удаляем исходный класс
    columnWrapper.classList.add(`column-wrapper-${tasknumber++}`); // Добавляем инкрементирующий класс

    columnsContainer.appendChild(clone); // Добавляем клонированный шаблон в контейнер колонок

    saveTasks(); // Сохраняем задачи после добавления новой колонки
}

function storePreviousValue(element) {
    previousValue = element.innerText; // Сохраняем текущее значение элемента
}

function checkIfEmpty(element, defaultValue) {
    if (element.innerText.trim() === '') {
        element.innerText = previousValue || defaultValue; // Если пусто, возвращаем предыдущее значение или значение по умолчанию
    }
    saveTasks(); // Сохраняем задачи после изменения
}

// Функция для добавления новой задачи
function addTask(button) {
    const taskContainer = document.createElement('div'); // Создаем новый элемент div для задачи
    taskContainer.className = 'task'; // Присваиваем класс 'task' новому элементу
    taskContainer.contentEditable = 'true'; // Делаем новый элемент редактируемым
    taskContainer.innerText = 'Новая задача'; // Устанавливаем текст для новой задачи
    taskContainer.onfocus = function() { storePreviousValue(taskContainer); };
    taskContainer.onblur = function() { checkIfEmpty(taskContainer, 'Новая задача'); };
    const column = button.closest(`.column`); // Находим ближайший родительский элемент с классом column
    const tasksContainer = column.querySelector(`.task-list`); // Получаем контейнер задач в найденной колонке
    tasksContainer.appendChild(taskContainer); // Добавляем новый элемент задачи в контейнер задач
    taskContainer.focus(); // Фокусируемся на новом элементе

    saveTasks(); // Сохраняем задачи после добавления новой задачи
}

// Функция для переключения меню
function toggleMenu(element) {
    const menu = element.nextElementSibling; // Получаем следующий элемент (меню)
    if (menu.style.display === 'block') {
        menu.style.display = 'none'; // Если меню отображается, скрываем его
    } else {
        menu.style.display = 'block'; // Если меню скрыто, отображаем его
    }
}

// Функция для переключения меню подзадач
function toggleTaskMenu(element) {
    const menu = element.nextElementSibling; // Получаем следующий элемент (меню)
    if (menu.style.display === 'block') {
        menu.style.display = 'none'; // Если меню отображается, скрываем его
    } else {
        menu.style.display = 'block'; // Если меню скрыто, отображаем его
    }
}

// Функция для удаления подзадачи
function deleteSubtask(button) {
    const task = button.closest('.task'); // Получаем ближайший родительский элемент с классом task
    task.remove(); // Удаляем подзадачу из DOM
    saveTasks(); // Сохраняем задачи после удаления подзадачи
}

// Функция для удаления колонки
function deleteColumn(element) {
    const column = element.closest('.column-wrapper');
    const taskId = column.querySelector('.column').dataset.taskId;
    if (taskId) {
        fetch(`delete_task/${taskId}/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Success:', data);
            if (data.status === 'success') {
                column.parentElement.removeChild(column); // Удаляем колонку из DOM
            }
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    } else {
        column.parentElement.removeChild(column); // Удаляем колонку из DOM, если taskId нет
    }
}

// Функция для переименования колонки
function renameColumn(element) {
    // Скрываем меню
    element.parentElement.style.display = 'none';
    // Получаем колонку, содержащую элемент
    const column = element.closest('.column');
    // Получаем заголовок колонки
    const header = column.querySelector('.task-header h2');
    // Сохраняем текущее значение заголовка
    const previousValue = header.textContent;
    // Устанавливаем возможность редактирования заголовка
    header.contentEditable = 'true';
    // Перемещаем фокус на заголовок для редактирования
    header.focus();
    // Снимаем возможность редактирования при потере фокуса
    header.onblur = function() {
        if (header.textContent.trim() === '') {
            header.textContent = previousValue;
        }
        header.contentEditable = 'false';
        saveTasks(); // Сохраняем задачи после изменения заголовка
    };
}

// Функция для переименования по двойному клику
function renameColumnInline(element) {
    const prevName = element.textContent; // Сохраняем текущее название колонки
    element.contentEditable = 'true'; // Делаем заголовок редактируемым
    element.focus(); // Устанавливаем фокус на заголовке
    element.onblur = function() {
        if (element.textContent.trim() === '') {
            element.textContent = prevName; // Если новое название пустое, возвращаем предыдущее
        }
        element.contentEditable = 'false'; // Убираем редактирование
        saveTasks(); // Сохраняем задачи после изменения заголовка
    };
}

document.addEventListener('click', function(event) {
    const menus = document.querySelectorAll('.dropdown-menu'); // Получаем все элементы меню
    menus.forEach(menu => {
        // Если клик не внутри меню и не на кнопку с тремя точками
        if (!menu.contains(event.target) && !menu.previousElementSibling.contains(event.target)) {
            menu.style.display = 'none'; // Скрываем меню
        }
    });
});

function saveTasks() {
    const columns = document.querySelectorAll('.column');
    columns.forEach(column => {
        const taskHeader = column.querySelector('h2').innerText;
        const taskDescription = column.querySelector('.task-description').innerText;
        const tasks = Array.from(column.querySelectorAll('.task')).map(task => task.innerText);
        const taskId = column.dataset.taskId;

        const data = {
            task_id: taskId,
            title: taskHeader,
            description: taskDescription,
            tasks: tasks,
        };

        fetch('save_task/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Success:', data);
            if (!taskId) {
                column.dataset.taskId = data.task_id; // Обновляем taskId, если он был создан заново
            }
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    });
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// function addNewTask(button) {
//     const tasksContainer = button.nextElementSibling;
//     const newTask = document.createElement('div');
//     newTask.className = 'task';
//     newTask.innerHTML = 'New Task';
//     tasksContainer.appendChild(newTask);
// }
