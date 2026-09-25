// Game lifecycle safety around the mature Hardcourt runtime.
// Keeps new-game transitions from inheriting stale game-only state.
export function installHardcourtGameLifecycle({readLocal=()=>({})}={}){
 const KEY='hardcourt-alpha';
 const gameOnly=['pendingShot','pendingAction','selectedPlayer','selectedAction','shotAssistPending','reboundPending'];
 const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
 function normalize(){const s=readLocal()||{};let dirty=false;for(const k of gameOnly){if(s[k]!==undefined&&s[k]!==null&&(!Array.isArray(s.events)||s.events.length===0)){s[k]=null;dirty=true}}if(!s.gameId){s.gameId=globalThis.crypto?.randomUUID?.()||`game-${Date.now()}`;dirty=true}if(!s.opponent&&!s.opp){s.opponent='Opponent';dirty=true}if(dirty)save(s)}
 function snapshot(){const s=readLocal()||{};if(!s.gameId)return;const raw=localStorage.getItem('hardcourt-recovery-games'),rows=(()=>{try{return JSON.parse(raw||'[]')}catch{return[]}})();const snap={gameId:s.gameId,cloudGameId:s.cloudGameId||null,teamId:s.cloudTeamId||s.teamId||null,team:s.team||'',opponent:s.opp||s.opponent||'Opponent',period:s.period||1,clockMs:Number(s.clockMs||0),events:Array.isArray(s.events)?s.events:[],minutes:s.minutes||{},savedAt:Date.now()};const i=rows.findIndex(x=>x.gameId===snap.gameId);if(i>=0)rows[i]=snap;else rows.push(snap);localStorage.setItem('hardcourt-recovery-games',JSON.stringify(rows.slice(-8)))}
 normalize();
 let last=0;const checkpoint=()=>{const now=Date.now();if(now-last<3000)return;last=now;snapshot()};
 window.addEventListener('pagehide',snapshot);document.addEventListener('visibilitychange',()=>{if(document.hidden)snapshot()});window.addEventListener('offline',snapshot);document.addEventListener('click',checkpoint,true);
 return{snapshot,normalize};
}
