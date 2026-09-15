from pathlib import Path

idx=Path('index.html');s=idx.read_text();marker='<script src="./field-position.js"></script>'
block='''<script src="./field-orientation.js"></script>\n<script src="./cloud-conflict.js"></script>\n<script src="./game-lifecycle.js"></script>\n<script src="./voice-workflow.js"></script>\n<script src="./edit-play-model.js"></script>'''
if block not in s:
    if s.count(marker)!=1: raise SystemExit(f'index field-position marker count={s.count(marker)}')
    s=s.replace(marker,marker+'\n'+block,1);idx.write_text(s)

p=Path('field-position.js');f=p.read_text()
old='''  function currentPossession(){return /OUR DEFENSE/i.test(document.getElementById("possessionMain")?.textContent||"")?"opp":"ours"}\n  function visualPercent(spot,poss=currentPossession()){const n=validSpot(spot);if(n===null)return 50;return poss==="opp"?100-n:n}\n  function underlyingFromVisual(percent,poss=currentPossession()){const p=Math.max(0,Math.min(100,percent));return poss==="opp"?100-p:p}'''
new='''  function currentPossession(){return /OUR DEFENSE/i.test(document.getElementById("possessionMain")?.textContent||"")?"opp":"ours"}\n  function currentQuarter(){const raw=document.getElementById("quarterSelect")?.value||document.getElementById("quarter")?.value||document.getElementById("quarterMain")?.textContent||"1";const m=String(raw).match(/([1-4])/);return m?Number(m[1]):1}\n  function visualPercent(spot,poss=currentPossession()){const n=validSpot(spot);if(n===null)return 50;const canonical=poss==="opp"?100-n:n;return window.SidelineFieldOrientation?window.SidelineFieldOrientation.visualPercent(canonical,currentQuarter()):canonical}\n  function underlyingFromVisual(percent,poss=currentPossession()){const p=Math.max(0,Math.min(100,percent));const canonical=window.SidelineFieldOrientation?window.SidelineFieldOrientation.canonicalPercent(p,currentQuarter()):p;return poss==="opp"?100-canonical:canonical}'''
if new not in f:
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
    helper='''function clearVoiceMissingFollowup(){document.getElementById("voiceMissingFollowup")?.remove()}\nfunction renderVoiceMissingFollowup(result,transcript){\n  clearVoiceMissingFollowup();const modal=document.querySelector("#voicePlayModal .voice-play-modal");if(!modal||!result?.missing)return;\n  const box=document.createElement("div");box.id="voiceMissingFollowup";box.className="voice-preview ready";box.style.marginTop="10px";\n  const add=(label,fn)=>{const b=document.createElement("button");b.type="button";b.className="btn ghost";b.style.margin="4px";b.textContent=label;b.addEventListener("click",fn);box.appendChild(b)};\n  const append=words=>{$("#voiceTranscript").value=`${transcript} ${words}`.trim();clearVoiceMissingFollowup();interpretVoicePlay()};\n  if(result.missing==="playType"){add("Run",()=>append("run"));add("Pass",()=>append("pass"))}\n  else if(["runner","tackler","players"].includes(result.missing)){const roster=[...(S.roster||[])].sort((a,b)=>Number(a.jersey)-Number(b.jersey));roster.forEach(p=>add(`#${p.jersey} ${p.name}`,()=>append(`number ${p.jersey}`)))}\n  else if(result.missing==="passResult"){add("Complete",()=>append("complete"));add("Incomplete",()=>append("incomplete"));add("Intercepted",()=>append("intercepted"))}\n  else return;modal.insertBefore(box,$("#voiceConfirmBtn"));\n}\n'''
    if x.count(anchor)!=1: raise SystemExit('voice helper anchor missing')
    x=x.replace(anchor,anchor+helper,1)
    close='''  $("#voiceConflictActions")?.classList.add("hidden");\n}''';close_new='''  $("#voiceConflictActions")?.classList.add("hidden");clearVoiceMissingFollowup();\n}'''
    if x.count(close)<1: raise SystemExit('closeVoicePlay anchor missing')
    x=x.replace(close,close_new,1)

# Duplicate-game prevention before a local game object is created.
old_new='''  const openingKickoff=$("#newOpeningKickoff")?.value||"receive";\n  const initialPossession=openingKickoff==="kick"?"opp":"ours";\n  const g={id:uid(),opponent:opp,opponentLogoData:pendingNewOpponentLogo||null,week:Number($("#newGameWeek").value||1),date:`Week ${$("#newGameWeek").value||1}`,createdAt:Date.now(),location:$("#newLocation").value,gameType:$("#newGameType").value||"regular",status:"live",ourScore:0,scoreAdjustment:0,scoreModelVersion:2,oppScore:0,openingKickoff,initialPossession,initialDown:1,initialDistance:10,initialBallSpot:null,ballSpot:null,down:1,distance:10,possession:initialPossession,quarter:1,gamePlan:planFromNewGameSource(),plays:[],snapRecords:[]};'''
new_new='''  const openingKickoff=$("#newOpeningKickoff")?.value||"receive";\n  const week=Number($("#newGameWeek").value||1),gameType=$("#newGameType").value||"regular";\n  const duplicate=(S.games||[]).find(existing=>existing.status!=="archived"&&Number(existing.week||0)===week&&(existing.gameType||"regular")===gameType&&String(existing.opponent||"").trim().toLowerCase()===opp.toLowerCase());\n  if(duplicate){selectedStatsGameId=duplicate.id;if(confirm(`A Week ${week} game vs ${duplicate.opponent} already exists. Open that game instead?`)){S.activeGameId=duplicate.id;persist();renderGameArea()}return}\n  const initialPossession=openingKickoff==="kick"?"opp":"ours";\n  const g={id:uid(),opponent:opp,opponentLogoData:pendingNewOpponentLogo||null,week,date:`Week ${week}`,createdAt:Date.now(),location:$("#newLocation").value,gameType,status:"live",ourScore:0,scoreAdjustment:0,scoreModelVersion:2,oppScore:0,openingKickoff,initialPossession,initialDown:1,initialDistance:10,initialBallSpot:null,ballSpot:null,down:1,distance:10,possession:initialPossession,quarter:1,gamePlan:planFromNewGameSource(),plays:[],snapRecords:[]};'''
if 'A Week ${week} game vs ${duplicate.opponent} already exists.' not in x:
    if x.count(old_new)!=1: raise SystemExit(f'new game block count={x.count(old_new)}')
    x=x.replace(old_new,new_new,1)

# Stronger deletion confirmation protects completed history and makes destructive scope explicit.
old_del='''    if(!confirm(`Delete the game vs ${g.opponent}? This removes all plays and stats from this game.`))return;\n    S.games=S.games.filter(x=>x.id!==g.id); if(S.activeGameId===g.id)S.activeGameId=null;'''
new_del='''    const scope=(g.plays?.length||0)+(g.snapRecords?.length||0);\n    const warning=g.status==="complete"?`This is a FINAL game. Delete ${g.opponent} and its ${scope} stored play/snap records?`:`Delete the game vs ${g.opponent}? This removes its ${scope} stored play/snap records.`;\n    if(!confirm(warning))return;\n    if(g.status==="complete"&&!confirm("Final confirmation: this historical game cannot be restored from the app after deletion. Continue?"))return;\n    S.games=S.games.filter(x=>x.id!==g.id); if(S.activeGameId===g.id)S.activeGameId=null;'''
if 'Final confirmation: this historical game cannot be restored' not in x:
    if x.count(old_del)!=1: raise SystemExit(f'delete block count={x.count(old_del)}')
    x=x.replace(old_del,new_del,1)

a.write_text(x)

sw=Path('service-worker.js');w=sw.read_text();needle="'./field-position.js'";assets="'./field-orientation.js','./cloud-conflict.js','./game-lifecycle.js','./voice-workflow.js','./edit-play-model.js'"
if assets not in w:
    if w.count(needle)!=1: raise SystemExit(f'SW field-position asset count={w.count(needle)}')
    w=w.replace(needle,needle+','+assets,1);sw.write_text(w)
print('Gridiron field, voice, duplicate-game and deletion safeguards integrated safely')
