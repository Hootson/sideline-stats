// Bleacher Butt Stats bridge for the existing Gridiron runtime.
(function(){
 const PREF='bbs-account-preferences';
 function read(){try{return JSON.parse(localStorage.getItem(PREF)||'{}')}catch{return{}}}
 function write(patch){try{localStorage.setItem(PREF,JSON.stringify({...read(),...patch,updatedAt:Date.now()}))}catch{}}
 function remember(){write({lastEdition:'gridiron'})}
 function addButton(){if(document.getElementById('bbsMySportsGridiron'))return;const b=document.createElement('button');b.id='bbsMySportsGridiron';b.type='button';b.textContent='Bleacher Butt Stats · My Sports';b.style.cssText='position:fixed;right:10px;bottom:10px;z-index:9990;border:1px solid #55c77b;border-radius:999px;background:#07110ded;color:#fff;padding:9px 12px;font:850 10px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;box-shadow:0 6px 22px #0008';b.onclick=()=>{remember();location.href='./hardcourt-account-preview/?umbrella=1&from=gridiron'};document.body.appendChild(b)}
 function route(){const q=new URLSearchParams(location.search);if(q.get('bbs')==='1'){remember();try{const u=new URL(location.href);u.searchParams.delete('bbs');history.replaceState({},'',u.href)}catch{}}}
 function init(){route();remember();addButton();window.addEventListener('pageshow',addButton)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
