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

  function installInteractivePicker(){
    const step=document.getElementById("stepFieldPosition");
    if(!step||step.dataset.interactiveFieldInstalled==="1")return;
    step.dataset.interactiveFieldInstalled="1";

    const sideGrid=step.querySelector(".field-side-grid");
    const yardRow=document.getElementById("fieldYardRow");
    const useBtn=document.getElementById("fieldPositionUse");
    if(!sideGrid||!yardRow||!useBtn)return;

    const style=document.createElement("style");
    style.textContent=`
      #stepFieldPosition .field-side-grid,#stepFieldPosition #fieldYardRow,#stepFieldPosition #fieldPositionUse{display:none!important}
      .ss-field-picker{margin-top:12px}
      .ss-field-help{font-size:12px;color:var(--muted);margin-bottom:9px}
      .ss-field-shell{position:relative;border-radius:18px;overflow:hidden;border:2px solid var(--s);box-shadow:0 8px 22px #0002;background:#0b663c;user-select:none;-webkit-user-select:none;touch-action:none}
      .ss-field-endzones{display:grid;grid-template-columns:56px 1fr 56px;min-height:186px}
      .ss-endzone{display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,var(--p),#10241a);color:#fff;font-weight:950;font-size:10px;letter-spacing:.08em;text-transform:uppercase;padding:6px;writing-mode:vertical-rl;text-orientation:mixed;text-align:center}
      .ss-endzone.right{transform:rotate(180deg)}
      .ss-field{position:relative;overflow:hidden;background:linear-gradient(90deg,#147a4b 0 10%,#116d43 10% 20%,#147a4b 20% 30%,#116d43 30% 40%,#147a4b 40% 50%,#116d43 50% 60%,#147a4b 60% 70%,#116d43 70% 80%,#147a4b 80% 90%,#116d43 90% 100%)}
      .ss-field:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 calc(10% - 1px),#fff9 calc(10% - 1px) 10%);pointer-events:none}
      .ss-field:after{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:#ffffff70;box-shadow:0 -48px 0 #ffffff38,0 48px 0 #ffffff38;pointer-events:none}
      .ss-hash{position:absolute;left:0;right:0;height:1px;top:35%;background:repeating-linear-gradient(90deg,#fff0 0 4.55%,#fff 4.55% 5%,#fff0 5% 9.55%,#fff 9.55% 10%);opacity:.82;pointer-events:none}
      .ss-hash.bottom{top:65%}
      .ss-yard-numbers{position:absolute;inset:0;pointer-events:none}
      .ss-yard-numbers span{position:absolute;top:16px;transform:translateX(-50%);color:#fff;font-size:11px;font-weight:950;text-align:center;text-shadow:0 1px 3px #0008}
      .ss-yard-numbers.bottom span{top:auto;bottom:16px}
      .ss-field-mid{position:absolute;left:50%;top:0;bottom:0;width:3px;background:#fff;transform:translateX(-50%);opacity:.95;pointer-events:none}
      .ss-field-start{position:absolute;top:0;bottom:0;width:3px;background:var(--s);box-shadow:0 0 0 1px #0004;transform:translateX(-50%);display:none;pointer-events:none}
      .ss-field-start-label{position:absolute;top:7px;transform:translateX(-50%);background:#111d;color:#fff;border:1px solid #ffffff55;border-radius:999px;padding:4px 7px;font-size:9px;font-weight:950;display:none;pointer-events:none;white-space:nowrap}
      .ss-football{position:absolute;top:50%;left:25%;width:30px;height:19px;transform:translate(-50%,-50%) rotate(-12deg);border-radius:50%;background:#8a4d24;border:2px solid #fff;box-shadow:0 3px 8px #0007;pointer-events:none;z-index:5}
      .ss-football:before{content:"";position:absolute;left:6px;right:6px;top:7px;height:2px;background:#fff}
      .ss-football:after{content:"";position:absolute;left:13px;top:4px;width:2px;height:8px;background:#fff;box-shadow:-4px 0 0 #fff,4px 0 0 #fff}
      .ss-field-magnifier{position:absolute;z-index:12;min-width:108px;transform:translate(-50%,-112%);background:#fff;color:#102019;border:2px solid var(--s);border-radius:14px;padding:7px 10px;text-align:center;box-shadow:0 8px 24px #0005;display:none;pointer-events:none}
      .ss-field-magnifier strong{display:block;font-size:18px;line-height:1.05;color:var(--p)}
      .ss-field-magnifier small{display:block;font-size:10px;margin-top:3px;color:#68736b}
      .ss-field-selection{margin-top:10px;border:1px solid var(--line);border-radius:13px;background:#f7faf8;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:10px}
      .ss-field-selection strong{display:block;color:var(--p);font-size:17px}.ss-field-selection span{font-size:12px;color:var(--muted);text-align:right}
    `;
    document.head.appendChild(style);

    const picker=document.createElement("div");
    picker.className="ss-field-picker";
    picker.innerHTML=`
      <div class="ss-field-help">Touch the field near the ball, then drag for precision. Release to set the spot.</div>
      <div class="ss-field-shell" id="ssFieldShell" role="slider" aria-label="Ball position" aria-valuemin="0" aria-valuemax="100" tabindex="0">
        <div class="ss-field-endzones">
          <div class="ss-endzone" id="ssOurEndzone">OUR</div>
          <div class="ss-field" id="ssFieldSurface">
            <div class="ss-hash"></div><div class="ss-hash bottom"></div>
            <div class="ss-yard-numbers">
              <span style="left:10%">10</span><span style="left:20%">20</span><span style="left:30%">30</span><span style="left:40%">40</span><span style="left:50%">50</span><span style="left:60%">40</span><span style="left:70%">30</span><span style="left:80%">20</span><span style="left:90%">10</span>
            </div>
            <div class="ss-yard-numbers bottom">
              <span style="left:10%">10</span><span style="left:20%">20</span><span style="left:30%">30</span><span style="left:40%">40</span><span style="left:50%">50</span><span style="left:60%">40</span><span style="left:70%">30</span><span style="left:80%">20</span><span style="left:90%">10</span>
            </div>
            <div class="ss-field-mid"></div>
            <div class="ss-field-start" id="ssFieldStart"></div>
            <div class="ss-field-start-label" id="ssFieldStartLabel">LOS</div>
            <div class="ss-football" id="ssFieldFootball"></div>
            <div class="ss-field-magnifier" id="ssFieldMagnifier"><strong>Our 25</strong><small>Release to set</small></div>
          </div>
          <div class="ss-endzone right" id="ssOppEndzone">OPP</div>
        </div>
      </div>
      <div class="ss-field-selection"><div><small class="muted">Selected spot</small><strong id="ssFieldSelected">Our 25</strong></div><span id="ssFieldDelta"></span></div>
    `;
    useBtn.parentNode.insertBefore(picker,useBtn);

    const surface=document.getElementById("ssFieldSurface");
    const football=document.getElementById("ssFieldFootball");
    const magnifier=document.getElementById("ssFieldMagnifier");
    const selectedText=document.getElementById("ssFieldSelected");
    const deltaText=document.getElementById("ssFieldDelta");
    const startLine=document.getElementById("ssFieldStart");
    const startLabel=document.getElementById("ssFieldStartLabel");
    const shell=document.getElementById("ssFieldShell");
    let selected=25,startSpot=null,dragging=false;

    const teamNames=()=>{
      const ours=(document.getElementById("fieldSideOurs")?.textContent||"Our side").replace(/\s+side$/i,"").trim()||"Our";
      const opp=(document.getElementById("fieldSideOpp")?.textContent||"Opponent side").replace(/\s+side$/i,"").trim()||"Opponent";
      return {ours,opp};
    };
    const possession=()=>/OUR DEFENSE/i.test(document.getElementById("possessionMain")?.textContent||"")?"opp":"ours";
    const mode=()=>/End of play/i.test(document.getElementById("fieldPositionPrompt")?.textContent||"")?"end":"start";
    const parseCurrentSpot=()=>{
      const text=(document.getElementById("fieldPositionText")?.textContent||"").trim();
      const {ours,opp}=teamNames();
      if(/midfield/i.test(text))return 50;
      if(text===`${ours} goal line`)return 0;
      if(text===`${opp} goal line`)return 100;
      if(text.startsWith(`${ours} `)){const n=Number(text.slice(ours.length+1));if(Number.isFinite(n))return n}
      if(text.startsWith(`${opp} `)){const n=Number(text.slice(opp.length+1));if(Number.isFinite(n))return 100-n}
      return null;
    };
    const clampForMode=value=>{
      let n=Math.max(0,Math.min(100,Math.round(Number(value)||0)));
      if(mode()==="start")n=Math.max(1,Math.min(99,n));
      if(mode()==="end"){
        const goal=possession()==="opp"?0:100;
        const ownGoal=goal===100?0:100;
        if(n===ownGoal)n=ownGoal===0?1:99;
      }
      return n;
    };
    const fieldLabel=spot=>{const {ours,opp}=teamNames();return label(spot,ours,opp)};
    const updateVisual=(spot,{showMagnifier=false,x=null}={})=>{
      selected=clampForMode(spot);
      football.style.left=`${selected}%`;
      const text=fieldLabel(selected);
      selectedText.textContent=text;
      shell.setAttribute("aria-valuenow",String(selected));
      shell.setAttribute("aria-valuetext",text);
      if(startSpot!==null&&mode()==="end"){
        const y=yardsBetween(startSpot,selected,possession());
        deltaText.textContent=`${y>0?"+":""}${y} yard${Math.abs(y)===1?"":"s"}`;
      }else deltaText.textContent="";
      if(showMagnifier){
        magnifier.style.display="block";
        magnifier.style.left=`${x==null?selected:x}%`;
        magnifier.querySelector("strong").textContent=text;
      }else magnifier.style.display="none";
    };
    const syncLegacyControls=spot=>{
      const n=clampForMode(spot),poss=possession();
      const buttons=[...document.querySelectorAll("#stepFieldPosition .field-side")];
      const clickSide=side=>buttons.find(b=>b.dataset.side===side)?.click();
      if(n===50)clickSide("midfield");
      else if((poss==="ours"&&n===100)||(poss==="opp"&&n===0))clickSide("endzone");
      else{
        const side=n<50?"ours":"opp";
        const yard=n<50?n:100-n;
        clickSide(side);
        const select=document.getElementById("fieldYardLine");
        if(select)select.value=String(Math.max(1,Math.min(49,yard)));
      }
    };
    const commit=spot=>{
      const n=clampForMode(spot);
      updateVisual(n);
      syncLegacyControls(n);
      if(navigator.vibrate)try{navigator.vibrate(12)}catch(_){ }
      requestAnimationFrame(()=>document.getElementById("fieldPositionUse")?.click());
    };
    const spotFromEvent=e=>{
      const rect=surface.getBoundingClientRect();
      const clientX=e.clientX??e.touches?.[0]?.clientX??rect.left;
      return clampForMode(((clientX-rect.left)/rect.width)*100);
    };
    const magnifierX=e=>{
      const rect=surface.getBoundingClientRect();
      const clientX=e.clientX??rect.left;
      return Math.max(7,Math.min(93,((clientX-rect.left)/rect.width)*100));
    };

    surface.addEventListener("pointerdown",e=>{
      dragging=true;surface.setPointerCapture?.(e.pointerId);e.preventDefault();
      updateVisual(spotFromEvent(e),{showMagnifier:true,x:magnifierX(e)});
    });
    surface.addEventListener("pointermove",e=>{if(!dragging)return;e.preventDefault();updateVisual(spotFromEvent(e),{showMagnifier:true,x:magnifierX(e)})});
    surface.addEventListener("pointerup",e=>{if(!dragging)return;dragging=false;e.preventDefault();commit(spotFromEvent(e))});
    surface.addEventListener("pointercancel",()=>{dragging=false;magnifier.style.display="none"});
    shell.addEventListener("keydown",e=>{
      if(e.key==="ArrowLeft"||e.key==="ArrowDown"){e.preventDefault();updateVisual(selected-1)}
      else if(e.key==="ArrowRight"||e.key==="ArrowUp"){e.preventDefault();updateVisual(selected+1)}
      else if(e.key==="Enter"||e.key===" "){e.preventDefault();commit(selected)}
    });

    const refresh=()=>{
      if(step.classList.contains("hidden"))return;
      const {ours,opp}=teamNames();
      document.getElementById("ssOurEndzone").textContent=ours;
      document.getElementById("ssOppEndzone").textContent=opp;
      const current=parseCurrentSpot();
      startSpot=mode()==="end"?current:null;
      updateVisual(current===null?25:current);
      if(startSpot!==null&&mode()==="end"){
        startLine.style.display="block";startLabel.style.display="block";
        startLine.style.left=`${startSpot}%`;startLabel.style.left=`${startSpot}%`;
      }else{startLine.style.display="none";startLabel.style.display="none"}
      const manual=document.getElementById("fieldPositionManual");
      if(manual)manual.classList.toggle("hidden",mode()!=="end");
    };
    new MutationObserver(refresh).observe(step,{attributes:true,attributeFilter:["class"]});
    new MutationObserver(refresh).observe(document.getElementById("fieldPositionPrompt"),{childList:true,characterData:true,subtree:true});
    refresh();
  }

  if(typeof document!=="undefined"){
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",installInteractivePicker,{once:true});
    else setTimeout(installInteractivePicker,0);
  }

  return {validSpot,spotFromSide,yardsBetween,advanceSpot,label,installInteractivePicker};
});
