(() => {
  'use strict';
  const desktop = document.querySelector('#desktop');
  const windows = document.querySelector('#windows');
  const apps = new Map();
  let highestZ = 10;
  let toastTimer;
  const $ = (s, root = document) => root.querySelector(s);
  const now = () => new Date();
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
    $('#theme-btn').textContent = light ? '☀' : '☾'; save('neon-theme', light ? 'light' : 'dark'); toast(light ? 'Light mode enabled' : 'Dark mode enabled');
  });
  const names = {terminal:'Terminal',notes:'My Notes',paint:'Pixel Art Studio',calc:'Calculator',about:'About NEON OS'};
  function focusWindow(win) {
    $('.window.active')?.classList.remove('active');
    win.classList.add('active'); win.style.zIndex = ++highestZ;
    if (win.dataset.app === 'terminal') $('.term-form input', win)?.focus();
  }
  function openApp(id) {
    if (!names[id]) return;
    if (apps.has(id)) { const existing = apps.get(id); existing.classList.remove('hidden'); focusWindow(existing); return; }
    const win = document.createElement('section');
    win.className = 'window'; win.dataset.app = id; win.setAttribute('aria-label', names[id]);
    const offset = apps.size * 27;
    win.style.left = `calc(25% + ${offset}px)`;
    win.style.top = `calc(8% + ${offset}px)`;
    win.innerHTML = `<div class="titlebar"><div class="traffic"><button class="close" aria-label="Закрыть"></button><button class="minimize" aria-label="Свернуть"></button><button class="maximize" aria-label="Развернуть"></button></div><div class="window-title">${names[id]}</div></div><div class="window-body"></div>`;
    windows.appendChild(win); apps.set(id, win); focusWindow(win);
    $('.close',win).addEventListener('click', () => { apps.delete(id); win.remove(); });
    $('.minimize',win).addEventListener('click', () => win.classList.add('hidden'));
    $('.maximize',win).addEventListener('click', () => {
      if (win.dataset.maximized === 'true') {
        win.style.cssText = win.dataset.oldStyle; win.dataset.maximized = 'false';
      } else {
        win.dataset.oldStyle = win.style.cssText; win.dataset.maximized = 'true';
        win.style.left = '10px'; win.style.top = '10px'; win.style.width = 'calc(100% - 20px)'; win.style.height = 'calc(100% - 104px)';
      }
      focusWindow(win);
    });
    win.addEventListener('pointerdown', () => focusWindow(win));
    makeDraggable(win);
    const body = $('.window-body',win);
    if (id === 'terminal') createTerminal(body);
    if (id === 'notes') createNotes(body);
    if (id === 'paint') createPaint(body);
    if (id === 'calc') createCalc(body);
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
    root.innerHTML = `<div class="terminal"><div class="term-output" role="log"></div><form class="term-form" autocomplete="off"><label for="terminal-input">guest@neon:~$</label><input id="terminal-input" aria-label="Введите команду" spellcheck="false" autocomplete="off"></form></div>`;
    const output = $('.term-output',root), input = $('.term-form input',root);
    let history = [], cursor = 0;
    const print = (content, cls='') => { const line = document.createElement('div'); line.className=cls; line.textContent=content; output.appendChild(line); output.scrollTop=output.scrollHeight; };
    print('NEON OS Terminal [Version 1.0]', 'accent');
    print('Type "help" to see all commands.\n', 'good');
    const commands = {
      help: () => 'AVAILABLE COMMANDS\n  help       List commands\n  about      System details\n  date       Current date and time\n  whoami     Who are you?\n  ls         List apps\n  open NAME  Launch an app (notes, paint, calc)\n  echo TEXT  Print text\n  theme      Switch light/dark\n  clear      Clear the terminal\n  matrix     ???\n  secret     ???',
      about: () => 'NEON OS v1.0 — built with vanilla HTML, CSS and JavaScript. No frameworks. No limits.',
      date: () => now().toLocaleString('ru-RU'),
      whoami: () => 'guest — creative explorer of NEON OS ✦',
      ls: () => 'terminal/   notes/   paint/   calc/   about/',
      matrix: () => Array.from({length:10},()=>Array.from({length:46},()=>Math.random()>.5?'1':'0').join('')).join('\n'),
      secret: () => '✧ ACHIEVEMENT UNLOCKED ✧\nYou found the secret. Build something impossible today!'
    };
    $('.term-form',root).addEventListener('submit', e => {
      e.preventDefault(); const raw=input.value.trim(); input.value=''; if(!raw) return;
      print('guest@neon:~$ '+raw); history.push(raw); cursor=history.length;
      const [cmd,...args]=raw.split(/\s+/);
      switch(cmd.toLowerCase()) {
        case 'clear': output.replaceChildren(); break;
        case 'echo': print(args.join(' ')); break;
        case 'open': if(names[args[0]]) {openApp(args[0]);print('Launching '+args[0]+'...','good');} else print('Unknown app. Try: ls','error'); break;
        case 'theme': $('#theme-btn').click();print('Theme switched.','good');break;
        default: if(commands[cmd.toLowerCase()]) print(commands[cmd.toLowerCase()](),cmd==='secret'?'good':'');
        else print(`Command not found: ${cmd}. Type "help".`, 'error');
      }
    });
    input.addEventListener('keydown', e => {
      if(e.key==='ArrowUp') {e.preventDefault();cursor=Math.max(0,cursor-1);input.value=history[cursor]??'';}
      if(e.key==='ArrowDown'){e.preventDefault();cursor=Math.min(history.length,cursor+1);input.value=history[cursor]??'';}
    });
    input.focus();
  }
  function createNotes(root) {
    root.innerHTML = `<div class="notes-wrap"><div class="section-head"><h2>✎ Scratchpad</h2><span class="small-label">AUTO-SAVE ON</span></div><textarea aria-label="Ваши заметки" placeholder="Your ideas belong here... ✨"></textarea><footer><span class="note-count">0 characters</span><button class="pill" type="button">COPY TEXT</button></footer></div>`;
    const textarea = $('textarea',root), count=$('.note-count',root);
    textarea.value = read('neon-notes');
    const refresh=()=>{ count.textContent=`${textarea.value.length} characters`; };
    refresh();textarea.addEventListener('input',()=>{save('neon-notes',textarea.value);refresh();});
    $('.pill',root).addEventListener('click',async()=>{
      try { await navigator.clipboard.writeText(textarea.value);toast('Notes copied!'); }
      catch {textarea.select();toast('Select text and copy it');}
    });
  }
  function createPaint(root) {
    const colors=['#131b2f','#fcfcff','#ff698d','#ffbd69','#ffe782','#6ae6b4','#54caf0','#a68aff','#e68ccf'];
    root.innerHTML=`<div class="paint-wrap"><div class="section-head"><h2>Pixel Art Studio</h2><span class="small-label">20 × 14 GRID</span></div><div class="paint-tools"><span class="small-label">COLOR</span><div class="palette" style="display:flex;gap:6px;flex-wrap:wrap"></div><button class="pill erase">ERASER</button><button class="pill clear-art">CLEAR</button><button class="pill save-art">SAVE PNG ↓</button></div><div class="paint-stage"><div class="paint-grid" role="grid" aria-label="Рисование по пикселям"></div></div><div class="paint-meta">TIP: Hold and drag to draw • Your art is saved automatically</div></div>`;
    const palette=$('.palette',root), grid=$('.paint-grid',root);
    let selected=2, painting=false;
    let pixels; try {const stored=JSON.parse(read('neon-pixels','null'));pixels=Array.isArray(stored)&&stored.length===280?stored: Array(280).fill(0);}catch{pixels=Array(280).fill(0);}
    const chooseColor=i=>{selected=i;palette.querySelectorAll('button').forEach((b,index)=>b.classList.toggle('selected',index===i));};
    colors.forEach((color,i)=>{const b=document.createElement('button');b.className='swatch';b.style.background=color;b.title='Color '+(i+1);b.setAttribute('aria-label','Цвет '+(i+1));b.addEventListener('click',()=>chooseColor(i));palette.appendChild(b);});
    chooseColor(selected);
    const cells=pixels.map((value,index)=>{ const cell=document.createElement('div');cell.className='pixel';cell.dataset.index=index;cell.style.background=colors[value]||colors[0];grid.appendChild(cell);return cell;});
    function draw(el){if(!el?.classList.contains('pixel'))return;const i=Number(el.dataset.index);pixels[i]=selected;el.style.background=colors[selected];save('neon-pixels',JSON.stringify(pixels));}
    grid.addEventListener('pointerdown', e=>{painting=true;grid.setPointerCapture(e.pointerId);draw(e.target);});
    grid.addEventListener('pointermove', e=>{if(!painting)return;const el=document.elementFromPoint(e.clientX,e.clientY);draw(el);});
    grid.addEventListener('pointerup',()=>painting=false);grid.addEventListener('pointercancel',()=>painting=false);
    $('.erase',root).addEventListener('click',()=>chooseColor(0));
    $('.clear-art',root).addEventListener('click',()=>{pixels.fill(0);cells.forEach(c=>c.style.background=colors[0]);save('neon-pixels',JSON.stringify(pixels));toast('Canvas cleared');});
    $('.save-art',root).addEventListener('click',()=>{
      const canvas=document.createElement('canvas');canvas.width=600;canvas.height=420;
      const ctx=canvas.getContext('2d');pixels.forEach((p,i)=>{ctx.fillStyle=colors[p]||colors[0];ctx.fillRect((i%20)*30,Math.floor(i/20)*30,30,30);});
      const a=document.createElement('a');a.download='neon-pixel-art.png';a.href=canvas.toDataURL('image/png');a.click();toast('PNG exported!');
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
  function createAbout(root) {
    root.innerHTML=`<div class="about-wrap"><div class="about-logo">✦</div><h2>NEON OS <span style="font-size:13px;color:#a79ec9;vertical-align:middle">v1.0</span></h2><p>A tiny operating system living in your browser. Made for explorers, builders and people who think normal websites are boring.</p><div class="about-stats"><span>HTML</span><span>CSS</span><span>VANILLA JS</span><span>NO FRAMEWORKS</span></div><p class="hint">✧ Drag windows around<br>✧ Notes & pixel art save automatically<br>✧ Open Terminal and type <b>help</b><br>✧ Try the <b>secret</b> command :)</p></div>`;
  }
  window.addEventListener('keydown',e=>{if(e.key==='Escape'){const win=[...apps.values()].filter(w=>!w.classList.contains('hidden')).sort((a,b)=>Number(b.style.zIndex)-Number(a.style.zIndex))[0];if(win){apps.delete(win.dataset.app);win.remove();}}});
  setTimeout(()=>{$('#boot').remove();desktop.classList.remove('hidden');},950);
})();