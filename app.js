const form = document.getElementById('todo-form');
const input = document.getElementById('new-item');
const list = document.getElementById('todo-list');

let todos = JSON.parse(localStorage.getItem('todos') || '[]');

// Set greeting based on time of day in EST
function setGreeting() {
    const estTime = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    const hour = new Date(estTime).getHours();
    
    let timeOfDay;
    if (hour < 12) {
        timeOfDay = 'Morning';
    } else if (hour < 18) {
        timeOfDay = 'Afternoon';
    } else {
        timeOfDay = 'Evenings';
    }
    
    input.placeholder = `Good ${timeOfDay}, Gurt!`;
}

setGreeting();

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
            // Play sound only when checking (not unchecking)
            if (!todo.done) {
                const audio = new Audio('assets/audio/perc 30.wav');
                audio.playbackRate = 1.44; // CHANGE THIS TO ADJUST SPEED (0.5 = half speed, 2 = double speed)
                audio.play().catch(e => console.log('Audio play failed:', e));
            }
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

// Fidget button - GIF with pause/play + todo shake
const fidgetBtn = document.getElementById('fidget-btn');
const fidgetGif = document.getElementById('fidget-gif');
let isPlaying = false;
let speedLevel = 20;

// Audio setup for fidget sound
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let fidgetSoundBuffer = null;

// Load fidget sound on page load
fetch('assets/audio/lightningbulb-spacebar-click-keyboard-199448.mp3')
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
    .then(audioBuffer => {
        fidgetSoundBuffer = audioBuffer;
    })
    .catch(e => console.log('Failed to load fidget sound:', e));

function playFidgetSound() {
    if (!fidgetSoundBuffer) return;
    
    const source = audioContext.createBufferSource();
    source.buffer = fidgetSoundBuffer;
    
    // EDIT THESE VALUES:
    source.playbackRate.value = 1.2; // SPEED (0.5 = half speed, 2 = double speed)
    source.detune.value = -100; // PITCH in cents (-1200 to 1200, each 100 = one semitone)
    
    source.connect(audioContext.destination);
    source.start(0);
}

fidgetBtn.addEventListener('click', () => {
    // Play sound
    playFidgetSound();
    
    // Shake todos
    document.querySelectorAll('#todo-list li').forEach(li => {
        li.classList.add('fidget');
        setTimeout(() => li.classList.remove('fidget'), 250);
    });
    
    // Play GIF with speed control
    if (!isPlaying) {
        isPlaying = true;
        fidgetGif.classList.add('playing');
        
        // Restart GIF by reloading
        const src = fidgetGif.src;
        fidgetGif.src = '';
        setTimeout(() => {
            fidgetGif.src = src + '?t=' + Date.now();
        }, 1);
        
        // Stop after 2 seconds
        setTimeout(() => {
            fidgetGif.classList.remove('playing');
            isPlaying = false;
        }, 2000);

    }
});

render();
