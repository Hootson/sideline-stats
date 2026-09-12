(()=>{
const SUPABASE_URL='https://eyuvgzhkhcpwtcbmsvct.supabase.co';
const KEY='sb_publishable_uMOkwO4jyHen4pz4zCkIuQ_Ss-wUf2l';
const token=new URLSearchParams(location.search).get('teamInvite')||'';
let data=null,currentGameId=null,timer=null;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function rpc(){const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_team_viewer`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'},body:JSON.stringify({p_token:token})});const txt=await r.text();if(!r.ok)throw new Error((()=>{try{return JSON.parse(txt).message||txt}catch{return txt}})());return JSON.parse(txt)}
function showMsg(t){$('#message').textContent=t;$('#message').classList.remove('hidden')}
function hideMsg(){$('#message').classList.add('hidden')}
function pname(id){const p=(data?.players||[]).find(x=>x.id===id);return p?`${p.jersey?`#${p.jersey} `:''}${p.name}`:'Player'}
function game(){return (data?.games||[]).find(g=>g.id===currentGameId)||null}
function plays(){return (data?.plays||[]).filter(p=>p.game_id===currentGameId)}
function raw(p){return p?.event_data?.raw||{}}
function has(r,x){return Array.isArray(r.extras)&&r.extras.includes(x)}
function preferredGame(){const gs=[...(data?.games||[])];return gs.find(g=>g.status==='live')||gs.sort((a,b)=>Number(b.week_number||0)-Number(a.week_number||0)||Date.parse(b.created_at)-Date.parse(a.created_at))[0]||null}
function setColors(){const p=data?.team?.primary||'#f28c28',a=data?.team?.accent||'#17202a';document.documentElement.style.setProperty('--p',p);document.documentElement.style.setProperty('--a',a);document.querySelector('meta[name="theme-color"]').setAttribute('content',p)}
function renderHeader(){setColors();$('#teamName').textContent=data.team?.name||'Sideline Stats';$('#seasonName').textContent=`${data.season?.name||'Season'} • Parent Viewer`;if(data.team?.logo){$('#teamLogo').src=data.team.logo;$('#teamLogo').classList.remove('hidden')}else $('#teamLogo').classList.add('hidden')}
function renderSelect(){const gs=[...(data.games||[])].sort((a,b)=>Number(b.week_number||0)-Number(a.week_number||0));$('#gameSelect').innerHTML=gs.map(g=>`<option value="${g.id}">Week ${g.week_number||'?'} • ${esc(g.opponent_name||'Opponent')}</option>`).join('');if(currentGameId)$('#gameSelect').value=currentGameId}
function rowEmpty(cols){return `<tr><td colspan="${cols}" class="empty">No stats yet.</td></tr>`}
function render(){const g=game();if(!g)return showMsg('No games are available yet.');hideMsg();renderHeader();renderSelect();$('#ourTeam').textContent=data.team?.name||'Team';$('#oppTeam').textContent=g.opponent_name||'Opponent';$('#ourScore').textContent=Number(g.team_score||0);$('#oppScore').textContent=Number(g.opponent_score||0);const status=String(g.status||'live').toLowerCase();$('#gameStatus').textContent=status==='final'?'FINAL':status==='live'?'LIVE':status.toUpperCase();$('#gameStatus').className=`status ${status==='final'?'final':status==='live'?'live':''}`;$('#gameMeta').textContent=`Week ${g.week_number||'?'} • Q${g.current_quarter||1} • ${String(g.location_type||'home').replace(/^./,c=>c.toUpperCase())}`;
const ps=plays(),rush={},pass={},rec={},def={};let rushY=0,passY=0,first=0;
for(const p of ps){const r=raw(p),type=String(r.type||p.play_type||''),yards=Number(r.yards??p.yards??0);if(has(r,'1st Down'))first++;
 if(type==='Rush'){const id=r.player;if(id){const s=rush[id]||(rush[id]={car:0,yd:0,td:0});s.car++;s.yd+=yards;if(has(r,'TD'))s.td++}rushY+=yards}
 if(type==='Pass'){const qb=r.player,wr=r.player2,sub=String(r.sub||p.subtype||'');if(qb){const s=pass[qb]||(pass[qb]={att:0,cmp:0,yd:0,td:0,int:0});s.att++;if(sub==='Complete'){s.cmp++;s.yd+=yards;if(has(r,'TD'))s.td++}if(sub==='Intercepted')s.int++}if(sub==='Complete'){passY+=yards;if(wr){const s=rec[wr]||(rec[wr]={rec:0,yd:0,td:0});s.rec++;s.yd+=yards;if(has(r,'TD'))s.td++}}}
 if(type==='Defense'){const credits=r.defCredits||{};for(const [id,val] of Object.entries(credits)){const s=def[id]||(def[id]={t:0,tfl:0,sack:0,int:0});s.t+=Number(val||0);if(r.tackleKind==='TFL')s.tfl+=Number(val||0);if(r.tackleKind==='Sack')s.sack+=Number(val||0)}if(r.interceptionPlayerId){const s=def[r.interceptionPlayerId]||(def[r.interceptionPlayerId]={t:0,tfl:0,sack:0,int:0});s.int++}}
}
$('#rushYds').textContent=rushY;$('#passYds').textContent=passY;$('#totalYds').textContent=rushY+passY;$('#firstDowns').textContent=first;
const rushRows=Object.entries(rush).sort((a,b)=>b[1].yd-a[1].yd).map(([id,s])=>`<tr><td>${esc(pname(id))}</td><td>${s.car}</td><td>${s.yd}</td><td>${s.car?(s.yd/s.car).toFixed(1):'0.0'}</td><td>${s.td}</td></tr>`).join('');$('#rushBody').innerHTML=rushRows||rowEmpty(5);
const passRows=Object.entries(pass).sort((a,b)=>b[1].yd-a[1].yd).map(([id,s])=>`<tr><td>${esc(pname(id))}</td><td>${s.cmp}/${s.att}</td><td>${s.yd}</td><td>${s.td}</td><td>${s.int}</td></tr>`).join('');$('#passBody').innerHTML=passRows||rowEmpty(5);
const recRows=Object.entries(rec).sort((a,b)=>b[1].yd-a[1].yd).map(([id,s])=>`<tr><td>${esc(pname(id))}</td><td>${s.rec}</td><td>${s.yd}</td><td>${s.rec?(s.yd/s.rec).toFixed(1):'0.0'}</td><td>${s.td}</td></tr>`).join('');$('#recBody').innerHTML=recRows||rowEmpty(5);
const defRows=Object.entries(def).sort((a,b)=>b[1].t-a[1].t||b[1].tfl-a[1].tfl).map(([id,s])=>`<tr><td>${esc(pname(id))}</td><td>${Number.isInteger(s.t)?s.t:s.t.toFixed(1)}</td><td>${Number.isInteger(s.tfl)?s.tfl:s.tfl.toFixed(1)}</td><td>${Number.isInteger(s.sack)?s.sack:s.sack.toFixed(1)}</td><td>${s.int}</td></tr>`).join('');$('#defBody').innerHTML=defRows||rowEmpty(5);$('#updated').textContent=`Updated ${new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})} • Auto-refreshes every 10 seconds`}
async function load({silent=false}={}){if(!token)return showMsg('This parent link is missing its access token.');try{const next=await rpc();const prior=currentGameId;data=next;if(!prior||(next.games||[]).every(g=>g.id!==prior))currentGameId=preferredGame()?.id||null;render()}catch(e){if(!silent)showMsg(e.message||'Could not load team stats.')}}
$('#gameSelect').addEventListener('change',()=>{currentGameId=$('#gameSelect').value;render()});$('#refreshBtn').addEventListener('click',()=>load());load();timer=setInterval(()=>load({silent:true}),10000);
})();
