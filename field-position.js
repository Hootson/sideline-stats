(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.SidelineFieldPosition=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  function validSpot(value){if(value===null||value===undefined||value==="")return null;const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=100?n:null}
  function spotFromSide(side,yard,possession){
    if(side==="midfield")return 50;
    if(side==="endzone")return possession==="opp"?0:100;
    const n=Number(yard);
    if(!Number.isFinite(n)||n<0||n>49)return null;
    return side==="opp"?100-n:n;
  }
  function yardsBetween(start,end,possession){
    const a=validSpot(start),b=validSpot(end);if(a===null||b===null)return null;
    return possession==="opp"?a-b:b-a;
  }
  function advanceSpot(start,yards,possession){
    const a=validSpot(start),y=Number(yards);if(a===null||!Number.isFinite(y))return null;
    return Math.max(0,Math.min(100,a+(possession==="opp"?-y:y)));
  }
  function label(spot,teamName,opponentName){
    const n=validSpot(spot);if(n===null)return "Starting position needed";
    if(n===50)return "Midfield";
    if(n===0)return `${teamName||"Our"} goal line`;
    if(n===100)return `${opponentName||"Opponent"} goal line`;
    return n<50?`${teamName||"Our"} ${n}`:`${opponentName||"Opponent"} ${100-n}`;
  }

  function injectStyles(){
    if(document.getElementById("ssInteractiveFieldStyles"))return;
    const style=document.createElement("style");style.id="ssInteractiveFieldStyles";
    style.textContent=`
      #stepFieldPosition .field-side-grid,#stepFieldPosition #fieldYardRow,#stepFieldPosition #fieldPositionUse{display:none!important}
      .ss-field-picker{margin-top:10px}
      .ss-field-help{font-size:12px;color:var(--muted);margin:0 0 7px}
      .ss-field-shell{position:relative;border-radius:14px;overflow:visible;user-select:none;-webkit-user-select:none;touch-action:none;perspective:700px;margin:2px 3px 8px}
      .ss-field-stage{border:2px solid var(--s);border-radius:13px;overflow:hidden;box-shadow:0 10px 16px #0003,0 2px 0 #0005;transform:perspective(700px) rotateX(7deg);transform-origin:center bottom;background:#0b663c}
      .ss-field-endzones{display:grid;grid-template-columns:42px 1fr 42px;height:98px}
      .ss-endzone{display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#18241d,#07130e);color:#fff;font-weight:950;font-size:9px;letter-spacing:.07em;text-transform:uppercase;padding:4px;writing-mode:vertical-rl;text-orientation:mixed;text-align:center;border-right:1px solid #ffffff55}
      .ss-endzone.right{transform:rotate(180deg);border-right:0;border-left:1px solid #ffffff55}
      .ss-endzone.ours{background:linear-gradient(180deg,var(--p),#111);color:#fff;box-shadow:inset 0 0 0 3px var(--s);text-shadow:0 1px 2px #000}
      .ss-field{position:relative;overflow:hidden;background:linear-gradient(90deg,#147a4b 0 10%,#116d43 10% 20%,#147a4b 20% 30%,#116d43 30% 40%,#147a4b 40% 50%,#116d43 50% 60%,#147a4b 60% 70%,#116d43 70% 80%,#147a4b 80% 90%,#116d43 90% 100%)}
      .ss-field:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 calc(10% - 1px),#ffffffe6 calc(10% - 1px) 10%);pointer-events:none}
      .ss-field:after{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:#ffffff80;box-shadow:0 -25px 0 #ffffff38,0 25px 0 #ffffff38;pointer-events:none}
      .ss-hash{position:absolute;left:0;right:0;height:1px;top:35%;background:repeating-linear-gradient(90deg,#fff0 0 4.55%,#fff 4.55% 5%,#fff0 5% 9.55%,#fff 9.55% 10%);opacity:.9;pointer-events:none}.ss-hash.bottom{top:65%}
      .ss-yard-numbers{position:absolute;inset:0;pointer-events:none}.ss-yard-numbers span{position:absolute;top:8px;transform:translateX(-50%);color:#fff;font-size:9px;font-weight:950;text-shadow:0 1px 2px #000a}.ss-yard-numbers.bottom span{top:auto;bottom:8px}
      .ss-field-mid{position:absolute;left:50%;top:0;bottom:0;width:2px;background:#fff;transform:translateX(-50%);pointer-events:none}
      .ss-field-start{position:absolute;top:0;bottom:0;width:3px;background:var(--s);box-shadow:0 0 0 1px #0005;transform:translateX(-50%);display:none;pointer-events:none;z-index:3}
      .ss-field-start-label{position:absolute;top:4px;transform:translateX(-50%);background:#111e;color:#fff;border-radius:999px;padding:2px 5px;font-size:8px;font-weight:950;display:none;pointer-events:none;white-space:nowrap;z-index:4}
      .ss-football{position:absolute;top:50%;left:25%;width:25px;height:16px;transform:translate(-50%,-50%) rotate(-12deg);border-radius:50%;background:#8a4d24;border:2px solid #fff;box-shadow:0 3px 7px #0008;pointer-events:none;z-index:5}.ss-football:before{content:"";position:absolute;left:5px;right:5px;top:6px;height:2px;background:#fff}.ss-football:after{content:"";position:absolute;left:10px;top:3px;width:2px;height:7px;background:#fff;box-shadow:-3px 0 0 #fff,3px 0 0 #fff}
      .ss-field-selection{margin-top:8px;border:1px solid var(--line);border-radius:12px;background:#f7faf8;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;gap:8px}.ss-field-selection strong{display:block;color:var(--p);font-size:16px}.ss-field-selection span{font-size:12px;color:var(--muted);text-align:right;font-weight:800}
      .ss-field-adjust{display:grid;grid-template-columns:54px 1fr 54px;gap:7px;margin-top:7px}.ss-field-adjust button{border:1px solid var(--line);background:#fff;color:var(--p);border-radius:10px;padding:9px 5px;font-weight:950;font-size:13px}.ss-field-adjust .ss-confirm{background:var(--p);color:#fff;border-color:var(--p);font-size:14px}
      .ss-direction{font-size:10px;font-weight:950;text-align:center;color:var(--muted);margin-top:5px;letter-spacing:.03em}
      #fieldPositionBar.ss-live-field-host{display:block;background:transparent;border:0;padding:0;margin:-2px 0 10px;box-shadow:none}
      #fieldPositionBar.ss-live-field-host>div:not(.ss-live-field),#fieldPositionBar.ss-live-field-host>#correctFieldPosition{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important;padding:0!important;border:0!important}
      .ss-live-field{width:100%;border-radius:13px;background:#fff;border:1px solid var(--line);padding:7px 8px 8px;box-shadow:0 2px 8px #0000000a;cursor:pointer}
      .ss-live-field-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:5px}.ss-live-field-top strong{font-size:12px;color:var(--p)}.ss-live-field-top span{font-size:11px;color:var(--muted);font-weight:800}
      .ss-mini-stage{display:grid;grid-template-columns:30px 1fr 30px;height:58px;border:2px solid var(--s);border-radius:10px;overflow:hidden;box-shadow:0 7px 12px #0002;transform:perspective(650px) rotateX(6deg);transform-origin:center bottom}
      .ss-mini-end{display:flex;align-items:center;justify-content:center;background:#111;color:#fff;font-size:7px;font-weight:950;letter-spacing:.04em;writing-mode:vertical-rl;text-orientation:mixed;text-transform:uppercase}.ss-mini-end.right{transform:rotate(180deg)}.ss-mini-end.ours{background:var(--p);box-shadow:inset 0 0 0 2px var(--s);font-size:8px}
      .ss-mini-surface{position:relative;overflow:hidden;background:linear-gradient(90deg,#147a4b 0 10%,#116d43 10% 20%,#147a4b 20% 30%,#116d43 30% 40%,#147a4b 40% 50%,#116d43 50% 60%,#147a4b 60% 70%,#116d43 70% 80%,#147a4b 80% 90%,#116d43 90% 100%)}.ss-mini-surface:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 calc(10% - 1px),#ffffffbb calc(10% - 1px) 10%)}.ss-mini-surface:after{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:#ffffff80;box-shadow:0 -16px 0 #ffffff35,0 16px 0 #ffffff35}
      .ss-mini-ball{position:absolute;top:50%;width:18px;height:11px;transform:translate(-50%,-50%) rotate(-12deg);border-radius:50%;background:#8a4d24;border:1.5px solid #fff;box-shadow:0 2px 5px #0008;z-index:4}.ss-mini-ball:after{content:"";position:absolute;left:7px;top:2px;width:1px;height:5px;background:#fff}
      .ss-mini-caption{display:flex;justify-content:space-between;gap:8px;margin-top:5px;font-size:11px;font-weight:850;color:var(--text)}.ss-mini-caption span:last-child{color:var(--muted);font-size:10px}
    `;document.head.appendChild(style);
  }

  function teamNames(){
    const ours=(document.getElementById("fieldSideOurs")?.textContent||"Our side").replace(/\s+side$/i,"").trim()||"Our";
    const opp=(document.getElementById("fieldSideOpp")?.textContent||"Opponent side").replace(/\s+side$/i,"").trim()||"Opponent";
    return {ours,opp};
  }
  function currentPossession(){return /OUR DEFENSE/i.test(document.getElementById("possessionMain")?.textContent||"")?"opp":"ours"}
  function visualPercent(spot,poss=currentPossession()){const n=validSpot(spot);if(n===null)return 50;return poss==="opp"?100-n:n}
  function underlyingFromVisual(percent,poss=currentPossession()){const p=Math.max(0,Math.min(100,percent));return poss==="opp"?100-p:p}
  function parseCurrentSpot(){
    const text=(document.getElementById("fieldPositionText")?.textContent||"").trim();const {ours,opp}=teamNames();
    if(/starting position needed/i.test(text))return null;
    if(/midfield/i.test(text))return 50;
    if(text===`${ours} goal line`)return 0;if(text===`${opp} goal line`)return 100;
    if(text.startsWith(`${ours} `)){const n=Number(text.slice(ours.length+1));if(Number.isFinite(n))return n}
    if(text.startsWith(`${opp} `)){const n=Number(text.slice(opp.length+1));if(Number.isFinite(n))return 100-n}
    return null;
  }
  function yardNumbersMarkup(){return `<div class="ss-yard-numbers"><span style="left:10%">10</span><span style="left:20%">20</span><span style="left:30%">30</span><span style="left:40%">40</span><span style="left:50%">50</span><span style="left:60%">40</span><span style="left:70%">30</span><span style="left:80%">20</span><span style="left:90%">10</span></div><div class="ss-yard-numbers bottom"><span style="left:10%">10</span><span style="left:20%">20</span><span style="left:30%">30</span><span style="left:40%">40</span><span style="left:50%">50</span><span style="left:60%">40</span><span style="left:70%">30</span><span style="left:80%">20</span><span style="left:90%">10</span></div>`}

  function installLiveField(){
    const host=document.getElementById("fieldPositionBar");if(!host||host.dataset.liveFieldInstalled==="1")return;host.dataset.liveFieldInstalled="1";host.classList.add("ss-live-field-host");
    const live=document.createElement("div");live.className="ss-live-field";live.setAttribute("role","button");live.setAttribute("tabindex","0");live.setAttribute("aria-label","Set or correct ball position");
    live.innerHTML=`<div class="ss-live-field-top"><strong id="ssLiveSpot">Starting position needed</strong><span id="ssLiveDirection">Tap field to set</span></div><div class="ss-mini-stage"><div class="ss-mini-end" id="ssMiniLeftEnd">OUR</div><div class="ss-mini-surface"><div class="ss-mini-ball" id="ssMiniBall"></div></div><div class="ss-mini-end right" id="ssMiniRightEnd">OPP</div></div><div class="ss-mini-caption"><span id="ssMiniDown">1st & 10</span><span>Tap to correct</span></div>`;
    host.appendChild(live);
    const refresh=()=>{
      const {ours,opp}=teamNames(),poss=currentPossession(),spot=parseCurrentSpot(),left=document.getElementById("ssMiniLeftEnd"),right=document.getElementById("ssMiniRightEnd"),ball=document.getElementById("ssMiniBall");
      if(poss==="ours"){left.textContent=ours;right.textContent=opp;left.classList.add("ours");right.classList.remove("ours")}else{left.textContent=opp;right.textContent=ours;left.classList.remove("ours");right.classList.add("ours")}
      document.getElementById("ssLiveSpot").textContent=spot===null?"Starting position needed":label(spot,ours,opp);
      document.getElementById("ssLiveDirection").textContent=poss==="ours"?`${ours} attacking →`:`${opp} attacking →`;
      document.getElementById("ssMiniDown").textContent=document.getElementById("possessionSub")?.textContent||"";
      ball.style.display=spot===null?"none":"block";if(spot!==null)ball.style.left=`${visualPercent(spot,poss)}%`;
    };
    const open=()=>document.getElementById("correctFieldPosition")?.click();live.addEventListener("click",open);live.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}});
    const watch=id=>{const el=document.getElementById(id);if(el)new MutationObserver(refresh).observe(el,{childList:true,characterData:true,subtree:true})};
    watch("fieldPositionText");watch("possessionMain");watch("possessionSub");refresh();
  }

  function installInteractivePicker(){
    const step=document.getElementById("stepFieldPosition");if(!step||step.dataset.interactiveFieldInstalled==="1")return;step.dataset.interactiveFieldInstalled="1";injectStyles();
    const useBtn=document.getElementById("fieldPositionUse");if(!useBtn)return;
    const picker=document.createElement("div");picker.className="ss-field-picker";
    picker.innerHTML=`<div class="ss-field-help">Drag the football to the spot. You can re-drag or nudge it before confirming.</div><div class="ss-field-shell" id="ssFieldShell" role="slider" aria-label="Ball position" aria-valuemin="0" aria-valuemax="100" tabindex="0"><div class="ss-field-stage"><div class="ss-field-endzones"><div class="ss-endzone" id="ssOurEndzone">OUR</div><div class="ss-field" id="ssFieldSurface"><div class="ss-hash"></div><div class="ss-hash bottom"></div>${yardNumbersMarkup()}<div class="ss-field-mid"></div><div class="ss-field-start" id="ssFieldStart"></div><div class="ss-field-start-label" id="ssFieldStartLabel">LOS</div><div class="ss-football" id="ssFieldFootball"></div></div><div class="ss-endzone right" id="ssOppEndzone">OPP</div></div></div></div><div class="ss-direction" id="ssFieldDirection"></div><div class="ss-field-selection"><div><small class="muted">Selected spot</small><strong id="ssFieldSelected">Our 25</strong></div><span id="ssFieldDelta"></span></div><div class="ss-field-adjust"><button type="button" id="ssFieldMinus">−1</button><button type="button" class="ss-confirm" id="ssFieldConfirm">Use This Position</button><button type="button" id="ssFieldPlus">+1</button></div>`;
    useBtn.parentNode.insertBefore(picker,useBtn);
    const surface=document.getElementById("ssFieldSurface"),football=document.getElementById("ssFieldFootball"),selectedText=document.getElementById("ssFieldSelected"),deltaText=document.getElementById("ssFieldDelta"),startLine=document.getElementById("ssFieldStart"),startLabel=document.getElementById("ssFieldStartLabel"),shell=document.getElementById("ssFieldShell"),confirm=document.getElementById("ssFieldConfirm"),minus=document.getElementById("ssFieldMinus"),plus=document.getElementById("ssFieldPlus");
    let selected=25,startSpot=null,dragging=false,lastTick=null;
    const mode=()=>/End of play/i.test(document.getElementById("fieldPositionPrompt")?.textContent||"")?"end":"start";
    const clampForMode=value=>{let n=Math.max(0,Math.min(100,Math.round(Number(value)||0)));if(mode()==="start")n=Math.max(1,Math.min(99,n));if(mode()==="end"){const goal=currentPossession()==="opp"?0:100,ownGoal=goal===100?0:100;if(n===ownGoal)n=ownGoal===0?1:99}return n};
    const updateVisual=spot=>{selected=clampForMode(spot);const poss=currentPossession(),{ours,opp}=teamNames(),vp=visualPercent(selected,poss);football.style.left=`${vp}%`;const text=label(selected,ours,opp);selectedText.textContent=text;shell.setAttribute("aria-valuenow",String(selected));shell.setAttribute("aria-valuetext",text);if(startSpot!==null&&mode()==="end"){const y=yardsBetween(startSpot,selected,poss);deltaText.textContent=`${y>0?"+":""}${y} yard${Math.abs(y)===1?"":"s"}`}else deltaText.textContent="";if(lastTick!==selected){lastTick=selected;if(navigator.vibrate)try{navigator.vibrate(4)}catch(_){}}};
    const syncLegacyControls=spot=>{const n=clampForMode(spot),poss=currentPossession(),buttons=[...document.querySelectorAll("#stepFieldPosition .field-side")],clickSide=side=>buttons.find(b=>b.dataset.side===side)?.click();if(n===50)clickSide("midfield");else if((poss==="ours"&&n===100)||(poss==="opp"&&n===0))clickSide("endzone");else{const side=n<50?"ours":"opp",yard=n<50?n:100-n;clickSide(side);const select=document.getElementById("fieldYardLine");if(select)select.value=String(Math.max(1,Math.min(49,yard)))}};
    const spotFromEvent=e=>{const rect=surface.getBoundingClientRect(),clientX=e.clientX??rect.left,visual=((clientX-rect.left)/rect.width)*100;return clampForMode(underlyingFromVisual(visual,currentPossession()))};
    const finalize=()=>{syncLegacyControls(selected);if(navigator.vibrate)try{navigator.vibrate(12)}catch(_){ }requestAnimationFrame(()=>useBtn.click())};
    surface.addEventListener("pointerdown",e=>{dragging=true;surface.setPointerCapture?.(e.pointerId);e.preventDefault();updateVisual(spotFromEvent(e))});
    surface.addEventListener("pointermove",e=>{if(!dragging)return;e.preventDefault();updateVisual(spotFromEvent(e))});
    surface.addEventListener("pointerup",e=>{if(!dragging)return;dragging=false;e.preventDefault();updateVisual(spotFromEvent(e))});
    surface.addEventListener("pointercancel",()=>{dragging=false});
    minus.addEventListener("click",()=>updateVisual(selected+(currentPossession()==="opp"?1:-1)));
    plus.addEventListener("click",()=>updateVisual(selected+(currentPossession()==="opp"?-1:1)));
    confirm.addEventListener("click",finalize);
    shell.addEventListener("keydown",e=>{if(e.key==="ArrowLeft"||e.key==="ArrowDown"){e.preventDefault();updateVisual(underlyingFromVisual(visualPercent(selected)-1))}else if(e.key==="ArrowRight"||e.key==="ArrowUp"){e.preventDefault();updateVisual(underlyingFromVisual(visualPercent(selected)+1))}else if(e.key==="Enter"||e.key===" "){e.preventDefault();finalize()}});
    const refresh=()=>{if(step.classList.contains("hidden"))return;const {ours,opp}=teamNames(),poss=currentPossession(),left=document.getElementById("ssOurEndzone"),right=document.getElementById("ssOppEndzone"),current=parseCurrentSpot();if(poss==="ours"){left.textContent=ours;right.textContent=opp;left.classList.add("ours");right.classList.remove("ours")}else{left.textContent=opp;right.textContent=ours;left.classList.remove("ours");right.classList.add("ours")}document.getElementById("ssFieldDirection").textContent=poss==="ours"?`${ours} attacking →`:`${opp} attacking →`;startSpot=mode()==="end"?current:null;updateVisual(current===null?25:current);if(startSpot!==null&&mode()==="end"){const vp=visualPercent(startSpot,poss);startLine.style.display="block";startLabel.style.display="block";startLine.style.left=`${vp}%`;startLabel.style.left=`${vp}%`}else{startLine.style.display="none";startLabel.style.display="none"}const manual=document.getElementById("fieldPositionManual");if(manual)manual.classList.toggle("hidden",mode()!=="end")};
    new MutationObserver(refresh).observe(step,{attributes:true,attributeFilter:["class"]});const prompt=document.getElementById("fieldPositionPrompt");if(prompt)new MutationObserver(refresh).observe(prompt,{childList:true,characterData:true,subtree:true});refresh();
  }

  function install(){
    injectStyles();installLiveField();installInteractivePicker();
    try{document.title="Sideline Stats V4.5.26";const hero=[...document.querySelectorAll(".hero .muted")].find(el=>/V4\.5\.25/i.test(el.textContent||""));if(hero)hero.textContent=hero.textContent.replace(/V4\.5\.25/i,"V4.5.26")}catch(_){ }
  }
  if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else setTimeout(install,0)}
  return {validSpot,spotFromSide,yardsBetween,advanceSpot,label,installInteractivePicker,installLiveField};
});
