(() => {
  'use strict';
  const desktop = document.querySelector('#desktop');
  const workspace = document.querySelector('#workspace');
  const dock = document.querySelector('.dock');
  const icons = document.querySelector('.desktop-icons');
  if (!desktop || !workspace || !dock || !icons) return;
  const $ = (selector, root = document) => root.querySelector(selector);
  const save = (key, value) => { try { localStorage.setItem('neon-extra-' + key, value); } catch {} };
  const load = (key, fallback = '') => { try { return localStorage.getItem('neon-extra-' + key) ?? fallback; } catch { return fallback; } };
  const safe = (str) => String(str).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const appNames = {hub:'Центр',files:'Файлы',focus:'Фокус',settings:'Настройки',achievements:'Достижения',reaction:'Реакция',store:'Магазин'};
  const appIcons = {hub:'✦',files:'▣',focus:'◴',settings:'⚙',achievements:'★',reaction:'⚡',store:'✧'};
  const active = new Map();
  let layer = 200;
  let timerHandle = null;
  const achievements = {
    explorer:['Первый запуск','Открыть новое приложение'],
    collector:['Коллекционер','Создать 3 файла'],
    focused:['Режим концентрации','Закончить фокус-сессию'],
    quick:['Быстрая реакция','Набрать менее 350 мс'],
    designer:['Дизайнер','Поменять обои'],
    shopper:['Коллекция','Установить приложение из магазина']
  };
  const unlocked = () => { try { return JSON.parse(load('achievements','{}')) || {}; } catch { return {}; } };
  function notice(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message; el.classList.add('show');
    clearTimeout(el._extraTimer);
    el._extraTimer = setTimeout(() => el.classList.remove('show'), 2500);
  }
  function unlock(id) {
    const data = unlocked();
    if (data[id] || !achievements[id]) return;
    data[id] = Date.now(); save('achievements',JSON.stringify(data));
    notice('★ Достижение: ' + achievements[id][0]);
    const panel = active.get('achievements');
    if (panel) renderAchievements($('.extra-content',panel));
  }
  function addShortcut(id) {
    if (icons.querySelector('[data-extra="'+id+'"]')) return;
    const item=document.createElement('button');
    item.className='desktop-icon extra-shortcut';
    item.dataset.extra=id;
    item.innerHTML='<span class="icon-tile extra-icon extra-'+id+'">'+appIcons[id]+'</span><span>'+appNames[id]+'</span>';
    item.addEventListener('click',()=>openApp(id));
    icons.append(item);
    const button=document.createElement('button');
    button.className='extra-dock';
    button.dataset.extra=id;
    button.title=appNames[id];
    button.textContent=appIcons[id];
    button.addEventListener('click',()=>openApp(id));
    dock.insertBefore(button, dock.querySelector('#theme-btn').previousElementSibling);
  }
  const installed=()=> { try { return JSON.parse(load('installed','["hub","files","settings","store"]')); } catch { return ['hub','files','settings','store']; } };
  const persistInstalled = list => save('installed',JSON.stringify(list));
  function refreshApps() {
    const set = new Set([...installed(),'hub','store','settings']);
    Object.keys(appNames).forEach(id=>{
      const on=set.has(id);
      if(on) addShortcut(id);
      document.querySelectorAll('[data-extra="'+id+'"]').forEach(el=>el.hidden=!on);
    });
  }
  function makeWindow(id) {
    const win=document.createElement('section');
    win.className='window extra-window active';
    win.dataset.extraWindow=id;
    win.style.left='clamp(15px,27%,320px)';
    win.style.top='11%';
    win.style.zIndex=++layer;
    win.setAttribute('aria-label',appNames[id]);
    win.innerHTML='<div class="titlebar"><div class="traffic"><button class="close" aria-label="Закрыть"></button><button class="minimize" aria-label="Свернуть"></button><button class="maximize" aria-label="Развернуть"></button></div><div class="window-title">'+appNames[id]+'</div></div><div class="extra-content window-body"></div>';
    workspace.append(win);
    const focus = () => {
      document.querySelectorAll('.window.active').forEach(el=>el.classList.remove('active'));
      win.classList.add('active'); win.style.zIndex=++layer;
    };
    win.addEventListener('pointerdown',focus);
    $('.close',win).addEventListener('click',()=>closeWindow(id));
    $('.minimize',win).addEventListener('click',()=>win.classList.add('hidden'));
    $('.maximize',win).addEventListener('click',()=>{
      if(win.dataset.full==='yes'){
        win.style.left=win.dataset.left;
        win.style.top=win.dataset.top;
        win.style.width=win.dataset.width;
        win.style.height=win.dataset.height;
        win.dataset.full='no';
      } else {
        win.dataset.left=win.style.left;
        win.dataset.top=win.style.top;
        win.dataset.width=win.style.width;
        win.dataset.height=win.style.height;
        win.style.left='10px';win.style.top='10px';
        win.style.width='calc(100% - 20px)';
        win.style.height='calc(100% - 110px)';
        win.dataset.full='yes';
      }
    });
    const bar=$('.titlebar',win);
    let start=null;
    bar.addEventListener('pointerdown',e=>{
      if(e.target.closest('button') || win.dataset.full==='yes' || matchMedia('(max-width:700px)').matches) return;
      const r=win.getBoundingClientRect(), p=workspace.getBoundingClientRect();
      start={x:e.clientX,y:e.clientY,left:r.left-p.left,top:r.top-p.top};
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove',e=>{
      if(!start) return;
      win.style.left=Math.max(0,Math.min(workspace.clientWidth-90,start.left+e.clientX-start.x))+'px';
      win.style.top=Math.max(0,Math.min(workspace.clientHeight-80,start.top+e.clientY-start.y))+'px';
    });
    bar.addEventListener('pointerup',()=>start=null);
    bar.addEventListener('pointercancel',()=>start=null);
    return win;
  }
  function closeWindow(id) {
    const win=active.get(id);
    if(!win)return;
    win._cleanup?.();win.remove();active.delete(id);
  }
  function openApp(id) {
    if(!appNames[id])return;
    if(active.has(id)){
      const w=active.get(id);
      w.classList.remove('hidden');
      document.querySelectorAll('.window.active').forEach(el=>el.classList.remove('active'));
      w.classList.add('active');w.style.zIndex=++layer;
      return;
    }
    const win=makeWindow(id);
    active.set(id,win);
    const content=$('.extra-content',win);
    const pages={hub:renderHub,files:renderFiles,focus:renderFocus,settings:renderSettings,achievements:renderAchievements,reaction:renderReaction,store:renderStore};
    pages[id](content,win);
    if(!['store','settings','hub'].includes(id)) unlock('explorer');
  }
  function renderHub(root) {
    const opened = unlocked();
    const completed=Object.keys(achievements).filter(k=>opened[k]).length;
    const best=Number(load('reaction-best','0'));
    const fileCount=filesData().length;
    const wall=wallpapers[load('wallpaper','cosmos')]?.[0] || 'Космос';
    root.innerHTML='<div class="hub-top"><div><span class="hub-eyebrow">NEON OS · ОБЗОР</span><h2>Твой рабочий стол ✦</h2><p>Всё самое важное в одном месте.</p></div><span class="hub-orbit">✧</span></div><div class="hub-stats"><div><span>ТВОИ ФАЙЛЫ</span><strong>'+fileCount+'</strong></div><div><span>ДОСТИЖЕНИЯ</span><strong>'+completed+' / '+Object.keys(achievements).length+'</strong></div><div><span>РЕАКЦИЯ</span><strong>'+(best?best+' мс':'—')+'</strong></div></div><h3 class="extra-subtitle">БЫСТРЫЕ ДЕЙСТВИЯ</h3><div class="hub-actions"><button data-go="files"><span>▣</span><strong>Мои файлы</strong><small>Записи и идеи</small></button><button data-go="focus"><span>◴</span><strong>Фокус</strong><small>Заняться делом</small></button><button data-go="reaction"><span>⚡</span><strong>Реакция</strong><small>Побить рекорд</small></button><button data-go="settings"><span>⚙</span><strong>Настройки</strong><small>Обои: '+safe(wall)+'</small></button></div><div class="hub-footer"><span class="status-dot"></span> Локальное хранение данных · без аккаунтов и серверов</div>';
    root.querySelectorAll('[data-go]').forEach(btn=>btn.addEventListener('click',()=>openApp(btn.dataset.go)));
  }
  function filesData() {
    try { const data=JSON.parse(load('files','[]'));return Array.isArray(data)?data:[]; } catch {return [];}
  }
  function renderFiles(root) {
    root.innerHTML='<div class="extra-head"><h2>▣ Мои файлы</h2><p>Твои тексты сохраняются в этом браузере</p></div><div class="file-toolbar"><button class="extra-btn" data-action="new">+ Новый файл</button><button class="extra-btn secondary" data-action="export">Скачать архив JSON</button></div><div class="file-list"></div><div class="file-editor hidden"><input class="file-name" maxlength="60" placeholder="Название файла" aria-label="Название файла"><textarea class="file-text" placeholder="Напиши что-нибудь..." aria-label="Содержимое файла"></textarea><div class="file-actions"><button class="extra-btn" data-action="save">Сохранить</button><button class="extra-btn secondary" data-action="cancel">Назад</button></div></div>';
    let current=null;
    const list=$('.file-list',root), editor=$('.file-editor',root);
    function showList() {
      editor.classList.add('hidden');list.classList.remove('hidden');
      const files=filesData();
      list.replaceChildren();
      if(!files.length){list.innerHTML='<p class="extra-empty">Пока пусто. Создай первый файл ✨</p>';return;}
      files.forEach(file=>{
        const row=document.createElement('div');row.className='file-row';
        const name=document.createElement('button');name.className='file-open';name.textContent='▤  '+file.name;name.onclick=()=>edit(file.id);
        const remove=document.createElement('button');remove.className='file-delete';remove.textContent='Удалить';
        remove.onclick=()=>{if(!confirm('Удалить «'+file.name+'»?'))return;save('files',JSON.stringify(filesData().filter(x=>x.id!==file.id)));showList();};
        row.append(name,remove);list.append(row);
      });
    }
    function edit(id) {
      current=id;
      const file=filesData().find(x=>x.id===id);
      $('.file-name',root).value=file?.name||'';
      $('.file-text',root).value=file?.text||'';
      list.classList.add('hidden');editor.classList.remove('hidden');$('.file-name',root).focus();
    }
    $('[data-action="new"]',root).onclick=()=>edit(null);
    $('[data-action="cancel"]',root).onclick=showList;
    $('[data-action="save"]',root).onclick=()=>{
      const name=$('.file-name',root).value.trim()||'Без названия';
      const text=$('.file-text',root).value;
      const files=filesData();
      if(current===null){files.unshift({id:Date.now()+'-'+Math.random().toString(36).slice(2,7),name,text});}
      else {const f=files.find(x=>x.id===current);if(f){f.name=name;f.text=text;}}
      save('files',JSON.stringify(files));showList();notice('Файл сохранён');
      if(files.length>=3)unlock('collector');
    };
    $('[data-action="export"]',root).onclick=()=>{
      const blob=new Blob([JSON.stringify(filesData(),null,2)],{type:'application/json;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='neon-files.json';a.click();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
    };
    showList();
  }
  function renderFocus(root,win) {
    root.innerHTML='<div class="extra-head"><h2>◴ Режим фокуса</h2><p>Поработай над своей идеей, затем отдохни</p></div><div class="focus-main"><div class="focus-ring"><div class="focus-time">25:00</div><div class="focus-caption">КОНЦЕНТРАЦИЯ</div></div><div class="focus-modes"><button data-minutes="25" class="selected">25 минут</button><button data-minutes="5">5 минут</button><button data-minutes="15">15 минут</button></div><div class="focus-actions"><button class="extra-btn focus-play">Старт</button><button class="extra-btn secondary focus-reset">Сбросить</button></div><p class="focus-info">Пока идёт таймер, можешь работать в других приложениях.</p></div>';
    let duration=1500,left=duration,running=false,last=0;
    const text=$('.focus-time',root),play=$('.focus-play',root),ring=$('.focus-ring',root);
    const format=()=>{text.textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');ring.style.setProperty('--progress',((duration-left)/duration*100)+'%');play.textContent=running?'Пауза':'Старт';};
    const tick=()=>{
      if(!running)return;
      const now=Date.now();const seconds=Math.floor((now-last)/1000);
      if(seconds<=0)return;
      left=Math.max(0,left-seconds);last+=seconds*1000;format();
      if(!left){running=false;format();notice('Фокус-сессия завершена!');unlock('focused');}
    };
    timerHandle=setInterval(tick,250);
    win._cleanup=()=>clearInterval(timerHandle);
    play.onclick=()=>{running=!running;last=Date.now();format();};
    $('.focus-reset',root).onclick=()=>{running=false;left=duration;format();};
    root.querySelectorAll('[data-minutes]').forEach(b=>b.onclick=()=>{
      duration=Number(b.dataset.minutes)*60;left=duration;running=false;
      root.querySelectorAll('[data-minutes]').forEach(x=>x.classList.toggle('selected',x===b));
      $('.focus-caption',root).textContent=duration===300?'ОТДЫХ':'КОНЦЕНТРАЦИЯ';format();
    });
    format();
  }
  const wallpapers = {
    cosmos:['Космос','radial-gradient(ellipse at 58% 37%,#253061 0%,#111933 29%,#090c1c 73%)'],
    sunset:['Закат','radial-gradient(ellipse at 58% 35%,#ae538f 0%,#542d72 35%,#180f32 75%)'],
    ocean:['Океан','radial-gradient(ellipse at 60% 40%,#197f8a 0%,#104268 38%,#0a1830 80%)'],
    forest:['Лес','radial-gradient(ellipse at 60% 40%,#1a8061 0%,#17453d 40%,#0a1e24 80%)'],
    ember:['Искра','radial-gradient(ellipse at 60% 40%,#a55832 0%,#5b2f40 38%,#1b1229 80%)']
  };
  function setWallpaper(id) {
    if(!wallpapers[id])id='cosmos';
    desktop.style.background=wallpapers[id][1];
    desktop.dataset.wallpaper=id;
    save('wallpaper',id);
  }
  function renderSettings(root) {
    root.innerHTML='<div class="extra-head"><h2>⚙ Персонализация</h2><p>Сделай NEON OS своей</p></div><h3 class="extra-subtitle">ОБОИ РАБОЧЕГО СТОЛА</h3><div class="wallpaper-options"></div><h3 class="extra-subtitle">НАСТРОЙКИ</h3><label class="settings-option"><input type="checkbox" class="effects-toggle"> Эффекты звёзд и свечения</label><p class="extra-empty">Тема переключается кнопкой ☾ на панели снизу.</p>';
    const options=$('.wallpaper-options',root);
    Object.entries(wallpapers).forEach(([id,[name,background]])=>{
      const btn=document.createElement('button');btn.className='wallpaper-choice';btn.dataset.wallpaper=id;
      btn.innerHTML='<span class="wallpaper-preview"></span><span>'+name+'</span>';
      $('.wallpaper-preview',btn).style.background=background;
      btn.onclick=()=>{setWallpaper(id);options.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b===btn));unlock('designer');};
      options.append(btn);
    });
    const current=load('wallpaper','cosmos');
    options.querySelector('[data-wallpaper="'+current+'"]')?.classList.add('selected');
    const toggle=$('.effects-toggle',root);
    toggle.checked=load('effects','on')==='on';
    toggle.onchange=()=>setEffects(toggle.checked);
  }
  function setEffects(on) {
    desktop.classList.toggle('effects-off',!on);
    save('effects',on?'on':'off');
  }
  function renderAchievements(root) {
    root.innerHTML='<div class="extra-head"><h2>★ Достижения</h2><p>Открывай секреты и собирай награды</p></div><div class="achievement-progress"></div><div class="achievement-list"></div>';
    const done=unlocked(),list=$('.achievement-list',root);
    $('.achievement-progress',root).textContent=Object.keys(done).filter(x=>achievements[x]).length+' из '+Object.keys(achievements).length+' достижений';
    Object.entries(achievements).forEach(([id,[title,description]])=>{
      const el=document.createElement('div');el.className='achievement-item '+(done[id]?'earned':'');
      el.innerHTML='<span class="achievement-medal">'+(done[id]?'★':'◇')+'</span><div><strong>'+safe(title)+'</strong><small>'+safe(description)+'</small></div><span class="achievement-state">'+(done[id]?'✓':'🔒')+'</span>';
      list.append(el);
    });
  }
  function renderReaction(root,win) {
    root.innerHTML='<div class="extra-head"><h2>⚡ Проверь реакцию</h2><p>Нажимай мышью или пробелом, когда экран станет зелёным</p></div><button class="reaction-field" type="button"><strong>НАЖМИ ДЛЯ СТАРТА</strong><span>Не торопись, дождись сигнала</span></button><div class="reaction-record">Рекорд: <b>пока нет</b></div>';
    const field=$('.reaction-field',root),record=$('.reaction-record b',root);
    let state='idle',start=0,timeout=null;
    const best=Number(load('reaction-best','0'));
    record.textContent=best?best+' мс':'пока нет';
    function reset() {clearTimeout(timeout);state='idle';field.className='reaction-field';field.querySelector('strong').textContent='НАЖМИ ДЛЯ СТАРТА';field.querySelector('span').textContent='Не торопись, дождись сигнала';}
    const onSpace = e => {
      if(e.code !== 'Space' || e.repeat || !win.isConnected || win.classList.contains('hidden') || !win.classList.contains('active')) return;
      if(!document.querySelector('.command-palette')?.classList.contains('hidden')) return;
      if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return;
      e.preventDefault();
      e.stopPropagation();
      press();
    };
    document.addEventListener('keydown',onSpace,true);
    win._cleanup=()=>{reset();document.removeEventListener('keydown',onSpace,true);};
    field.onclick=press;
    function press(){
      if(state==='idle'||state==='done'){
        state='waiting';field.className='reaction-field waiting';
        field.querySelector('strong').textContent='ЖДИ...';
        field.querySelector('span').textContent='Пока не нажимай!';
        timeout=setTimeout(()=>{
          if(!field.isConnected)return;
          state='ready';start=performance.now();field.className='reaction-field ready';
          field.querySelector('strong').textContent='ЖМИ!';
          field.querySelector('span').textContent='Быстрее!';
        },1200+Math.random()*2200);
      } else if(state==='waiting'){
        clearTimeout(timeout);state='done';field.className='reaction-field early';
        field.querySelector('strong').textContent='СЛИШКОМ РАНО!';
        field.querySelector('span').textContent='Нажми, чтобы попробовать ещё раз';
      } else if(state==='ready'){
        const ms=Math.round(performance.now()-start);
        state='done';field.className='reaction-field done';
        field.querySelector('strong').textContent=ms+' мс';
        field.querySelector('span').textContent='Нажми для новой попытки';
        const old=Number(load('reaction-best','0'));
        if(!old||ms<old){save('reaction-best',String(ms));record.textContent=ms+' мс';}
        if(ms<350)unlock('quick');
      }
    }
  }
  function renderStore(root) {
    root.innerHTML='<div class="extra-head"><h2>✧ Магазин приложений</h2><p>Добавляй новые приложения на рабочий стол</p></div><div class="store-list"></div>';
    const list=$('.store-list',root);
    const descriptions={hub:'Сводка и быстрый доступ',files:'Создавай и сохраняй текстовые файлы',focus:'Таймер для учёбы и отдыха',achievements:'Открывай награды за действия',reaction:'Проверь скорость своих рефлексов',settings:'Темы, обои и оформление'};
    Object.entries(descriptions).forEach(([id,description])=>{
      const row=document.createElement('div');row.className='store-item';
      const details=document.createElement('div');
      details.innerHTML='<strong>'+appIcons[id]+' '+appNames[id]+'</strong><small>'+description+'</small>';
      const btn=document.createElement('button');btn.className='extra-btn';
      const refresh=()=>{
        const has=installed().includes(id)||id==='settings'||id==='hub';
        btn.textContent=['settings','hub'].includes(id)?'ОТКРЫТЬ':has?'УДАЛИТЬ':'УСТАНОВИТЬ';
      };
      btn.onclick=()=>{
        if(['settings','hub'].includes(id)){openApp(id);return;}
        const list=installed(),has=list.includes(id);
        persistInstalled(has?list.filter(x=>x!==id):[...list,id]);
        refreshApps();refresh();
        if(!has){notice('Приложение установлено: '+appNames[id]);unlock('shopper');}
        else{notice('Приложение убрано с рабочего стола');closeWindow(id);}
      };
      refresh();row.append(details,btn);list.append(row);
    });
  }
  const palette=document.createElement('div');
  palette.className='command-palette hidden';
  palette.innerHTML='<div class="palette-overlay"></div><div class="palette-box"><label>⌕ БЫСТРЫЙ ПОИСК</label><input placeholder="Начни вводить название приложения..." aria-label="Поиск приложений"><div class="palette-results"></div><p>Ctrl + K для открытия, Esc для закрытия</p></div>';
  document.body.append(palette);
  const input=$('.palette-box input',palette);
  function hidePalette(){palette.classList.add('hidden');}
  function showPalette(){
    palette.classList.remove('hidden');input.value='';updatePalette();input.focus();
  }
  function updatePalette() {
    const list=$('.palette-results',palette);list.replaceChildren();
    const options=[...document.querySelectorAll('.desktop-icon[data-open]')].map(el=>({id:el.dataset.open,name:el.textContent.trim(),extra:false}))
      .concat(Object.keys(appNames).map(id=>({id,name:appNames[id],extra:true})));
    options.filter(x=>x.name.toLowerCase().includes(input.value.trim().toLowerCase())).forEach(x=>{
      const btn=document.createElement('button');btn.textContent=x.name;
      btn.onclick=()=>{hidePalette();if(x.extra)openApp(x.id);else document.querySelector('.desktop-icon[data-open="'+x.id+'"]')?.click();};
      list.append(btn);
    });
    if(!list.children.length)list.textContent='Ничего не найдено';
  }
  input.addEventListener('input',updatePalette);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){$('.palette-results button',palette)?.click();}});
  $('.palette-overlay',palette).addEventListener('click',hidePalette);
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();palette.classList.contains('hidden')?showPalette():hidePalette();}
    if(e.key==='Escape'&&!palette.classList.contains('hidden')){e.stopImmediatePropagation();hidePalette();}
  },true);
  refreshApps();
  setWallpaper(load('wallpaper','cosmos'));
  setEffects(load('effects','on')==='on');
  window.neonExtras={openApp,showPalette};
})();
