from pathlib import Path

idx=Path('index.html');s=idx.read_text();marker='<script src="./field-position.js"></script>'
block='''<script src="./field-orientation.js"></script>\n<script src="./cloud-conflict.js"></script>\n<script src="./game-lifecycle.js"></script>\n<script src="./voice-workflow.js"></script>\n<script src="./edit-play-model.js"></script>'''
if block not in s:
    if s.count(marker)!=1: raise SystemExit(f'index field-position marker count={s.count(marker)}')
    s=s.replace(marker,marker+'\n'+block,1);idx.write_text(s)
p=Path('field-position.js');f=p.read_text()
if 'SidelineFieldOrientation' not in f: raise SystemExit('quarter-aware field source missing')
a=Path('app.js');x=a.read_text()
if 'id="editDefPD"' not in x: raise SystemExit('defensive Edit Play source integration missing')
if 'async function assertCloudDeleteSafe' not in x:
    anchor='async function syncDeletedCloudPlays(){\n';helper='''async function assertCloudDeleteSafe(table,id,localLabel){\n  const {data,error}=await SB.from(table).select("revision,updated_at,client_updated_at").eq("id",id).maybeSingle();\n  if(error)throw error;if(!data)return;\n  const remoteRevision=Number(data.revision||0),knownRevision=Number(S.cloud?.deleteRevisions?.[`${table}:${id}`]||0);\n  if(knownRevision&&remoteRevision>knownRevision){const msg=`${localLabel} changed in the cloud after this device last saw it — refresh before deleting`;S.cloud.lastSyncError=msg;throw new Error(msg)}\n}\n'''
    if x.count(anchor)!=1: raise SystemExit('deleted-play anchor missing')
    x=x.replace(anchor,helper+anchor,1)
    x=x.replace('const {error}=await SB.from("plays").update({deleted_at:new Date().toISOString()}).eq("id",cloudId);if(error)throw error;','await assertCloudDeleteSafe("plays",cloudId,"Play");\n    const {error}=await SB.from("plays").update({deleted_at:new Date().toISOString()}).eq("id",cloudId);if(error)throw error;',1)
    x=x.replace('const {error}=await SB.from("snap_events").update({active:false}).eq("id",cloudId);if(error)throw error;','await assertCloudDeleteSafe("snap_events",cloudId,"Snap");\n    const {error}=await SB.from("snap_events").update({active:false}).eq("id",cloudId);if(error)throw error;',1)
    x=x.replace('const {error}=await SB.from("games").update({status:"archived"}).eq("id",cloudId);if(error)throw error;','await assertCloudDeleteSafe("games",cloudId,"Game");\n    const {error}=await SB.from("games").update({status:"archived"}).eq("id",cloudId);if(error)throw error;',1)
if 'if(!S.cloud.deleteRevisions)S.cloud.deleteRevisions={};' not in x:
    init='if(!S.cloud.snapHashes)S.cloud.snapHashes={};\n'
    if x.count(init)!=1: raise SystemExit('cloud init anchor missing')
    x=x.replace(init,init+'if(!S.cloud.deleteRevisions)S.cloud.deleteRevisions={};\n',1)
if 'function snapViewGame(){' not in x:
    old='function currentGameSnapCount(playerId){\n  const g=currentGame();'
    if x.count(old)!=1: raise SystemExit('snap history source anchor missing')
    x=x.replace(old,'function snapViewGame(){return currentGame()||selectedStatsGame()||latestGame()}\nfunction currentGameSnapCount(playerId){\n  const g=snapViewGame();',1)
    old='const gameTotal=currentGame()?.snapRecords?.length||0;'
    if x.count(old)!=1: raise SystemExit('snap total source anchor missing')
    x=x.replace(old,'const snapGame=snapViewGame();const gameTotal=snapGame?.snapRecords?.length||0;$("#recordSnapBtn").disabled=!currentGame()||currentGame()?.status==="complete";',1)
    old='const g=currentGame();const total=g&&Array.isArray(g.snapRecords)?g.snapRecords.length:0;'
    if x.count(old)!=1: raise SystemExit('snap render source anchor missing')
    x=x.replace(old,'const g=snapViewGame();const total=g&&Array.isArray(g.snapRecords)?g.snapRecords.length:0;',1)
if 'snap_participants").delete().eq("snap_event_id",id)' not in x:
    old='''else{\n    const {error}=await SB.from("snap_events").update({active:false}).eq("id",id);if(error)throw error;\n    id=await createCloudSnapEvent(payload,cloudGameId);S.cloud.snapIds[r.id]=id;\n  }'''
    new='''else{\n    const {error}=await SB.from("snap_events").update({snap_number:payload.snap_number||1,quarter:payload.quarter,client_created_at:payload.client_created_at,active:true}).eq("id",id);if(error)throw error;\n    const {error:de}=await SB.from("snap_participants").delete().eq("snap_event_id",id);if(de)throw de;\n    for(const localPid of payload.playerIds){const playerId=S.cloud.playerIds?.[localPid];if(!playerId)continue;const {error:pe}=await SB.from("snap_participants").insert({snap_event_id:id,player_id:playerId});if(pe)throw pe}\n  }'''
    if x.count(old)!=1: raise SystemExit('snap sync source anchor missing')
    x=x.replace(old,new,1)
for field,credit in {'passDefendedPlayerId':'pass_defended','interceptionPlayerId':'def_interception','forcedFumblePlayerId':'forced_fumble','fumbleRecoveryPlayerId':'fumble_recovery','defensiveTouchdownPlayerId':'defensive_td'}.items():
    old=f'p.{field}=firstCreditPlayer(c,["{credit}"]);';new=f'p.{field}=firstCreditPlayer(c,["{credit}"])||p.{field}||null;'
    if old in x:x=x.replace(old,new,1)
if 'PlayNumber:p.playCall?.number??""' not in x:
    old='PlaySequence:i+1,\n      Timestamp:'
    if x.count(old)!=1: raise SystemExit('export play sequence anchor missing')
    x=x.replace(old,'PlaySequence:i+1,\n      PlayNumber:p.playCall?.number??"",\n      PlayName:p.playCall?.name||"",\n      Timestamp:',1)
if '{Field:"PlayNumber"' not in x:
    old='{Field:"GameType",Meaning:"regular or playoff"},'
    if x.count(old)!=1: raise SystemExit('export dictionary anchor missing')
    x=x.replace(old,old+'\n  {Field:"PlayNumber",Meaning:"Offensive play-call number selected from the game plan when the play was recorded."},\n  {Field:"PlayName",Meaning:"Offensive play-call name selected from the game plan when the play was recorded."},',1)
score_old='ourScore:Number(g.team_score||0),scoreAdjustment:Number(g.team_score||0)-auto,scoreModelVersion:2,oppScore:Number(g.opponent_score||0)'
score_new='ourScore:(g.status==="final"&&Number(g.team_score||0)===0&&auto>0)?auto:Number(g.team_score||0),scoreAdjustment:(g.status==="final"&&Number(g.team_score||0)===0&&auto>0)?0:Number(g.team_score||0)-auto,scoreModelVersion:2,oppScore:Number(g.opponent_score||0)'
if score_old in x:x=x.replace(score_old,score_new,1)
required=['renderVoiceMissingFollowup(result,transcript)','id="editDefPD"','Newer cloud edit detected — refresh before overwriting','assertCloudDeleteSafe','function snapViewGame(){','snap_participants").delete().eq("snap_event_id",id)','PlayNumber:p.playCall?.number??""','g.status==="final"&&Number(g.team_score||0)===0&&auto>0','team_voice_corrections','viewer_events']
missing=[m for m in required if m not in x]
if missing: raise SystemExit('app integration marker missing: '+', '.join(missing))
a.write_text(x)
# Coach analytics: TDs and either first-down spelling are successful plays.
ca=Path('coach-analytics.js');c=ca.read_text()
old='if(play?.firstDown===true||play?.extras?.includes("First Down"))return true;'
new='if(play?.extras?.includes("TD")||play?.firstDown===true||play?.extras?.includes("First Down")||play?.extras?.includes("1st Down"))return true;'
if new not in c:
    if c.count(old)!=1: raise SystemExit(f'coach success anchor count={c.count(old)}')
    c=c.replace(old,new,1);ca.write_text(c)
sw=Path('service-worker.js');w=sw.read_text();needle="'./field-position.js'";assets="'./field-orientation.js','./cloud-conflict.js','./game-lifecycle.js','./voice-workflow.js','./edit-play-model.js'"
if assets not in w:
    if w.count(needle)!=1: raise SystemExit(f'SW field-position asset count={w.count(needle)}')
    w=w.replace(needle,needle+','+assets,1);sw.write_text(w)
print('Gridiron red integrations verified safely')