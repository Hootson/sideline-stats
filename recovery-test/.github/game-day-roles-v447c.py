from pathlib import Path

p=Path('app.js')
s=p.read_text()

def rep(old,new):
    global s
    n=s.count(old)
    if n!=1:
        raise SystemExit(f'Expected 1 match, found {n}: {old[:100]}')
    s=s.replace(old,new,1)

marker='function isCloudStatkeeper(){return cloudDeviceRole()==="statkeeper"}\n'
insert='''function isCloudStatkeeper(){return cloudDeviceRole()==="statkeeper"}\n\nasync function resolveCloudDeviceRole(){\n  if(!SB||!cloudUser||!S.cloud?.teamId||!S.cloud?.seasonId)return cloudDeviceRole();\n  try{\n    const {data:team,error:teamErr}=await SB.from("teams").select("owner_user_id").eq("id",S.cloud.teamId).single();\n    if(teamErr)throw teamErr;\n    let role=team?.owner_user_id===cloudUser.id?"statkeeper":"viewer";\n    if(role!=="statkeeper"){\n      const {data:member,error:memberErr}=await SB.from("team_members").select("is_admin,is_statkeeper,status").eq("team_id",S.cloud.teamId).eq("user_id",cloudUser.id).maybeSingle();\n      if(memberErr)throw memberErr;\n      if(member?.status==="active"&&(member.is_admin||member.is_statkeeper))role="statkeeper";\n    }\n    S.cloud.deviceRole=role;\n    persist({skipCloud:true});\n    updateCloudUI();\n    return role;\n  }catch(e){console.warn("Could not resolve cloud role",e);return cloudDeviceRole()}\n}\n'''
rep(marker,insert)

rep('''async function initCloud(){\n  try{\n    if(!window.supabase?.createClient){updateCloudUI("unavailable");return}\n    SB=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});\n    const {data}=await SB.auth.getSession(); cloudUser=data?.session?.user||null; cloudReady=true; if(cloudUser)rebaseCloudHashesV443(); inferCloudDeviceRole();updateCloudUI();if(isCloudStatkeeper())scheduleCloudSync(300);else setTimeout(checkCloudForUpdates,500);setTimeout(startCloudRealtime,800);\n    SB.auth.onAuthStateChange((_event,session)=>{cloudUser=session?.user||null;if(cloudUser)rebaseCloudHashesV443();inferCloudDeviceRole();updateCloudUI();if(isCloudStatkeeper())scheduleCloudSync(250);else setTimeout(checkCloudForUpdates,500);setTimeout(startCloudRealtime,800)});\n  }catch(e){console.error("Cloud init failed",e);updateCloudUI("unavailable")}\n}\n''','''async function initCloud(){\n  try{\n    if(!window.supabase?.createClient){updateCloudUI("unavailable");return}\n    SB=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});\n    const {data}=await SB.auth.getSession();cloudUser=data?.session?.user||null;cloudReady=true;\n    if(cloudUser){rebaseCloudHashesV443();await resolveCloudDeviceRole()}else updateCloudUI();\n    if(isCloudStatkeeper())scheduleCloudSync(300);else setTimeout(checkCloudForUpdates,500);\n    setTimeout(startCloudRealtime,800);\n    SB.auth.onAuthStateChange(async(_event,session)=>{\n      cloudUser=session?.user||null;\n      if(cloudUser){rebaseCloudHashesV443();await resolveCloudDeviceRole()}else updateCloudUI();\n      if(isCloudStatkeeper())scheduleCloudSync(250);else setTimeout(checkCloudForUpdates,500);\n      setTimeout(startCloudRealtime,800);\n    });\n  }catch(e){console.error("Cloud init failed",e);updateCloudUI("unavailable")}\n}\n''')

rep('''    if(!SB||!cloudUser||!cloudLinked()||navigator.onLine===false||cloudPendingCount()>0||cloudSyncRunning||cloudAutoRefreshRunning)return;''','''    if(isCloudStatkeeper()||!SB||!cloudUser||!cloudLinked()||navigator.onLine===false||cloudPendingCount()>0||cloudSyncRunning||cloudAutoRefreshRunning)return;''')
rep('''  if(cloudRemoteCheckRunning||cloudAutoRefreshRunning||!SB||!cloudUser||!cloudLinked()||navigator.onLine===false||cloudPendingCount()>0)return;''','''  if(isCloudStatkeeper()||cloudRemoteCheckRunning||cloudAutoRefreshRunning||!SB||!cloudUser||!cloudLinked()||navigator.onLine===false||cloudPendingCount()>0)return;''')

snap_marker='''$("#recordSnapBtn").addEventListener("click",()=>{\n'''
if s.count(snap_marker)!=1: raise SystemExit('Record snap marker missing')
invite_code='''async function inviteSnapTracker(){\n  const g=currentGame();\n  if(!g)return toast("Open a game first");\n  if(!SB||!cloudUser){openAuth();return toast("Sign in first to invite a snap tracker")}\n  const role=await resolveCloudDeviceRole();\n  if(role!=="statkeeper")return toast("Only the team statkeeper can create this invite");\n  try{\n    await syncCloudNow();\n    const cloudGameId=S.cloud?.gameIds?.[g.id];\n    if(!cloudGameId)throw new Error("This game has not synced to the cloud yet");\n    const {data,error}=await SB.rpc("create_snap_tracker_invite",{p_game_id:cloudGameId,p_expires_hours:24});\n    if(error)throw error;\n    const row=Array.isArray(data)?data[0]:data;\n    if(!row?.token)throw new Error("Invite link was not created");\n    const u=new URL("./snap-tracker.html",location.href);u.searchParams.set("token",row.token);\n    const text=`Track ${S.team.name} player snaps vs ${g.opponent} with this Sideline Stats link.`;\n    if(navigator.share){\n      try{await navigator.share({title:`${S.team.name} Snap Tracker`,text,url:u.href});return}catch(e){if(e?.name==="AbortError")return}\n    }\n    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(u.href);toast("Snap Tracker link copied")}\n    else{prompt("Copy this Snap Tracker link",u.href)}\n  }catch(e){console.error(e);toast(e.message||"Could not create Snap Tracker invite")}\n}\n$("#inviteSnapTrackerBtn")?.addEventListener("click",inviteSnapTracker);\n\n'''
s=s.replace(snap_marker,invite_code+snap_marker,1)
p.write_text(s)

idx=Path('index.html')
t=idx.read_text()
old='''      <button class="btn snap-record-btn" id="recordSnapBtn">Record Snap</button>\n      <button class="btn ghost" id="shareSnapsBtn" style="margin-top:12px">Share Participation Report</button>'''
new='''      <button class="btn snap-record-btn" id="recordSnapBtn">Record Snap</button>\n      <button class="btn ghost" id="inviteSnapTrackerBtn" style="margin-top:12px">Invite Snap Tracker</button>\n      <div class="share-tip">Send a game-only link to a second parent. They can record participation but cannot edit game stats.</div>\n      <button class="btn ghost" id="shareSnapsBtn" style="margin-top:12px">Share Participation Report</button>'''
if t.count(old)!=1: raise SystemExit('Snap buttons block missing')
t=t.replace(old,new,1)
oldv='V4.4.7b • SHARE STATS CLEANUP • GRIDIRON EDITION'
if t.count(oldv)!=1: raise SystemExit('Version label missing')
t=t.replace(oldv,'V4.4.7c • GAME-DAY ROLES • GRIDIRON EDITION',1)
idx.write_text(t)

sw=Path('service-worker.js')
u=sw.read_text()
oldc="const CACHE='sideline-stats-v4-4-7b-share-stats';"
if u.count(oldc)!=1: raise SystemExit('Cache label missing')
u=u.replace(oldc,"const CACHE='sideline-stats-v4-4-7c-game-day-roles';",1)
olda="'./icon.png'];"
if u.count(olda)!=1: raise SystemExit('Asset tail missing')
u=u.replace(olda,"'./icon.png','./snap-tracker.html','./snap-tracker.js'];",1)
sw.write_text(u)
