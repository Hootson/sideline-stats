const CACHE='sideline-stats-v4-5-31-export-defense-edit';
const ASSETS=['./','./index.html','./styles.css','./field-position.js','./voice-play.js','./coach-analytics.js','./commercial-access.js','./pwa.js','./brand-header.png','./brand-field.png','./icon.png','./snap-tracker.html','./snap-tracker.js','./parent-viewer.html','./parent-viewer.js'];

function patchAppJs(src){
  // Completed games intentionally have no activeGameId. Keep historical snap context read-only.
  src=src.replace('function currentGameSnapCount(playerId){\n  const g=currentGame();','function snapViewGame(){return currentGame()||selectedStatsGame()||latestGame()}\nfunction currentGameSnapCount(playerId){\n  const g=snapViewGame();');
  src=src.replace('const gameTotal=currentGame()?.snapRecords?.length||0;','const snapGame=snapViewGame();const gameTotal=snapGame?.snapRecords?.length||0;$("#recordSnapBtn").disabled=!currentGame()||currentGame()?.status==="complete";');
  src=src.replace('const g=currentGame();const total=g&&Array.isArray(g.snapRecords)?g.snapRecords.length:0;','const g=snapViewGame();const total=g&&Array.isArray(g.snapRecords)?g.snapRecords.length:0;');

  // Reconcile edited snaps in place rather than creating a second row with the same snap number.
  src=src.replace('else{\n    const {error}=await SB.from("snap_events").update({active:false}).eq("id",id);if(error)throw error;\n    id=await createCloudSnapEvent(payload,cloudGameId);S.cloud.snapIds[r.id]=id;\n  }','else{\n    const {error}=await SB.from("snap_events").update({snap_number:payload.snap_number||1,quarter:payload.quarter,client_created_at:payload.client_created_at,active:true}).eq("id",id);if(error)throw error;\n    const {error:de}=await SB.from("snap_participants").delete().eq("snap_event_id",id);if(de)throw de;\n    for(const localPid of payload.playerIds){const playerId=S.cloud.playerIds?.[localPid];if(!playerId)continue;const {error:pe}=await SB.from("snap_participants").insert({snap_event_id:id,player_id:playerId});if(pe)throw pe}\n  }');

  // Preserve valid raw defensive event fields if an older cloud credit row is absent.
  for(const field of ['passDefendedPlayerId','interceptionPlayerId','forcedFumblePlayerId','fumbleRecoveryPlayerId','defensiveTouchdownPlayerId']){
    const credit={passDefendedPlayerId:'pass_defended',interceptionPlayerId:'def_interception',forcedFumblePlayerId:'forced_fumble',fumbleRecoveryPlayerId:'fumble_recovery',defensiveTouchdownPlayerId:'defensive_td'}[field];
    src=src.replace(`p.${field}=firstCreditPlayer(c,["${credit}"]);`,`p.${field}=firstCreditPlayer(c,["${credit}"])||p.${field}||null;`);
  }

  // Include the called play in every raw play export row.
  src=src.replace('PlaySequence:i+1,\n      Timestamp:', 'PlaySequence:i+1,\n      PlayNumber:p.playCall?.number??"",\n      PlayName:p.playCall?.name||"",\n      Timestamp:');
  src=src.replace('{Field:"GameType",Meaning:"regular or playoff"},','{Field:"GameType",Meaning:"regular or playoff"},\n  {Field:"PlayNumber",Meaning:"Offensive play-call number selected from the game plan when the play was recorded."},\n  {Field:"PlayName",Meaning:"Offensive play-call name selected from the game plan when the play was recorded."},');

  // Full defensive editor: tackles plus all event credits and return/yardage fields.
  src=src.replace(/if\(p\.type==="Defense"&&p\.defCredits\)\{let html=.*?scrollIntoView\(\{behavior:"smooth",block:"center"\}\);return;\}/s,
`if(p.type==="Defense"&&p.defCredits){
    const opt=(sel,blank="None")=>\`<option value="">\${blank}</option>\`+playerOptions(sel);
    let html=\`<div class="muted">Defense • \${esc(p.sub)}</div><label>Defender credits</label>\`;
    html+=S.roster.map(r=>{const cur=Number(p.defCredits[r.id]||0);return \`<div class="def-credit-row"><div class="def-credit-player"><span>#\${r.jersey}</span> \${esc(r.name)}</div><button type="button" class="credit-btn edit-def-credit \${cur===0.5?"active":""}" data-id="\${r.id}" data-v="0.5">0.5</button><button type="button" class="credit-btn edit-def-credit \${cur===1?"active":""}" data-id="\${r.id}" data-v="1">1.0</button></div>\`}).join("");
    html+=\`<label>Tackle classification</label><select id="editDefKind"><option value="Tackle" \${p.tackleKind==="Tackle"?"selected":""}>Tackle</option><option value="TFL" \${p.tackleKind==="TFL"?"selected":""}>TFL</option><option value="Sack" \${p.sub==="Sack"?"selected":""}>Sack</option></select>
    <label>Pass defended</label><select id="editDefPD">\${opt(p.passDefendedPlayerId)}</select>
    <label>Interception</label><select id="editDefINT">\${opt(p.interceptionPlayerId)}</select>
    <label>Forced fumble</label><select id="editDefFF">\${opt(p.forcedFumblePlayerId)}</select>
    <label>Fumble recovery</label><select id="editDefFR">\${opt(p.fumbleRecoveryPlayerId)}</select>
    <label>Return yards</label><input id="editDefReturn" inputmode="numeric" value="\${Number(p.returnYards||0)}">
    <label>Defensive touchdown</label><select id="editDefTD">\${opt(p.defensiveTouchdownPlayerId)}</select>
    <label>Play yards</label><input id="editDefYards" inputmode="numeric" value="\${Number(p.yards||0)}">\`;
    $("#editFields").innerHTML=html;$("#editPlayCard").classList.remove("hidden");const temp={...p.defCredits};
    $$(".edit-def-credit").forEach(b=>b.addEventListener("click",()=>{const pid=b.dataset.id,v=Number(b.dataset.v);if(Number(temp[pid])===v){delete temp[pid];b.classList.remove("active")}else{temp[pid]=v;document.querySelectorAll(\`.edit-def-credit[data-id="\${pid}"]\`).forEach(x=>x.classList.remove("active"));b.classList.add("active")}$("#editPlayCard").dataset.defCredits=JSON.stringify(temp)}));
    $("#editPlayCard").dataset.defCredits=JSON.stringify(temp);$("#editPlayCard").scrollIntoView({behavior:"smooth",block:"center"});return;
  }`);

  src=src.replace(/if\(p\.type==="Defense"&&p\.defCredits\)\{const credits=.*?toast\("Play updated"\);return;\}/s,
`if(p.type==="Defense"&&p.defCredits){
    const credits=JSON.parse($("#editPlayCard").dataset.defCredits||"{}");
    p.defCredits=credits;
    const kind=$("#editDefKind")?.value||p.tackleKind||"Tackle";p.tackleKind=kind==="Sack"?"TFL":kind;if(kind==="Sack")p.sub="Sack";else if(p.sub==="Sack")p.sub=kind;
    p.passDefendedPlayerId=$("#editDefPD")?.value||null;p.interceptionPlayerId=$("#editDefINT")?.value||null;p.forcedFumblePlayerId=$("#editDefFF")?.value||null;p.fumbleRecoveryPlayerId=$("#editDefFR")?.value||null;p.defensiveTouchdownPlayerId=$("#editDefTD")?.value||null;
    const ry=parseInt($("#editDefReturn")?.value||"0",10),y=parseInt($("#editDefYards")?.value||"0",10);if(Number.isNaN(ry)||Number.isNaN(y))return toast("Enter valid yards");p.returnYards=ry;p.yards=y;
    p.cloudEditedAt=Date.now();rebuildGameState(g);g.ourScore=displayedOurScore(g);persist();$("#editPlayCard").classList.add("hidden");S.editingPlayId=null;renderLiveGame();toast("Play updated");return;
  }`);
  return src;
}

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  if(url.pathname.endsWith('/app.js')){event.respondWith(fetch(event.request,{cache:'no-store'}).then(async res=>{const text=patchAppJs(await res.text());const patched=new Response(text,{status:res.status,statusText:res.statusText,headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-cache'}});const copy=patched.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return patched}).catch(async()=>{const cached=await caches.match(event.request);if(!cached)return caches.match('./index.html');const text=patchAppJs(await cached.text());return new Response(text,{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-cache'}})}));return;}
  event.respondWith(fetch(event.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return res}).catch(async()=>{const exact=await caches.match(event.request);if(exact)return exact;if(url.pathname.endsWith('/snap-tracker.html'))return caches.match('./snap-tracker.html');if(url.pathname.endsWith('/parent-viewer.html'))return caches.match('./parent-viewer.html');return caches.match('./index.html')}));
});
