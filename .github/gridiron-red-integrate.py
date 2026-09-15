from pathlib import Path

idx=Path('index.html');s=idx.read_text();marker='<script src="./field-position.js"></script>'
block='''<script src="./field-orientation.js"></script>\n<script src="./cloud-conflict.js"></script>\n<script src="./game-lifecycle.js"></script>\n<script src="./voice-workflow.js"></script>\n<script src="./edit-play-model.js"></script>'''
if block not in s:
    if s.count(marker)!=1: raise SystemExit(f'index field-position marker count={s.count(marker)}')
    s=s.replace(marker,marker+'\n'+block,1);idx.write_text(s)
p=Path('field-position.js');f=p.read_text()
old='''  function currentPossession(){return /OUR DEFENSE/i.test(document.getElementById("possessionMain")?.textContent||"")?"opp":"ours"}\n  function visualPercent(spot,poss=currentPossession()){const n=validSpot(spot);if(n===null)return 50;return poss==="opp"?100-n:n}\n  function underlyingFromVisual(percent,poss=currentPossession()){const p=Math.max(0,Math.min(100,percent));return poss==="opp"?100-p:p}'''
new='''  function currentPossession(){return /OUR DEFENSE/i.test(document.getElementById("possessionMain")?.textContent||"")?"opp":"ours"}\n  function currentQuarter(){const raw=document.getElementById("quarterSelect")?.value||document.getElementById("quarter")?.value||document.getElementById("quarterMain")?.textContent||"1";const m=String(raw).match(/([1-4])/);return m?Number(m[1]):1}\n  function visualPercent(spot,poss=currentPossession()){const n=validSpot(spot);if(n===null)return 50;const canonical=poss==="opp"?100-n:n;return window.SidelineFieldOrientation?window.SidelineFieldOrientation.visualPercent(canonical,currentQuarter()):canonical}\n  function underlyingFromVisual(percent,poss=currentPossession()){const p=Math.max(0,Math.min(100,percent));const canonical=window.SidelineFieldOrientation?window.SidelineFieldOrientation.canonicalPercent(p,currentQuarter()):p;return poss==="opp"?100-canonical:canonical}'''
if 'SidelineFieldOrientation' not in f:
    if f.count(old)!=1: raise SystemExit(f'field visual conversion block count={f.count(old)}')
    f=f.replace(old,new,1);p.write_text(f)
a=Path('app.js');x=a.read_text()
old_voice='''  if(!result.ok){$("#voicePlayStatus").textContent=result.error;$("#voicePlayPreview").textContent=`I heard: “${transcript}”`;return}\n  pendingVoiceResult=result;'''
new_voice='''  if(!result.ok){\n    $("#voicePlayStatus").textContent=result.error;$("#voicePlayPreview").textContent=`I heard: “${transcript}”`;\n    renderVoiceMissingFollowup(result,transcript);return\n  }\n  clearVoiceMissingFollowup();\n  pendingVoiceResult=result;'''
if 'renderVoiceMissingFollowup(result,transcript)' not in x:
    if x.count(old_voice)!=1: raise SystemExit(f'voice missing branch count={x.count(old_voice)}')
    x=x.replace(old_voice,new_voice,1)
    anchor='''function voiceSpotWords(spot){const n=Field.validSpot(spot),g=currentGame();if(n===(g?.possession==="opp"?0:100))return "end zone touchdown";if(n===50)return "midfield";if(n<50)return `${S.team.name} ${n}`;return `${g?.opponent||"opponent"} ${100-n}`}\n'''
    helper='''function clearVoiceMissingFollowup(){document.getElementById("voiceMissingFollowup")?.remove()}\nfunction renderVoiceMissingFollowup(result,transcript){clearVoiceMissingFollowup();const modal=document.querySelector("#voicePlayModal .voice-play-modal");if(!modal||!result?.missing)return;const box=document.createElement("div");box.id="voiceMissingFollowup";box.className="voice-preview ready";box.style.marginTop="10px";const add=(label,fn)=>{const b=document.createElement("button");b.type="button";b.className="btn ghost";b.style.margin="4px";b.textContent=label;b.addEventListener("click",fn);box.appendChild(b)};const append=words=>{$("#voiceTranscript").value=`${transcript} ${words}`.trim();clearVoiceMissingFollowup();interpretVoicePlay()};if(result.missing==="playType"){add("Run",()=>append("run"));add("Pass",()=>append("pass"))}else if(["runner","tackler","players"].includes(result.missing)){const roster=[...(S.roster||[])].sort((a,b)=>Number(a.jersey)-Number(b.jersey));roster.forEach(p=>add(`#${p.jersey} ${p.name}`,()=>append(`number ${p.jersey}`)))}else if(result.missing==="passResult"){add("Complete",()=>append("complete"));add("Incomplete",()=>append("incomplete"));add("Intercepted",()=>append("intercepted"))}else return;modal.insertBefore(box,$("#voiceConfirmBtn"));}\n'''
    if x.count(anchor)!=1: raise SystemExit('voice helper anchor missing')
    x=x.replace(anchor,anchor+helper,1)
# Complete special teams editor using fields already understood by the app.
if 'id="editFairCatch"' not in x:
    anchor='''  if(p.type==="Kickoff")html+=`<label>Kickoff result</label><select id="editKickoffResult"><option value="" ${!p.kickoffResult?"selected":""}>Normal</option><option ${p.kickoffResult==="Touchback"?"selected":""}>Touchback</option><option ${p.kickoffResult==="Out of Bounds"?"selected":""}>Out of Bounds</option><option ${p.kickoffResult==="Onside"?"selected":""}>Onside</option></select>`;\n'''
    add='''  if(p.type==="Punt")html+=`<label>Punt outcome</label><select id="editPuntResult"><option value="" ${!p.puntResult?"selected":""}>Normal / Returned</option><option ${p.puntResult==="Touchback"?"selected":""}>Touchback</option><option ${p.puntResult==="Fair Catch"?"selected":""}>Fair Catch</option><option ${p.puntResult==="Out of Bounds"?"selected":""}>Out of Bounds</option><option ${p.puntResult==="Downed"?"selected":""}>Downed</option><option ${p.puntResult==="Blocked"?"selected":""}>Blocked</option></select><label><input type="checkbox" id="editTouchback" ${p.touchback||p.puntResult==="Touchback"?"checked":""}> Touchback</label><label><input type="checkbox" id="editFairCatch" ${p.fairCatch||p.puntResult==="Fair Catch"?"checked":""}> Fair catch</label>`;\n  if(p.type==="Special"&&["Kick Return","Punt Return"].includes(p.sub))html+=`<label>Returner</label><select id="editReturner">${optPlayer(p.player)}</select><label>Return yards</label><input id="editReturnYards" inputmode="numeric" value="${Number(p.yards||0)}"><label><input type="checkbox" id="editReturnFumble" ${p.extras?.includes("Fumble")?"checked":""}> Fumble</label>`;\n'''
    if x.count(anchor)!=1: raise SystemExit('special UI anchor missing')
    x=x.replace(anchor,anchor+add,1)
    try_anchor='''  if(p.type==="Try")html+=`<label>Try type</label><select id="editTryType"><option ${p.tryType==="Kick"?"selected":""}>Kick</option><option ${p.tryType==="Run"?"selected":""}>Run</option><option ${p.tryType==="Pass"?"selected":""}>Pass</option></select><label>Result</label><select id="editTryResult"><option ${p.tryResult==="Good"?"selected":""}>Good</option><option ${p.tryResult==="No Good"?"selected":""}>No Good</option></select><label>Point value</label><input id="editTryValue" inputmode="numeric" value="${Number(p.tryValue||p.points||2)}">`;\n'''
    try_new=try_anchor+'''  if(p.type==="Try"&&p.tryType==="Pass")html+=`<label>Receiver</label><select id="editTryReceiver">${optPlayer(p.player2)}</select>`;\n'''
    if x.count(try_anchor)!=1: raise SystemExit('try receiver anchor missing')
    x=x.replace(try_anchor,try_new,1)
    save='''  if($("#editKickoffResult"))p.kickoffResult=$("#editKickoffResult").value||null;\n'''
    save_add='''  if($("#editPuntResult")){p.puntResult=$("#editPuntResult").value||null;p.touchback=$("#editTouchback").checked;p.fairCatch=$("#editFairCatch").checked;if(p.touchback)p.puntResult="Touchback";else if(p.fairCatch)p.puntResult="Fair Catch";}\n  if($("#editReturner")){p.player=$("#editReturner").value||null;const ry=parseInt($("#editReturnYards").value,10);if(Number.isNaN(ry))return toast("Enter valid return yards");p.yards=ry;const has=$("#editReturnFumble").checked;p.extras=[...(p.extras||[])].filter(v=>v!=="Fumble");if(has)p.extras.push("Fumble");}\n  if($("#editTryReceiver"))p.player2=$("#editTryReceiver").value||null;\n'''
    if x.count(save)!=1: raise SystemExit('special save anchor missing')
    x=x.replace(save,save+save_add,1)
required=['renderVoiceMissingFollowup(result,transcript)','Final confirmation: this historical game cannot be restored','id="editFGDistance"','id="editPenaltyType"','id="editPenaltyPlayer"','id="editPenaltyYards"','id="editPenaltyDown"','id="editPuntResult"','id="editFairCatch"','id="editTryReceiver"','Newer cloud edit detected — refresh before overwriting','team_voice_corrections','viewer_events','sidelineViewerSession']
missing=[m for m in required if m not in x]
if missing: raise SystemExit('app integration marker missing: '+', '.join(missing))
a.write_text(x)
sw=Path('service-worker.js');w=sw.read_text();needle="'./field-position.js'";assets="'./field-orientation.js','./cloud-conflict.js','./game-lifecycle.js','./voice-workflow.js','./edit-play-model.js'"
if assets not in w:
    if w.count(needle)!=1: raise SystemExit(f'SW field-position asset count={w.count(needle)}')
    w=w.replace(needle,needle+','+assets,1);sw.write_text(w)
print('Gridiron red integrations verified safely')