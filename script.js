(() => {
  'use strict';
  const desktop = document.querySelector('#desktop');
  const windows = document.querySelector('#windows');
  const apps = new Map();
  let highestZ = 10;
  let toastTimer;
  const $ = (s, root = document) => root.querySelector(s);
  const now = () => new Date();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function sparkle(x, y) {
    if (reduceMotion) return;
    const node = document.createElement('span');
    node.className = 'click-spark';
    node.style.left = x + 'px'; node.style.top = y + 'px';
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 650);
  }
  document.addEventListener('pointerdown', ev => sparkle(ev.clientX, ev.clientY));
  if (!reduceMotion && matchMedia('(pointer:fine)').matches) {
    const glow = document.querySelector('.cursor-glow');
    let previous = 0;
    document.addEventListener('pointermove', ev => {
      const time = performance.now();
      if(time - previous < 20) return;
      previous = time;
      if(glow){glow.style.setProperty('--cursor-x', ev.clientX + 'px');glow.style.setProperty('--cursor-y', ev.clientY + 'px');}
    }, {passive:true});
  }
  const stars = document.querySelector('.stars');
  if (stars && !reduceMotion) {
    for (let i = 0; i < 42; i++) {
      const star = document.createElement('i');
      star.style.left = ((i * 67.13) % 100) + '%';
      star.style.top = ((i * 43.71 + 7) % 100) + '%';
      star.style.animationDelay = ((i * 0.41) % 6) + 's';
      star.style.animationDuration = (2.5 + i % 5) + 's';
      stars.appendChild(star);
    }
  }
  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read = (key, fallback = '') => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, value); return true; } catch { return false; } };
  function toast(message) {
    const el = $('#toast'); el.textContent = message; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
  function updateClock() {
    const d = now();
    $('#clock').textContent = d.toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
    $('#date').textContent = d.toLocaleDateString('ru-RU', {day:'2-digit', month:'short'}).toUpperCase();
  }
  updateClock(); setInterval(updateClock, 10000);
  if (read('neon-theme') === 'light') desktop.classList.add('light');
  $('#theme-btn').textContent = desktop.classList.contains('light') ? '☀' : '☾';
  $('#theme-btn').addEventListener('click', () => {
    desktop.classList.toggle('light'); const light = desktop.classList.contains('light');
    $('#theme-btn').textContent = light ? '☀' : '☾'; save('neon-theme', light ? 'light' : 'dark'); toast(light ? 'Светлая тема включена' : 'Тёмная тема включена');
  });
  const names = {terminal:'Терминал',notes:'Заметки',paint:'Пиксель-арт',calc:'Калькулятор',snake:'Змейка',about:'О системе'};
  function focusWindow(win) {
    $('.window.active')?.classList.remove('active');
    win.classList.add('active'); win.style.zIndex = ++highestZ;
    if (win.dataset.app === 'terminal' && !win.contains(document.activeElement)) $('.term-form input', win)?.focus();
  }
  function openApp(id) {
    if (!names[id]) return;
    if (apps.has(id)) { const existing = apps.get(id); existing.classList.remove('hidden','minimizing'); existing.classList.add('restoring'); setTimeout(() => existing.classList.remove('restoring'), 330); focusWindow(existing); return; }
    const win = document.createElement('section');
    win.className = 'window'; win.dataset.app = id; win.setAttribute('aria-label', names[id]);
    const offset = apps.size * 27;
    win.style.left = `calc(25% + ${offset}px)`;
    win.style.top = `calc(8% + ${offset}px)`;
    win.innerHTML = `<div class="titlebar"><div class="traffic"><button class="close" aria-label="Закрыть"></button><button class="minimize" aria-label="Свернуть"></button><button class="maximize" aria-label="Развернуть"></button></div><div class="window-title">${names[id]}</div></div><div class="window-body"></div>`;
    windows.appendChild(win); apps.set(id, win); focusWindow(win);
    $('.close',win).addEventListener('click', () => { win._cleanup?.(); apps.delete(id); win.remove(); });
    $('.minimize',win).addEventListener('click', () => { win.classList.add('minimizing'); setTimeout(() => { win.classList.add('hidden'); win.classList.remove('minimizing'); }, 210); });
    $('.maximize',win).addEventListener('click', () => {
      if (win.dataset.maximized === 'true') {
        win.style.cssText = win.dataset.oldStyle; win.dataset.maximized = 'false';
      } else {
        win.dataset.oldStyle = win.style.cssText; win.dataset.maximized = 'true';
        win.style.left = '10px'; win.style.top = '10px'; win.style.width = 'calc(100% - 20px)'; win.style.height = 'calc(100% - 104px)';
      }
      focusWindow(win);
    });
    win.addEventListener('pointerdown', ev => { if (ev.target.closest('input,textarea,button')) { win.style.zIndex = ++highestZ; return; } focusWindow(win); });
    makeDraggable(win);
    const body = $('.window-body',win);
    if (id === 'terminal') createTerminal(body);
    if (id === 'notes') createNotes(body);
    if (id === 'paint') createPaint(body);
    if (id === 'calc') createCalc(body);
    if (id === 'snake') createSnake(body, win);
    if (id === 'about') createAbout(body);
  }
  function makeDraggable(win) {
    const bar = $('.titlebar',win);
    let start = null;
    bar.addEventListener('pointerdown', ev => {
      if (ev.target.closest('button') || win.dataset.maximized === 'true' || matchMedia('(max-width:700px)').matches) return;
      const r = win.getBoundingClientRect(), p = $('#workspace').getBoundingClientRect();
      start = {x:ev.clientX,y:ev.clientY,left:r.left-p.left,top:r.top-p.top};
      bar.setPointerCapture(ev.pointerId);
    });
    bar.addEventListener('pointermove', ev => {
      if (!start) return;
      win.style.left = `${Math.max(0, Math.min($('#workspace').clientWidth-80, start.left+ev.clientX-start.x))}px`;
      win.style.top = `${Math.max(0, Math.min($('#workspace').clientHeight-90, start.top+ev.clientY-start.y))}px`;
    });
    bar.addEventListener('pointerup', () => {start = null;});
    bar.addEventListener('pointercancel', () => {start = null;});
  }
  document.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => openApp(el.dataset.open)));
  $('#explore').addEventListener('click', () => openApp('terminal'));
  $('#launcher').addEventListener('click', () => openApp('about'));
  function createTerminal(root) {
    root.innerHTML = `<div class="terminal"><div class="term-output" role="log"></div><form class="term-form" autocomplete="off"><label for="terminal-input">guest@neon:~$</label><input id="terminal-input" aria-label="Введите команду" placeholder="Введи команду..." spellcheck="false" autocomplete="off" autocapitalize="off"></form></div>`;
    const output = $('.term-output',root), input = $('.term-form input',root);
    $('.terminal',root).addEventListener('click',event=>{if(!event.target.closest('button,input,a')) input.focus();});
    let history = [], cursor = 0;
    const print = (content, cls='') => { const line = document.createElement('div'); line.className=cls; line.textContent=content; output.appendChild(line); output.scrollTop=output.scrollHeight; };
    print('Терминал NEON OS [версия 2.2]', 'accent');
    print('Напиши "помощь" или "help", чтобы увидеть команды.\n', 'good');
    const commands = {
      help: () => 'КОМАНДЫ\n  помощь     Список команд\n  система    Информация о системе\n  дата       Дата и время\n  ктоя       Текущий пользователь\n  список     Все приложения\n  открыть ИМЯ  Запуск приложения\n  эхо ТЕКСТ  Показать текст\n  тема       Сменить оформление\n  очистить   Очистить экран\n  открыть змейка  Запуск игры\n  matrix     Секретный эффект\n  secret     Пасхалка',
      about: () => 'NEON OS v1.2. Сделано на HTML, CSS и JavaScript. Без фреймворков.',
      date: () => now().toLocaleString('ru-RU'),
      whoami: () => 'Гость, исследователь NEON OS ✦',
      ls: () => 'terminal/   notes/   paint/   calc/   snake/   about/',
      matrix: () => Array.from({length:10},()=>Array.from({length:46},()=>Math.random()>.5?'1':'0').join('')).join('\n'),
      secret: () => '✧ ДОСТИЖЕНИЕ ОТКРЫТО ✧\nТы нашёл секрет! Самое время создать что-то крутое.'
    };
    $('.term-form',root).addEventListener('submit', e => {
      e.preventDefault(); const raw=input.value.trim(); input.value=''; if(!raw) {input.focus(); return;}
      print('guest@neon:~$ '+raw); history.push(raw); cursor=history.length;
      const [cmd,...args]=raw.split(/\s+/);
      const aliases = { 'помощь':'help','система':'about','дата':'date','ктоя':'whoami','список':'ls','открыть':'open','эхо':'echo','тема':'theme','очистить':'clear' };
      const command = aliases[cmd.toLowerCase()] || cmd.toLowerCase();
      const appAliases = { 'заметки':'notes','рисование':'paint','рисовалка':'paint','калькулятор':'calc','терминал':'terminal','осистема':'about','змейка':'snake' };
      if(args[0]) args[0] = appAliases[args[0].toLowerCase()] || args[0].toLowerCase();
      switch(command) {
        case 'clear': output.replaceChildren(); break;
        case 'echo': print(args.join(' ')); break;
        case 'open': if(names[args[0]]) {openApp(args[0]);print('Запускаю '+args[0]+'...','good');} else print('Неизвестное приложение. Введи: список','error'); break;
        case 'theme': $('#theme-btn').click();print('Тема изменена.','good');break;
        default: if(commands[command]) print(commands[command](),command==='secret'?'good':'');
        else print(`Неизвестная команда: ${cmd} Введи "помощь".`, 'error');
      }
      input.focus();
    });
    input.addEventListener('keydown', e => {
      if(e.key==='ArrowUp') {e.preventDefault();cursor=Math.max(0,cursor-1);input.value=history[cursor]??'';}
      if(e.key==='ArrowDown'){e.preventDefault();cursor=Math.min(history.length,cursor+1);input.value=history[cursor]??'';}
    });
    input.focus();
  }
  function createNotes(root) {
    root.innerHTML = `<div class="notes-wrap"><div class="section-head"><h2>✎ Мои заметки</h2><span class="small-label">АВТОСОХРАНЕНИЕ</span></div><textarea aria-label="Ваши заметки" placeholder="Запиши свои идеи здесь... ✨"></textarea><footer><span class="note-count">0 символов</span><button class="pill" type="button">КОПИРОВАТЬ</button></footer></div>`;
    const textarea = $('textarea',root), count=$('.note-count',root);
    textarea.value = read('neon-notes');
    const refresh=()=>{ count.textContent=`${textarea.value.length} символов`; };
    refresh();textarea.addEventListener('input',()=>{save('neon-notes',textarea.value);refresh();});
    $('.pill',root).addEventListener('click',async()=>{
      try { await navigator.clipboard.writeText(textarea.value);toast('Текст скопирован!'); }
      catch {textarea.select();toast('Выдели текст и скопируй его');}
    });
  }
  function createPaint(root) {
    const colors=['#131b2f','#fcfcff','#ff698d','#ffbd69','#ffe782','#6ae6b4','#54caf0','#a68aff','#e68ccf'];
    root.innerHTML=`<div class="paint-wrap"><div class="section-head"><h2>Пиксель-арт</h2><span class="small-label">СЕТКА 20 × 14</span></div><div class="paint-tools"><span class="small-label">ЦВЕТ</span><div class="palette" style="display:flex;gap:6px;flex-wrap:wrap"></div><button class="pill erase">ЛАСТИК</button><button class="pill clear-art">ОЧИСТИТЬ</button><button class="pill save-art">СОХРАНИТЬ PNG ↓</button></div><div class="paint-stage"><div class="paint-grid" role="grid" aria-label="Рисование по пикселям"></div></div><div class="paint-meta">Зажми кнопку и веди курсор. Рисунок сохраняется автоматически.</div></div>`;
    const palette=$('.palette',root), grid=$('.paint-grid',root);
    let selected=2, painting=false;
    let pixels; try {const stored=JSON.parse(read('neon-pixels','null'));pixels=Array.isArray(stored)&&stored.length===280?stored: Array(280).fill(0);}catch{pixels=Array(280).fill(0);}
    const chooseColor=i=>{selected=i;palette.querySelectorAll('button').forEach((b,index)=>b.classList.toggle('selected',index===i));};
    colors.forEach((color,i)=>{const b=document.createElement('button');b.className='swatch';b.style.background=color;b.title='Цвет '+(i+1);b.setAttribute('aria-label','Цвет '+(i+1));b.addEventListener('click',()=>chooseColor(i));palette.appendChild(b);});
    chooseColor(selected);
    const cells=pixels.map((value,index)=>{ const cell=document.createElement('div');cell.className='pixel';cell.dataset.index=index;cell.style.background=colors[value]||colors[0];grid.appendChild(cell);return cell;});
    function draw(el){if(!el?.classList.contains('pixel'))return;const i=Number(el.dataset.index);pixels[i]=selected;el.style.background=colors[selected];save('neon-pixels',JSON.stringify(pixels));}
    grid.addEventListener('pointerdown', e=>{painting=true;grid.setPointerCapture(e.pointerId);draw(e.target);});
    grid.addEventListener('pointermove', e=>{if(!painting)return;const el=document.elementFromPoint(e.clientX,e.clientY);draw(el);});
    grid.addEventListener('pointerup',()=>painting=false);grid.addEventListener('pointercancel',()=>painting=false);
    $('.erase',root).addEventListener('click',()=>chooseColor(0));
    $('.clear-art',root).addEventListener('click',()=>{pixels.fill(0);cells.forEach(c=>c.style.background=colors[0]);save('neon-pixels',JSON.stringify(pixels));toast('Рисунок очищен');});
    $('.save-art',root).addEventListener('click',()=>{
      const canvas=document.createElement('canvas');canvas.width=600;canvas.height=420;
      const ctx=canvas.getContext('2d');pixels.forEach((p,i)=>{ctx.fillStyle=colors[p]||colors[0];ctx.fillRect((i%20)*30,Math.floor(i/20)*30,30,30);});
      const a=document.createElement('a');a.download='neon-pixel-art.png';a.href=canvas.toDataURL('image/png');a.click();toast('PNG сохранён!');
    });
  }
  function createCalc(root) {
    root.innerHTML=`<div class="calc-wrap"><div class="calc-display" aria-label="Результат">0</div><div class="calc-keys"></div></div>`;
    const display=$('.calc-display',root), keys=$('.calc-keys',root);
    let current='0', previous=null, operation=null, resetNext=false;
    const update=()=>display.textContent=current;
    function compute(a,b,op){switch(op){case '+':return a+b;case '−':return a-b;case '×':return a*b;case '÷':return b===0?NaN:a/b;default:return b;}}
    function press(key){
      if(/^\d$/.test(key)||key==='.'){
        if(resetNext){current='0';resetNext=false;}
        if(key==='.'&&current.includes('.'))return;
        if(current.replace(/\D/g,'').length>=13)return;
        current=key==='.'?current+'.':current==='0'?key:current+key;
      } else if(key==='C'){current='0';previous=null;operation=null;resetNext=false;}
      else if(key==='±'){current=String(-Number(current));}
      else if(key==='%'){current=String(Number(current)/100);}
      else if(['+','−','×','÷'].includes(key)){
        if(previous!==null&&operation&&!resetNext){const result=compute(previous,Number(current),operation);current=Number.isFinite(result)?String(Number(result.toPrecision(12))):'Error';}
        previous=Number(current);operation=key;resetNext=true;
      } else if(key==='='){
        if(previous!==null&&operation){const result=compute(previous,Number(current),operation);current=Number.isFinite(result)?String(Number(result.toPrecision(12))):'Error';previous=null;operation=null;resetNext=true;}
      }
      if(current==='Error'){previous=null;operation=null;resetNext=true;}
      update();
    }
    ['C','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','='].forEach(k=>{
      const b=document.createElement('button');b.textContent=k;b.className=k==='='?'equals':'+−×÷'.includes(k)?'op':k==='0'?'zero':'';
      b.addEventListener('click',()=>press(k));keys.appendChild(b);
    });
  }
  function createSnake(root, win) {
    const side = 16;
    const total = side * side;
    const directions = { ArrowUp:-side, ArrowDown:side, ArrowLeft:-1, ArrowRight:1, 'ц':-side, 'ы':side, 'ф':-1, 'в':1 };
    root.innerHTML = `<div class="snake-wrap">
      <div class="snake-head"><div><strong>◈ НЕОНОВАЯ ЗМЕЙКА</strong><span>Собери как можно больше энергии</span></div><div class="snake-scores"><div>СЧЁТ <b class="snake-score">0</b></div><div>РЕКОРД <b class="snake-best">0</b></div></div></div>
      <div class="snake-board" role="img" aria-label="Игровое поле змейки"></div>
      <div class="snake-controls"><button data-snake="ArrowLeft" aria-label="Влево">←</button><button data-snake="ArrowUp" aria-label="Вверх">↑</button><button data-snake="ArrowDown" aria-label="Вниз">↓</button><button data-snake="ArrowRight" aria-label="Вправо">→</button><button class="snake-toggle">НАЧАТЬ ИГРУ</button></div>
      <p class="snake-help">Управление: стрелки или WASD. Пробел для паузы.</p>
    </div>`;
    const board = $('.snake-board',root);
    const cells = Array.from({length:total}, () => {
      const cell = document.createElement('div'); cell.className = 'snake-cell'; board.appendChild(cell); return cell;
    });
    const scoreEl = $('.snake-score',root), bestEl = $('.snake-best',root), toggle = $('.snake-toggle',root);
    let best = Number(read('neon-snake-best','0')) || 0;
    let snake = [120,119,118], food = 200, direction = 1, next = 1, score = 0, running = false, over = false, last = 0;
    let raf = 0;
    bestEl.textContent = best;
    const occupied = () => new Set(snake);
    function spawnFood() {
      const used = occupied();
      const empty = Array.from({length:total},(_,i)=>i).filter(i=>!used.has(i));
      return empty.length ? empty[Math.floor(Math.random()*empty.length)] : -1;
    }
    food = spawnFood();
    function draw() {
      cells.forEach((cell,i)=>{
        cell.className = 'snake-cell';
        if(i===food) cell.classList.add('snake-food');
        if(snake.includes(i)) cell.classList.add('snake-body');
        if(i===snake[0]) cell.classList.add('snake-head-cell');
      });
      scoreEl.textContent = score;
      bestEl.textContent = best;
      toggle.textContent = over ? 'ЕЩЁ РАЗ' : running ? 'ПАУЗА' : score ? 'ПРОДОЛЖИТЬ' : 'НАЧАТЬ ИГРУ';
    }
    function reset() {
      snake=[120,119,118]; direction=1;next=1;score=0;over=false;food=spawnFood();last=0;
    }
    function turn(key) {
      const map = {w:'ArrowUp',a:'ArrowLeft',s:'ArrowDown',d:'ArrowRight'};
      const d = directions[map[key.toLowerCase()] || key];
      if(d===undefined || d===-direction || d===next) return;
      next=d;
      if(!running && !over) {running=true;last=0;draw();}
    }
    function tick() {
      direction=next;
      const head=snake[0], target=head+direction;
      const wall = target < 0 || target >= total ||
        (direction===1 && head%side===side-1) ||
        (direction===-1 && head%side===0);
      const eat = target===food;
      const body= eat ? snake : snake.slice(0,-1);
      if(wall || body.includes(target)) {
        running=false;over=true;toast('Игра окончена! Счёт: '+score);draw();return;
      }
      snake.unshift(target);
      if(eat) {
        score++;
        if(score>best){best=score;save('neon-snake-best',String(best));}
        food=spawnFood();
        if(food===-1){running=false;over=true;toast('Победа! Всё поле заполнено!');}
      } else snake.pop();
      draw();
    }
    function frame(time) {
      if(!root.isConnected) return;
      if(running && !win.classList.contains('hidden') && time-last > Math.max(75,155-score*3)) {tick();last=time;}
      raf=requestAnimationFrame(frame);
    }
    function toggleGame() {
      if(over) {reset();running=true;}
      else running=!running;
      last=0;draw();
    }
    toggle.addEventListener('click',toggleGame);
    root.querySelectorAll('[data-snake]').forEach(b=>b.addEventListener('click',()=>turn(b.dataset.snake)));
    const keyHandler=e=>{
      if(!win.isConnected || win.classList.contains('hidden') || !win.classList.contains('active')) return;
      if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if(e.code==='Space') {e.preventDefault();toggleGame();return;}
      const key = e.key==='ц'?'w':e.key==='ф'?'a':e.key==='ы'?'s':e.key==='в'?'d':e.key;
      if(directions[key]!==undefined || ['w','a','s','d','W','A','S','D'].includes(key)) {e.preventDefault();turn(key);}
    };
    document.addEventListener('keydown',keyHandler);
    win._cleanup=()=>{cancelAnimationFrame(raf);document.removeEventListener('keydown',keyHandler);};
    draw();
    raf=requestAnimationFrame(frame);
  }
  function createAbout(root) {
    root.innerHTML=`<div class="about-wrap"><div class="about-logo">✦</div><h2>NEON OS <span style="font-size:13px;color:#a79ec9;vertical-align:middle">v1.2</span></h2><p>Мини-операционная система прямо в браузере. Для тех, кому скучно на обычных сайтах.</p><div class="about-stats"><span>HTML</span><span>CSS</span><span>VANILLA JS</span><span>БЕЗ ФРЕЙМВОРКОВ</span></div><p class="hint">✧ Перетаскивай окна мышью<br>✧ Заметки и рисунки сохраняются автоматически<br>✧ Открой терминал и введи <b>помощь</b><br>✧ Сыграй в <b>Змейку</b> и побей свой рекорд<br>✧ Попробуй команду <b>secret</b> :)</p></div>`;
  }
  window.addEventListener('keydown',e=>{if(e.key==='Escape'){const win=[...apps.values()].filter(w=>!w.classList.contains('hidden')).sort((a,b)=>Number(b.style.zIndex)-Number(a.style.zIndex))[0];if(win){win._cleanup?.();apps.delete(win.dataset.app);win.remove();}}});
  setTimeout(()=>{$('#boot').remove();desktop.classList.remove('hidden');},950);
})();