from pathlib import Path

idx=Path('index.html');s=idx.read_text()
old_scripts='''<script src="./field-position.js"></script>\n<script src="./field-orientation.js"></script>\n<script src="./cloud-conflict.js"></script>\n<script src="./game-lifecycle.js"></script>\n<script src="./voice-workflow.js"></script>\n<script src="./edit-play-model.js"></script>'''
new_scripts='''<script src="./field-orientation.js"></script>\n<script src="./field-position.js"></script>\n<script src="./cloud-conflict.js"></script>\n<script src="./game-lifecycle.js"></script>\n<script src="./voice-workflow.js"></script>\n<script src="./edit-play-model.js"></script>'''
if new_scripts not in s:
    if s.count(old_scripts)!=1: raise SystemExit(f'index enhancement script block count={s.count(old_scripts)}')
    s=s.replace(old_scripts,new_scripts,1);idx.write_text(s)
p=Path('field-position.js');f=p.read_text()
if 'SidelineFieldOrientation' not in f: raise SystemExit('quarter-aware field source missing')
a=Path('app.js');x=a.read_text()
# Deletion conflict checks need the revision actually observed when cloud state was loaded.
anchor='''    S.cloud.teamHash=simpleHash(buildCloudTeamPayload());for(const p of S.roster)S.cloud.playerHashes[p.id]=simpleHash({season_id:S.cloud.seasonId,jersey_number:String(p.jersey??""),name:p.name||"Player",active:true});'''
replacement='''    S.cloud.deleteRevisions={};for(const g of games)S.cloud.deleteRevisions[`games:${g.id}`]=Number(g.revision||0);for(const p of plays)S.cloud.deleteRevisions[`plays:${p.id}`]=Number(p.revision||0);for(const r of snaps)S.cloud.deleteRevisions[`snap_events:${r.id}`]=Number(r.revision||0);\n    S.cloud.teamHash=simpleHash(buildCloudTeamPayload());for(const p of S.roster)S.cloud.playerHashes[p.id]=simpleHash({season_id:S.cloud.seasonId,jersey_number:String(p.jersey??""),name:p.name||"Player",active:true});'''
if replacement not in x:
    if x.count(anchor)!=1: raise SystemExit(f'deletion revision baseline anchor count={x.count(anchor)}')
    x=x.replace(anchor,replacement,1);a.write_text(x)
required=['renderVoiceMissingFollowup(result,transcript)','id="editDefPD"','Newer cloud edit detected — refresh before overwriting','assertCloudDeleteSafe','S.cloud.deleteRevisions[`games:${g.id}`]','S.cloud.deleteRevisions[`plays:${p.id}`]','S.cloud.deleteRevisions[`snap_events:${r.id}`]','function snapViewGame(){','snap_participants").delete().eq("snap_event_id",id)','PlayNumber:p.playCall?.number??""','g.status==="final"&&Number(g.team_score||0)===0&&auto>0','team_voice_corrections','viewer_events']
missing=[m for m in required if m not in x]
if missing: raise SystemExit('app integration marker missing: '+', '.join(missing))
ca=Path('coach-analytics.js');c=ca.read_text();old='if(play?.firstDown===true||play?.extras?.includes("First Down"))return true;';new='if(play?.extras?.includes("TD")||play?.firstDown===true||play?.extras?.includes("First Down")||play?.extras?.includes("1st Down"))return true;'
if new not in c:
    if c.count(old)!=1: raise SystemExit(f'coach success anchor count={c.count(old)}')
    c=c.replace(old,new,1);ca.write_text(c)
sw=Path('service-worker.js');w=sw.read_text()
if 'function patchAppJs' in w or 'src=src.replace' in w: raise SystemExit('runtime app patching must remain removed')
for asset in ['./app.js','./field-position.js','./field-orientation.js','./cloud-conflict.js','./game-lifecycle.js','./voice-workflow.js','./edit-play-model.js','./coach-analytics.js']:
    if repr(asset) not in w and ('"'+asset+'"') not in w: raise SystemExit('service worker missing '+asset)
print('Gridiron release integrations verified safely')