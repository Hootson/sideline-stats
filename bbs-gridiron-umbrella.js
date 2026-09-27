// Bleacher Butt Stats bridge for the existing Gridiron runtime.
(function(){
 const PREF='bbs-account-preferences',DATA='sidelineStatsData';
 function read(){try{return JSON.parse(localStorage.getItem(PREF)||'{}')}catch{return{}}}
 function write(patch){try{localStorage.setItem(PREF,JSON.stringify({...read(),...patch,updatedAt:Date.now()}))}catch{}}
 function gridironTeam(){try{return JSON.parse(localStorage.getItem(DATA)||'{}')?.cloud?.teamId||null}catch{return null}}
 function remember(){const teamId=gridironTeam();write({lastEdition:'gridiron',...(teamId?{lastGridironTeam:teamId}:{})})}
 function goSports(){remember();location.href='./hardcourt-account-preview/?umbrella=1&from=gridiron'}
 function addButton(){if(document.getElementById('bbsMySportsGridiron'))return;const b=document.createElement('button');b.id='bbsMySportsGridiron';b.type='button';b.setAttribute('aria-label','Open Bleacher Butt Stats My Sports');b.innerHTML='<span style="font-size:13px">●</span> Bleacher Butt Stats · My Sports';b.style.cssText='position:fixed;right:10px;bottom:10px;z-index:9990;border:1px solid #55c77b;border-radius:999px;background:#07110df2;color:#fff;padding:10px 13px;font:850 10px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;box-shadow:0 6px 22px #0008;min-height:38px';b.onclick=goSports;document.body.appendChild(b)}
 function route(){const q=new URLSearchParams(location.search);if(q.get('sports')==='1'){goSports();return false}if(q.get('bbs')==='1'){remember();try{const u=new URL(location.href);u.searchParams.delete('bbs');history.replaceState({},'',u.href)}catch{}}return true}
 function init(){if(!route())return;remember();addButton();window.addEventListener('pageshow',()=>{remember();addButton()});window.addEventListener('storage',e=>{if(e.key===DATA)remember()})}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
