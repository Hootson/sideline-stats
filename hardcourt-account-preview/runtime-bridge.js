// Compatibility bridge while the mature game runtime is progressively separated from its old account UI.
// Keeps the proven stat-entry engine intact while routing account-facing controls through Bleacher Butt Stats.
export function installHardcourtRuntimeBridge(){
 const openShared=()=>{if(typeof window.openBleacherButtAccount==='function'){window.openBleacherButtAccount();return true}return false};
 // The legacy runtime still renders account/status controls. Intercept only account actions;
 // do not disturb game, sharing, stat-entry, invite, or analytics handlers.
 document.addEventListener('click',e=>{
   const target=e.target?.closest?.('#accountBtn,#settingsAccount');
   if(!target)return;
   if(openShared()){
     e.preventDefault();
     e.stopImmediatePropagation();
   }
 },true);
 // Replace legacy wording when those controls are rendered/re-rendered.
 const normalize=()=>{
   const account=document.getElementById('accountBtn');
   if(account){account.textContent='⚙ Bleacher Butt Stats';account.setAttribute('aria-label','Open Bleacher Butt Stats account and teams')}
   const settings=document.getElementById('settingsAccount');
   if(settings)settings.textContent='Bleacher Butt Stats Account';
   const cloud=document.getElementById('cloudStatus');
   if(cloud&&/Local mode|Signed in/i.test(cloud.textContent||''))cloud.style.display='none';
 };
 normalize();
 const observer=new MutationObserver(normalize);observer.observe(document.body,{childList:true,subtree:true});
 return{destroy(){observer.disconnect()}};
}
