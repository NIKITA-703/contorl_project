// task.js
function createNewColumn() {
    const template = document.querySelector('#column-template');
    const columnsContainer = document.querySelector('.columns-container');
    const clone = document.importNode(template.content, true);
    columnsContainer.appendChild(clone);
}

function addTask(button) {
    const taskContainer = document.createElement('div');
    taskContainer.className = 'task';
    taskContainer.contentEditable = 'true';
    taskContainer.innerText = 'Новая задача';
    const tasksContainer = button.nextElementSibling;
    tasksContainer.appendChild(taskContainer);
}
// function addNewTask(button) {
//     const tasksContainer = button.nextElementSibling;
//     const newTask = document.createElement('div');
//     newTask.className = 'task';
//     newTask.innerHTML = 'New Task';
//     tasksContainer.appendChild(newTask);
// }
