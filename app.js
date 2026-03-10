const form = document.getElementById('todo-form');
const input = document.getElementById('new-item');
const list = document.getElementById('todo-list');

let todos = JSON.parse(localStorage.getItem('todos') || '[]');

function save() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function render() {
    list.innerHTML = '';
    todos.forEach((todo, idx) => {
        const li = document.createElement('li');
        // new items should animate when added
        if (todo.new) {
            li.classList.add('new');
            todo.new = false; // clear flag so future renders don't animate
        }
        if (todo.done) li.classList.add('done');
        if (todo.faded) li.classList.add('faded');

        const span = document.createElement('span');
        span.textContent = todo.title;
        // text toggle remains
        span.addEventListener('click', () => {
            check.classList.add('done');
            setTimeout(() => {
                todos[idx].done = !todos[idx].done;
                save();
                render();
            }, 400);
        });

        const check = document.createElement('button');
        check.className = 'check';
        if (todo.done) check.classList.add('done');
        if (todo.faded) check.classList.add('fade-action');
        // click fades then toggle; disabled if faded
        check.addEventListener('click', () => {
            if (todo.faded) return; // cannot toggle after fade
            check.classList.add('bounce', 'done'); // Show green immediately during animation
            setTimeout(() => check.classList.remove('bounce'), 200);
            setTimeout(() => {
                todos[idx].done = !todos[idx].done;
                save();
                render();
            }, 400);
        });

        // placeholder for a dropdown button (chevron only)
        const dropdown = document.createElement('button');
        dropdown.className = 'dropdown';
        dropdown.textContent = '▾';

        // menu container
        const menu = document.createElement('div');
        menu.className = 'dropdown-menu';

        // fade notification text
        const fadeText = document.createElement('div');
        fadeText.className = 'fade-text';
        fadeText.textContent = 'FADEEE';
        li.appendChild(fadeText);

        const fadeOpt = document.createElement('button');
        fadeOpt.textContent = todo.faded ? 'Unfade' : 'Fade';
        fadeOpt.addEventListener('click', () => {
            // trigger fade text animation and background fade-in together
            if (!todo.faded) {
                fadeText.classList.add('show');
                li.classList.add('faded'); // Start red background transition immediately
            }
            
            // play fade animation and toggle faded state
            li.classList.add('fade');
            setTimeout(() => {
                todo.faded = !todo.faded;
                save();
                render();
            }, 800);
            menu.classList.remove('show');
        });

        const clearOpt = document.createElement('button');
        clearOpt.textContent = 'Clear';
        clearOpt.addEventListener('click', () => {
            todos.splice(idx, 1);
            save();
            render();
        });

        menu.append(fadeOpt, clearOpt);
        dropdown.addEventListener('click', e => {
            e.stopPropagation();
            menu.classList.toggle('show');
        });

        li.append(span, check, dropdown, menu);
        list.appendChild(li);
    });
}

form.addEventListener('submit', e => {
    e.preventDefault();
    const title = input.value.trim();
    if (title) {
        todos.push({title, done: false, new: true, faded: false});
        save();
        render();
        input.value = '';
    }
});

// hide any open dropdowns when clicking elsewhere
document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
});

// Clear All button
document.getElementById('clear-all-btn').addEventListener('click', () => {
    if (todos.length === 0) return;
    if (confirm('Are you sure you want to clear all todos?')) {
        todos = [];
        save();
        render();
    }
});

// Fidget button - shake all items
document.getElementById('fidget-btn').addEventListener('click', () => {
    document.querySelectorAll('#todo-list li').forEach(li => {
        li.classList.add('fidget');
        setTimeout(() => li.classList.remove('fidget'), 500);
    });
});

render();
