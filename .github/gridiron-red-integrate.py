from pathlib import Path

idx=Path('index.html');s=idx.read_text();marker='<script src="./field-position.js"></script>'
block='''<script src="./field-orientation.js"></script>\n<script src="./cloud-conflict.js"></script>\n<script src="./game-lifecycle.js"></script>\n<script src="./voice-workflow.js"></script>\n<script src="./edit-play-model.js"></script>'''
if block not in s:
    if s.count(marker)!=1: raise SystemExit(f'index field-position marker count={s.count(marker)}')
    s=s.replace(marker,marker+'\n'+block,1);idx.write_text(s)

p=Path('field-position.js');f=p.read_text()
old='''  function currentPossession(){return /OUR DEFENSE/i.test(document.getElementById("possessionMain")?.textContent||"")?"opp":"ours"}\n  function visualPercent(spot,poss=currentPossession()){const n=validSpot(spot);if(n===null)return 50;return poss==="opp"?100-n:n}\n  function underlyingFromVisual(percent,poss=currentPossession()){const p=Math.max(0,Math.min(100,percent));return poss==="opp"?100-p:p}'''
new='''  function currentPossession(){return /OUR DEFENSE/i.test(document.getElementById("possessionMain")?.textContent||"")?"opp":"ours"}\n  function currentQuarter(){const raw=document.getElementById("quarterSelect")?.value||document.getElementById("quarter")?.value||document.getElementById("quarterMain")?.textContent||"1";const m=String(raw).match(/([1-4])/);return m?Number(m[1]):1}\n  function visualPercent(spot,poss=currentPossession()){const n=validSpot(spot);if(n===null)return 50;const canonical=poss==="opp"?100-n:n;return window.SidelineFieldOrientation?window.SidelineFieldOrientation.visualPercent(canonical,currentQuarter()):canonical}\n  function underlyingFromVisual(percent,poss=currentPossession()){const p=Math.max(0,Math.min(100,percent));const canonical=window.SidelineFieldOrientation?window.SidelineFieldOrientation.canonicalPercent(p,currentQuarter()):p;return poss==="opp"?100-canonical:canonical}'''
# Newer field-position.js already contains the quarter-aware implementation; only patch legacy source.
if 'SidelineFieldOrientation' not in f:
    if f.count(old)!=1: raise SystemExit(f'field visual conversion block count={f.count(old)}')
    f=f.replace(old,new,1);p.write_text(f)

a=Path('app.js');x=a.read_text()
# Voice missing-info integration
old_voice='''  if(!result.ok){$("#voicePlayStatus").textContent=result.error;$("#voicePlayPreview").textContent=`I heard: “${transcript}”`;return}\n  pendingVoiceResult=result;'''
new_voice='''  if(!result.ok){\n    $("#voicePlayStatus").textContent=result.error;$("#voicePlayPreview").textContent=`I heard: “${transcript}”`;\n    renderVoiceMissingFollowup(result,transcript);return\n  }\n  clearVoiceMissingFollowup();\n  pendingVoiceResult=result;'''
if 'renderVoiceMissingFollowup(result,transcript)' not in x:
    if x.count(old_voice)!=1: raise SystemExit(f'voice missing branch count={x.count(old_voice)}')
    x=x.replace(old_voice,new_voice,1)
    anchor='''function voiceSpotWords(spot){const n=Field.validSpot(spot),g=currentGame();if(n===(g?.possession==="opp"?0:100))return "end zone touchdown";if(n===50)return "midfield";if(n<50)return `${S.team.name} ${n}`;return `${g?.opponent||"opponent"} ${100-n}`}\n'''
    helper='''function clearVoiceMissingFollowup(){document.getElementById("voiceMissingFollowup")?.remove()}\nfunction renderVoiceMissingFollowup(result,transcript){clearVoiceMissingFollowup();const modal=document.querySelector("#voicePlayModal .voice-play-modal");if(!modal||!result?.missing)return;const box=document.createElement("div");box.id="voiceMissingFollowup";box.className="voice-preview ready";box.style.marginTop="10px";const add=(label,fn)=>{const b=document.createElement("button");b.type="button";b.className="btn ghost";b.style.margin="4px";b.textContent=label;b.addEventListener("click",fn);box.appendChild(b)};const append=words=>{$("#voiceTranscript").value=`${transcript} ${words}`.trim();clearVoiceMissingFollowup();interpretVoicePlay()};if(result.missing==="playType"){add("Run",()=>append("run"));add("Pass",()=>append("pass"))}else if(["runner","tackler","players"].includes(result.missing)){const roster=[...(S.roster||[])].sort((a,b)=>Number(a.jersey)-Number(b.jersey));roster.forEach(p=>add(`#${p.jersey} ${p.name}`,()=>append(`number ${p.jersey}`)))}else if(result.missing==="passResult"){add("Complete",()=>append("complete"));add("Incomplete",()=>append("incomplete"));add("Intercepted",()=>append("intercepted"))}else return;modal.insertBefore(box,$("#voiceConfirmBtn"));}\n'''
    if x.count(anchor)!=1: raise SystemExit('voice helper anchor missing')
    x=x.replace(anchor,anchor+helper,1)

# Existing app integrations below are intentionally idempotent: the workflow may run after direct feature-branch source improvements.
# Verify the integrated red-feature markers rather than rewriting already-updated blocks.
required=['renderVoiceMissingFollowup(result,transcript)','Final confirmation: this historical game cannot be restored','id="editFGDistance"','Newer cloud edit detected — refresh before overwriting','team_voice_corrections','viewer_events','sidelineViewerSession']
missing=[m for m in required if m not in x]
if missing: raise SystemExit('app integration marker missing: '+', '.join(missing))
a.write_text(x)

sw=Path('service-worker.js');w=sw.read_text();needle="'./field-position.js'";assets="'./field-orientation.js','./cloud-conflict.js','./game-lifecycle.js','./voice-workflow.js','./edit-play-model.js'"
if assets not in w:
    if w.count(needle)!=1: raise SystemExit(f'SW field-position asset count={w.count(needle)}')
    w=w.replace(needle,needle+','+assets,1);sw.write_text(w)
print('Gridiron red integrations verified safely')