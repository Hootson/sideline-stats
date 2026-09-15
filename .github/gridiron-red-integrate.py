from pathlib import Path

idx=Path('index.html');s=idx.read_text();marker='<script src="./field-position.js"></script>'
block='''<script src="./field-orientation.js"></script>\n<script src="./cloud-conflict.js"></script>\n<script src="./game-lifecycle.js"></script>\n<script src="./voice-workflow.js"></script>\n<script src="./edit-play-model.js"></script>'''
if block not in s:
    if s.count(marker)!=1: raise SystemExit(f'index field-position marker count={s.count(marker)}')
    s=s.replace(marker,marker+'\n'+block,1);idx.write_text(s)
p=Path('field-position.js');f=p.read_text()
if 'SidelineFieldOrientation' not in f: raise SystemExit('quarter-aware field source missing')
a=Path('app.js');x=a.read_text()
# Defensive editor source migration is already authoritative on the feature branch.
if 'id="editDefPD"' not in x: raise SystemExit('defensive Edit Play source integration missing')
# Before destructive cloud cleanup, verify that the cloud row has not changed since this device last loaded/synced it.
if 'async function assertCloudDeleteSafe' not in x:
    anchor='''async function syncDeletedCloudPlays(){\n'''
    helper='''async function assertCloudDeleteSafe(table,id,localLabel){\n  const {data,error}=await SB.from(table).select("revision,updated_at,client_updated_at").eq("id",id).maybeSingle();\n  if(error)throw error;if(!data)return;\n  const remoteRevision=Number(data.revision||0),knownRevision=Number(S.cloud?.deleteRevisions?.[`${table}:${id}`]||0);\n  if(knownRevision&&remoteRevision>knownRevision){const msg=`${localLabel} changed in the cloud after this device last saw it — refresh before deleting`;S.cloud.lastSyncError=msg;throw new Error(msg)}\n}\n'''
    if x.count(anchor)!=1: raise SystemExit('deleted-play anchor missing')
    x=x.replace(anchor,helper+anchor,1)
    x=x.replace('''    const {error}=await SB.from("plays").update({deleted_at:new Date().toISOString()}).eq("id",cloudId);if(error)throw error;''','''    await assertCloudDeleteSafe("plays",cloudId,"Play");\n    const {error}=await SB.from("plays").update({deleted_at:new Date().toISOString()}).eq("id",cloudId);if(error)throw error;''',1)
    x=x.replace('''    const {error}=await SB.from("snap_events").update({active:false}).eq("id",cloudId);if(error)throw error;''','''    await assertCloudDeleteSafe("snap_events",cloudId,"Snap");\n    const {error}=await SB.from("snap_events").update({active:false}).eq("id",cloudId);if(error)throw error;''',1)
    x=x.replace('''    const {error}=await SB.from("games").update({status:"archived"}).eq("id",cloudId);if(error)throw error;''','''    await assertCloudDeleteSafe("games",cloudId,"Game");\n    const {error}=await SB.from("games").update({status:"archived"}).eq("id",cloudId);if(error)throw error;''',1)
# Track cloud revisions when mappings are loaded/synced, so destructive actions can compare against a known version.
if 'if(!S.cloud.deleteRevisions)S.cloud.deleteRevisions={};' not in x:
    init='''if(!S.cloud.snapHashes)S.cloud.snapHashes={};\n'''
    if x.count(init)!=1: raise SystemExit('cloud init anchor missing')
    x=x.replace(init,init+'if(!S.cloud.deleteRevisions)S.cloud.deleteRevisions={};\n',1)
required=['renderVoiceMissingFollowup(result,transcript)','id="editPenaltyType"','id="editPuntResult"','id="editTryReceiver"','id="editDefPD"','Newer cloud edit detected — refresh before overwriting','assertCloudDeleteSafe','deleteRevisions','team_voice_corrections','viewer_events']
missing=[m for m in required if m not in x]
if missing: raise SystemExit('app integration marker missing: '+', '.join(missing))
a.write_text(x)
sw=Path('service-worker.js');w=sw.read_text();needle="'./field-position.js'";assets="'./field-orientation.js','./cloud-conflict.js','./game-lifecycle.js','./voice-workflow.js','./edit-play-model.js'"
if assets not in w:
    if w.count(needle)!=1: raise SystemExit(f'SW field-position asset count={w.count(needle)}')
    w=w.replace(needle,needle+','+assets,1);sw.write_text(w)
print('Gridiron red integrations verified safely')