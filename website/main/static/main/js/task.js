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

    // console.log(tasknumber);
}

function storePreviousValue(element) {
    previousValue = element.innerText; // Сохраняем текущее значение элемента
}

function checkIfEmpty(element, defaultValue) {
    if (element.innerText.trim() === '') {
        element.innerText = previousValue || defaultValue; // Если пусто, возвращаем предыдущее значение или значение по умолчанию
    }
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





// function addNewTask(button) {
//     const tasksContainer = button.nextElementSibling;
//     const newTask = document.createElement('div');
//     newTask.className = 'task';
//     newTask.innerHTML = 'New Task';
//     tasksContainer.appendChild(newTask);
// }
