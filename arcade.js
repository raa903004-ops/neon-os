(() => {
  'use strict';
  const workspace=document.querySelector('#workspace');
  const icons=document.querySelector('.desktop-icons');
  const dock=document.querySelector('.dock');
  if(!workspace||!icons||!dock)return;
  const $=(s,r=document)=>r.querySelector(s);
  const store=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
  const restore=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key));return value===null?fallback:value;}catch{return fallback;}};
  let top=1500;
  const openWindows=new Map();
  const list=[
    {id:'2048',title:'2048',icon:'▦',color:'game-2048'},
    {id:'memory',title:'Найди пары',icon:'✿',color:'game-memory'}
  ];
  function makeShortcut(app){
    const btn=document.createElement('button');
    btn.className='desktop-icon arcade-icon';
    btn.dataset.arcade=app.id;
    btn.innerHTML='<span class="icon-tile '+app.color+'">'+app.icon+'</span><span>'+app.title+'</span>';
    btn.addEventListener('click',()=>openGame(app.id));
    icons.appendChild(btn);
    const dockBtn=document.createElement('button');
    dockBtn.title=app.title;
    dockBtn.textContent=app.icon;
    dockBtn.setAttribute('aria-label',app.title);
    dockBtn.addEventListener('click',()=>openGame(app.id));
    dock.insertBefore(dockBtn,$('#theme-btn',dock).previousElementSibling);
  }
  function makeWindow(id){
    const app=list.find(x=>x.id===id);
    let win=openWindows.get(id);
    if(win){
      win.classList.remove('hidden');
      win.style.zIndex=++top;
      return null;
    }
    win=document.createElement('section');
    win.className='window arcade-window active';
    win.style.left='clamp(12px,29%,320px)';
    win.style.top='9%';
    win.style.zIndex=++top;
    win.setAttribute('aria-label',app.title);
    win.innerHTML='<div class="titlebar"><div class="traffic"><button class="close" aria-label="Закрыть"></button><button class="minimize" aria-label="Свернуть"></button><button class="maximize" aria-label="Развернуть"></button></div><div class="window-title">'+app.title+'</div></div><div class="arcade-body window-body"></div>';
    workspace.appendChild(win);
    openWindows.set(id,win);
    const close=()=>{win._dispose?.();openWindows.delete(id);win.remove();};
    $('.close',win).onclick=close;
    $('.minimize',win).onclick=()=>win.classList.add('hidden');
    $('.maximize',win).onclick=()=>{
      if(win.dataset.full==='true'){
        win.style.left=win.dataset.prevLeft;
        win.style.top=win.dataset.prevTop;
        win.style.width=win.dataset.prevWidth;
        win.style.height=win.dataset.prevHeight;
        win.dataset.full='false';
      }else{
        win.dataset.prevLeft=win.style.left;win.dataset.prevTop=win.style.top;
        win.dataset.prevWidth=win.style.width;win.dataset.prevHeight=win.style.height;
        win.style.left='10px';win.style.top='10px';
        win.style.width='calc(100% - 20px)';win.style.height='calc(100% - 110px)';
        win.dataset.full='true';
      }
    };
    win.addEventListener('pointerdown',()=>{document.querySelectorAll('.window.active').forEach(w=>w.classList.remove('active'));win.classList.add('active');win.style.zIndex=++top;});
    const bar=$('.titlebar',win);let start=null;
    bar.addEventListener('pointerdown',e=>{
      if(e.target.closest('button')||win.dataset.full==='true'||matchMedia('(max-width:700px)').matches)return;
      const r=win.getBoundingClientRect(),parent=workspace.getBoundingClientRect();
      start={x:e.clientX,y:e.clientY,left:r.left-parent.left,top:r.top-parent.top};
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove',e=>{
      if(!start)return;
      win.style.left=Math.max(0,Math.min(workspace.clientWidth-80,start.left+e.clientX-start.x))+'px';
      win.style.top=Math.max(0,Math.min(workspace.clientHeight-80,start.top+e.clientY-start.y))+'px';
    });
    bar.addEventListener('pointerup',()=>start=null);
    bar.addEventListener('pointercancel',()=>start=null);
    return win;
  }
  function openGame(id){
    const win=makeWindow(id);
    if(!win)return;
    if(id==='2048')create2048(win);
    if(id==='memory')createMemory(win);
  }
  function create2048(win){
    const root=$('.arcade-body',win);
    root.innerHTML='<div class="arcade-top"><div><p class="arcade-eyebrow">ЧИСЛОВАЯ ГОЛОВОЛОМКА</p><h2>2048 <span>✦</span></h2><p>Объединяй одинаковые плитки</p></div><div class="arcade-score"><small>СЧЁТ</small><b>0</b><small>РЕКОРД</small><strong>0</strong></div></div><div class="board2048" role="grid" aria-label="Поле игры 2048"></div><div class="arcade-actions"><button class="arcade-reset">Новая игра</button><span>Стрелки, WASD или свайпы</span></div><div class="arcade-status" role="status"></div>';
    const boardEl=$('.board2048',root),scoreEl=$('.arcade-score b',root),bestEl=$('.arcade-score strong',root),status=$('.arcade-status',root);
    const cells=[];
    for(let i=0;i<16;i++){const e=document.createElement('div');e.className='tile2048';boardEl.append(e);cells.push(e);}
    let board=Array(16).fill(0),score=0,over=false;
    let best=restore('neon2048best',0);
    bestEl.textContent=best;
    function spawn(){
      const free=board.map((n,i)=>n?null:i).filter(x=>x!==null);
      if(!free.length)return;
      board[free[Math.floor(Math.random()*free.length)]]=Math.random()<.9?2:4;
    }
    function paint(){
      cells.forEach((el,i)=>{
        const v=board[i];el.textContent=v||'';
        el.dataset.value=v;
        el.classList.toggle('filled',!!v);
      });
      scoreEl.textContent=score;bestEl.textContent=best;
    }
    function reset(){board.fill(0);score=0;over=false;status.textContent='';spawn();spawn();paint();}
    function move(direction){
      if(over)return;
      let changed=false,added=0;
      for(let line=0;line<4;line++){
        let indices=[];
        for(let i=0;i<4;i++){
          const p=direction==='left'?line*4+i:direction==='right'?line*4+3-i:direction==='up'?i*4+line:(3-i)*4+line;
          indices.push(p);
        }
        const values=indices.map(i=>board[i]).filter(Boolean);
        const next=[];
        for(let i=0;i<values.length;i++){
          if(i+1<values.length&&values[i]===values[i+1]){
            next.push(values[i]*2);added+=values[i]*2;i++;
          }else next.push(values[i]);
        }
        while(next.length<4)next.push(0);
        indices.forEach((index,i)=>{if(board[index]!==next[i])changed=true;board[index]=next[i];});
      }
      if(!changed)return;
      score+=added;if(score>best){best=score;store('neon2048best',best);}
      spawn();paint();
      if(board.includes(2048))status.textContent='🏆 Ты собрал 2048! Можешь играть дальше.';
      if(!board.some(x=>!x)){
        let possible=false;
        for(let i=0;i<16;i++){
          if(i%4<3&&board[i]===board[i+1])possible=true;
          if(i<12&&board[i]===board[i+4])possible=true;
        }
        if(!possible){over=true;status.textContent='Игра окончена. Попробуй ещё раз!';}
      }
    }
    const directions={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',w:'up',a:'left',s:'down',d:'right',ц:'up',ф:'left',ы:'down',в:'right'};
    const onKey=e=>{
      if(win.classList.contains('hidden')||!win.isConnected||!win.classList.contains('active'))return;
      if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
      const dir=directions[e.key]||directions[e.key.toLowerCase()];
      if(dir){e.preventDefault();move(dir);}
    };
    document.addEventListener('keydown',onKey);
    let touch=null;
    boardEl.addEventListener('touchstart',e=>{touch={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
    boardEl.addEventListener('touchend',e=>{
      if(!touch)return;
      const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;
      if(Math.max(Math.abs(dx),Math.abs(dy))>25)move(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');
      touch=null;
    },{passive:true});
    $('.arcade-reset',root).onclick=reset;
    win._dispose=()=>document.removeEventListener('keydown',onKey);
    reset();
  }
  function createMemory(win){
    const root=$('.arcade-body',win);
    root.innerHTML='<div class="arcade-top"><div><p class="arcade-eyebrow">ТРЕНИРОВКА ПАМЯТИ</p><h2>Найди пары <span>✿</span></h2><p>Открой две одинаковые карточки</p></div><div class="arcade-score"><small>ХОДЫ</small><b>0</b><small>ЛУЧШИЙ</small><strong>—</strong></div></div><div class="memory-board" role="grid" aria-label="Карточки памяти"></div><div class="arcade-actions"><button class="arcade-reset">Перемешать</button><span>Найди все 8 пар</span></div><div class="arcade-status" role="status"></div>';
    const symbols=['☀','✦','☾','♢','☘','❖','♬','⚡'];
    const cells=$('.memory-board',root);
    const status=$('.arcade-status',root),movesEl=$('.arcade-score b',root),bestEl=$('.arcade-score strong',root);
    let shuffled=[],first=null,second=null,locked=false,moves=0,found=0,timeout=null;
    let best=restore('neonMemoryBest',0);
    bestEl.textContent=best||'—';
    function reset(){
      clearTimeout(timeout);shuffled=[...symbols,...symbols].sort(()=>Math.random()-.5);
      first=null;second=null;locked=false;moves=0;found=0;
      cells.replaceChildren();status.textContent='';movesEl.textContent='0';
      shuffled.forEach((symbol,index)=>{
        const b=document.createElement('button');b.type='button';b.className='memory-card';
        b.dataset.index=index;b.setAttribute('aria-label','Закрытая карточка');b.innerHTML='<span class="memory-front">✧</span><span class="memory-back">'+symbol+'</span>';
        b.onclick=()=>choose(b);
        cells.append(b);
      });
    }
    function choose(card){
      if(locked||card.classList.contains('revealed')||card.classList.contains('matched'))return;
      card.classList.add('revealed');card.setAttribute('aria-label','Карточка '+shuffled[Number(card.dataset.index)]);
      if(!first){first=card;return;}
      second=card;moves++;movesEl.textContent=moves;
      const a=shuffled[Number(first.dataset.index)],b=shuffled[Number(second.dataset.index)];
      if(a===b){
        first.classList.add('matched');second.classList.add('matched');
        first=null;second=null;found++;
        if(found===8){
          status.textContent='🎉 Все пары найдены за '+moves+' ходов!';
          if(!best||moves<best){best=moves;store('neonMemoryBest',best);bestEl.textContent=best;}
        }
      }else{
        locked=true;
        timeout=setTimeout(()=>{
          first?.classList.remove('revealed');second?.classList.remove('revealed');
          first=null;second=null;locked=false;
        },800);
      }
    }
    $('.arcade-reset',root).onclick=reset;
    win._dispose=()=>clearTimeout(timeout);
    reset();
  }
  list.forEach(makeShortcut);
  function initDrag(){
    const saved=restore('neonIconPositions',{});
    function idOf(el){return el.dataset.open||el.dataset.extra||el.dataset.arcade;}
    function position(el,x,y){
      el.classList.add('icon-moved');
      el.style.left=x+'px';el.style.top=y+'px';
    }
    const rect=()=>icons.getBoundingClientRect();
    const apply=()=>{
      Object.values(saved).length;
      icons.querySelectorAll('.desktop-icon').forEach(el=>{
        const p=saved[idOf(el)];
        if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&matchMedia('(min-width:701px)').matches){
          position(el,p.x,p.y);
        }
      });
    };
    apply();
    let drag=null,suppress=null;
    icons.addEventListener('pointerdown',e=>{
      const el=e.target.closest('.desktop-icon');
      if(!el||e.button!==0||matchMedia('(max-width:700px)').matches)return;
      const bounds=el.getBoundingClientRect(),parent=rect();
      drag={el,id:idOf(el),startX:e.clientX,startY:e.clientY,dx:e.clientX-bounds.left,dy:e.clientY-bounds.top,
        x:bounds.left-parent.left,y:bounds.top-parent.top,moved:false};
    });
    document.addEventListener('pointermove',e=>{
      if(!drag)return;
      if(!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<7)return;
      if(!drag.moved){drag.moved=true;drag.el.classList.add('dragging');}
      const bounds=rect();
      const x=Math.max(0,Math.min(workspace.clientWidth-75,e.clientX-bounds.left-drag.dx));
      const y=Math.max(-10,Math.min(workspace.clientHeight-95,e.clientY-bounds.top-drag.dy));
      position(drag.el,x,y);
    });
    document.addEventListener('pointerup',()=>{
      if(!drag)return;
      if(drag.moved){
        const {el,id}=drag;el.classList.remove('dragging');
        saved[id]={x:parseFloat(el.style.left),y:parseFloat(el.style.top)};
        store('neonIconPositions',saved);suppress=el;
      }
      drag=null;
    });
    document.addEventListener('pointercancel',()=>{drag?.el.classList.remove('dragging');drag=null;});
    document.addEventListener('click',e=>{
      if(suppress&&e.target.closest('.desktop-icon')===suppress){
        e.preventDefault();e.stopImmediatePropagation();suppress=null;
      }
    },true);
    const observer=new MutationObserver(apply);
    observer.observe(icons,{childList:true});
    document.addEventListener('keydown',e=>{
      if(e.altKey&&e.key.toLowerCase()==='r'){
        e.preventDefault();
        Object.keys(saved).forEach(k=>delete saved[k]);
        store('neonIconPositions',saved);
        icons.querySelectorAll('.desktop-icon').forEach(el=>{
          el.classList.remove('icon-moved');el.style.left='';el.style.top='';
        });
      }
    });
  }
  initDrag();
})();
