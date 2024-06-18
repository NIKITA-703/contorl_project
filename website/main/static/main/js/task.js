let previousValue = ''; //1
let tasknumber = 0;
let currentTaskWrapper = null;
let mouseX = 0;
let mouseY = 0;

function trackMouseEvents() {
    document.addEventListener('mousemove', function(event) {
        mouseX = event.clientX;
        mouseY = event.clientY;
    });

    document.addEventListener('mousedown', function(event) {
        const button = event.button === 0 ? 'left' : event.button === 1 ? 'middle' : 'right';
    });
}

// Вызов функции для начала отслеживания
trackMouseEvents();

function createNewColumn() {
    const template = document.querySelector('#column-template'); // Получаем шаблон колонки
    const columnsContainer = document.querySelector('.columns-container'); // Получаем контейнер для колонок
    const clone = document.importNode(template.content, true); // Клонируем содержимое шаблона

    const columnWrapper = clone.querySelector('.column-wrapper');
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
    const currentUser = document.getElementById('current-user').value; // Получаем имя текущего пользователя
    const taskContainer = document.createElement('div'); // Создаем новый элемент div для задачи
    taskContainer.className = 'task'; // Присваиваем класс 'task' новому элементу
    taskContainer.contentEditable = 'true'; // Делаем новый элемент редактируемым
    taskContainer.innerText = 'Новая задача'; // Устанавливаем текст для новой задачи
    taskContainer.onfocus = function() { storePreviousValue(taskContainer); };
    taskContainer.onblur = function() { checkIfEmpty(taskContainer, 'Новая задача'); };
    const column = button.closest(`.column`); // Находим ближайший родительский элемент с классом column
    const tasksContainer = column.querySelector(`.task-list`); // Получаем контейнер задач в найденной колонке
    
    const taskWrapper = document.createElement('div');
    taskWrapper.className = 'task-wrapper';
    taskWrapper.setAttribute('data-details', '');
    taskWrapper.setAttribute('data-creator', currentUser); // Устанавливаем имя пользователя
    taskWrapper.setAttribute('data-status', 'не в процессе');
    taskWrapper.setAttribute('data-date', new Date().toLocaleString());
    taskWrapper.oncontextmenu = function(event) { showContextMenu(event, taskWrapper); };

    taskWrapper.appendChild(taskContainer); // Добавляем новый элемент задачи в taskWrapper
    tasksContainer.appendChild(taskWrapper); // Добавляем taskWrapper в контейнер задач

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

// ПКМ ПО ПОДЗАДАЧЕ ///////

document.addEventListener('click', function(event) {
    const contextMenu = document.getElementById('context-menu');
    if (contextMenu.style.display === 'block' && !contextMenu.contains(event.target)) {
        contextMenu.style.display = 'none'; // Скрываем меню, если клик не внутри меню
    }
});

document.addEventListener('contextmenu', function(event) {
    if (event.target.classList.contains('task')) {
        event.preventDefault();
        showContextMenu(event, event.target.closest('.task')); // Передаем событие и текущий элемент подзадачи
    }
});

function showContextMenu(e, taskWrapper) {
    e.preventDefault();
    currentTaskWrapper = taskWrapper; // Сохраняем текущий элемент подзадачи

    const contextMenu = document.getElementById('context-menu');
    contextMenu.style.display = 'block';

    const position = positionMenu(); // Получаем координаты для позиционирования

    contextMenu.style.top = position.Y;
    contextMenu.style.left = position.X;

    // Добавим проверку родительского элемента
    if (contextMenu.parentElement !== document.body) {
        document.body.appendChild(contextMenu);
    }
}

function positionMenu() {
    const menu = document.getElementById('context-menu');
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let posX = mouseX;
    let posY = mouseY;

    if ((windowWidth - mouseX) < menuWidth) {
        posX = windowWidth - menuWidth - 10; // Отступ от правого края окна
    }

    if ((windowHeight - mouseY) < menuHeight) {
        posY = windowHeight - menuHeight - 10; // Отступ от нижнего края окна
    }

    return {
        Y: `${posY}px`,
        X: `${posX}px`
    };
}

function deleteSubtask() {
    if (currentTaskWrapper) {
        currentTaskWrapper.remove(); // Удаляем подзадачу из DOM
        saveTasks(); // Сохраняем задачи после удаления подзадачи
        document.getElementById('context-menu').style.display = 'none'; // Скрываем меню
    }
}

window.onresize = function(e) {
    const contextMenu = document.getElementById('context-menu');
    if (contextMenu.style.display === 'block') {
        contextMenu.style.display = 'none'; // Скрываем меню при изменении размера окна
    }
};
//      КОНЕЦ ПКМ       ///////

// Функция для удаления колонки
function deleteColumn(element) {
    const column = element.closest('.column-wrapper');
    if (!column) {
        console.error('Column wrapper not found!');
        return;
    }

    const taskId = column.querySelector('.column').dataset.taskId;
    console.log(`columnWrapper: ${column}`);
    if (!taskId) {
        // Если taskId отсутствует, просто удалим элемент из DOM
        column.parentElement.removeChild(column);
        console.log('Element without taskId removed from DOM');
        return;
    }

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

// модальное окно ///

function openTaskDetails() {
    const modal = document.getElementById('task-modal');
    const closeButton = document.querySelector('.modal .close');

    // Получаем текущего пользователя
    const currentUser = document.getElementById('current-user').value;
    console.log(`Current User: ${currentUser}`);

    // Установка данных модального окна
    const taskName = currentTaskWrapper.innerText || 'Неизвестно';
    const taskDetails = currentTaskWrapper.dataset.details || '';
    const taskCreator = currentTaskWrapper.dataset.creator || currentUser || 'Неизвестно';
    const taskStatus = currentTaskWrapper.dataset.status || 'не в процессе';
    const taskDate = currentTaskWrapper.dataset.date || new Date().toLocaleString();

    // Логи для проверки значений
    console.log('Task Name:', taskName);
    console.log('Task Details:', taskDetails);
    console.log('Task Creator:', taskCreator);
    console.log('Task Status:', taskStatus);
    console.log('Task Date:', taskDate);

    document.getElementById('task-name').innerText = taskName;
    document.getElementById('task-details').value = taskDetails;
    document.getElementById('task-creator').innerText = `Кто создал: ${taskCreator}`;
    document.getElementById('task-status-select').value = taskStatus;
    document.getElementById('task-date').innerText = `Дата создания: ${taskDate}`;

    modal.style.display = 'block';

    closeButton.onclick = function() {
        modal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }

    console.log(`Logged Task Creator: ${taskCreator}`);

    document.getElementById('context-menu').style.display = 'none'; // Скрываем меню
}


// function addNewTask(button) {
//     const tasksContainer = button.nextElementSibling;
//     const newTask = document.createElement('div');
//     newTask.className = 'task';
//     newTask.innerHTML = 'New Task';
//     tasksContainer.appendChild(newTask);
// }
