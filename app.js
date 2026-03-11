const authScreen = document.getElementById('auth-screen');
const mainContent = document.getElementById('main-content');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('new-item');
const todoList = document.getElementById('todo-list');
const partyModeBtn = document.getElementById('party-mode-btn');
const partyContainer = document.getElementById('party-container');
const partyVideo = document.querySelector('#party-video iframe');

let userToken = localStorage.getItem('token');
let todos = [];
let partyMode = localStorage.getItem('partyMode') === 'true';

// Initialize SortableJS
const sortable = new Sortable(todoList, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    filter: '.editing', // Don't allow dragging while editing
    onEnd: async function() {
        const ids = Array.from(todoList.children).map(li => li.getAttribute('data-id'));
        const reordered = ids.map(id => todos.find(t => t._id === id));
        todos = reordered;
        if (userToken) {
            try {
                await fetch('/api/todos/reorder', {
                    method: 'PATCH',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${userToken}` 
                    },
                    body: JSON.stringify({ ids })
                });
            } catch (error) {
                console.error('Failed to sync reorder with server:', error);
            }
        }
    }
});

async function handleAuth(action) {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password) return alert('Username and password required gng');
    try {
        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, username, password })
        });
        const data = await res.json();
        if (res.ok) {
            userToken = data.token;
            localStorage.setItem('token', userToken);
            localStorage.setItem('username', data.username);
            showMainContent();
            fetchTodos();
        } else {
            alert(data.error || 'Auth failed');
        }
    } catch (err) {
        console.error('Auth error:', err);
        alert('Something went wrong, try again.');
    }
}

function showMainContent() {
    authScreen.style.display = 'none';
    mainContent.style.display = 'block';
    setGreeting();
    if (partyMode) {
        partyContainer.classList.remove('hidden');
        partyContainer.style.display = 'block';
        partyModeBtn.checked = true;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    userToken = null;
    mainContent.style.display = 'none';
    authScreen.style.display = 'flex';
}

loginBtn.addEventListener('click', () => handleAuth('login'));
registerBtn.addEventListener('click', () => handleAuth('register'));
logoutBtn.addEventListener('click', logout);

// Party Mode Toggle
partyModeBtn.addEventListener('change', () => {
    partyMode = partyModeBtn.checked;
    localStorage.setItem('partyMode', partyMode);
    if (partyMode) {
        partyContainer.classList.remove('hidden');
        partyContainer.style.display = 'block';
        // Play video
        partyVideo.src = partyVideo.src.replace('autoplay=0', 'autoplay=1');
    } else {
        partyContainer.classList.add('hidden');
        partyContainer.style.display = 'none';
        // Pause video
        partyVideo.src = partyVideo.src.replace('autoplay=1', 'autoplay=0');
    }
});

function setGreeting() {
    const estTime = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    const hour = new Date(estTime).getHours();
    const username = localStorage.getItem('username') || 'Gurt';
    let timeOfDay;
    if (hour < 12) timeOfDay = 'Morning';
    else if (hour < 18) timeOfDay = 'Afternoon';
    else timeOfDay = 'Evenings';
    todoInput.placeholder = `Good ${timeOfDay}, ${username}!`;
}

async function fetchTodos() {
    if (!userToken) return;
    try {
        const response = await fetch('/api/todos', {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        if (response.status === 401) return logout();
        todos = await response.json();
        render();
    } catch (error) {
        console.error('Failed to fetch todos:', error);
    }
}

async function addTodo(title) {
    if (!userToken) return;
    try {
        const response = await fetch('/api/todos', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}` 
            },
            body: JSON.stringify({ title })
        });
        if (response.status === 401) return logout();
        const newTodo = await response.json();
        newTodo.new = true;
        todos.push(newTodo);
        render();
    } catch (error) {
        console.error('Failed to add todo:', error);
    }
}

async function updateTodoStatus(id, status) {
    if (!userToken) return;
    try {
        const response = await fetch('/api/todos', {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}` 
            },
            body: JSON.stringify({ id, status })
        });
        if (response.status === 401) return logout();
        const updated = await response.json();
        const index = todos.findIndex(t => t._id === id);
        if (index !== -1) {
            todos[index] = updated;
            render();
        }
    } catch (error) {
        console.error('Failed to update todo status:', error);
    }
}

async function updateTodoTitle(id, title) {
    if (!userToken) return;
    try {
        const response = await fetch('/api/todos', {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}` 
            },
            body: JSON.stringify({ id, title })
        });
        if (response.status === 401) return logout();
        const updated = await response.json();
        const index = todos.findIndex(t => t._id === id);
        if (index !== -1) {
            todos[index] = updated;
            render();
        }
    } catch (error) {
        console.error('Failed to update todo title:', error);
    }
}

async function clearTodo(id) {
    if (!userToken) return;
    try {
        const response = await fetch('/api/todos', {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}` 
            },
            body: JSON.stringify({ id })
        });
        if (response.status === 401) return logout();
        todos = todos.filter(t => t._id !== id);
        render();
    } catch (error) {
        console.error('Failed to clear todo:', error);
    }
}

async function clearAllTodos() {
    if (!userToken) return;
    try {
        const response = await fetch('/api/todos', {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}` 
            },
            body: JSON.stringify({ clearAll: true })
        });
        if (response.status === 401) return logout();
        todos = [];
        render();
    } catch (error) {
        console.error('Failed to clear all todos:', error);
    }
}

function render() {
    todoList.innerHTML = '';
    todos.forEach((todo) => {
        const li = document.createElement('li');
        li.setAttribute('data-id', todo._id);

        if (todo.new) {
            li.classList.add('new');
            delete todo.new;
        }
        if (todo.status === 'done') li.classList.add('done');
        if (todo.status === 'faded') li.classList.add('faded');

        const span = document.createElement('span');
        span.textContent = todo.title;
        span.className = 'todo-title';

        const finishEdit = async () => {
            if (span.contentEditable !== 'true') return;
            span.contentEditable = 'false';
            span.classList.remove('editing');
            const newTitle = span.textContent.trim();
            if (newTitle && newTitle !== todo.title) {
                await updateTodoTitle(todo._id, newTitle);
            } else {
                span.textContent = todo.title; // Reset if empty
            }
        };

        const startEdit = () => {
            span.contentEditable = 'true';
            span.classList.add('editing');
            span.focus();
            
            // Place cursor at the end
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(span);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        };

        span.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEdit();
            }
            if (e.key === 'Escape') {
                span.contentEditable = 'false';
                span.classList.remove('editing');
                span.textContent = todo.title;
            }
        });

        span.addEventListener('blur', finishEdit);

        const check = document.createElement('button');
        check.className = 'check';
        if (todo.status === 'done') check.classList.add('done');
        if (todo.status === 'faded') check.classList.add('fade-action');
        
        check.addEventListener('click', (e) => {
            if (span.contentEditable === 'true') {
                e.stopPropagation();
                finishEdit();
                return;
            }
            if (todo.status === 'faded') return;
            check.classList.add('bounce');
            if (todo.status !== 'done') {
                const audio = new Audio('assets/audio/perc 30.wav');
                audio.playbackRate = 1.44;
                audio.play().catch(e => console.log('Audio play failed:', e));
            }
            setTimeout(() => {
                const nextStatus = todo.status === 'done' ? 'pending' : 'done';
                updateTodoStatus(todo._id, nextStatus);
            }, 400);
        });

        const dropdown = document.createElement('button');
        dropdown.className = 'dropdown';
        dropdown.textContent = '▾';

        const menu = document.createElement('div');
        menu.className = 'dropdown-menu';

        const fadeText = document.createElement('div');
        fadeText.className = 'fade-text';
        fadeText.textContent = 'FADEEE';
        li.appendChild(fadeText);

        const editOpt = document.createElement('button');
        editOpt.textContent = 'Edit';
        editOpt.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.remove('show');
            startEdit();
        });

        const fadeOpt = document.createElement('button');
        fadeOpt.textContent = todo.status === 'faded' ? 'Unfade' : 'Fade';
        fadeOpt.addEventListener('click', () => {
            const nextStatus = todo.status === 'faded' ? 'pending' : 'faded';
            if (nextStatus === 'faded') {
                fadeText.classList.add('show');
                li.classList.add('fade');
            }
            setTimeout(() => {
                updateTodoStatus(todo._id, nextStatus);
            }, 800);
            menu.classList.remove('show');
        });

        const clearOpt = document.createElement('button');
        clearOpt.textContent = 'Clear';
        clearOpt.addEventListener('click', () => clearTodo(todo._id));

        menu.append(editOpt, fadeOpt, clearOpt);
        dropdown.addEventListener('click', e => {
            e.stopPropagation();
            menu.classList.toggle('show');
        });

        li.append(span, check, dropdown, menu);
        todoList.appendChild(li);
    });
}

todoForm.addEventListener('submit', e => {
    e.preventDefault();
    const title = todoInput.value.trim();
    if (title) {
        addTodo(title);
        todoInput.value = '';
    }
});

document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
});

document.getElementById('clear-all-btn').addEventListener('click', () => {
    if (todos.length === 0) return;
    if (confirm('Are you sure you want to clear all todos?')) clearAllTodos();
});

const fidgetBtn = document.getElementById('fidget-btn');
let isPlaying = false;
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let fidgetSoundBuffer = null;

fetch('assets/audio/lightningbulb-spacebar-click-keyboard-199448.mp3')
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
    .then(audioBuffer => fidgetSoundBuffer = audioBuffer)
    .catch(e => console.log('Fidget audio failed:', e));

function playFidgetSound() {
    if (!fidgetSoundBuffer) return;
    const source = audioContext.createBufferSource();
    source.buffer = fidgetSoundBuffer;
    source.playbackRate.value = 1.2;
    source.detune.value = -100;
    source.connect(audioContext.destination);
    source.start(0);
}

fidgetBtn.addEventListener('click', () => {
    playFidgetSound();
    document.querySelectorAll('#todo-list li').forEach(li => {
        li.classList.add('fidget');
        setTimeout(() => li.classList.remove('fidget'), 250);
    });
    fidgetBtn.classList.add('brighten');
    setTimeout(() => fidgetBtn.classList.remove('brighten'), 200);
});

if (userToken) {
    showMainContent();
    fetchTodos();
} else {
    authScreen.style.display = 'flex';
}
