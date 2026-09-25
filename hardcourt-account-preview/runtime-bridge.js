// Compatibility bridge while the mature game runtime is progressively separated from its old account UI.
// Keeps proven stat entry intact while removing prototype account/demo behavior from the user experience.
export function installHardcourtRuntimeBridge({readLocal=()=>({})}={}){
 const openShared=()=>{if(typeof window.openBleacherButtAccount==='function'){window.openBleacherButtAccount();return true}return false};
 const demoNames=new Set(['Mason Reed','Liam Carter','Noah Brooks','Ethan Hayes','Caleb Turner','Owen Parker','Jack Bennett','Luke Foster','Henry Collins','Wyatt Cooper','Abe','Max','Cole','Sam','Jack','Ben','Luke','Noah','Eli','Ryan']);
 function scrubPrototypeRoster(){
   let s=readLocal();if(!s)return;
   const r=Array.isArray(s.roster)?s.roster:[];
   const looksDemo=r.length>=5&&r.every((p,i)=>!p?.cloudId&&(demoNames.has(String(p?.name||''))||String(p?.name||'')===`Player ${i+1}`));
   if(!looksDemo)return;
   s={...s,roster:[],active:[]};localStorage.setItem('hardcourt-alpha',JSON.stringify(s));
 }
 function scrubPrototypeGameLabels(){
   const s=readLocal();if(!s)return;
   const patches={};
   if(/^(Erie Elite|Longmont|Home Team|My Team)$/i.test(String(s.team||'').trim())&&!s.cloudTeamId)patches.team='';
   if(/^(Longmont|Away Team)$/i.test(String(s.opponent||'').trim()))patches.opponent='Opponent';
   if(Object.keys(patches).length)localStorage.setItem('hardcourt-alpha',JSON.stringify({...s,...patches}));
 }
 scrubPrototypeRoster();scrubPrototypeGameLabels();
 document.addEventListener('click',e=>{
   const target=e.target?.closest?.('#accountBtn,#settingsAccount');
   if(!target)return;
   if(openShared()){e.preventDefault();e.stopImmediatePropagation()}
 },true);
 const normalize=()=>{
   const account=document.getElementById('accountBtn');
   if(account){account.textContent='⚙ Bleacher Butt Stats';account.setAttribute('aria-label','Open Bleacher Butt Stats account and teams')}
   const settings=document.getElementById('settingsAccount');if(settings)settings.textContent='Bleacher Butt Stats Account';
   for(const id of ['cloudStatus','liveCloudStatus']){const cloud=document.getElementById(id);if(cloud)cloud.style.display='none'}
   document.querySelectorAll('button').forEach(b=>{
     const t=(b.textContent||'').trim();
     if(/Sign In\s*\/\s*Create Account/i.test(t))b.textContent='Bleacher Butt Stats Account';
     if(/^Account$/i.test(t)&&b.id!=='bbsHubBtn')b.textContent='Bleacher Butt Stats Account';
   });
   document.querySelectorAll('[data-demo],[data-sample]').forEach(x=>x.style.display='none');
 };
 normalize();const observer=new MutationObserver(normalize);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
 window.addEventListener('storage',e=>{if(e.key==='hardcourt-alpha'){scrubPrototypeRoster();scrubPrototypeGameLabels();normalize()}});
 return{destroy(){observer.disconnect()}};
}
