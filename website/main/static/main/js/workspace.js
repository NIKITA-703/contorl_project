/* Potok workspace: server-backed state, accessible dialogs, no UI framework. */
(() => {
'use strict';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = name => '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
const color = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#8792a2';
let state = JSON.parse($('#workspace-data').textContent);
let projects = state.projects;
const allowedViews = ['board','list','calendar','timeline','overview','activity'];
let view = allowedViews.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'board';
let filters = {search:'', assignee:'', priority:'', overdue:false};
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let busy = false, draggingId = null, dialogType = '', dialogCardId = null, formSnapshot = '', refreshGeneration = 0;
const dialog = $('#editor');
const priorityNames = {low:'Низкий', medium:'Обычный', high:'Высокий', urgent:'Срочный'};
const isoDay = date => [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
const today = () => isoDay(new Date());
const dateObject = value => new Date(String(value).slice(0,10) + 'T12:00:00');
const shortDate = value => value ? dateObject(value).toLocaleDateString('ru-RU',{day:'numeric',month:'short'}).replace('.', '') : '';
const dateTime = value => new Date(value).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
const isOwner = () => state.project?.owner_id === state.me.id;
const columnFor = card => state.columns.find(c => c.id === card.column_id);
const isDone = card => Boolean(columnFor(card)?.is_done);
const isOverdue = card => Boolean(card.due_date && card.due_date < today() && !isDone(card));
const memberFor = id => state.members.find(m => m.id === id);
const getCard = id => state.cards.find(c => c.id === Number(id));
function initials(name) { return String(name).trim().split(/\s+/).slice(0,2).map(p => p[0] || '').join('').toUpperCase(); }
function avatar(member, small = false) {
    if (!member) return '<span class="unassigned-avatar" title="Без исполнителя">' + icon('users') + '</span>';
    const cls = 'avatar ' + (small ? 'small ' : '') + 'alt-' + (member.id % 4);
    return member.avatar ? '<img class="' + cls + '" src="' + esc(member.avatar) + '" alt="' + esc(member.name) + '" title="' + esc(member.name) + '">' :
        '<span class="' + cls + '" title="' + esc(member.name) + '">' + esc(initials(member.name)) + '</span>';
}
function priority(value) { return '<span class="priority ' + esc(value) + '">' + priorityNames[value] + '</span>'; }
function labelClass(label) { return [...label].reduce((sum,c) => sum + c.charCodeAt(0), 0) % 4; }
function selectedCards() {
    const query = filters.search.trim().toLocaleLowerCase();
    return (state.cards || []).filter(c =>
        (!query || [c.title,c.description,c.label].join(' ').toLocaleLowerCase().includes(query)) &&
        (!filters.assignee || (filters.assignee === 'none' ? !c.assignee_id : c.assignee_id === Number(filters.assignee))) &&
        (!filters.priority || c.priority === filters.priority) &&
        (!filters.overdue || isOverdue(c))
    );
}
function toast(message, error = false) {
    const node = document.createElement('div');
    node.className = 'toast' + (error ? ' error' : '');
    node.innerHTML = icon(error ? 'flag' : 'check') + '<span>' + esc(message) + '</span><button aria-label="Закрыть">×</button>';
    $('button', node).onclick = () => node.remove();
    $('#toasts').append(node);
    setTimeout(() => node.remove(), error ? 9000 : 4200);
}
function syncStatus(text, error = false) {
    $('#sync-status').innerHTML = '<i style="background:' + (error ? '#ba7764' : '#7a9a61') + '"></i>' + esc(text);
}
async function request(url, data) {
    let response;
    try {
        response = await fetch(url, {method: data ? 'POST' : 'GET', credentials:'same-origin',
            headers: data ? {'Content-Type':'application/json','X-CSRFToken': decodeURIComponent(document.cookie.split('; ').find(c => c.startsWith('csrftoken='))?.split('=')[1] || '')} : {},
            body: data ? JSON.stringify(data) : undefined});
    } catch (_) { throw new Error('Нет связи с сервером. Проверьте подключение и повторите попытку.'); }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(result.error || (response.status === 403 ? 'Сессия устарела или доступ запрещён. Обновите страницу.' :
            response.status === 404 ? 'Объект не найден или больше недоступен.' : 'Не удалось выполнить действие. Попробуйте ещё раз.'));
        error.status = response.status;
        throw error;
    }
    return result;
}
const apiUrl = () => '/management/api/projects/' + state.project.id + '/';
async function refresh({quiet = false} = {}) {
    if (!state.project) return;
    const scroll = $('#view-content');
    const left = scroll.scrollLeft, top = scroll.scrollTop;
    const generation = ++refreshGeneration;
    const updated = await request(apiUrl());
    if (generation !== refreshGeneration) return;
    state = updated;
    projects = projects.map(p => p.id === state.project.id ? state.project : p);
    render();
    scroll.scrollLeft = left; scroll.scrollTop = top;
    syncStatus('Все изменения сохранены');
    if (!quiet) toast('Доска обновлена');
}
async function mutate(data, message) {
    busy = true; refreshGeneration++; syncStatus('Сохраняем изменения…');
    try {
        const result = await request(apiUrl(), data);
        if (!result.deleted) {
            try { await refresh({quiet:true}); }
            catch (_) { syncStatus('Сохранено · обновите доску',true); toast('Изменения сохранены, но доску не удалось обновить. Нажмите «Обновить доску».',true); }
        }
        if (message) toast(message);
        return result;
    } catch (error) {
        syncStatus('Изменения не сохранены', true);
        throw error;
    } finally { busy = false; }
}
function render() {
    $('#project-nav').innerHTML = projects.map(p => '<a href="/management/project/' + p.id + '/" class="' + (p.id === state.project?.id ? 'active' : '') + '"><span class="project-dot" style="--dot:' + color(p.color) + '"></span><span>' + esc(p.title) + '</span></a>').join('');
    if (!state.project) {
        $('#project-header').innerHTML = '';
        $('#project-tabs').hidden = $('#toolbar').hidden = true;
        $('#view-content').innerHTML = '<div class="empty-state"><div class="empty-art">' + icon('board') + '</div><span class="eyebrow">ВАШЕ НОВОЕ НАЧАЛО</span><h2>Дайте идеям пространство</h2><p>Создайте первый проект. Добавьте задачи, пригласите команду и превратите большой план в понятные шаги.</p><button class="button primary" data-action="new-project">' + icon('plus') + 'Создать проект</button></div>';
        return;
    }
    const done = state.cards.filter(isDone).length;
    const pct = state.cards.length ? Math.round(done / state.cards.length * 100) : 0;
    $('#breadcrumb-project').textContent = state.project.title;
    document.title = state.project.title + ' — Поток';
    $('#my-count').textContent = state.cards.filter(c => c.assignee_id === state.me.id && !isDone(c)).length;
    $('#project-header').innerHTML = '<div class="project-heading"><div class="project-title-row"><span class="project-emblem">' + icon('board') +
        '</span><div><h1>' + esc(state.project.title) + '</h1><p>' + esc(state.project.description || 'Место, где идеи становятся результатом.') +
        '</p></div></div><div class="project-meta"><span>' + icon('users') + state.members.length + ' в команде</span><i class="meta-separator"></i><span>' +
        icon('circle-check') + done + ' из ' + state.cards.length + ' задач завершено</span><i class="meta-separator"></i><span>' + icon('clock') + 'В своём ритме</span></div></div>' +
        '<div class="project-header-right"><div class="header-actions"><div class="avatar-stack">' + state.members.slice(0,4).map(m => avatar(m,true)).join('') +
        '</div><button class="button" data-action="team">' + icon('users') + 'Команда</button><button class="button primary" data-action="new-card">' + icon('plus') +
        'Новая задача</button>' + (isOwner() ? '<button class="icon-button" data-action="project-settings" aria-label="Настройки проекта" title="Настройки проекта">' + icon('more') + '</button>' : '') +
        '</div><div class="project-progress">Прогресс проекта <div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div><strong>' + pct + '%</strong></div></div>';
    const previousAssignee = filters.assignee;
    $('#assignee-filter').innerHTML = '<option value="">Все исполнители</option><option value="none">Без исполнителя</option>' +
        state.members.map(m => '<option value="' + m.id + '">' + esc(m.id === state.me.id ? 'Мои задачи' : m.name) + '</option>').join('');
    $('#assignee-filter').value = previousAssignee;
    $('#project-tabs').hidden = false;
    renderView();
}
function renderView() {
    if (!state.project) return;
    const cards = selectedCards();
    $$('.view-tabs button').forEach(b => {const active = b.dataset.view === view; b.classList.toggle('active',active); b.setAttribute('aria-selected',active); b.tabIndex = active ? 0 : -1;});
    $$('.side-nav button').forEach(b => b.classList.toggle('active', b.dataset.view === view || (b.dataset.action === 'my-tasks' && filters.assignee === String(state.me.id))));
    $('#toolbar').hidden = ['overview','activity'].includes(view);
    $('#overdue-filter').classList.toggle('active', filters.overdue);
    $('#overdue-filter').setAttribute('aria-pressed', filters.overdue);
    $('#reset-filters').hidden = !Object.values(filters).some(Boolean);
    $('#result-count').textContent = ['overview','activity'].includes(view) ? 'Проект доступен только участникам' : 'Показано ' + cards.length + ' из ' + state.cards.length + ' задач';
    const renderers = {board:renderBoard,list:renderList,calendar:renderCalendar,timeline:renderTimeline,overview:renderOverview,activity:renderActivity};
    $('#view-content').innerHTML = renderers[view](cards);
}
function taskCard(card) {
    const done = isDone(card), completed = card.checklist.filter(i => i.done).length;
    return '<article class="task-card' + (done ? ' card-done' : '') + '" draggable="true" tabindex="0" role="button" aria-label="Открыть задачу: ' + esc(card.title) + '" data-card-id="' + card.id + '" data-action="open-card">' +
        '<div class="card-topline">' + (card.label ? '<span class="label-tag label-' + labelClass(card.label) + '">' + esc(card.label) + '</span>' : '<span></span>') +
        '<span class="task-id">PT-' + card.id + '</span></div><h3>' + esc(card.title) + '</h3>' +
        (card.description ? '<p class="card-excerpt">' + esc(card.description) + '</p>' : '') +
        '<div class="card-details">' + (card.due_date ? '<span class="due ' + (isOverdue(card) ? 'overdue' : done ? 'done' : '') + '" title="' + (isOverdue(card) ? 'Просрочено' : 'Дедлайн') + '">' + icon('calendar') + shortDate(card.due_date) + '</span>' : '') +
        (card.checklist.length ? '<span title="Чек-лист">' + icon('circle-check') + completed + '/' + card.checklist.length + '</span>' : '') +
        (card.comments.length ? '<span title="Комментарии">' + icon('message') + card.comments.length + '</span>' : '') + '</div>' +
        '<div class="card-bottom">' + (done ? '<span class="card-completion">' + icon('circle-check') + 'Завершено</span>' : priority(card.priority)) + avatar(memberFor(card.assignee_id)) + '</div></article>';
}
function renderBoard(cards) {
    return '<div class="board">' + state.columns.map(col => {
        const group = cards.filter(c => c.column_id === col.id);
        return '<section class="board-column" data-column-id="' + col.id + '"><div class="column-header"><span class="column-indicator" style="--column-color:' + color(col.color) +
            '"></span><h2>' + esc(col.title) + '</h2><span class="column-count">' + group.length + '</span>' +
            (isOwner() ? '<button class="icon-button" data-action="edit-column" data-column-id="' + col.id + '" title="Настроить колонку" aria-label="Настроить колонку ' + esc(col.title) + '">' + icon('more') + '</button>' : '') +
            '</div><div class="card-list">' + (group.length ? group.map(taskCard).join('') : '<div class="empty-column">' + (state.cards.some(c => c.column_id === col.id) ? 'Нет задач по фильтру' : 'Здесь начинается следующий шаг') + '</div>') +
            '</div><button class="add-card" data-action="new-card" data-column-id="' + col.id + '">' + icon('plus') + 'Добавить задачу</button></section>';
    }).join('') + (isOwner() ? '<button class="add-column" data-action="new-column">' + icon('plus') + 'Добавить колонку</button>' : '') + '</div>';
}
function renderList(cards) {
    if (!cards.length) return emptyResults();
    return '<div class="table-wrap"><table class="task-table"><thead><tr><th>Задача</th><th>Статус</th><th>Исполнитель</th><th>Приоритет</th><th>Дедлайн</th></tr></thead><tbody>' +
        cards.map(c => '<tr><td><button class="task-title-button" data-action="open-card" data-card-id="' + c.id + '"><span class="task-id">PT-' + c.id + '</span>' + esc(c.title) + '</button></td>' +
        '<td><span class="column-badge"><i class="project-dot" style="--dot:' + color(columnFor(c).color) + '"></i>' + esc(columnFor(c).title) + '</span></td>' +
        '<td><span class="table-person">' + avatar(memberFor(c.assignee_id),true) + esc(memberFor(c.assignee_id)?.name || 'Не назначен') + '</span></td><td>' + priority(c.priority) +
        '</td><td><span class="due ' + (isOverdue(c) ? 'overdue' : '') + '">' + (shortDate(c.due_date) || '—') + '</span></td></tr>').join('') + '</tbody></table></div>';
}
function emptyResults() { return '<div class="empty-state"><div class="empty-art">' + icon('search') + '</div><h2>Пока ничего не нашлось</h2><p>Попробуйте изменить фильтры или добавьте новую задачу.</p><button class="button" data-action="reset-filters">Сбросить фильтры</button></div>'; }
function renderCalendar(cards) {
    const month = calendarMonth.getMonth(), start = new Date(calendarMonth);
    start.setDate(1 - (start.getDay()+6)%7);
    let html = '<div class="view-section-header"><div><h2>' + calendarMonth.toLocaleDateString('ru-RU',{month:'long',year:'numeric'}) + '</h2><p class="muted">Задачи на дату дедлайна · Без срока: ' + cards.filter(c => !c.due_date).length +
        '</p></div><div class="calendar-controls"><button class="icon-button" data-action="month-prev" aria-label="Предыдущий месяц">←</button><button class="button small" data-action="month-today">Сегодня</button><button class="icon-button" data-action="month-next" aria-label="Следующий месяц">→</button></div></div><div class="calendar">';
    html += ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'].map(d => '<div class="calendar-weekday">' + d + '</div>').join('');
    for(let i=0;i<42;i++) {
        const d = new Date(start); d.setDate(start.getDate()+i);
        const iso = isoDay(d);
        html += '<div class="calendar-day' + (d.getMonth() !== month ? ' outside' : '') + (iso === today() ? ' today' : '') + '"><span class="day-number">' + d.getDate() + '</span>' +
            cards.filter(c => c.due_date === iso).map(c => '<button class="calendar-card ' + (isOverdue(c) ? 'overdue' : '') + '" data-action="open-card" data-card-id="' + c.id + '">' + esc(c.title) + '</button>').join('') + '</div>';
    }
    return html + '</div>';
}
function renderTimeline(cards) {
    const dated = cards.filter(c => c.start_date || c.due_date);
    if (!dated.length) return '<div class="empty-state"><div class="empty-art">' + icon('timeline') + '</div><h2>Планы обретают форму</h2><p>Укажите дату начала или дедлайн в карточке задачи. Здесь появится наглядный план проекта.</p></div>';
    const dates = dated.flatMap(c => [c.start_date || c.due_date,c.due_date || c.start_date]).sort();
    const from = dateObject(dates[0]), to = dateObject(dates.at(-1));
    from.setDate(from.getDate()-1); to.setDate(to.getDate()+2);
    const total = to-from, percent = date => (dateObject(date)-from)/total*100;
    let axis = '';
    for(let i=0;i<7;i++) axis += '<span>' + shortDate(isoDay(new Date(+from+total*i/6))) + '</span>';
    return '<div class="view-section-header"><div><h2>Всё в своё время</h2><p class="muted">План по датам начала и завершения · Без дат: ' + (cards.length-dated.length) + '</p></div></div><div class="timeline-scroll"><div class="timeline"><div class="timeline-head"><span class="timeline-title">Задача</span><div class="timeline-axis">' + axis + '</div></div>' +
        dated.map(c => {const left = percent(c.start_date || c.due_date), end = percent(c.due_date || c.start_date); return '<div class="timeline-row"><button class="timeline-title" data-action="open-card" data-card-id="' + c.id + '">' + esc(c.title) +
            '</button><div class="timeline-track"><button class="timeline-bar ' + (isOverdue(c) ? 'overdue' : '') + '" style="left:' + left.toFixed(2) + '%;width:' + Math.max(1.2,end-left).toFixed(2) + '%" data-action="open-card" data-card-id="' + c.id + '" title="' + esc(c.title) + ' · ' + shortDate(c.start_date || c.due_date) + ' — ' + shortDate(c.due_date || c.start_date) + '">' + esc(memberFor(c.assignee_id)?.name || '') + '</button></div></div>';}).join('') + '</div></div>';
}
function renderOverview() {
    const cards = state.cards, done = cards.filter(isDone).length;
    const metrics = [['Всего задач',cards.length,'Каждый шаг имеет значение'],['Завершено',done,cards.length ? Math.round(done/cards.length*100)+'% от общего плана' : 'Начните с первой задачи'],['Просрочено',cards.filter(isOverdue).length,'Требуют вашего внимания'],['Без исполнителя',cards.filter(c => !c.assignee_id && !isDone(c)).length,'Можно взять в работу']];
    return '<div class="view-section-header"><div><h2>Проект в фокусе</h2><p class="muted">Прогресс, команда и распределение работы.</p></div></div><div class="metrics">' +
        metrics.map(m => '<div class="metric-card"><span class="metric-label">' + m[0] + '</span><strong>' + m[1] + '</strong><small>' + m[2] + '</small></div>').join('') +
        '</div><div class="overview-grid"><section class="panel"><h3>Загрузка команды</h3>' + state.members.map(m => {const total=cards.filter(c=>c.assignee_id===m.id).length,active=cards.filter(c=>c.assignee_id===m.id&&!isDone(c)).length;return '<div class="workload-row">'+avatar(m)+'<span>'+esc(m.name)+'<br><small>'+active+' открытых · '+total+' всего</small></span><div class="progress-track"><div class="progress-fill" style="width:'+(cards.length?active/cards.length*100:0)+'%"></div></div></div>';}).join('') +
        '</section><section class="panel"><h3>Распределение по этапам</h3>' + state.columns.map(c => {const count=cards.filter(t=>t.column_id===c.id).length;return '<div class="workload-row"><i class="project-dot" style="--dot:'+color(c.color)+'"></i><span>'+esc(c.title)+'</span><div class="progress-track"><div class="progress-fill" style="width:'+(cards.length?count/cards.length*100:0)+'%"></div></div><small>'+count+'</small></div>';}).join('') + '</section></div>';
}
function renderActivity() {
    return '<div class="view-section-header"><div><h2>История проекта</h2><p class="muted">Последние 30 событий команды.</p></div></div><section class="panel"><ul class="activity-list">' +
        (state.activity.length ? state.activity.map(a => '<li class="activity-item">' + avatar(a.actor) + '<div><p><strong>' + esc(a.actor.name) + '</strong> ' + esc(a.text) + '</p><time>' + dateTime(a.created_at) + '</time></div></li>').join('') : '<li class="empty-inline">Здесь появятся события вашего проекта.</li>') + '</ul></section>';
}
function field(label, name, value = '', options = {}) {
    const type = options.type || 'text';
    return '<div class="field ' + (options.className || '') + '"><label for="field-' + name + '">' + label + '</label>' +
        (type === 'textarea' ? '<textarea id="field-' + name + '" name="' + name + '" maxlength="' + (options.max || 20000) + '">' + esc(value) + '</textarea>' :
        '<input id="field-' + name + '" name="' + name + '" type="' + type + '" value="' + esc(value) + '" ' + (options.required ? 'required ' : '') + (options.max ? 'maxlength="' + options.max + '" ' : '') + '>') + '</div>';
}
function selectField(label, name, options, current) {
    return '<div class="field"><label for="field-' + name + '">' + label + '</label><select id="field-' + name + '" name="' + name + '">' +
        options.map(o => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(current ?? '') ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></div>';
}
function hidden(name,value) { return '<input type="hidden" name="' + name + '" value="' + esc(value) + '">'; }
function dialogHeader(title, eyebrow = '') {
    return '<header class="dialog-header"><div>' + (eyebrow ? '<span class="eyebrow">' + esc(eyebrow) + '</span>' : '') + '<h2 id="dialog-title">' + esc(title) + '</h2></div><button class="icon-button" data-action="close-dialog" aria-label="Закрыть окно">' + icon('close') + '</button></header>';
}
function formError() { return '<div class="form-error" role="alert" id="form-error"></div>'; }
function footer(formId, label = 'Сохранить', extra = '') {
    return '<footer class="dialog-footer">' + extra + '<button class="button" data-action="close-dialog" type="button">Отмена</button><button class="button primary" type="submit" form="' + formId + '">' + label + '</button></footer>';
}
function snapshot() { const form = $('#main-form'); return form ? JSON.stringify([...new FormData(form)]) : ''; }
function hasDraft() {
    return snapshot() !== formSnapshot || $$('[data-form="comment"] textarea,[data-form="checklist"] input',dialog).some(input => input.value.trim());
}
function showDialog(html, type, compact = false) {
    dialogType = type;
    dialog.classList.toggle('compact', compact);
    $('#dialog-content').innerHTML = html;
    if (!dialog.open) dialog.showModal();
    formSnapshot = snapshot();
    requestAnimationFrame(() => {const el = $('input:not([type=hidden]), textarea', dialog); if(el && type !== 'card') el.focus();});
}
function closeDialog(force = false) {
    if (busy) return;
    if (!force && hasDraft() && !confirm('Закрыть окно без сохранения изменений?')) return;
    dialog.close(); dialogCardId = null; dialogType = ''; formSnapshot = '';
}
function openProject(settings = false) {
    const project = settings ? state.project : {title:'',description:'',color:'#579b83'};
    showDialog(dialogHeader(settings ? 'Настройки проекта' : 'Новый проект', 'ПРОСТРАНСТВО ДЛЯ ВАШЕЙ ИДЕИ') +
        '<form id="main-form" data-form="project" class="dialog-body stack-form">' + hidden('action',settings?'project_update':'project_create') + formError() +
        field('Название проекта','title',project.title,{required:true,max:120}) + field('Описание','description',project.description,{type:'textarea',max:4000}) +
        field('Цвет проекта','color',project.color,{type:'color'}) + (!settings ? '<p class="help">Сразу создадим четыре этапа: «Новые», «В работе», «На проверке» и «Готово». Их можно изменить.</p>' : '') +
        '</form>' + footer('main-form',settings?'Сохранить':'Создать проект',settings ? '<button class="button danger" data-action="delete-project" type="button">' + icon('trash') + 'Удалить</button>' : ''), 'project',true);
}
function openColumn(id) {
    const col = state.columns.find(c=>c.id===Number(id));
    showDialog(dialogHeader(col ? 'Настройки колонки' : 'Новая колонка') +
        '<form id="main-form" data-form="column" class="dialog-body stack-form">' + hidden('action',col?'column_update':'column_create') +
        (col?hidden('column_id',col.id):'') + formError() + field('Название','title',col?.title || '',{required:true,max:120}) +
        (col ? '<label class="check-field"><input type="checkbox" name="is_done" ' + (col.is_done?'checked':'') + '>Задачи в этой колонке завершены</label><p class="help">Удалить можно только пустую колонку. Задачи сначала перенесите в другой этап.</p>' : '') +
        '</form>' + footer('main-form','Сохранить',col?'<button type="button" class="button danger" data-action="delete-column" data-column-id="'+col.id+'">'+icon('trash')+'Удалить</button>':''), 'column',true);
}
function openCard(id, columnId) {
    const card = id ? getCard(id) : null;
    if (id && !card) { toast('Эта задача больше недоступна.',true); return; }
    dialogCardId = card?.id || null;
    showDialog(dialogHeader(card ? 'Детали задачи' : 'Новая задача',card?'PT-'+card.id:'СЛЕДУЮЩИЙ ШАГ') +
        '<div class="dialog-body"><form id="main-form" data-form="card" class="stack-form">' +
        hidden('action',card?'card_update':'card_create') + (card?hidden('card_id',card.id)+hidden('version',card.version):'') + formError() +
        field('Название задачи','title',card?.title || '',{required:true,max:255,className:'title-field'}) +
        field('Описание','description',card?.description || '',{type:'textarea'}) +
        '<div class="form-grid">' +
        selectField('Колонка','column',state.columns.map(c=>[c.id,c.title]),card?.column_id || columnId || state.columns[0]?.id) +
        selectField('Исполнитель','assignee',[['','Не назначен'],...state.members.map(m=>[m.id,m.name+(m.id===state.me.id?' (я)':'')])],card?.assignee_id) +
        selectField('Приоритет','priority',Object.entries(priorityNames),card?.priority || 'medium') +
        field('Метка','label',card?.label || '',{max:40}) +
        field('Дата начала','start_date',card?.start_date || '',{type:'date'}) +
        field('Дедлайн','due_date',card?.due_date || '',{type:'date'}) + '</div></form>' +
        (card && !card.assignee_id ? '<button class="button small" style="margin-top:15px" data-action="claim-card">' + icon('users') + 'Взять задачу на себя</button>' : '') +
        (card ? '<div id="task-extras"></div><div class="task-meta">Создал(а) ' + esc(card.creator.name) + ' · ' + dateTime(card.created_at) + '<br>Обновлено ' + dateTime(card.updated_at) + '</div>' : '<p class="help" style="margin-top:20px">После создания появятся чек-лист и обсуждение.</p>') +
        '</div>' + footer('main-form',card?'Сохранить изменения':'Создать задачу',card?'<button type="button" class="button danger" data-action="delete-card">'+icon('trash')+'Удалить</button>':''),'card');
    if(card) renderExtras();
}
function renderExtras() {
    const card = getCard(dialogCardId);
    if(!card || !$('#task-extras')) return;
    const commentDraft = $('[data-form="comment"] textarea',dialog)?.value || '';
    const checkDraft = $('[data-form="checklist"] input',dialog)?.value || '';
    const focusedId = document.activeElement?.id;
    const completed = card.checklist.filter(i=>i.done).length;
    $('#task-extras').innerHTML = '<div class="task-extras"><section><h3>' + icon('circle-check') + 'Чек-лист <span class="muted">' + completed + '/' + card.checklist.length + '</span></h3>' +
        card.checklist.map(i=>'<div class="checklist-row"><input type="checkbox" id="check-'+i.id+'" data-check-id="'+i.id+'" '+(i.done?'checked':'')+'><label for="check-'+i.id+'" class="'+(i.done?'checked':'')+'">'+esc(i.text)+'</label><button class="icon-button" data-action="delete-check" data-item-id="'+i.id+'" aria-label="Удалить пункт">'+icon('close')+'</button></div>').join('') +
        '<form data-form="checklist" class="inline-input"><input name="text" placeholder="Добавить пункт..." aria-label="Новый пункт чек-листа" maxlength="255" required><button class="button small" aria-label="Добавить пункт">'+icon('plus')+'</button></form></section>' +
        '<section><h3>'+icon('message')+'Обсуждение <span class="muted">'+card.comments.length+'</span></h3><div class="comments-list">' +
        (card.comments.length ? card.comments.map(c=>'<div class="comment">'+avatar(c.author,true)+'<div><strong>'+esc(c.author.name)+'</strong><time>'+dateTime(c.created_at)+'</time><p>'+esc(c.text)+'</p></div></div>').join('') : '<p class="help">Обсудите детали или поделитесь результатом.</p>') +
        '</div><form data-form="comment" class="inline-input"><textarea name="text" placeholder="Написать комментарий..." aria-label="Комментарий" maxlength="4000" required></textarea><button class="button small" aria-label="Отправить комментарий">'+icon('arrow')+'</button></form></section></div>';
    $('[data-form="comment"] textarea',dialog).value = commentDraft;
    $('[data-form="checklist"] input',dialog).value = checkDraft;
    if(focusedId) document.getElementById(focusedId)?.focus();
}
function openTeam() {
    showDialog(dialogHeader('Вместе получается больше', 'КОМАНДА ПРОЕКТА') + '<div class="dialog-body"><p class="muted" style="font-size:12px">Участники видят доску, работают с задачами и обсуждают детали. Проектом и составом команды управляет владелец.</p><div id="team-list">' +
        state.members.map(m=>'<div class="team-row">'+avatar(m)+'<div><strong>'+esc(m.name)+'</strong><small>@'+esc(m.username)+'</small></div>'+(m.id===state.project.owner_id?'<span class="role">Владелец</span>':isOwner()?'<button class="icon-button" data-action="remove-member" data-member-id="'+m.id+'" aria-label="Удалить участника">'+icon('close')+'</button>':'<span class="role">Участник</span>')+'</div>').join('') +
        '</div>' + (isOwner()?'<form id="main-form" data-form="member" class="stack-form" style="margin-top:24px">'+formError()+field('Добавить участника по логину','username','',{required:true,max:150})+'<p class="help">Пользователь должен быть зарегистрирован в «Потоке». После добавления проект появится в его пространстве.</p><button class="button primary">Добавить в проект</button></form>':'')+'</div>', 'team',true);
}
function setView(next) {
    view = next; history.replaceState(null,'','#'+view);
    document.body.classList.remove('sidebar-open');
    renderView(); $('#view-content').scrollTop = 0;
}
function resetFilters() {
    filters = {search:'',assignee:'',priority:'',overdue:false};
    $('#search').value = $('#assignee-filter').value = $('#priority-filter').value = '';
    renderView();
}
async function handleAction(button) {
    const action=button.dataset.action;
    if (action === 'toggle-sidebar') {document.body.classList.toggle('sidebar-open');return;}
    if (action === 'close-dialog') {closeDialog();return;}
    if (action === 'new-project') {openProject();return;}
    if (!state.project) {if(action==='team') toast('Сначала создайте проект.');return;}
    switch(action) {
    case 'view': setView(button.dataset.view); break;
    case 'my-tasks': resetFilters();filters.assignee=String(state.me.id);$('#assignee-filter').value=filters.assignee;setView('list');break;
    case 'overdue': filters.overdue=!filters.overdue;renderView();break;
    case 'reset-filters': resetFilters();break;
    case 'refresh': await refresh();break;
    case 'new-card': openCard(null,button.dataset.columnId);break;
    case 'open-card': openCard(button.dataset.cardId);break;
    case 'reload-card':
        if(confirm('Загрузить актуальную версию задачи? Несохранённые изменения будут потеряны.')) {
            await refresh({quiet:true});openCard(dialogCardId);
        } break;
    case 'new-column': openColumn();break;
    case 'edit-column': openColumn(button.dataset.columnId);break;
    case 'project-settings': openProject(true);break;
    case 'team': openTeam();document.body.classList.remove('sidebar-open');break;
    case 'delete-card': {
        const card=getCard(dialogCardId);
        if(confirm('Удалить задачу «'+card.title+'» вместе с комментариями и чек-листом?')) {
            await mutate({action:'card_delete',card_id:card.id,version:Number($('[name=version]',dialog).value)},'Задача удалена');
            closeDialog(true);
        } break;
    }
    case 'claim-card': {
        if(snapshot()!==formSnapshot) {toast('Сначала сохраните изменения задачи.',true);break;}
        const card=getCard(dialogCardId);
        await mutate({action:'card_claim',card_id:card.id,version:Number($('[name=version]',dialog).value)},'Задача теперь ваша');
        openCard(card.id);break;
    }
    case 'delete-project':
        if(confirm('Удалить проект «'+state.project.title+'» и все его задачи? Это действие нельзя отменить.')) {
            await mutate({action:'project_delete'});
            location.assign('/management/');
        } break;
    case 'delete-column':
        if(confirm('Удалить эту пустую колонку?')) {
            await mutate({action:'column_delete',column_id:Number(button.dataset.columnId)},'Колонка удалена');
            closeDialog(true);
        } break;
    case 'remove-member':
        if(confirm('Удалить участника из проекта? Его задачи останутся без исполнителя.')) {
            await mutate({action:'member_remove',member_id:Number(button.dataset.memberId)},'Участник удалён');
            openTeam();
        } break;
    case 'delete-check':
        await mutate({action:'checklist_delete',card_id:dialogCardId,item_id:Number(button.dataset.itemId)});
        renderExtras();break;
    case 'month-prev':calendarMonth.setMonth(calendarMonth.getMonth()-1);renderView();break;
    case 'month-next':calendarMonth.setMonth(calendarMonth.getMonth()+1);renderView();break;
    case 'month-today':calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);renderView();break;
    case 'export':exportCsv();break;
    }
}
async function submitForm(form) {
    const type=form.dataset.form;
    const data=Object.fromEntries(new FormData(form));
    const errorBox=$('#form-error');
    if(errorBox) errorBox.textContent='';
    const submit=$('[type=submit][form="'+form.id+'"]') || $('button',form);
    if(submit) submit.disabled=true;
    try {
        if(type==='project' && data.action==='project_create') {
            busy=true;
            const result=await request('/management/api/projects/',data);
            busy=false;
            formSnapshot=snapshot();
            location.assign('/management/project/'+result.id+'/');
        } else if(type==='project') {
            await mutate(data,'Проект обновлён');closeDialog(true);
        } else if(type==='column') {
            data.is_done=Boolean(form.elements.is_done?.checked);
            await mutate(data,'Колонка сохранена');closeDialog(true);
        } else if(type==='card') {
            if(data.card_id) {data.card_id=Number(data.card_id);data.version=Number(data.version);}
            const result=await mutate(data,data.card_id?'Задача обновлена':'Задача создана');
            closeDialog(true);
            if(result.card_id) openCard(result.card_id);
        } else if(type==='member') {
            await mutate({action:'member_add',username:data.username},'Участник добавлен');
            openTeam();
        } else if(type==='comment' || type==='checklist') {
            await mutate({action:type==='comment'?'comment_add':'checklist_add',card_id:dialogCardId,text:data.text});
            form.reset();
            renderExtras();
        }
    } catch(error) {
        if(errorBox) {
            errorBox.textContent=error.message;
            if(error.status===409 && type==='card') errorBox.insertAdjacentHTML('beforeend',' <button type="button" class="button small" data-action="reload-card">Загрузить актуальную версию</button>');
        }
        else toast(error.message,true);
    } finally {busy=false;if(submit)submit.disabled=false;}
}
function exportCsv() {
    const quote=value=>{let s=String(value??'');if(/^[=+@\-\t\r\n]/.test(s)) s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
    const rows=[['ID','Задача','Описание','Колонка','Исполнитель','Приоритет','Начало','Дедлайн'],...selectedCards().map(c=>['PT-'+c.id,c.title,c.description,columnFor(c).title,memberFor(c.assignee_id)?.name||'',priorityNames[c.priority],c.start_date,c.due_date])];
    const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(quote).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='potok-project-'+state.project.id+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    toast('Экспорт задач готов');
}
async function run(action) {try{await action();}catch(error){const target=$('#form-error',dialog);if(dialog.open&&target)target.textContent=error.message;else toast(error.message,true);}}
document.addEventListener('click',event=>{
    const button=event.target.closest('[data-action]');
    if(!button || busy) return;
    run(()=>handleAction(button));
});
document.addEventListener('submit',event=>{
    const form=event.target.closest('form[data-form]');
    if(!form)return;event.preventDefault();if(!busy)submitForm(form);
});
dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog();}});
document.addEventListener('change',event=>{
    const target=event.target;
    if(target.id==='assignee-filter'){filters.assignee=target.value;renderView();}
    if(target.id==='priority-filter'){filters.priority=target.value;renderView();}
    if(target.dataset.checkId) {
        if(busy){target.checked=!target.checked;return;}
        const checked=target.checked;
        run(async()=>{try{await mutate({action:'checklist_toggle',card_id:dialogCardId,item_id:Number(target.dataset.checkId),done:checked});renderExtras();}catch(e){target.checked=!checked;throw e;}});
    }
});
$('#search').addEventListener('input',event=>{filters.search=event.target.value;renderView();});
document.addEventListener('keydown',event=>{
    if(event.key==='Escape')document.body.classList.remove('sidebar-open');
    if(event.target.matches('.task-card') && ['Enter',' '].includes(event.key)){event.preventDefault();openCard(event.target.dataset.cardId);return;}
    if(event.target.matches('[role=tab]')&&['ArrowRight','ArrowLeft','Home','End'].includes(event.key)){
        const tabs=$$('[role=tab]');let i=tabs.indexOf(event.target);
        i=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
        event.preventDefault();setView(tabs[i].dataset.view);tabs[i].focus();return;
    }
    if(dialog.open || event.target.matches('input,textarea,select,[contenteditable]') || event.ctrlKey || event.metaKey || event.altKey)return;
    if(event.key==='/'){event.preventDefault();$('#search').focus();}
    if(event.key.toLowerCase()==='n'&&state.project){event.preventDefault();openCard();}
});
function clearDropStyles() {$$('.drop-target,.drop-before').forEach(n=>n.classList.remove('drop-target','drop-before'));}
$('#view-content').addEventListener('dragstart',event=>{
    const card=event.target.closest('.task-card');
    if(!card || busy)return;
    draggingId=Number(card.dataset.cardId);event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',String(draggingId));card.classList.add('dragging');
});
$('#view-content').addEventListener('dragover',event=>{
    const col=event.target.closest('.board-column');
    if(!col || !draggingId)return;
    event.preventDefault();event.dataTransfer.dropEffect='move';clearDropStyles();col.classList.add('drop-target');
    const card=event.target.closest('.task-card');
    if(card&&Number(card.dataset.cardId)!==draggingId)card.classList.add('drop-before');
});
$('#view-content').addEventListener('drop',event=>{
    const col=event.target.closest('.board-column');
    if(!col || !draggingId)return;event.preventDefault();
    const card=getCard(draggingId),columnId=Number(col.dataset.columnId),target=event.target.closest('.task-card');
    const others=state.cards.filter(c=>c.column_id===columnId&&c.id!==card.id);
    const position=target?others.findIndex(c=>c.id===Number(target.dataset.cardId)):others.length;
    clearDropStyles();draggingId=null;
    if(target&&Number(target.dataset.cardId)===card.id)return;
    run(()=>mutate({action:'card_move',card_id:card.id,version:card.version,column_id:columnId,position:Math.max(0,position)},'Задача перемещена'));
});
document.addEventListener('dragend',()=>{draggingId=null;clearDropStyles();$$('.dragging').forEach(n=>n.classList.remove('dragging'));});
window.addEventListener('beforeunload',event=>{if(busy || (dialog.open&&hasDraft())){event.preventDefault();event.returnValue='';}});
setInterval(()=>{if(state.project&&!document.hidden&&!dialog.open&&!busy&&!draggingId)refresh({quiet:true}).catch(()=>syncStatus('Не удалось обновить доску',true));},30000);
render();
})();
