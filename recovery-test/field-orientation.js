/* Sideline Stats — game-configurable visual field orientation.
   Visual only: never changes canonical ball spot, down, distance, possession, or recorded stats. */
(function(root){
  const DATA_KEY='sidelineStatsData';
  const SETTINGS_KEY='sidelineFieldOrientationV1';

  function quarterNumber(value){
    const m=String(value??'').match(/(?:Q|Quarter\s*)?(\d+)/i);
    const n=m?Number(m[1]):Number(value);
    return Number.isFinite(n)&&n>=1?n:1;
  }
  function readData(){try{return JSON.parse(localStorage.getItem(DATA_KEY)||'null')||{}}catch(_){return {}}}
  function readSettings(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null')||{teams:{},games:{}}}catch(_){return {teams:{},games:{}}}}
  function writeSettings(v){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(v))}catch(_){}}
  function teamKey(data=readData()){
    return data?.cloud?.teamId||`${data?.team?.name||'team'}|${data?.team?.season||'season'}`;
  }
  function activeGameId(data=readData()){return data?.activeGameId||null}
  function teamDefaults(data=readData()){
    const s=readSettings(),t=s.teams?.[teamKey(data)]||{};
    return {startDirection:t.startDirection==='left'?'left':'right',flipSchedule:t.flipSchedule==='halftime'?'halftime':'quarter'};
  }
  function gameSettings(gameId=activeGameId(),data=readData()){
    const base=teamDefaults(data),g=readSettings().games?.[gameId]||{};
    return {startDirection:g.startDirection==='left'?'left':(g.startDirection==='right'?'right':base.startDirection),flipSchedule:g.flipSchedule==='halftime'?'halftime':(g.flipSchedule==='quarter'?'quarter':base.flipSchedule)};
  }
  function saveTeamDefaults(startDirection,flipSchedule){
    const data=readData(),s=readSettings(),key=teamKey(data);s.teams=s.teams||{};s.teams[key]={startDirection:startDirection==='left'?'left':'right',flipSchedule:flipSchedule==='halftime'?'halftime':'quarter'};writeSettings(s);
  }
  function saveGameSettings(gameId,startDirection,flipSchedule){
    if(!gameId)return;const s=readSettings();s.games=s.games||{};s.games[gameId]={startDirection:startDirection==='left'?'left':'right',flipSchedule:flipSchedule==='halftime'?'halftime':'quarter'};writeSettings(s);persistIntoSnapshot(gameId,s.games[gameId]);
  }
  function persistIntoSnapshot(gameId,settings){
    try{const data=readData();const g=(data.games||[]).find(x=>x.id===gameId);if(g){g.fieldOrientation={...settings};localStorage.setItem(DATA_KEY,JSON.stringify(data))}}catch(_){ }
  }
  function hydrateFromSnapshot(){
    const data=readData(),s=readSettings();s.games=s.games||{};let changed=false;
    for(const g of data.games||[]){if(g?.id&&g?.fieldOrientation&&!s.games[g.id]){s.games[g.id]=g.fieldOrientation;changed=true}}
    if(changed)writeSettings(s);
  }
  function ourAttackDirection(quarter){
    const q=quarterNumber(quarter),cfg=gameSettings();let dir=cfg.startDirection;
    const flip=cfg.flipSchedule==='halftime'?q>=3:q%2===0;
    if(flip)dir=dir==='right'?'left':'right';return dir;
  }
  function shouldMirror(quarter){return ourAttackDirection(quarter)==='left'}
  function visualPercent(spot,quarter){
    const n=Math.max(0,Math.min(100,Number(spot)||0));
    return shouldMirror(quarter)?100-n:n;
  }
  function canonicalPercent(percent,quarter){
    const n=Math.max(0,Math.min(100,Number(percent)||0));
    return shouldMirror(quarter)?100-n:n;
  }
  function refreshFieldVisuals(){
    const q=document.getElementById('quarterCard');
    if(q){q.classList.toggle('ss-orientation-refresh');requestAnimationFrame(()=>q.classList.toggle('ss-orientation-refresh'))}
  }
  function makeSelect(id,label,options,value){
    const wrap=document.createElement('div');wrap.className='ss-orientation-option';wrap.innerHTML=`<label for="${id}">${label}</label><select id="${id}">${options.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select>`;wrap.querySelector('select').value=value;return wrap;
  }
  function injectStyles(){if(document.getElementById('ssOrientationStyles'))return;const st=document.createElement('style');st.id='ssOrientationStyles';st.textContent=`.ss-orientation-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.ss-orientation-option label{display:block}.ss-orientation-note{margin-top:6px;font-size:12px;color:var(--muted)}#flipFieldBtn{white-space:nowrap}@media(max-width:620px){.ss-orientation-grid{grid-template-columns:1fr}}`;document.head.appendChild(st)}
  function installNewGameControls(){
    const kickoff=document.getElementById('newOpeningKickoff');if(!kickoff||document.getElementById('newStartingDirection'))return;
    const defaults=teamDefaults(),grid=document.createElement('div');grid.className='ss-orientation-grid';
    grid.appendChild(makeSelect('newStartingDirection','Starting field direction',[["right","We attack left → right"],["left","We attack right → left"]],defaults.startDirection));
    grid.appendChild(makeSelect('newFieldFlipSchedule','Switch field direction',[["quarter","Every quarter"],["halftime","At halftime only"]],defaults.flipSchedule));
    const note=document.createElement('div');note.className='ss-orientation-note';note.textContent='These control only the visual field direction. Opening kickoff and possession stay independent.';
    const anchor=kickoff.nextElementSibling||kickoff;anchor.after(grid,note);
    const savePref=()=>saveTeamDefaults(document.getElementById('newStartingDirection').value,document.getElementById('newFieldFlipSchedule').value);
    grid.addEventListener('change',savePref);
    document.getElementById('newGameBtn')?.addEventListener('click',()=>setTimeout(()=>{const d=readData(),id=activeGameId(d);if(id)saveGameSettings(id,document.getElementById('newStartingDirection').value,document.getElementById('newFieldFlipSchedule').value)},0));
  }
  function installEditControls(){
    const card=document.getElementById('editGameCard'),save=document.getElementById('saveGameDetailsBtn');if(!card||!save||document.getElementById('editStartingDirection'))return;
    const grid=document.createElement('div');grid.className='ss-orientation-grid';grid.appendChild(makeSelect('editStartingDirection','Starting field direction',[["right","We attack left → right"],["left","We attack right → left"]],'right'));grid.appendChild(makeSelect('editFieldFlipSchedule','Switch field direction',[["quarter","Every quarter"],["halftime","At halftime only"]],'quarter'));save.parentElement.before(grid);
    const populate=()=>{const cfg=gameSettings();document.getElementById('editStartingDirection').value=cfg.startDirection;document.getElementById('editFieldFlipSchedule').value=cfg.flipSchedule};
    document.getElementById('editGameBtn')?.addEventListener('click',()=>setTimeout(populate,0));
    save.addEventListener('click',()=>{const id=activeGameId();saveGameSettings(id,document.getElementById('editStartingDirection').value,document.getElementById('editFieldFlipSchedule').value);saveTeamDefaults(document.getElementById('editStartingDirection').value,document.getElementById('editFieldFlipSchedule').value);refreshFieldVisuals()});populate();
  }
  function installFlipButton(){
    const actions=document.querySelector('.score-actions');if(!actions||document.getElementById('flipFieldBtn'))return;
    const btn=document.createElement('button');btn.className='score-action';btn.id='flipFieldBtn';btn.type='button';btn.textContent='⇄ Flip Field';btn.title='Reverse the visual field direction for this game';actions.appendChild(btn);
    btn.addEventListener('click',()=>{const id=activeGameId();if(!id)return;const cfg=gameSettings(id);const next=cfg.startDirection==='right'?'left':'right';saveGameSettings(id,next,cfg.flipSchedule);refreshFieldVisuals();btn.textContent='✓ Field Flipped';setTimeout(()=>btn.textContent='⇄ Flip Field',900)});
  }
  function install(){hydrateFromSnapshot();injectStyles();installNewGameControls();installEditControls();installFlipButton()}
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else setTimeout(install,0)}
  root.SidelineFieldOrientation={quarterNumber,ourAttackDirection,shouldMirror,visualPercent,canonicalPercent,gameSettings,refreshFieldVisuals};
})(typeof globalThis!=='undefined'?globalThis:this);
