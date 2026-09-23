(()=>{
const SITE='https://www.bleacherbuttstats.com';
let actionPhoto=null,headshot=null,lastBlob=null,lastName='player-card.png';
const $=s=>document.querySelector(s);
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function inject(){
 const style=document.createElement('style');style.textContent=`
 .pc-launch{border:0;background:var(--p);color:var(--p-ink);border-radius:10px;padding:10px 12px;font-weight:900;cursor:pointer}.pc-modal{position:fixed;inset:0;background:#0009;z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:18px;overflow:auto}.pc-modal.hidden{display:none}.pc-panel{width:min(760px,100%);background:#fff;color:#17202a;border-radius:18px;padding:16px;box-shadow:0 20px 60px #0006}.pc-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.pc-head h2{margin:0;font-size:22px}.pc-close{border:0;background:#eceff1;border-radius:999px;width:36px;height:36px;font-size:20px;font-weight:900}.pc-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.pc-field{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:800}.pc-field select,.pc-field input{padding:10px;border:1px solid #d6d9dc;border-radius:10px;background:#fff;font:inherit}.pc-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.pc-actions button{border:0;border-radius:10px;padding:11px 14px;font-weight:900}.pc-primary{background:var(--p);color:var(--p-ink)}.pc-secondary{background:var(--a);color:var(--a-ink)}.pc-canvas-wrap{background:#262626;border-radius:14px;padding:10px;overflow:auto}.pc-canvas-wrap canvas{display:block;width:min(100%,360px);height:auto;margin:auto;border-radius:10px;box-shadow:0 4px 18px #0005}.pc-note{font-size:12px;color:#6f767d;line-height:1.4}@media(max-width:620px){.pc-grid{grid-template-columns:1fr}.pc-panel{padding:12px}.pc-actions button{flex:1 1 45%}}`;
 document.head.appendChild(style);
 const toolbar=$('.toolbar');if(!toolbar)return;
 const btn=document.createElement('button');btn.className='pc-launch';btn.id='playerCardBtn';btn.textContent='Create Player Card';toolbar.appendChild(btn);
 const modal=document.createElement('div');modal.id='playerCardModal';modal.className='pc-modal hidden';modal.innerHTML=`<div class="pc-panel"><div class="pc-head"><div><h2>Player Card</h2><div class="pc-note">Vintage front + back stacked into one shareable image.</div></div><button class="pc-close" id="pcClose">×</button></div><div class="pc-grid"><label class="pc-field">Player<select id="pcPlayer"></select></label><label class="pc-field">Position<input id="pcPosition" placeholder="QB • DE"></label><label class="pc-field">Action photo<input id="pcPhoto" type="file" accept="image/*"></label><label class="pc-field">Headshot<input id="pcHeadshot" type="file" accept="image/*"></label></div><div class="pc-actions"><button class="pc-primary" id="pcBuild">Build Card</button><button class="pc-secondary" id="pcShare" disabled>Share</button><button id="pcSave" disabled>Save Image</button></div><div class="pc-canvas-wrap"><canvas id="pcCanvas" width="1080" height="2520"></canvas></div><p class="pc-note">Players are listed by jersey number. If no separate headshot is added, the action photo is reused on the back.</p></div>`;
 document.body.appendChild(modal);
 btn.onclick=()=>{populatePlayers();modal.classList.remove('hidden');build()};$('#pcClose').onclick=()=>modal.classList.add('hidden');modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.add('hidden')});
 $('#pcPhoto').onchange=async e=>{actionPhoto=e.target.files?.[0]?await fileImage(e.target.files[0]):null;build()};
 $('#pcHeadshot').onchange=async e=>{headshot=e.target.files?.[0]?await fileImage(e.target.files[0]):null;build()};
 $('#pcBuild').onclick=build;$('#pcPlayer').onchange=build;$('#pcPosition').oninput=debounce(build,250);$('#pcShare').onclick=share;$('#pcSave').onclick=save;
}
function debounce(fn,ms){let t;return()=>{clearTimeout(t);t=setTimeout(fn,ms)}}
function cleanPlayer(s){return String(s||'').trim().replace(/^#\d+\s+/,'')}
function jerseyNumber(s){const m=String(s||'').trim().match(/^#?(\d+)/);return m?Number(m[1]):999}
function playerLabel(s){return String(s||'').trim()}
function playerName(label){return cleanPlayer(label)||'PLAYER'}
function players(){
 const out=new Map();document.querySelectorAll('.stats-section tbody tr td:first-child').forEach(td=>{const raw=td.textContent.trim();if(raw&&raw!=='No stats yet.')out.set(cleanPlayer(raw),raw)});
 return [...out.entries()].sort((a,b)=>{const an=jerseyNumber(a[1]),bn=jerseyNumber(b[1]);return an-bn||a[0].localeCompare(b[0])});
}
function populatePlayers(){const sel=$('#pcPlayer'),prior=sel.value,ps=players();sel.innerHTML=ps.map(([n,l])=>`<option value="${esc(n)}">${esc(l)}</option>`).join('');if(ps.some(([n])=>n===prior))sel.value=prior}
function row(sectionTitle,name){const sec=[...document.querySelectorAll('.stats-section')].find(s=>s.querySelector('.section-title')?.textContent.trim()===sectionTitle);if(!sec)return null;return [...sec.querySelectorAll('tbody tr')].find(tr=>cleanPlayer(tr.cells?.[0]?.textContent)===name)||null}
function vals(tr){return tr?[...tr.cells].map(td=>td.textContent.trim()):[]}
function num(v){const n=parseFloat(String(v||'').replace(/[^\d.-]/g,''));return Number.isFinite(n)?n:0}
function statRows(name){
 const rushing=vals(row('Rushing',name)),passing=vals(row('Passing',name)),receiving=vals(row('Receiving',name)),defense=vals(row('Defense',name));
 const rows=[];let passY=0,passTd=0,rushY=0,rushTd=0,recY=0,recTd=0;
 if(passing.length){rows.push(['PASSING',passing[1]||'0/0']);passY=num(passing[2]);passTd=num(passing[3]);rows.push(['PASS YDS',String(passY)],['PASS TD',String(passTd)])}
 if(rushing.length){rows.push(['RUSHES',rushing[1]||'0']);rushY=num(rushing[2]);rushTd=num(rushing[4]);rows.push(['RUSH YDS',String(rushY)],['RUSH TD',String(rushTd)])}
 if(receiving.length){rows.push(['RECEPTIONS',receiving[2]||'0']);recY=num(receiving[3]);recTd=num(receiving[5]);rows.push(['REC YDS',String(recY)]);if(recTd)rows.push(['REC TD',String(recTd)])}
 if(defense.length){if(num(defense[2]))rows.push(['TFL',defense[2]]);if(num(defense[3]))rows.push(['SACKS',defense[3]]);if(num(defense[4]))rows.push(['INT',defense[4]]);if(num(defense[1]))rows.push(['TACKLES',defense[1]])}
 const totalY=passY+rushY+recY,totalTd=passTd+rushTd+recTd;
 if(totalY||totalTd){rows.push(['TOTAL YDS',String(totalY)],['TOTAL TD',String(totalTd)])}
 return rows.slice(0,10);
}
function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()}
function hex(h,fallback){return /^#[0-9a-f]{6}$/i.test(h||'')?h:fallback}
function loadImage(src){return new Promise(res=>{if(!src)return res(null);const i=new Image();i.crossOrigin='anonymous';i.onload=()=>res(i);i.onerror=()=>res(null);i.src=src})}
function fileImage(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>loadImage(r.result).then(res);r.onerror=rej;r.readAsDataURL(file)})}
function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function cover(ctx,img,x,y,w,h,focusY=.5){if(!img)return;const s=Math.max(w/img.width,h/img.height),dw=img.width*s,dh=img.height*s;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)*focusY,dw,dh)}
function contain(ctx,img,x,y,w,h){if(!img)return;const s=Math.min(w/img.width,h/img.height),dw=img.width*s,dh=img.height*s;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh)}
function fit(ctx,text,max,base,min=20,font='Arial Black,Impact,sans-serif'){let size=base;while(size>min){ctx.font=`900 ${size}px ${font}`;if(ctx.measureText(text).width<=max)break;size-=2}return size}
function seed(i){const x=Math.sin(i*999.91)*43758.5453;return x-Math.floor(x)}
function distress(ctx,x,y,w,h,dark='#1d1d1b',light='#fff8e8'){
 ctx.save();rounded(ctx,x,y,w,h,28);ctx.clip();
 for(let i=0;i<300;i++){const rx=x+seed(i)*w,ry=y+seed(i+311)*h,r=seed(i+719)*3+.4;ctx.globalAlpha=.035+seed(i+99)*.06;ctx.fillStyle=i%3?dark:light;ctx.beginPath();ctx.arc(rx,ry,r,0,Math.PI*2);ctx.fill()}
 for(let i=0;i<26;i++){ctx.globalAlpha=.04;ctx.strokeStyle=i%2?dark:light;ctx.lineWidth=1+seed(i+90)*2;ctx.beginPath();const sx=x+seed(i+12)*w,sy=y+seed(i+53)*h;ctx.moveTo(sx,sy);ctx.lineTo(sx+(seed(i+32)-.5)*150,sy+(seed(i+66)-.5)*12);ctx.stroke()}
 ctx.restore();ctx.globalAlpha=1;
}
function slant(ctx,x,y,w,h,fill,cut=38){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w-cut,y+h);ctx.lineTo(x,y+h);ctx.closePath();ctx.fillStyle=fill;ctx.fill()}
function paw(ctx,x,y,s,fill){ctx.save();ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y+s*.2,s*.34,s*.28,0,0,Math.PI*2);ctx.fill();[[-.3,-.12],[-.1,-.28],[.14,-.28],[.34,-.08]].forEach(([dx,dy],i)=>{ctx.beginPath();ctx.ellipse(x+dx*s,y+dy*s,s*.13,s*.17,(i-1.5)*.16,0,Math.PI*2);ctx.fill()});ctx.restore()}
function footballBadge(ctx,x,y,w,h,orange,ink,cream,week){ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(-.16);ctx.fillStyle=cream;ctx.strokeStyle=orange;ctx.lineWidth=8;ctx.beginPath();ctx.ellipse(0,0,w/2,h/2,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle=ink;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-35,-18);ctx.lineTo(35,18);ctx.stroke();for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*14-6,-13+i*4);ctx.lineTo(i*14+6,-3+i*4);ctx.stroke()}ctx.fillStyle=ink;ctx.textAlign='center';ctx.font='900 24px Arial Black,Impact,sans-serif';ctx.fillText('WEEK',0,-10);ctx.font='900 48px Arial Black,Impact,sans-serif';ctx.fillText(week,8,42);ctx.restore();ctx.textAlign='left'}
function drawBrand(ctx,img,x,y,w,h,ink,orange){if(img){contain(ctx,img,x,y,w,h);return}ctx.fillStyle=ink;ctx.font='900 34px Arial Black,Impact,sans-serif';ctx.fillText('BLEACHER',x,y+35);ctx.font='900 46px Arial Black,Impact,sans-serif';ctx.fillText('STATS',x+35,y+77);ctx.fillStyle=orange;ctx.fillRect(x+35,y+88,190,28);ctx.fillStyle=ink;ctx.font='900 15px Arial Black,Impact,sans-serif';ctx.fillText('GRIDIRON EDITION',x+51,y+108)}
function weekFrom(meta){const m=String(meta||'').match(/week\s*(\d+)/i);return m?m[1]:'—'}
async function build(){
 const canvas=$('#pcCanvas');if(!canvas)return;const ctx=canvas.getContext('2d'),W=1080,H=2520,CARD_X=40,CARD_W=1000,CARD_H=1200,FRONT_Y=30,BACK_Y=1290;
 const orange=hex(css('--p'),'#f28c28'),ink=hex(css('--a'),'#17202a'),cream='#f4ead6',black='#151515';
 const name=$('#pcPlayer')?.value||players()[0]?.[0]||'Player',label=playerLabel(players().find(x=>x[0]===name)?.[1]||name),displayName=playerName(label).toUpperCase(),number=jerseyNumber(label)===999?'—':String(jerseyNumber(label)),position=($('#pcPosition')?.value.trim()||'').toUpperCase();
 const team=($('#ourTeam')?.textContent.trim()||'TEAM').toUpperCase(),opp=($('#oppTeam')?.textContent.trim()||'OPPONENT').toUpperCase(),ourScore=$('#ourScore')?.textContent||'0',oppScore=$('#oppScore')?.textContent||'0',meta=$('#gameMeta')?.textContent.trim()||'',week=weekFrom(meta),stats=statRows(name);
 const backPhoto=headshot||actionPhoto,brand=await loadImage('./brand-header-gridiron.webp');
 ctx.clearRect(0,0,W,H);ctx.fillStyle='#262626';ctx.fillRect(0,0,W,H);
 // FRONT CARD
 ctx.save();rounded(ctx,CARD_X,FRONT_Y,CARD_W,CARD_H,32);ctx.clip();ctx.fillStyle=cream;ctx.fillRect(CARD_X,FRONT_Y,CARD_W,CARD_H);
 ctx.fillStyle=orange;ctx.fillRect(CARD_X+28,FRONT_Y+28,CARD_W-56,12);
 const px=CARD_X+68,py=FRONT_Y+58,pw=CARD_W-110,ph=CARD_H-128;
 ctx.fillStyle='#d9d0bf';ctx.fillRect(px,py,pw,ph);if(actionPhoto)cover(ctx,actionPhoto,px,py,pw,ph,.42);else{ctx.fillStyle='#b7b09f';ctx.fillRect(px,py,pw,ph);ctx.fillStyle='#6d675d';ctx.font='900 34px Arial Black,sans-serif';ctx.fillText('ADD ACTION PHOTO',px+235,py+500)}
 const fade=ctx.createLinearGradient(0,FRONT_Y+680,0,FRONT_Y+1180);fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(1,'rgba(0,0,0,.24)');ctx.fillStyle=fade;ctx.fillRect(px,FRONT_Y+680,pw,500);
 // left vintage panels
 slant(ctx,CARD_X+20,FRONT_Y+38,340,120,black,54);ctx.fillStyle='#fff';ctx.font='italic 900 66px Arial Black,Impact,sans-serif';ctx.fillText(displayName,CARD_X+55,FRONT_Y+118);ctx.fillStyle=orange;ctx.beginPath();ctx.moveTo(CARD_X+340,FRONT_Y+38);ctx.lineTo(CARD_X+375,FRONT_Y+38);ctx.lineTo(CARD_X+326,FRONT_Y+158);ctx.lineTo(CARD_X+292,FRONT_Y+158);ctx.closePath();ctx.fill();
 slant(ctx,CARD_X+25,FRONT_Y+300,235,155,black,34);ctx.fillStyle=orange;ctx.font='900 76px Arial Black,Impact,sans-serif';ctx.fillText(`#${number}`,CARD_X+50,FRONT_Y+402);
 slant(ctx,CARD_X+25,FRONT_Y+468,235,90,black,34);ctx.fillStyle='#fff';ctx.font='900 38px Arial Black,Impact,sans-serif';fit(ctx,position||'PLAYER',170,38,22);ctx.fillText(position||'PLAYER',CARD_X+48,FRONT_Y+527);
 // side stripe accents
 ctx.save();ctx.translate(CARD_X+920,FRONT_Y+520);ctx.rotate(-.56);for(let i=0;i<4;i++){ctx.fillStyle=i%2?black:orange;ctx.fillRect(0,i*48,58,28)}ctx.restore();
 footballBadge(ctx,CARD_X+730,FRONT_Y+48,220,126,orange,black,cream,week);
 // footer
 paw(ctx,CARD_X+105,FRONT_Y+1090,90,orange);slant(ctx,CARD_X+205,FRONT_Y+1080,690,95,black,-35);ctx.fillStyle='#fff';ctx.font='italic 900 48px Arial Black,Impact,sans-serif';fit(ctx,team,600,48,28);ctx.fillText(team,CARD_X+255,FRONT_Y+1143);ctx.fillStyle=orange;ctx.fillRect(CARD_X+235,FRONT_Y+1160,610,10);
 distress(ctx,CARD_X,FRONT_Y,CARD_W,CARD_H,black,cream);ctx.restore();ctx.strokeStyle='#bdb09b';ctx.lineWidth=5;rounded(ctx,CARD_X,FRONT_Y,CARD_W,CARD_H,32);ctx.stroke();
 // BACK CARD
 ctx.save();rounded(ctx,CARD_X,BACK_Y,CARD_W,CARD_H,32);ctx.clip();ctx.fillStyle=cream;ctx.fillRect(CARD_X,BACK_Y,CARD_W,CARD_H);ctx.fillStyle=orange;ctx.fillRect(CARD_X+26,BACK_Y+26,CARD_W-52,12);
 const hx=CARD_X+58,hy=BACK_Y+54,hw=300,hh=315;ctx.fillStyle=black;ctx.fillRect(hx-8,hy-8,hw+16,hh+16);ctx.fillStyle=cream;ctx.fillRect(hx,hy,hw,hh);if(backPhoto)cover(ctx,backPhoto,hx,hy,hw,hh,.28);else{ctx.fillStyle='#d3c8b4';ctx.fillRect(hx,hy,hw,hh);ctx.fillStyle='#6d675d';ctx.font='900 26px Arial Black,sans-serif';ctx.fillText('HEADSHOT',hx+72,hy+168)}
 const rx=CARD_X+392,rw=590;ctx.fillStyle=orange;ctx.fillRect(rx,hy, rw,112);ctx.fillStyle=black;ctx.font='900 76px Arial Black,Impact,sans-serif';fit(ctx,displayName,390,76,44);ctx.fillText(displayName,rx+20,hy+82);ctx.fillStyle=black;ctx.fillRect(rx,hy+122,rw,64);ctx.fillStyle='#fff';ctx.font='900 36px Arial Black,Impact,sans-serif';ctx.fillText(position||'PLAYER',rx+20,hy+167);ctx.fillStyle=orange;ctx.fillRect(rx,hy+196,rw,66);ctx.fillStyle=black;ctx.font='900 34px Arial Black,Impact,sans-serif';fit(ctx,team,420,34,22);ctx.fillText(team,rx+20,hy+241);ctx.fillStyle=black;ctx.font='900 60px Arial Black,Impact,sans-serif';ctx.fillText(`#${number}`,CARD_X+862,hy+77);
 // score rows
 const scoreY=BACK_Y+395;ctx.fillStyle=orange;ctx.fillRect(CARD_X+58,scoreY,CARD_W-116,58);ctx.fillStyle=black;ctx.font='900 33px Arial Black,Impact,sans-serif';fit(ctx,team,690,33,21);ctx.fillText(team,CARD_X+78,scoreY+40);ctx.textAlign='right';ctx.fillText(String(ourScore),CARD_X+948,scoreY+40);ctx.textAlign='left';ctx.fillStyle=black;ctx.fillRect(CARD_X+58,scoreY+62,CARD_W-116,58);ctx.fillStyle='#fff';fit(ctx,opp,690,31,20);ctx.fillText(opp,CARD_X+78,scoreY+102);ctx.textAlign='right';ctx.fillText(String(oppScore),CARD_X+948,scoreY+102);ctx.textAlign='left';
 // stat table
 const tableX=CARD_X+95,tableY=BACK_Y+545,tableW=CARD_W-190,rowH=53;ctx.strokeStyle=black;ctx.lineWidth=3;ctx.strokeRect(tableX,tableY,tableW,rowH*Math.max(stats.length,7));ctx.font='900 27px Arial Black,Impact,sans-serif';const tableRows=stats.length?stats:[['NO STATS','—']];tableRows.forEach(([k,v],i)=>{const y=tableY+i*rowH;if(i){ctx.beginPath();ctx.moveTo(tableX,y);ctx.lineTo(tableX+tableW,y);ctx.stroke()}ctx.fillStyle=black;ctx.fillText(k,tableX+24,y+36);ctx.textAlign='right';ctx.fillText(v,tableX+tableW-24,y+36);ctx.textAlign='left'});
 // fill empty table lines so the back keeps the same dense collectible look
 for(let i=tableRows.length;i<7;i++){const y=tableY+i*rowH;ctx.beginPath();ctx.moveTo(tableX,y);ctx.lineTo(tableX+tableW,y);ctx.stroke()}
 const bottomY=BACK_Y+980;drawBrand(ctx,brand,CARD_X+70,bottomY,280,150,black,orange);ctx.fillStyle=black;ctx.font='900 17px Arial Black,Impact,sans-serif';ctx.fillText(`PLAYER CARD • WEEK ${week}`,CARD_X+430,bottomY+30);ctx.fillStyle=orange;ctx.fillRect(CARD_X+430,bottomY+46,230,8);ctx.fillStyle=black;ctx.font='italic 700 25px "Comic Sans MS","Marker Felt",cursive';ctx.fillText('SOME KIDS',CARD_X+430,bottomY+91);ctx.fillText('PLAY THE GAME.',CARD_X+430,bottomY+120);ctx.fillText('SOME DADS',CARD_X+430,bottomY+149);ctx.fillText('KEEP THE STATS.',CARD_X+430,bottomY+178);paw(ctx,CARD_X+880,bottomY+82,82,orange);ctx.font='900 18px Arial Black,Impact,sans-serif';ctx.textAlign='center';ctx.fillText(team,CARD_X+880,bottomY+184);ctx.textAlign='left';
 distress(ctx,CARD_X,BACK_Y,CARD_W,CARD_H,black,cream);ctx.restore();ctx.strokeStyle='#bdb09b';ctx.lineWidth=5;rounded(ctx,CARD_X,BACK_Y,CARD_W,CARD_H,32);ctx.stroke();
 await new Promise(r=>canvas.toBlob(b=>{lastBlob=b;lastName=`${name.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'player'}-week-${week}-card.png`;r()},'image/png',.96));$('#pcShare').disabled=!lastBlob;$('#pcSave').disabled=!lastBlob;
}
async function share(){if(!lastBlob)return;const f=new File([lastBlob],lastName,{type:'image/png'});try{if(navigator.canShare?.({files:[f]})){await navigator.share({files:[f]});return}}catch(e){if(e?.name==='AbortError')return}save()}
function save(){if(!lastBlob)return;const u=URL.createObjectURL(lastBlob),a=document.createElement('a');a.href=u;a.download=lastName;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();
