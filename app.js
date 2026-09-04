(function(){
const KEY="sidelineStatsData";
const RECOVERY_KEY="sidelineStatsRecovery";
const MIGRATION_KEYS=["sidelineStatsV23","sidelineStatsV20","sidelineStatsV19","sidelineStatsV18","sidelineStatsV17","sidelineStatsV16","sidelineStatsV15","sidelineStatsV14","sidelineStatsV13","sidelineStatsV12","sidelineStatsV11","sidelineStatsV10","sidelineStatsV09","sidelineStatsV08","sidelineStatsV07","sidelineStatsV06","sidelineStatsV05","sidelineStatsV04","sidelineStatsV03","sidelineStatsV02"];

const SUPABASE_URL="https://eyuvgzhkhcpwtcbmsvct.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_uMOkwO4jyHen4pz4zCkIuQ_Ss-wUf2l";
let SB=null, cloudUser=null, cloudReady=false, cloudRemoteUpdates=false, cloudRemoteCheckRunning=false;
const empty={team:null,roster:[],games:[],activeGameId:null,flow:{},editingPlayId:null,cloud:{teamId:null,seasonId:null,playerIds:{},gameIds:{},playIds:{},playHashes:{},gameHashes:{},creditIds:{},creditHashes:{},penaltyIds:{},penaltyHashes:{},snapIds:{},snapHashes:{},connectedAt:null,lastSyncAt:null,lastSyncError:null,remoteFingerprint:null,hashVersion:2,deviceRole:null}};
let S=load();
if(!S.cloud)S.cloud={teamId:null,seasonId:null,playerIds:{},gameIds:{},playIds:{},playHashes:{},gameHashes:{},connectedAt:null,lastSyncAt:null,lastSyncError:null};
if(!S.cloud.playerIds)S.cloud.playerIds={};
if(!S.cloud.gameIds)S.cloud.gameIds={};
if(!S.cloud.playIds)S.cloud.playIds={};
if(!S.cloud.playHashes)S.cloud.playHashes={};
if(!S.cloud.gameHashes)S.cloud.gameHashes={};
if(!S.cloud.creditIds)S.cloud.creditIds={};
if(!S.cloud.creditHashes)S.cloud.creditHashes={};
if(!S.cloud.penaltyIds)S.cloud.penaltyIds={};
if(!S.cloud.penaltyHashes)S.cloud.penaltyHashes={};
if(!S.cloud.snapIds)S.cloud.snapIds={};
if(!S.cloud.snapHashes)S.cloud.snapHashes={};
if(S.cloud.remoteFingerprint===undefined)S.cloud.remoteFingerprint=null;
if(S.cloud.deviceRole===undefined)S.cloud.deviceRole=null;
if(S.cloud.hashVersion===undefined)S.cloud.hashVersion=1;
let statsScope="game";
let selectedStatsGameId=null;
let pendingNewOpponentLogo=null;
let pendingEditOpponentLogo=undefined;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

function load(){
  try{
    let raw=localStorage.getItem(KEY);
    if(!raw){
      for(const k of MIGRATION_KEYS){raw=localStorage.getItem(k);if(raw)break}
      if(raw)localStorage.setItem(KEY,raw);
    }
    return raw?Object.assign({},empty,JSON.parse(raw)):JSON.parse(JSON.stringify(empty));
  }catch(e){
    try{
      const recovery=localStorage.getItem(RECOVERY_KEY);
      return recovery?Object.assign({},empty,JSON.parse(recovery)):JSON.parse(JSON.stringify(empty));
    }catch(_){return JSON.parse(JSON.stringify(empty))}
  }
}
function persist(opts={}){
  try{
    const current=localStorage.getItem(KEY);
    if(current)localStorage.setItem(RECOVERY_KEY,current);
    localStorage.setItem(KEY,JSON.stringify(S));
    if(typeof updateCloudUI==="function")updateCloudUI();
    if(!opts.skipCloud && typeof scheduleCloudSync==="function" && cloudDeviceRole()!=="viewer")scheduleCloudSync();
  }catch(e){console.error("Save failed",e);toast("Could not save data")}
}

function inferCloudDeviceRole(){
  if(!S.cloud?.teamId||!S.cloud?.seasonId)return null;
  if(S.cloud.deviceRole==="statkeeper"||S.cloud.deviceRole==="viewer")return S.cloud.deviceRole;
  const gamePairs=Object.entries(S.cloud.gameIds||{});
  const playerPairs=Object.entries(S.cloud.playerIds||{});
  const playPairs=Object.entries(S.cloud.playIds||{});
  const hasMappedLocalIds=[...gamePairs,...playerPairs,...playPairs].some(([localId,cloudId])=>localId&&cloudId&&localId!==cloudId);
  S.cloud.deviceRole=hasMappedLocalIds?"statkeeper":"viewer";
  try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}
  return S.cloud.deviceRole;
}
function cloudDeviceRole(){return inferCloudDeviceRole()||"viewer"}
function isCloudStatkeeper(){return cloudDeviceRole()==="statkeeper"}

let cloudRealtimeChannel=null,cloudRealtimeTimer=null;

function stopCloudRealtime(){
  if(cloudRealtimeTimer){clearTimeout(cloudRealtimeTimer);cloudRealtimeTimer=null}
  if(cloudRealtimeChannel&&SB){try{SB.removeChannel(cloudRealtimeChannel)}catch(e){}}
  cloudRealtimeChannel=null;
}
function queueRealtimeRefresh(){
  if(cloudRealtimeTimer)clearTimeout(cloudRealtimeTimer);
  cloudRealtimeTimer=setTimeout(async()=>{
    cloudRealtimeTimer=null;
    if(!SB||!cloudUser||!cloudLinked()||navigator.onLine===false||cloudPendingCount()>0||cloudSyncRunning||cloudAutoRefreshRunning)return;
    cloudAutoRefreshRunning=true;
    try{await loadTeamFromCloud({refresh:true,auto:true})}
    catch(e){console.warn("Realtime refresh failed",e)}
    finally{cloudAutoRefreshRunning=false}
  },1800);
}
function startCloudRealtime(){
  stopCloudRealtime();
  if(!SB||!cloudUser||!cloudLinked())return;
  const gameIds=Object.values(S.cloud?.gameIds||{}).filter(Boolean);
  if(!gameIds.length)return;
  let ch=SB.channel(`sideline-live-${S.cloud.teamId}-${Date.now()}`);
  ch=ch.on('postgres_changes',{event:'*',schema:'public',table:'games'},queueRealtimeRefresh);
  for(const gid of gameIds){
    ch=ch.on('postgres_changes',{event:'*',schema:'public',table:'plays',filter:`game_id=eq.${gid}`},queueRealtimeRefresh);
    ch=ch.on('postgres_changes',{event:'*',schema:'public',table:'penalties',filter:`game_id=eq.${gid}`},queueRealtimeRefresh);
    ch=ch.on('postgres_changes',{event:'*',schema:'public',table:'snap_events',filter:`game_id=eq.${gid}`},queueRealtimeRefresh);
  }
  cloudRealtimeChannel=ch.subscribe(status=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')console.warn('Realtime channel',status)});
}

async function initCloud(){
  try{
    if(!window.supabase?.createClient){updateCloudUI("unavailable");return}
    SB=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data}=await SB.auth.getSession(); cloudUser=data?.session?.user||null; cloudReady=true; if(cloudUser)rebaseCloudHashesV443(); inferCloudDeviceRole();updateCloudUI();if(isCloudStatkeeper())scheduleCloudSync(300);else setTimeout(checkCloudForUpdates,500);setTimeout(startCloudRealtime,800);
    SB.auth.onAuthStateChange((_event,session)=>{cloudUser=session?.user||null;if(cloudUser)rebaseCloudHashesV443();inferCloudDeviceRole();updateCloudUI();if(isCloudStatkeeper())scheduleCloudSync(250);else setTimeout(checkCloudForUpdates,500);setTimeout(startCloudRealtime,800)});
  }catch(e){console.error("Cloud init failed",e);updateCloudUI("unavailable")}
}
function cloudLinked(){return !!(teamExists()&&S.cloud?.teamId&&S.cloud?.seasonId)}
function updateCloudUI(force){
  const dot=$("#cloudDot"), text=$("#cloudStatusText"), meta=$("#cloudMeta"), acct=$("#cloudAccountBtn"); if(!dot||!text)return;
  dot.className="cloud-dot"; acct?.classList.remove("connected");
  $("#cloudSignInBtn")?.classList.toggle("hidden",!!cloudUser); $("#cloudSignOutBtn")?.classList.toggle("hidden",!cloudUser);
  $("#cloudConnectTeamBtn")?.classList.toggle("hidden",!cloudUser||!teamExists()||cloudLinked()); $("#cloudLoadTeamBtn")?.classList.toggle("hidden",!cloudUser||cloudLinked()); $("#cloudRefreshBtn")?.classList.toggle("hidden",!cloudUser||!cloudLinked());
  if(force==="unavailable"){dot.classList.add("warn");text.textContent="Local mode";meta.textContent="Cloud library unavailable. Game tracking still works offline.";return}
  if(!cloudUser){text.textContent="Local mode";meta.textContent="Your existing data stays on this device until you sign in."; if(acct)acct.textContent="☁ Account";return}
  acct?.classList.add("connected"); if(acct)acct.textContent="☁ Connected";
  if(cloudLinked()){
    const pending=cloudPendingCount();
    if(pending>0){dot.classList.add("warn");text.textContent=`Cloud connected — ${pending} pending`;}
    else if(cloudRemoteUpdates){dot.classList.add("warn");text.textContent="Cloud has updates";}
    else{dot.classList.add("on");text.textContent="Cloud synced";}
    const rb=$("#cloudRefreshBtn");if(rb)rb.textContent=cloudRemoteUpdates?"Load Updates":"Refresh Cloud";
    const when=S.cloud?.lastSyncAt?` • Last sync ${new Date(S.cloud.lastSyncAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`:"";
    const err=S.cloud?.lastSyncError?` • Sync paused: ${S.cloud.lastSyncError}`:"";
    const pendingDetail=pending>0?` • Pending: ${cloudPendingItems().slice(0,3).join(", ")}${pending>3?` +${pending-3} more`:""}`:"";
    meta.textContent=`${cloudUser.email||"Signed in"} • Games, stats, penalties + snaps are local-first and sync automatically${when}${pendingDetail}${err}`;
  }
  else{dot.classList.add("warn");text.textContent="Signed in — team not connected";meta.textContent=`${cloudUser.email||"Signed in"} • Connect this team or load one already stored in the cloud.`}
}
function openAuth(){if(cloudUser){go("setup");return}$("#authModal").classList.remove("hidden");setTimeout(()=>$("#authEmail")?.focus(),50)}
function closeAuth(){$("#authModal").classList.add("hidden")}
async function authSignIn(){
  if(!SB)return toast("Cloud connection is not ready"); const email=$("#authEmail").value.trim(),password=$("#authPassword").value;
  if(!email||!password)return toast("Enter email and password"); $("#authMessage").textContent="Signing in…";
  const {error}=await SB.auth.signInWithPassword({email,password}); if(error){$("#authMessage").textContent=error.message;return}
  closeAuth();toast("Signed in");
}
async function authCreate(){
  if(!SB)return toast("Cloud connection is not ready"); const email=$("#authEmail").value.trim(),password=$("#authPassword").value;
  if(!email||password.length<6)return toast("Use an email and password of at least 6 characters"); $("#authMessage").textContent="Creating account…";
  const redirectTo=(location.hostname==="localhost"||location.hostname==="127.0.0.1")?location.origin+location.pathname:"https://hootson.github.io/sideline-stats/";
  const {data,error}=await SB.auth.signUp({email,password,options:{emailRedirectTo:redirectTo}}); if(error){$("#authMessage").textContent=error.message;return}
  if(data?.session){closeAuth();toast("Account created") } else $("#authMessage").textContent="Account created. Check your email to confirm it, then sign in here.";
}
async function cloudSignOut(){if(!SB)return;await SB.auth.signOut();cloudUser=null;updateCloudUI();toast("Signed out — local data remains safe")}
function localPossession(v){return v==="opponent"?"opp":"ours"}
function cloneJson(v){return JSON.parse(JSON.stringify(v??{}))}
function firstCreditPlayer(credits,types){for(const t of types){const c=credits.find(x=>x.credit_type===t&&Number(x.value)!==0);if(c)return c.player_id}return null}
function restorePlayFromCloud(row,credits,penalty){
  const raw=cloneJson(row.event_data?.raw||{});
  const p=Object.keys(raw).length?raw:{type:row.play_type||"Play",sub:row.subtype||null,yards:row.yards??null,extras:[]};
  p.id=row.id;p.type=p.type||row.play_type||"Play";p.sub=p.sub??row.subtype??null;p.yards=p.yards??row.yards??null;p.quarter=Number(row.quarter||p.quarter||1);p.ts=p.ts||Date.parse(row.client_created_at||row.created_at||new Date().toISOString());p.cloudEditedAt=Date.parse(row.client_updated_at||row.updated_at||row.client_created_at||new Date().toISOString());p.cloudRevision=Number(row.revision||1);
  p.stateBefore={...(p.stateBefore||{}),possession:localPossession(row.state_before?.possession||row.possession),down:row.state_before?.down??row.down??1,distance:row.state_before?.distance??row.distance??10};
  p.stateAfter={...(p.stateAfter||{}),possession:localPossession(row.state_after?.possession||row.possession),down:row.state_after?.down??1,distance:row.state_after?.distance??10};
  const c=credits||[];
  if(p.type==="Rush")p.player=firstCreditPlayer(c,["rush_attempt"]);
  else if(p.type==="Pass"){p.player=firstCreditPlayer(c,["pass_attempt","qb_sacked"]);p.player2=firstCreditPlayer(c,["target"])}
  else if(p.type==="Defense"){
    const d={};for(const x of c.filter(x=>["tackle","tfl","sack"].includes(x.credit_type)&&Number(x.value)!==0))d[x.player_id]=Number(x.value);if(Object.keys(d).length)p.defCredits=d;
    p.passDefendedPlayerId=firstCreditPlayer(c,["pass_defended"]);p.interceptionPlayerId=firstCreditPlayer(c,["def_interception"]);p.forcedFumblePlayerId=firstCreditPlayer(c,["forced_fumble"]);p.fumbleRecoveryPlayerId=firstCreditPlayer(c,["fumble_recovery"]);p.defensiveTouchdownPlayerId=firstCreditPlayer(c,["defensive_td"]);
  }else if(p.type==="Special")p.player=firstCreditPlayer(c,["kick_return","punt_return","st_forced_fumble","st_fumble_recovery"]);
  else if(p.type==="Kickoff")p.player=firstCreditPlayer(c,["kickoff"]);
  else if(p.type==="Kickoff Return")p.player=firstCreditPlayer(c,["kick_return"]);
  else if(p.type==="Punt")p.player=firstCreditPlayer(c,["punt"]);
  else if(p.type==="Field Goal")p.player=firstCreditPlayer(c,["field_goal_attempt"]);
  else if(p.type==="Try"){p.player=firstCreditPlayer(c,["try_kick_attempt","try_run_attempt","try_pass_attempt"]);p.player2=firstCreditPlayer(c,["try_pass_reception"])}
  if(p.type==="Penalty"){p.penaltyPlayer=penalty?.player_id||"UNKNOWN";p.penaltyType=penalty?.penalty_type||p.penaltyType||"Other";p.penaltyYards=penalty?.yards??p.penaltyYards??0;const rev={replay_same:"replay",next_down:"next",automatic_first:"automatic1st",loss_of_down:"loss"};p.penaltyDownResult=rev[penalty?.down_result]||p.penaltyDownResult||"replay"}
  return p;
}
async function chooseCloudTeam(){
  const {data,error}=await SB.from("teams").select("id,name,grade,primary_color,accent_color,logo_data,timezone,created_at,updated_at").order("created_at",{ascending:true});if(error)throw error;if(!data?.length)throw new Error("No cloud teams found for this account");if(data.length===1)return data[0];
  const lines=data.map((t,i)=>`${i+1}. ${t.name}${t.grade?` — ${t.grade}`:""}`).join("\n");const ans=prompt(`Choose a team to load:\n\n${lines}\n\nEnter 1-${data.length}`);if(ans===null)return null;const n=Number(ans);if(!Number.isInteger(n)||n<1||n>data.length)throw new Error("That team number was not valid");return data[n-1];
}
async function loadTeamFromCloud(options={}){
  if(!SB||!cloudUser)return openAuth();if(navigator.onLine===false)return toast("Connect to the internet to load cloud data");
  const refreshing=!!options.refresh, autoRefresh=!!options.auto;
  const priorScreen=$('.screen.active')?.dataset?.screen||"setup";
  if(!refreshing&&teamExists()&&!confirm("Load a cloud team on this device? This will replace the current local team, roster and games. Export a backup first if you need to keep them."))return;
  const btn=refreshing?$("#cloudRefreshBtn"):$("#cloudLoadTeamBtn");if(btn){btn.disabled=true;btn.textContent=refreshing?"Refreshing…":"Loading…"}
  const priorActiveCloudId=S.activeGameId?(S.cloud?.gameIds?.[S.activeGameId]||S.activeGameId):null;
  try{
    let team=options.team||null;
    if(!team&&refreshing&&S.cloud?.teamId){const q=await SB.from("teams").select("id,name,grade,primary_color,accent_color,logo_data,timezone,created_at,updated_at").eq("id",S.cloud.teamId).single();if(q.error)throw q.error;team=q.data}
    if(!team)team=await chooseCloudTeam();if(!team)return;
    const {data:seasons,error:se}=await SB.from("seasons").select("*").eq("team_id",team.id).order("created_at",{ascending:false});if(se)throw se;const season=seasons?.find(x=>x.status==="active")||seasons?.[0];if(!season)throw new Error("This cloud team has no season yet");
    const [pr,gr]=await Promise.all([SB.from("players").select("*").eq("season_id",season.id).order("created_at"),SB.from("games").select("*").eq("season_id",season.id).order("created_at")]);if(pr.error)throw pr.error;if(gr.error)throw gr.error;
    const players=pr.data||[],games=gr.data||[],gameIds=games.map(x=>x.id);
    let plays=[],credits=[],penalties=[],snaps=[],snapParts=[];
    if(gameIds.length){const [a,b,c]=await Promise.all([SB.from("plays").select("*").in("game_id",gameIds).is("deleted_at",null).order("sequence"),SB.from("penalties").select("*").in("game_id",gameIds).eq("accepted",true),SB.from("snap_events").select("*").in("game_id",gameIds).eq("active",true).order("snap_number")]);if(a.error)throw a.error;if(b.error)throw b.error;if(c.error)throw c.error;plays=a.data||[];penalties=b.data||[];snaps=c.data||[];
      const playIds=plays.map(x=>x.id);if(playIds.length){const q=await SB.from("play_credits").select("*").in("play_id",playIds);if(q.error)throw q.error;credits=q.data||[]}
      const snapIds=snaps.map(x=>x.id);if(snapIds.length){const q=await SB.from("snap_participants").select("*").in("snap_event_id",snapIds);if(q.error)throw q.error;snapParts=q.data||[]}
    }
    const roster=players.filter(x=>x.active!==false).map(x=>({id:x.id,jersey:x.jersey_number??"",name:x.name||"Player",snaps:0}));
    const localGames=games.map(g=>{const gp=plays.filter(x=>x.game_id===g.id).sort((a,b)=>a.sequence-b.sequence).map(r=>restorePlayFromCloud(r,credits.filter(c=>c.play_id===r.id&&c.metadata?.active!==false),penalties.find(q=>q.play_id===r.id)));const sr=snaps.filter(x=>x.game_id===g.id).sort((a,b)=>a.snap_number-b.snap_number).map(x=>({id:x.id,ts:x.client_created_at?Date.parse(x.client_created_at):Date.parse(x.created_at),quarter:Number(x.quarter||1),playerIds:snapParts.filter(q=>q.snap_event_id===x.id).map(q=>q.player_id)}));const auto=gp.reduce((sum,p)=>sum+pointsFromPlay(p),0);const firstBefore=gp[0]?.stateBefore;return {id:g.id,opponent:g.opponent_name||"Opponent",opponentLogoData:g.opponent_logo_data||null,week:Number(g.week_number||1),date:`Week ${Number(g.week_number||1)}`,location:g.location_type||"home",gameType:g.game_type||"regular",status:g.status==="final"?"complete":(g.status||"live"),ourScore:Number(g.team_score||0),scoreAdjustment:Number(g.team_score||0)-auto,scoreModelVersion:2,oppScore:Number(g.opponent_score||0),openingKickoff:g.opening_kickoff||"receive",initialPossession:firstBefore?.possession||((g.opening_kickoff||"receive")==="kick"?"opp":"ours"),initialDown:1,initialDistance:10,down:Number(g.current_down||1),distance:Number(g.current_distance||10),possession:localPossession(g.possession||"ours"),quarter:Number(g.current_quarter||1),plays:gp,snapRecords:sr};});
    const cloud={teamId:team.id,seasonId:season.id,playerIds:Object.fromEntries(players.map(x=>[x.id,x.id])),gameIds:Object.fromEntries(games.map(x=>[x.id,x.id])),playIds:Object.fromEntries(plays.map(x=>[x.id,x.id])),playHashes:{},gameHashes:{},creditIds:{},creditHashes:{},penaltyIds:{},penaltyHashes:{},snapIds:Object.fromEntries(snaps.map(x=>[x.id,x.id])),snapHashes:{},connectedAt:new Date().toISOString(),lastSyncAt:new Date().toISOString(),lastSyncError:null,remoteFingerprint:fingerprintLoadedCloudSnapshot(team,players,games,plays,credits,penalties,snaps,snapParts),hashVersion:2,deviceRole:"viewer"};
    S={team:{name:team.name,grade:team.grade||"5th Grade",season:season.name||String(season.season_year||"Season"),primary:team.primary_color||"#177b46",secondary:team.accent_color||"#f0b33b",logoData:team.logo_data||null},roster,games:localGames,activeGameId:(refreshing&&priorActiveCloudId&&localGames.some(x=>x.id===priorActiveCloudId))?priorActiveCloudId:null,flow:{},editingPlayId:null,cloud};
    for(const p of plays){const lp=localGames.flatMap(x=>x.plays).find(x=>x.id===p.id);if(!lp)continue;const g=localGames.find(x=>x.id===p.game_id);const idx=g.plays.findIndex(x=>x.id===p.id);S.cloud.playHashes[p.id]=simpleHash(buildCloudPlayPayload(g,lp,idx,g.id));for(const c of buildCloudCredits(lp)){const row=credits.find(x=>x.play_id===p.id&&x.player_id===c.playerLocalId&&x.credit_type===c.credit_type&&x.metadata?.active!==false);if(row){const key=creditKey(lp.id,c);S.cloud.creditIds[key]=row.id;S.cloud.creditHashes[key]=simpleHash(c)}}const pen=penalties.find(x=>x.play_id===p.id);if(pen){S.cloud.penaltyIds[lp.id]=pen.id;S.cloud.penaltyHashes[lp.id]=simpleHash(buildCloudPenaltyPayload(g,lp,g.id,p.id))}}
    for(const g of localGames)S.cloud.gameHashes[g.id]=simpleHash(buildCloudGamePayload(g));for(const g of localGames)(g.snapRecords||[]).forEach((r,i)=>S.cloud.snapHashes[r.id]=simpleHash(buildCloudSnapPayload(g,r,i,g.id)));
    cloudRemoteUpdates=false;
    persist({skipCloud:true});normalizeRoster();normalizeGames();syncChrome();populateSetup();initializeSnapSelections();renderRoster();renderGameArea();renderSnaps();renderStats();updateCloudUI();
    go(refreshing?priorScreen:"setup");
    if(!autoRefresh)toast(refreshing?"Latest cloud changes loaded":"Cloud team loaded on this device");
    // Cloud-loaded devices are viewers; never push a restored snapshot back to the database.
    setTimeout(checkCloudForUpdates,1200);startCloudRealtime();
  }catch(e){console.error("Cloud restore failed",e);toast(e?.message||"Could not load cloud team")}
  finally{if(btn){btn.disabled=false;btn.textContent=refreshing?"Refresh Cloud":"Load Cloud Team"}updateCloudUI()}
}

async function refreshFromCloud(){
  if(!cloudLinked())return toast("Connect or load a cloud team first");
  if(navigator.onLine===false)return toast("Connect to the internet to refresh");
  const pending=cloudPendingCount();
  if(pending>0){const detail=cloudPendingItems().slice(0,2).join(", ");return toast(`${pending} local change${pending===1?"":"s"} pending${detail?`: ${detail}`:""}`)};
  await loadTeamFromCloud({refresh:true});cloudRemoteUpdates=false;updateCloudUI();
}


async function connectTeamToCloud(){
  if(!SB||!cloudUser)return openAuth(); if(!teamExists())return toast("Create your team first");
  const btn=$("#cloudConnectTeamBtn"); if(btn){btn.disabled=true;btn.textContent="Connecting…"}
  try{
    let teamId=S.cloud?.teamId, seasonId=S.cloud?.seasonId;
    if(!teamId){
      const {data,error}=await SB.from("teams").insert({owner_user_id:cloudUser.id,name:S.team.name,grade:S.team.grade||null,primary_color:S.team.primary||null,accent_color:S.team.secondary||null,logo_data:S.team.logoData||null,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC"}).select("id").single();
      if(error)throw error; teamId=data.id;
    }else{
      const {error}=await SB.from("teams").update({name:S.team.name,grade:S.team.grade||null,primary_color:S.team.primary||null,accent_color:S.team.secondary||null,logo_data:S.team.logoData||null}).eq("id",teamId); if(error)throw error;
    }
    if(!seasonId){
      const yr=parseInt(S.team.season,10); const {data,error}=await SB.from("seasons").insert({team_id:teamId,name:String(S.team.season||"Season"),season_year:Number.isFinite(yr)?yr:null}).select("id").single(); if(error)throw error; seasonId=data.id;
    }
    const playerIds={...(S.cloud?.playerIds||{})};
    for(const p of S.roster||[]){
      if(playerIds[p.id]){const {error}=await SB.from("players").update({jersey_number:String(p.jersey),name:p.name,active:true}).eq("id",playerIds[p.id]);if(error)throw error}
      else{const {data,error}=await SB.from("players").insert({season_id:seasonId,jersey_number:String(p.jersey),name:p.name,active:true}).select("id").single();if(error)throw error;playerIds[p.id]=data.id}
    }
    S.cloud={...(S.cloud||{}),teamId,seasonId,playerIds,gameIds:S.cloud?.gameIds||{},playIds:S.cloud?.playIds||{},playHashes:S.cloud?.playHashes||{},gameHashes:S.cloud?.gameHashes||{},creditIds:S.cloud?.creditIds||{},creditHashes:S.cloud?.creditHashes||{},penaltyIds:S.cloud?.penaltyIds||{},penaltyHashes:S.cloud?.penaltyHashes||{},snapIds:S.cloud?.snapIds||{},snapHashes:S.cloud?.snapHashes||{},connectedAt:new Date().toISOString(),lastSyncError:null,remoteFingerprint:S.cloud?.remoteFingerprint||null,hashVersion:2,deviceRole:"statkeeper"};persist();updateCloudUI();toast("Team connected — this device is the statkeeper")
  }catch(e){console.error("Cloud team connect failed",e);toast(e?.message||"Could not connect team")}
  finally{if(btn){btn.disabled=false;btn.textContent="Connect Team"}updateCloudUI()}
}

let cloudSyncTimer=null,cloudSyncRunning=false;
function cloudUuid(){return (crypto?.randomUUID?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==="x"?r:(r&3|8);return v.toString(16)}))}
function simpleHash(value){
  const str=typeof value==="string"?value:JSON.stringify(value);let h=2166136261;
  for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0).toString(16);
}
function cloudLocation(v){const x=String(v||"home").toLowerCase();return ["home","away","neutral"].includes(x)?x:"home"}
function cloudGameStatus(g){return g?.status==="complete"?"final":g?.status==="final"?"final":g?.status==="archived"?"archived":"live"}
function opponentPointsFromPlay(p){return p?.type==="Defense"&&p?.extras?.includes("TD")?6:0}
function cloudPendingItems(){
  if(!cloudLinked())return [];const out=[];
  for(const g of S.games||[]){
    if(!S.cloud.gameIds?.[g.id]){out.push(`game: ${g.opponent||"Opponent"}`);continue}
    const cloudGameId=S.cloud.gameIds[g.id];
    (g.plays||[]).forEach((p,i)=>{
      const payload=buildCloudPlayPayload(g,p,i,cloudGameId);const h=simpleHash(payload);if(!S.cloud.playIds?.[p.id]||S.cloud.playHashes?.[p.id]!==h)out.push(`play ${i+1}: ${p.type||"Play"}`);
      for(const c of buildCloudCredits(p)){const key=creditKey(p.id,c);const ch=simpleHash(c);if(!S.cloud.creditIds?.[key]||S.cloud.creditHashes?.[key]!==ch)out.push(`stat credit: play ${i+1}`)}
      if(p.type==="Penalty"){const ph=simpleHash(buildCloudPenaltyPayload(g,p,cloudGameId,S.cloud.playIds?.[p.id]||null));if(!S.cloud.penaltyIds?.[p.id]||S.cloud.penaltyHashes?.[p.id]!==ph)out.push(`penalty: play ${i+1}`)}
    });
    (g.snapRecords||[]).forEach((r,i)=>{const sh=simpleHash(buildCloudSnapPayload(g,r,i,cloudGameId));if(!S.cloud.snapIds?.[r.id]||S.cloud.snapHashes?.[r.id]!==sh)out.push(`snap ${i+1}`)});
    const gh=simpleHash(buildCloudGamePayload(g));if(S.cloud.gameHashes?.[g.id]!==gh)out.push(`game state: ${g.opponent||"Opponent"}`);
  }
  const localPlayIds=new Set((S.games||[]).flatMap(g=>(g.plays||[]).map(p=>p.id)));
  for(const localId of Object.keys(S.cloud.playIds||{}))if(!localPlayIds.has(localId))out.push("deleted play");
  const localSnapIds=new Set((S.games||[]).flatMap(g=>(g.snapRecords||[]).map(r=>r.id)));
  for(const localId of Object.keys(S.cloud.snapIds||{}))if(!localSnapIds.has(localId))out.push("deleted snap");
  return out;
}
function cloudPendingCount(){return cloudPendingItems().length}
function rebaseCloudHashesV443(){
  if(!S.cloud||Number(S.cloud.hashVersion||1)>=2||S.cloud.lastSyncError||!teamExists())return;
  try{
    for(const g of S.games||[]){
      const cloudGameId=S.cloud.gameIds?.[g.id];if(!cloudGameId)continue;
      S.cloud.gameHashes[g.id]=simpleHash(buildCloudGamePayload(g));
      (g.plays||[]).forEach((p,i)=>{
        if(S.cloud.playIds?.[p.id])S.cloud.playHashes[p.id]=simpleHash(buildCloudPlayPayload(g,p,i,cloudGameId));
        for(const c of buildCloudCredits(p)){const key=creditKey(p.id,c);if(S.cloud.creditIds?.[key])S.cloud.creditHashes[key]=simpleHash(c)}
        if(p.type==="Penalty"&&S.cloud.penaltyIds?.[p.id])S.cloud.penaltyHashes[p.id]=simpleHash(buildCloudPenaltyPayload(g,p,cloudGameId,S.cloud.playIds?.[p.id]||null));
      });
      (g.snapRecords||[]).forEach((r,i)=>{if(S.cloud.snapIds?.[r.id])S.cloud.snapHashes[r.id]=simpleHash(buildCloudSnapPayload(g,r,i,cloudGameId))});
    }
    S.cloud.hashVersion=2;persist({skipCloud:true});
  }catch(e){console.warn("Cloud hash rebase skipped",e)}
}
function scheduleCloudSync(delay=700){
  if(!isCloudStatkeeper())return;
  if(cloudSyncTimer)clearTimeout(cloudSyncTimer);
  cloudSyncTimer=setTimeout(()=>{cloudSyncTimer=null;syncCloudNow()},delay);
}
function fingerprintLoadedCloudSnapshot(team,players,games,plays,credits,penalties,snaps,snapParts){
  const pick=(o,keys)=>Object.fromEntries(keys.map(k=>[k,o?.[k]??null]));
  const sort=(a,k='id')=>[...(a||[])].sort((x,y)=>String(x[k]||'').localeCompare(String(y[k]||'')));
  return simpleHash({
    team:pick(team,["id","updated_at"]),
    players:sort((players||[]).map(x=>pick(x,["id","updated_at","active","jersey_number","name"]))),
    games:sort((games||[]).map(x=>pick(x,["id","updated_at","status","current_quarter","team_score","opponent_score","possession","current_down","current_distance"]))),
    plays:sort((plays||[]).map(x=>pick(x,["id","game_id","updated_at","revision","deleted_at"]))),
    credits:sort((credits||[]).map(x=>pick(x,["id","play_id","player_id","credit_type","value","metadata"]))),
    penalties:sort((penalties||[]).map(x=>pick(x,["id","game_id","play_id","updated_at","accepted","yards","down_result","player_id"]))),
    snaps:sort((snaps||[]).map(x=>pick(x,["id","game_id","updated_at","active","snap_number","quarter","client_created_at"]))),
    snapParts:sort((snapParts||[]).map(x=>pick(x,["id","snap_event_id","player_id","created_at"])))
  });
}
async function remoteCloudFingerprint(){
  const [teamQ,playersQ,gamesQ]=await Promise.all([
    SB.from("teams").select("id,updated_at").eq("id",S.cloud.teamId).single(),
    SB.from("players").select("id,updated_at,active,jersey_number,name").eq("season_id",S.cloud.seasonId),
    SB.from("games").select("id,updated_at,status,current_quarter,team_score,opponent_score,possession,current_down,current_distance").eq("season_id",S.cloud.seasonId)
  ]);
  if(teamQ.error)throw teamQ.error;if(playersQ.error)throw playersQ.error;if(gamesQ.error)throw gamesQ.error;
  const gameIds=(gamesQ.data||[]).map(x=>x.id);
  let plays=[],credits=[],penalties=[],snaps=[],snapParts=[];
  if(gameIds.length){
    const [playsQ,penQ,snapQ]=await Promise.all([
      SB.from("plays").select("id,game_id,updated_at,revision,deleted_at").in("game_id",gameIds),
      SB.from("penalties").select("id,game_id,play_id,updated_at,accepted,yards,down_result,player_id").in("game_id",gameIds),
      SB.from("snap_events").select("id,game_id,updated_at,active,snap_number,quarter,client_created_at").in("game_id",gameIds)
    ]);
    if(playsQ.error)throw playsQ.error;if(penQ.error)throw penQ.error;if(snapQ.error)throw snapQ.error;
    plays=playsQ.data||[];penalties=penQ.data||[];snaps=snapQ.data||[];
    const playIds=plays.map(x=>x.id),snapIds=snaps.map(x=>x.id);
    if(playIds.length){const q=await SB.from("play_credits").select("id,play_id,player_id,credit_type,value,metadata").in("play_id",playIds);if(q.error)throw q.error;credits=q.data||[]}
    if(snapIds.length){const q=await SB.from("snap_participants").select("id,snap_event_id,player_id,created_at").in("snap_event_id",snapIds);if(q.error)throw q.error;snapParts=q.data||[]}
  }
  const sort=(a,k='id')=>[...(a||[])].sort((x,y)=>String(x[k]||'').localeCompare(String(y[k]||'')));
  return simpleHash({team:teamQ.data,players:sort(playersQ.data),games:sort(gamesQ.data),plays:sort(plays),credits:sort(credits),penalties:sort(penalties),snaps:sort(snaps),snapParts:sort(snapParts)});
}
async function checkCloudForUpdates(){
  if(cloudRemoteCheckRunning||cloudAutoRefreshRunning||!SB||!cloudUser||!cloudLinked()||navigator.onLine===false||cloudPendingCount()>0)return;
  cloudRemoteCheckRunning=true;
  try{
    const fp=await remoteCloudFingerprint();
    if(!S.cloud.remoteFingerprint){
      S.cloud.remoteFingerprint=fp;cloudRemoteUpdates=false;persist({skipCloud:true});updateCloudUI();return;
    }
    cloudRemoteUpdates=fp!==S.cloud.remoteFingerprint;
    updateCloudUI();
    if(cloudRemoteUpdates&&cloudPendingCount()===0){
      cloudAutoRefreshRunning=true;
      try{await loadTeamFromCloud({refresh:true,auto:true})}
      finally{cloudAutoRefreshRunning=false}
    }
  }catch(e){console.warn("Cloud update check failed",e)}finally{cloudRemoteCheckRunning=false}
}
setInterval(checkCloudForUpdates,15000);
function cloudStateForPlay(g,p,index){
  const plays=g.plays||[];let teamScore=Number(g.scoreAdjustment||0),oppScore=0;
  for(let i=0;i<=index&&i<plays.length;i++){teamScore+=pointsFromPlay(plays[i]);oppScore+=opponentPointsFromPlay(plays[i])}
  const st=p.stateAfter||{possession:g.possession,down:g.down,distance:g.distance};
  const pos=(st.possession||g.possession||"ours")==="opp"?"opponent":"ours";
  return {quarter:Number(p.quarter||g.quarter||1),team_score:Math.max(0,teamScore),opponent_score:Math.max(0,oppScore),possession:pos,down:Number(st.down||1),distance:Number(st.distance||10)};
}
function buildCloudPlayPayload(g,p,index,cloudGameId){
  const before=p.stateBefore||{possession:g.initialPossession||"ours",down:1,distance:10};
  const after=cloudStateForPlay(g,p,index);
  const teamPts=Math.max(0,Number(pointsFromPlay(p)||0));
  const oppPts=Math.max(0,Number(opponentPointsFromPlay(p)||0));
  return {
    p_id:S.cloud.playIds?.[p.id]||null,
    p_game_id:cloudGameId,
    p_quarter:Number(p.quarter||1),
    p_possession:before.possession==="opp"?"opponent":"ours",
    p_down:Number.isFinite(Number(before.down))?Number(before.down):null,
    p_distance:Number.isFinite(Number(before.distance))?Number(before.distance):null,
    p_play_type:String(p.type||"Play"),
    p_subtype:p.sub?String(p.sub):null,
    p_yards:Number.isFinite(Number(p.yards))?Number(p.yards):null,
    p_first_down:offensivePlayEarnedFirstDown(p),
    p_turnover:!!(p.type==="Pass"&&p.sub==="Intercepted"||p.extras?.includes("Fumble Lost")||p.type==="Punt"||p.type==="Possession Switch"||p.interceptionPlayerId||p.fumbleRecoveryPlayerId),
    p_team_points:teamPts,
    p_opponent_points:oppPts,
    p_event_data:{local_id:p.id,local_index:index,raw:(()=>{const raw={...p};delete raw.cloudRevision;delete raw.cloudEditedAt;return raw})()},
    p_state_before:{quarter:Number(p.quarter||1),team_score:Math.max(0,after.team_score-teamPts),opponent_score:Math.max(0,after.opponent_score-oppPts),possession:before.possession==="opp"?"opponent":"ours",down:Number(before.down||1),distance:Number(before.distance||10)},
    p_state_after:after,
    p_client_created_at:p.ts?new Date(p.ts).toISOString():new Date().toISOString(),
    p_client_updated_at:new Date(p.cloudEditedAt||p.ts||Date.now()).toISOString()
  };
}

function addCredit(out,playerId,type,value=1,metadata={}){if(playerId&&Number(value)!==0)out.push({playerLocalId:playerId,credit_type:type,value:Number(value),metadata});}
function buildCloudCredits(p){
  const out=[],y=Number(p?.yards||0),td=!!p?.extras?.includes("TD"),fd=offensivePlayEarnedFirstDown(p);
  if(p?.type==="Rush"){
    addCredit(out,p.player,"rush_attempt",1);addCredit(out,p.player,"rush_yards",y);if(fd)addCredit(out,p.player,"rush_first_down",1);if(td)addCredit(out,p.player,"rush_td",1);
    if(p.extras?.includes("Fumble"))addCredit(out,p.player,"fumble",1);if(p.extras?.includes("Fumble Lost"))addCredit(out,p.player,"fumble_lost",1);
  }
  if(p?.type==="Pass"){
    const official=["Complete","Incomplete","Intercepted"].includes(p.sub);
    if(official)addCredit(out,p.player,"pass_attempt",1);if(p.sub==="Complete"){addCredit(out,p.player,"pass_completion",1);addCredit(out,p.player,"pass_yards",y);if(fd)addCredit(out,p.player,"pass_first_down",1);if(td)addCredit(out,p.player,"pass_td",1)}
    if(p.sub==="Intercepted")addCredit(out,p.player,"pass_interception_thrown",1);if(p.sub==="Sack")addCredit(out,p.player,"qb_sacked",1);
    if(p.player2&&official){addCredit(out,p.player2,"target",1);if(p.sub==="Complete"){addCredit(out,p.player2,"reception",1);addCredit(out,p.player2,"receiving_yards",y);if(fd)addCredit(out,p.player2,"receiving_first_down",1);if(td)addCredit(out,p.player2,"receiving_td",1)}if(p.sub==="Incomplete"&&p.drop)addCredit(out,p.player2,"drop",1)}
  }
  if(p?.type==="Defense"){
    for(const [id,v0] of Object.entries(p.defCredits||{})){const v=Number(v0)||0;if(p.tackleKind==="TFL"||p.sub==="TFL")addCredit(out,id,"tfl",v);else if(["Tackle","Opponent Run","Complete Pass"].includes(p.tackleKind)||["Tackle","Opponent Run","Complete Pass"].includes(p.sub))addCredit(out,id,"tackle",v);if(p.sub==="Sack")addCredit(out,id,"sack",v)}
    addCredit(out,p.passDefendedPlayerId,"pass_defended",1);addCredit(out,p.interceptionPlayerId,"def_interception",1,{return_yards:Number(p.returnYards||0)});addCredit(out,p.forcedFumblePlayerId,"forced_fumble",1);addCredit(out,p.fumbleRecoveryPlayerId,"fumble_recovery",1,{return_yards:Number(p.returnYards||0)});addCredit(out,p.defensiveTouchdownPlayerId,"defensive_td",1);
  }
  if(p?.type==="Special"){if(p.sub==="Kick Return"){addCredit(out,p.player,"kick_return",1);addCredit(out,p.player,"kick_return_yards",y)}else if(p.sub==="Punt Return"){addCredit(out,p.player,"punt_return",1);addCredit(out,p.player,"punt_return_yards",y)}else if(p.sub==="Forced Fumble")addCredit(out,p.player,"st_forced_fumble",1);else if(p.sub==="Fumble Recovery")addCredit(out,p.player,"st_fumble_recovery",1)}
  if(p?.type==="Kickoff"){addCredit(out,p.player,"kickoff",1);addCredit(out,p.player,"kickoff_yards",Math.max(0,y));if(p.kickoffResult==="Touchback")addCredit(out,p.player,"kickoff_touchback",1)}
  if(p?.type==="Kickoff Return"){addCredit(out,p.player,"kick_return",1);addCredit(out,p.player,"kick_return_yards",y)}
  if(p?.type==="Punt"){addCredit(out,p.player,"punt",1);addCredit(out,p.player,"punt_yards",Math.abs(y))}
  if(p?.type==="Try"){const t=String(p.tryType||p.sub||"").toLowerCase();if(t){addCredit(out,p.player,`try_${t}_attempt`,1);if(p.tryResult==="Good")addCredit(out,p.player,`try_${t}_made`,1)}if(p.tryType==="Pass"&&p.player2&&p.tryResult==="Good")addCredit(out,p.player2,"try_pass_reception",1)}
  if(p?.type==="Field Goal"){addCredit(out,p.player,"field_goal_attempt",1,{distance:Number(p.fieldGoalDistance||p.yards||0)});if(p.fieldGoalResult==="Good")addCredit(out,p.player,"field_goal_made",1,{distance:Number(p.fieldGoalDistance||p.yards||0)})}
  return out;
}
function creditKey(localPlayId,c){return `${localPlayId}::${c.playerLocalId}::${c.credit_type}`}
async function syncPlayCredits(p,cloudPlayId){
  const credits=buildCloudCredits(p),active=new Set();
  for(const c of credits){const key=creditKey(p.id,c);active.add(key);const playerId=S.cloud.playerIds?.[c.playerLocalId];if(!playerId)continue;const payload={play_id:cloudPlayId,player_id:playerId,credit_type:c.credit_type,value:c.value,metadata:{...(c.metadata||{}),local_play_id:p.id,active:true}};const h=simpleHash(c);let id=S.cloud.creditIds[key];if(!id){id=cloudUuid();const {error}=await SB.from("play_credits").insert({id,...payload});if(error)throw error;S.cloud.creditIds[key]=id}else if(S.cloud.creditHashes[key]!==h){const {error}=await SB.from("play_credits").update({value:payload.value,metadata:payload.metadata}).eq("id",id);if(error)throw error}S.cloud.creditHashes[key]=h}
  for(const [key,id] of Object.entries(S.cloud.creditIds||{})){if(!key.startsWith(`${p.id}::`)||active.has(key))continue;const h="inactive";if(S.cloud.creditHashes[key]!==h){const {error}=await SB.from("play_credits").update({value:0,metadata:{local_play_id:p.id,active:false}}).eq("id",id);if(error)throw error;S.cloud.creditHashes[key]=h}}
}
function penaltyDownResult(v){return ({replay:"replay_same",unchanged:"replay_same",next:"next_down",automatic1st:"automatic_first",loss:"loss_of_down"})[v]||"replay_same"}
function buildCloudPenaltyPayload(g,p,cloudGameId,cloudPlayId){
  const pos=p.stateBefore?.possession||"ours",yards=Number(p.penaltyYards||0),committer=yards<0?pos:(pos==="ours"?"opp":"ours");
  return {game_id:cloudGameId,play_id:cloudPlayId,side:committer==="opp"?"opponent":"ours",penalty_type:p.penaltyType||"Other",player_id:p.penaltyPlayer&&p.penaltyPlayer!=="UNKNOWN"?(S.cloud.playerIds?.[p.penaltyPlayer]||null):null,player_label:p.penaltyPlayer&&p.penaltyPlayer!=="UNKNOWN"?penaltyPlayerName(p):"Unknown / Team",yards,down_result:penaltyDownResult(p.penaltyDownResult),accepted:true,metadata:{local_play_id:p.id,quarter:Number(p.quarter||1),active:true}};
}
async function syncPenalty(g,p,cloudGameId,cloudPlayId){
  if(p.type!=="Penalty")return;const payload=buildCloudPenaltyPayload(g,p,cloudGameId,cloudPlayId);const h=simpleHash(payload);let id=S.cloud.penaltyIds[p.id];if(!id){id=cloudUuid();const {error}=await SB.from("penalties").insert({id,...payload});if(error)throw error;S.cloud.penaltyIds[p.id]=id}else if(S.cloud.penaltyHashes[p.id]!==h){const {error}=await SB.from("penalties").update(payload).eq("id",id);if(error)throw error}S.cloud.penaltyHashes[p.id]=h;
}
function buildCloudSnapPayload(g,r,index,cloudGameId){return {game_id:cloudGameId,created_by:cloudUser.id,snap_number:index+1,quarter:Number(r.quarter||g.quarter||1),client_created_at:r.ts?new Date(r.ts).toISOString():null,playerIds:[...(r.playerIds||[])].sort()}}
async function createCloudSnapEvent(payload,cloudGameId){
  const id=cloudUuid();
  const {error}=await SB.from("snap_events").insert({id,game_id:cloudGameId,created_by:cloudUser.id,snap_number:payload.snap_number||1,quarter:payload.quarter,client_created_at:payload.client_created_at,active:true});if(error)throw error;
  for(const localPid of payload.playerIds){const playerId=S.cloud.playerIds?.[localPid];if(!playerId)continue;const {error:pe}=await SB.from("snap_participants").insert({snap_event_id:id,player_id:playerId});if(pe)throw pe}
  return id;
}
async function syncSnapRecord(g,r,index,cloudGameId){
  if(!r.id)r.id=uid();const payload=buildCloudSnapPayload(g,r,index,cloudGameId),h=simpleHash(payload);payload.snap_number=index+1;if(S.cloud.snapHashes[r.id]===h)return;let id=S.cloud.snapIds[r.id];
  if(!id){id=await createCloudSnapEvent(payload,cloudGameId);S.cloud.snapIds[r.id]=id}
  else{
    const {error}=await SB.from("snap_events").update({active:false}).eq("id",id);if(error)throw error;
    id=await createCloudSnapEvent(payload,cloudGameId);S.cloud.snapIds[r.id]=id;
  }
  S.cloud.snapHashes[r.id]=h;
}
function buildCloudGamePayload(g){
  return {season_id:S.cloud.seasonId,created_by:cloudUser.id,opponent_name:g.opponent||"Opponent",opponent_logo_data:g.opponentLogoData||null,week_number:Number(g.week||1),game_date:null,location_type:cloudLocation(g.location),game_type:["regular","playoff","scrimmage","other"].includes(g.gameType)?g.gameType:"regular",status:cloudGameStatus(g),opening_kickoff:g.openingKickoff||null,current_quarter:Number(g.quarter||1),team_score:Math.max(0,Number(displayedOurScore(g)||0)),opponent_score:Math.max(0,Number(g.oppScore||0)),possession:g.possession==="opp"?"opponent":"ours",current_down:Number(g.down||1),current_distance:Number(g.distance||10),current_state:{quarter:Number(g.quarter||1),team_score:Math.max(0,Number(displayedOurScore(g)||0)),opponent_score:Math.max(0,Number(g.oppScore||0)),possession:g.possession==="opp"?"opponent":"ours",down:Number(g.down||1),distance:Number(g.distance||10)}};
}
async function ensureCloudRoster(){
  if(!cloudLinked())return;const localIds=new Set();
  for(const p of S.roster||[]){localIds.add(p.id);const payload={season_id:S.cloud.seasonId,jersey_number:String(p.jersey??""),name:p.name||"Player",active:true};let id=S.cloud.playerIds?.[p.id];if(id){const {error}=await SB.from("players").update({jersey_number:payload.jersey_number,name:payload.name,active:true}).eq("id",id);if(error)throw error}else{const {data,error}=await SB.from("players").insert(payload).select("id").single();if(error)throw error;S.cloud.playerIds[p.id]=data.id}}
  for(const [localId,cloudId] of Object.entries(S.cloud.playerIds||{})){if(localIds.has(localId))continue;const {error}=await SB.from("players").update({active:false}).eq("id",cloudId);if(error)throw error}
  persist({skipCloud:true});
}
async function ensureCloudGame(g){
  let id=S.cloud.gameIds?.[g.id];const payload=buildCloudGamePayload(g);const h=simpleHash(payload);
  if(!id){
    const {data,error}=await SB.from("games").insert(payload).select("id").single();if(error)throw error;id=data.id;S.cloud.gameIds[g.id]=id;S.cloud.gameHashes[g.id]=h;persist({skipCloud:true});
  }else{
    // Game state (especially score) is authoritative on the active statkeeper. Reconcile it every sync.
    const update={...payload};delete update.created_by;delete update.season_id;
    const {error}=await SB.from("games").update(update).eq("id",id);if(error)throw error;S.cloud.gameHashes[g.id]=h;persist({skipCloud:true});
  }
  return id;
}
async function syncOnePlay(g,p,index,cloudGameId){
  if(!S.cloud.playIds[p.id])S.cloud.playIds[p.id]=cloudUuid();
  const payload=buildCloudPlayPayload(g,p,index,cloudGameId);payload.p_id=S.cloud.playIds[p.id];const h=simpleHash(payload);
  if(S.cloud.playHashes[p.id]!==h){
    const alreadySynced=!!S.cloud.playHashes[p.id];
    if(!alreadySynced){
      const {error}=await SB.rpc("sync_play",payload);if(error)throw error;
    }else{
      const update={quarter:payload.p_quarter,possession:payload.p_possession,down:payload.p_down,distance:payload.p_distance,play_type:payload.p_play_type,subtype:payload.p_subtype,yards:payload.p_yards,first_down:payload.p_first_down,turnover:payload.p_turnover,team_points:payload.p_team_points,opponent_points:payload.p_opponent_points,event_data:payload.p_event_data,state_before:payload.p_state_before,state_after:payload.p_state_after,client_updated_at:payload.p_client_updated_at,revision:(Number(p.cloudRevision||1)+1)};
      const {error}=await SB.from("plays").update(update).eq("id",payload.p_id);if(error)throw error;p.cloudRevision=update.revision;
    }
    S.cloud.playHashes[p.id]=h;
  }
  await syncPlayCredits(p,payload.p_id);
  await syncPenalty(g,p,cloudGameId,payload.p_id);
  persist({skipCloud:true});
}
async function syncDeletedCloudPlays(){
  const localPlayIds=new Set((S.games||[]).flatMap(g=>(g.plays||[]).map(p=>p.id)));
  for(const [localId,cloudId] of Object.entries(S.cloud.playIds||{})){
    if(localPlayIds.has(localId))continue;
    const {error}=await SB.from("plays").update({deleted_at:new Date().toISOString()}).eq("id",cloudId);if(error)throw error;
    if(S.cloud.penaltyIds?.[localId]){const {error:pe}=await SB.from("penalties").update({accepted:false,metadata:{local_play_id:localId,active:false}}).eq("id",S.cloud.penaltyIds[localId]);if(pe)throw pe}
    for(const [key,id] of Object.entries(S.cloud.creditIds||{})){if(key.startsWith(`${localId}::`)){const {error:ce}=await SB.from("play_credits").update({value:0,metadata:{local_play_id:localId,active:false}}).eq("id",id);if(ce)throw ce;S.cloud.creditHashes[key]="inactive"}}
    delete S.cloud.playIds[localId];delete S.cloud.playHashes[localId];persist({skipCloud:true});
  }
}
async function syncDeletedCloudSnaps(){
  const localSnapIds=new Set((S.games||[]).flatMap(g=>(g.snapRecords||[]).map(r=>r.id)));
  for(const [localId,cloudId] of Object.entries(S.cloud.snapIds||{})){
    if(localSnapIds.has(localId))continue;
    const {error}=await SB.from("snap_events").update({active:false}).eq("id",cloudId);if(error)throw error;
    delete S.cloud.snapIds[localId];delete S.cloud.snapHashes[localId];persist({skipCloud:true});
  }
}
async function syncCloudNow(){
  if(cloudSyncRunning||!SB||!cloudUser||!cloudLinked()||navigator.onLine===false||!isCloudStatkeeper())return;
  cloudSyncRunning=true;updateCloudUI();
  try{
    await ensureCloudRoster();
    for(const g of S.games||[]){const cloudGameId=await ensureCloudGame(g);for(let i=0;i<(g.plays||[]).length;i++)await syncOnePlay(g,g.plays[i],i,cloudGameId);for(let i=0;i<(g.snapRecords||[]).length;i++)await syncSnapRecord(g,g.snapRecords[i],i,cloudGameId);await ensureCloudGame(g)}
    await syncDeletedCloudPlays();
    await syncDeletedCloudSnaps();
    S.cloud.lastSyncAt=new Date().toISOString();S.cloud.lastSyncError=null;
    try{S.cloud.remoteFingerprint=await remoteCloudFingerprint()}catch(_){S.cloud.remoteFingerprint=null}
    persist({skipCloud:true});setTimeout(checkCloudForUpdates,500);
  }catch(e){console.error("Cloud sync failed",e);S.cloud.lastSyncError=(e?.message||"Will retry when connected").slice(0,120);persist({skipCloud:true})}
  finally{cloudSyncRunning=false;updateCloudUI()}
}
window.addEventListener("online",()=>{if(isCloudStatkeeper())scheduleCloudSync(150);setTimeout(checkCloudForUpdates,500)});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){if(isCloudStatkeeper())scheduleCloudSync(250);setTimeout(checkCloudForUpdates,500)}});

$("#cloudAccountBtn")?.addEventListener("click",()=>cloudUser?go("setup"):openAuth());
$("#cloudSignInBtn")?.addEventListener("click",openAuth); $("#cloudSignOutBtn")?.addEventListener("click",cloudSignOut); $("#cloudConnectTeamBtn")?.addEventListener("click",connectTeamToCloud); $("#cloudLoadTeamBtn")?.addEventListener("click",()=>loadTeamFromCloud()); $("#cloudRefreshBtn")?.addEventListener("click",refreshFromCloud);
$("#authCloseBtn")?.addEventListener("click",closeAuth); $("#authSignInBtn")?.addEventListener("click",authSignIn); $("#authCreateBtn")?.addEventListener("click",authCreate);
$("#authModal")?.addEventListener("click",e=>{if(e.target.id==="authModal")closeAuth()});

function normalizeRoster(){
  let changed=false;
  (S.roster||[]).forEach(p=>{if(typeof p.snaps!=="number"){p.snaps=0;changed=true}});
  if(changed)persist();
}
function normalizeGames(){
  let changed=false;
  (S.games||[]).forEach(g=>{if(!g.gameType){g.gameType="regular";changed=true}if(!g.week){const w=Number(String(g.date||"").replace(/\D/g,""));if(w>=1&&w<=10){g.week=w;changed=true}} if(!g.down||g.down<1||g.down>4){g.down=1;changed=true} if(!g.possession){g.possession="ours";changed=true}if(!g.quarter||g.quarter<1||g.quarter>4){g.quarter=1;changed=true}if(!Array.isArray(g.snapRecords)){g.snapRecords=[];changed=true}if(!g.distance||g.distance<1){g.distance=10;changed=true}});
  if(changed)persist();
}
function toast(m){let t=$("#toast");t.textContent=m;t.style.display="block";setTimeout(()=>t.style.display="none",1500)}
function today(){return new Date().toISOString().slice(0,10)}
function colors(){let p=S.team?.primary||"#177b46",s=S.team?.secondary||"#f0b33b";document.documentElement.style.setProperty("--p",p);document.documentElement.style.setProperty("--s",s);document.querySelector('meta[name="theme-color"]').setAttribute("content",p)}
function teamExists(){return !!(S.team&&S.team.name)}
function currentGame(){return S.games.find(g=>g.id===S.activeGameId)||null}
function gameById(id){return S.games.find(g=>g.id===id)||null}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function readImageFile(file,cb){
  if(!file)return;
  if(!/^image\//.test(file.type||""))return toast("Choose an image file");
  const r=new FileReader();
  r.onload=()=>cb(String(r.result||""));
  r.onerror=()=>toast("Could not read that image");
  r.readAsDataURL(file);
}
function renderLogoPreview(targetId,data){
  const el=$("#"+targetId);if(!el)return;
  el.innerHTML=data?`<img src="${data}" alt="Opponent logo preview">`:"";
}


function go(name){
  if(!teamExists() && name!=="setup"){toast("Create your team first");name="setup"}
  $$(".screen").forEach(x=>x.classList.remove("active"));$(`[data-screen="${name}"]`).classList.add("active");
  $("#topTitle").textContent={setup:"Sideline Stats",roster:"Roster",game:"Game",snaps:"Snaps",stats:"Team Stats",share:"Share"}[name];
  if(name==="game")renderGameArea();
  if(name==="snaps")renderSnaps();
  if(name==="stats"){if(currentGame())selectedStatsGameId=currentGame().id;renderStats();}
  
}
$$("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));

function syncChrome(){
  colors();
  $("#bottomNav").classList.toggle("hidden",!teamExists());
  $("#editTeamBtn").classList.toggle("hidden",!teamExists());
  if(teamExists()) $("#editTeamBtn").textContent=`Edit ${S.team.name}`;
}
$("#editTeamBtn").addEventListener("click",()=>{populateSetup();go("setup")});
$("#resetAllBtn").addEventListener("click",()=>{
  const first=confirm("Reset ALL Sideline Stats data on this device? This permanently deletes the team, roster, games and stats.");
  if(!first)return;
  const second=confirm("Are you sure? This cannot be undone unless you exported a backup.");
  if(!second)return toast("Reset cancelled");
  try{
    localStorage.removeItem(KEY);
    localStorage.removeItem(RECOVERY_KEY);
    MIGRATION_KEYS.forEach(k=>localStorage.removeItem(k));
  }catch(e){
    console.error("Reset failed",e);
    return toast("Could not clear saved data");
  }
  S=JSON.parse(JSON.stringify(empty));
  selectedStatsGameId=null;
  statsScope="game";
  syncChrome();
  populateSetup();
  renderRoster();
  go("setup");
  toast("All data cleared");
});

function preview(){
  let p=$("#primary").value,s=$("#secondary").value,n=$("#teamName").value||"YOUR TEAM";
  $("#preview").style.background=p;$("#preview").style.borderBottomColor=s;$("#previewTeamText").textContent=n.toUpperCase();
  $("#primaryHex").textContent=p.toUpperCase();$("#secondaryHex").textContent=s.toUpperCase();
  renderLogoPreview(S.team?.logoData||null);
}
["#primary","#secondary","#teamName"].forEach(id=>$(id).addEventListener("input",preview));

function populateSetup(){
  if(teamExists()){
    $("#teamName").value=S.team.name;$("#grade").value=S.team.grade||"5th Grade";$("#season").value=S.team.season||"2026";
    $("#primary").value=S.team.primary||"#177b46";$("#secondary").value=S.team.secondary||"#f0b33b";
    $("#setupHeading").textContent="Edit your team";$("#setupSub").textContent="Update your team details and colors.";
    $("#saveTeam").textContent="Save Team Changes";$("#setupGateNote").classList.add("hidden");$("#dataManagement").classList.remove("hidden");
  }else{
    $("#teamName").value="";$("#grade").value="5th Grade";$("#season").value="2026";$("#primary").value="#177b46";$("#secondary").value="#f0b33b";
    $("#setupHeading").textContent="Create your team";$("#setupSub").textContent="Set colors, build your roster, then stat a game.";
    $("#saveTeam").textContent="Save Team & Add Roster";$("#setupGateNote").classList.remove("hidden");$("#dataManagement").classList.add("hidden");
  }
  preview();renderLogoPreview(S.team?.logoData||null);
}

function renderLogoPreview(data){
  const box=$("#logoPreviewBox"), small=$("#previewLogo");
  if(data){
    box.innerHTML=`<img src="${data}" alt="Team logo">`;
    small.style.display="flex";small.innerHTML=`<img src="${data}" alt="Team logo">`;
    $("#removeLogoBtn").classList.remove("hidden");
  }else{
    box.innerHTML='<span class="logo-placeholder">🏈</span>';
    small.style.display="none";small.innerHTML="";
    $("#removeLogoBtn").classList.add("hidden");
  }
}
$("#teamLogoInput").addEventListener("change",()=>{
  const file=$("#teamLogoInput").files?.[0];
  if(!file)return;
  if(file.size>2.5*1024*1024){$("#teamLogoInput").value="";return toast("Please choose a logo under 2.5 MB")}
  const reader=new FileReader();
  reader.onload=()=>{
    if(!S.team)S.team={};
    S.team.logoData=reader.result;
    renderLogoPreview(S.team.logoData);
  };
  reader.readAsDataURL(file);
});
$("#removeLogoBtn").addEventListener("click",()=>{
  if(!S.team)S.team={};
  S.team.logoData=null;$("#teamLogoInput").value="";renderLogoPreview(null);
});

$("#saveTeam").addEventListener("click",()=>{
  const name=$("#teamName").value.trim();if(!name)return toast("Enter a team name");
  const nextSeason=$("#season").value.trim()||"2026";
  if(teamExists()&&S.team.season&&S.team.season!==nextSeason){
    const ok=confirm(`New season: ${nextSeason}. In the production app, starting a new season will require a new season purchase. Continue in test mode?`);
    if(!ok)return;
  }
  S.team={name,grade:$("#grade").value,season:nextSeason,primary:$("#primary").value,secondary:$("#secondary").value,logoData:S.team?.logoData||null};
  persist();syncChrome();normalizeRoster();initializeSnapSelections();renderRoster();updateCloudUI();toast("Team saved");
  go("roster");
});


function downloadBlob(blob,name){
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)
}
function downloadJson(obj,name){downloadBlob(new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}),name)}
$("#backupDataBtn").addEventListener("click",()=>downloadJson({format:"sideline-stats-backup",backupVersion:1,appVersion:"4.2.0",exportedAt:new Date().toISOString(),data:S},`${(S.team?.name||"sideline_stats").replace(/[^a-z0-9]/gi,"_")}_backup.json`));
$("#restoreDataBtn").addEventListener("click",()=>$("#restoreDataInput").click());
$("#restoreDataInput").addEventListener("change",async()=>{
  const f=$("#restoreDataInput").files?.[0];if(!f)return;
  try{
    const obj=JSON.parse(await f.text()),data=obj.data||obj;
    if(!data||!Array.isArray(data.roster)||!Array.isArray(data.games))throw new Error("Invalid backup");
    if(!confirm("Restore this backup and replace the current local team data?"))return;
    S=Object.assign({},empty,data);persist();normalizeRoster();normalizeGames();syncChrome();populateSetup();renderRoster();initializeSnapSelections();go(teamExists()?"roster":"setup");toast("Backup restored");
  }catch(e){toast("That backup file could not be restored")}
  $("#restoreDataInput").value="";
});
$("#exportRosterBtn").addEventListener("click",()=>downloadJson({format:"sideline-stats-roster",team:S.team?.name||"",roster:S.roster},`${(S.team?.name||"team").replace(/[^a-z0-9]/gi,"_")}_roster.json`));
$("#importRosterBtn").addEventListener("click",()=>$("#importRosterInput").click());
$("#importRosterInput").addEventListener("change",async()=>{
  const f=$("#importRosterInput").files?.[0];if(!f)return;
  try{
    const obj=JSON.parse(await f.text()),r=obj.roster||obj;
    if(!Array.isArray(r))throw new Error("Invalid roster");
    const cleaned=r.slice(0,25).map(p=>({id:p.id||uid(),jersey:Number(p.jersey),name:String(p.name||"").trim(),snaps:0})).filter(p=>Number.isFinite(p.jersey)&&p.name);
    if(!cleaned.length)throw new Error("No players");
    if(!confirm(`Replace current roster with ${cleaned.length} imported players?`))return;
    S.roster=cleaned;persist();initializeSnapSelections();renderRoster();toast("Roster imported");
  }catch(e){toast("That roster file could not be imported")}
  $("#importRosterInput").value="";
});

function renderRoster(){
  S.roster.sort((a,b)=>a.jersey-b.jersey);$("#count").textContent=`${S.roster.length} / 25`;
  $("#rosterList").innerHTML=S.roster.length?S.roster.map(p=>`<div class="player"><div><span class="jersey">#${p.jersey}</span> &nbsp; ${esc(p.name)}</div><button class="choice remove" data-id="${p.id}" style="min-height:auto;padding:6px 10px">×</button></div>`).join(""):'<span class="muted">No players yet. Add your real roster above.</span>';
  $$(".remove").forEach(b=>b.addEventListener("click",()=>{S.roster=S.roster.filter(p=>p.id!==b.dataset.id);persist();renderRoster()}))
}
$("#addPlayer").addEventListener("click",()=>{
  if(S.roster.length>=25)return toast("25-player limit");
  let j=parseInt($("#jersey").value,10),n=$("#player").value.trim();
  if(Number.isNaN(j)||!n)return toast("Add jersey number and player name");
  if(S.roster.some(p=>p.jersey===j))return toast("That jersey number already exists");
  S.roster.push({id:uid(),jersey:j,name:n,snaps:0});$("#jersey").value="";$("#player").value="";persist();renderRoster()
});
$("#goGames").addEventListener("click",()=>go("game"));

function renderGameArea(){
  const g=currentGame();
  $("#gameManager").classList.toggle("hidden",!!g);
  $("#liveGame").classList.toggle("hidden",!g);
  renderGameList();
  if(g) renderLiveGame();
}
function renderGameList(){
  const list=$("#gameList");
  if(!S.games.length){list.innerHTML='<span class="muted">No games yet.</span>';return}
  list.innerHTML=[...S.games].sort((a,b)=>b.date.localeCompare(a.date)).map(g=>`
    <div class="game-card">
      <div class="game-info"><strong>${esc(S.team.name)} vs ${esc(g.opponent)} <span class="game-type-badge ${(g.gameType||"regular")==="playoff"?"playoff":"regular"}">${(g.gameType||"regular")==="playoff"?"PLAYOFF":"REGULAR"}</span></strong><span>${(g.gameType||"regular")==="playoff"?"Playoff":"Regular Season"} • Week ${g.week||String(g.date||"").replace(/\D/g,"")||"?"} • ${g.location} • ${displayedOurScore(g)}-${g.oppScore}</span></div>
      <div style="display:flex;gap:6px">
        <button class="btn ghost small open-game" data-id="${g.id}">${g.status==="complete"?"View":"Open"}</button>
        <button class="btn ghost small edit-saved-game" data-id="${g.id}">Edit</button>
        <button class="btn danger small delete-game" data-id="${g.id}">Delete</button>
      </div>
    </div>`).join("");
  $$(".open-game").forEach(b=>b.addEventListener("click",()=>{S.activeGameId=b.dataset.id;selectedStatsGameId=b.dataset.id;persist();renderGameArea()}));
  $$(".edit-saved-game").forEach(b=>b.addEventListener("click",()=>{
    S.activeGameId=b.dataset.id;selectedStatsGameId=b.dataset.id;persist();renderGameArea();openEditGame();
  }));
  $$(".delete-game").forEach(b=>b.addEventListener("click",()=>{
    const g=gameById(b.dataset.id); if(!g)return;
    if(!confirm(`Delete the game vs ${g.opponent}? This removes all plays and stats from this game.`))return;
    S.games=S.games.filter(x=>x.id!==g.id); if(S.activeGameId===g.id)S.activeGameId=null;
    persist();renderGameArea();toast("Game deleted");
  }))
}
$("#newOpponentLogo").addEventListener("change",e=>{
  const file=e.target.files?.[0];if(!file)return;
  readImageFile(file,data=>{
    pendingNewOpponentLogo=data;
    renderLogoPreview("newOpponentLogoPreview",data);
    $("#removeNewOpponentLogoBtn").classList.remove("hidden");
  });
});
$("#removeNewOpponentLogoBtn").addEventListener("click",()=>{
  pendingNewOpponentLogo=null;
  $("#newOpponentLogo").value="";
  renderLogoPreview("newOpponentLogoPreview","");
  $("#removeNewOpponentLogoBtn").classList.add("hidden");
});

$("#newGameBtn").addEventListener("click",()=>{
  if(!S.roster.length)return toast("Add your roster first");
  const opp=$("#newOpponent").value.trim();if(!opp)return toast("Enter an opponent");
  const openingKickoff=$("#newOpeningKickoff")?.value||"receive";
  const initialPossession=openingKickoff==="kick"?"opp":"ours";
  const g={id:uid(),opponent:opp,opponentLogoData:pendingNewOpponentLogo||null,week:Number($("#newGameWeek").value||1),date:`Week ${$("#newGameWeek").value||1}`,location:$("#newLocation").value,gameType:$("#newGameType").value||"regular",status:"live",ourScore:0,scoreAdjustment:0,scoreModelVersion:2,oppScore:0,openingKickoff,initialPossession,initialDown:1,initialDistance:10,down:1,distance:10,possession:initialPossession,quarter:1,plays:[],snapRecords:[]};
  S.games.push(g);S.activeGameId=g.id;selectedStatsGameId=g.id;
  pendingNewOpponentLogo=null;
  $("#newOpponentLogo").value="";
  renderLogoPreview("newOpponentLogoPreview","");
  $("#removeNewOpponentLogoBtn").classList.add("hidden");
  persist();resetFlow();renderGameArea()
});

function openEditGame(){
  const g=currentGame();if(!g)return;
  $("#editTeamName").value=S.team?.name||"";
  $("#editOpponent").value=g.opponent||"";
  $("#editGameWeek").value=String(g.week||1);
  $("#editLocation").value=g.location||"Home";
  $("#editGameType").value=g.gameType||"regular";
  pendingEditOpponentLogo=g.opponentLogoData||null;
  renderLogoPreview("opponentLogoPreview",pendingEditOpponentLogo);
  $("#removeOpponentLogoBtn").classList.toggle("hidden",!pendingEditOpponentLogo);
  $("#editOpponentLogo").value="";
  $("#editGameCard").classList.remove("hidden");
  $("#editGameCard").scrollIntoView({behavior:"smooth",block:"start"});
}
function closeEditGame(){
  $("#editGameCard").classList.add("hidden");
  pendingEditOpponentLogo=undefined;
  $("#editOpponentLogo").value="";
}
$("#editGameBtn").addEventListener("click",openEditGame);
$("#cancelEditGameBtn").addEventListener("click",closeEditGame);
$("#editOpponentLogo").addEventListener("change",e=>{
  const file=e.target.files?.[0];if(!file)return;
  readImageFile(file,data=>{
    pendingEditOpponentLogo=data;
    renderLogoPreview("opponentLogoPreview",data);
    $("#removeOpponentLogoBtn").classList.remove("hidden");
  });
});
$("#removeOpponentLogoBtn").addEventListener("click",()=>{
  pendingEditOpponentLogo=null;
  $("#editOpponentLogo").value="";
  renderLogoPreview("opponentLogoPreview","");
  $("#removeOpponentLogoBtn").classList.add("hidden");
});
$("#saveGameDetailsBtn").addEventListener("click",()=>{
  const g=currentGame();if(!g)return;
  const teamName=$("#editTeamName").value.trim();
  const opponent=$("#editOpponent").value.trim();
  if(!teamName)return toast("Enter a team name");
  if(!opponent)return toast("Enter an opponent");
  S.team.name=teamName;
  g.opponent=opponent;
  g.week=Number($("#editGameWeek").value||1);
  g.date=`Week ${g.week}`;
  g.location=$("#editLocation").value||"Home";
  g.gameType=$("#editGameType").value||"regular";
  if(pendingEditOpponentLogo!==undefined)g.opponentLogoData=pendingEditOpponentLogo;
  selectedStatsGameId=g.id;
  persist();
  closeEditGame();
  renderLiveGame();
  renderGameList();
  toast("Game details updated");
});

$("#endGameBtn").addEventListener("click",()=>{
  const g=currentGame();if(!g)return;
  g.status="complete";S.activeGameId=null;persist();toast("Game saved");renderGameArea()
});
$("#setOurScore").addEventListener("click",()=>{
  const g=currentGame();if(!g)return;ensureScoreModel(g);
  const current=displayedOurScore(g);
  const v=prompt("Set our official score:",String(current));
  if(v===null)return;const n=parseInt(v,10);if(Number.isNaN(n)||n<0)return toast("Enter a valid score");
  g.scoreAdjustment=n-autoPoints(g);g.ourScore=n;persist();renderLiveGame();toast("Score corrected");
});
$("#setOppScore").addEventListener("click",()=>{
  const g=currentGame();if(!g)return;
  const v=prompt("Set opponent official score:",String(g.oppScore||0));
  if(v===null)return;const n=parseInt(v,10);if(Number.isNaN(n)||n<0)return toast("Enter a valid score");
  g.oppScore=n;persist();renderLiveGame();toast("Opponent score updated");
});

function legacyPointsFromPlay(p){
  if(!p||!p.extras)return 0;
  let pts=0;
  if(p.extras.includes("TD"))pts+=6;
  if(p.extras.includes("1PT"))pts+=1;
  if(p.extras.includes("2PT"))pts+=2;
  return pts;
}
function pointsFromPlay(p){
  if(!p)return 0;
  let pts=legacyPointsFromPlay(p);
  if(p.type==="Defense"&&p.defensiveTouchdownPlayerId)pts+=6;
  if(p.type==="Try"&&p.tryResult==="Good")pts+=Number(p.points||2);
  if(p.type==="Field Goal"&&p.fieldGoalResult==="Good")pts+=3;
  return pts;
}
function legacyAutoPoints(g){return (g?.plays||[]).reduce((sum,p)=>sum+legacyPointsFromPlay(p),0)}
function autoPoints(g){return (g?.plays||[]).reduce((sum,p)=>sum+pointsFromPlay(p),0)}
function ensureScoreModel(g){
  if(!g)return;

  // V2 adds defensive return touchdowns to automatic scoring.
  // Preserve the score the statkeeper was already seeing so a TD that was
  // manually corrected in an older build does not suddenly get counted twice.
  if(Number(g.scoreModelVersion||0)<2){
    const oldAuto=legacyAutoPoints(g);
    const oldDisplayed=(typeof g.scoreAdjustment==="number")
      ? oldAuto+Number(g.scoreAdjustment||0)
      : Number(g.ourScore||0);
    const newAuto=autoPoints(g);
    g.scoreAdjustment=oldDisplayed-newAuto;
    g.scoreModelVersion=2;
    g.ourScore=oldDisplayed;
    return;
  }

  if(typeof g.scoreAdjustment!=="number"){
    const auto=autoPoints(g);
    const old=Number(g.ourScore||0);
    g.scoreAdjustment=(old===0 && auto>0)?0:(old-auto);
  }
}
function displayedOurScore(g){ensureScoreModel(g);return autoPoints(g)+Number(g.scoreAdjustment||0)}


$$(".quarter-btn").forEach(b=>b.addEventListener("click",()=>{
  const g=currentGame();if(!g)return;
  const nextQ=Number(b.dataset.quarter);
  if(nextQ===3&&Number(g.quarter||1)<3&&!g.halftimeKickoffApplied){
    const next=secondHalfPossessionForGame(g);
    const who=next==="ours"?S.team.name:g.opponent;
    if(!confirm(`Start 3rd quarter: ${who} receives the second-half kickoff and starts 1st & 10?`))return;
    g.quarter=3;applyHalftimeKickoff(g);
    persist();renderLiveGame();toast(`${who} ball — 1st & 10`);return;
  }
  g.quarter=nextQ;
  persist();renderLiveGame();toast(`Quarter ${g.quarter}`);
}));
$("#nextQuarterBtn").addEventListener("click",()=>{const g=currentGame();if(!g)return;const q=Number(g.quarter||1);if(q>=4)return toast("Already in 4th quarter");document.querySelector(`.quarter-btn[data-quarter="${q+1}"]`)?.click();});


function playYardsFromOurPerspective(p){
  // Positive = our offense gained yards; negative = our offense lost yards.
  // On defense, positive yards means opponent gained yards, so convert relative to possession state only where needed.
  return Number(p?.yards||0);
}
function normalizeGameState(st){
  return {
    possession:st?.possession==="opp"?"opp":"ours",
    down:Math.min(4,Math.max(1,Number(st?.down)||1)),
    distance:Math.max(1,Number(st?.distance)||10)
  };
}
function oppositePossession(possession){return possession==="ours"?"opp":"ours"}
function ensureInitialGameState(g){
  if(!g)return {possession:"ours",down:1,distance:10};
  if(!g.initialPossession){
    const first=g.plays?.[0];
    const seed=first?.stateBefore||{possession:g.possession,down:g.down,distance:g.distance};
    const st=normalizeGameState(seed);
    g.initialPossession=st.possession;g.initialDown=st.down;g.initialDistance=st.distance;
  }
  return normalizeGameState({possession:g.initialPossession,down:g.initialDown||1,distance:g.initialDistance||10});
}
function nextScrimmageState(possession,down,distance,yards){
  const st=normalizeGameState({possession,down,distance});
  const gain=Number(yards);
  const y=Number.isFinite(gain)?gain:0;
  if(y>=st.distance)return {possession:st.possession,down:1,distance:10,firstDown:true,turnoverOnDowns:false};
  const nextDistance=Math.max(1,st.distance-y);
  if(st.down<4)return {possession:st.possession,down:st.down+1,distance:nextDistance,firstDown:false,turnoverOnDowns:false};
  return {possession:oppositePossession(st.possession),down:1,distance:10,firstDown:false,turnoverOnDowns:true};
}
function offensivePlayEarnedFirstDown(p){
  if(!p)return false;
  const isScrimmageGain=p.type==="Rush"||(p.type==="Pass"&&p.sub==="Complete");
  if(!isScrimmageGain)return false;
  const distance=Number(p.stateBefore?.distance);
  const yards=Number(p.yards);
  if(Number.isFinite(distance)&&distance>0&&Number.isFinite(yards))return yards>=distance;
  // Backward compatibility for older backups that may not have stateBefore.
  return !!p.extras?.includes("1st Down");
}

function applyPlayToState(state,p){
  let st=normalizeGameState(state);
  if(!Array.isArray(p.extras))p.extras=[];

  if(p.type==="Try")return st;
  if(p.type==="Possession Switch")return {possession:p.toPossession==="opp"?"opp":"ours",down:1,distance:10};
  if(p.type==="Game State Correction")return normalizeGameState({
    possession:p.correctedPossession??st.possession,
    down:p.correctedDown??st.down,
    distance:p.correctedDistance??st.distance
  });

  if(p.type==="Halftime Kickoff")return normalizeGameState(p.stateAfter||{possession:st.possession,down:1,distance:10});
  if(p.type==="Kickoff")return {possession:p.receivingSide==="ours"?"ours":"opp",down:1,distance:10};
  if(p.type==="Kickoff Return")return {possession:"ours",down:1,distance:10};
  if(p.type==="Opponent Kickoff Return")return {possession:"opp",down:1,distance:10};
  if(p.type==="Field Goal")return p.fieldGoalResult==="Good"?{possession:"ours",down:1,distance:10}:{possession:"opp",down:1,distance:10};

  // Punt always hands the ball to the other side.
  if(p.type==="Punt")return {possession:oppositePossession(st.possession),down:1,distance:10};

  if(p.type==="Penalty"){
    const y=Number(p.penaltyYards||0);
    st.distance=Math.max(1,st.distance-y);
    const r=p.penaltyDownResult||"unchanged";
    if(r==="automatic1st"){st.down=1;st.distance=10}
    else if(r==="replay"||r==="unchanged"){}
    else if(r==="next"||r==="loss"){
      if(st.down<4)st.down+=1;
      else st={possession:oppositePossession(st.possession),down:1,distance:10};
    }
    return st;
  }

  if(st.possession==="ours"){
    if(p.type==="Pass"&&p.sub==="Intercepted")return {possession:"opp",down:1,distance:10};
    if(p.extras.includes("Fumble Lost"))return {possession:"opp",down:1,distance:10};
    if(p.extras.includes("TD")){
      p.extras=p.extras.filter(x=>x!=="1st Down");
      if((p.type==="Rush"||(p.type==="Pass"&&p.sub==="Complete"))&&Number(p.yards)>=Number(st.distance))p.extras.push("1st Down");
      return {possession:"ours",down:1,distance:10};
    }
    if(p.type==="Rush"||(p.type==="Pass"&&p.sub==="Complete")){
      p.extras=p.extras.filter(x=>x!=="1st Down");
      const n=nextScrimmageState(st.possession,st.down,st.distance,p.yards);
      if(n.firstDown)p.extras.push("1st Down");
      return {possession:n.possession,down:n.down,distance:n.distance};
    }
    if(p.type==="Pass"){
      p.extras=p.extras.filter(x=>x!=="1st Down");
      const n=nextScrimmageState(st.possession,st.down,st.distance,0);
      return {possession:n.possession,down:n.down,distance:n.distance};
    }
  }else{
    // Defensive entry represents the opponent's offensive play.
    if(p.type==="Defense"){
      if(p.sub==="INT"||p.sub==="Fumble Recovery"||p.fumbleRecoveryPlayerId)return {possession:"ours",down:1,distance:10};
      if(p.extras?.includes("TD"))return {possession:"opp",down:1,distance:10};
      if(p.sub==="Incomplete Pass"){
        const n=nextScrimmageState(st.possession,st.down,st.distance,0);
        return {possession:n.possession,down:n.down,distance:n.distance};
      }
      if(p.sub==="Sack"){
        const loss=Math.abs(Number(p.yards||0));
        const n=nextScrimmageState(st.possession,st.down,st.distance,-loss);
        return {possession:n.possession,down:n.down,distance:n.distance};
      }
      if(p.sub==="Opponent Run"||p.sub==="Complete Pass"||p.sub==="Tackle"||p.sub==="TFL"){
        const n=nextScrimmageState(st.possession,st.down,st.distance,p.yards);
        return {possession:n.possession,down:n.down,distance:n.distance};
      }
      return st;
    }
  }

  if(p.type==="Special"&&p.sub==="Fumble Recovery")return {possession:"ours",down:1,distance:10};
  return st;
}
function calcDriveState(g){
  let st=ensureInitialGameState(g);
  const plays=g?.plays||[];
  g.halftimeKickoffApplied=plays.some(p=>p.type==="Halftime Kickoff");
  for(let i=0;i<plays.length;i++){
    const p=plays[i];
    if(i===0&&p.stateBefore&&!g.initialPossession)st=normalizeGameState(p.stateBefore);
    st=applyPlayToState(st,p);
    p.stateAfter={...st};
  }
  return st;
}
function syncDerivedGameState(g){
  const st=calcDriveState(g);
  g.possession=st.possession;g.down=st.down;g.distance=st.distance;
}

function secondHalfPossessionForGame(g){
  return (g?.openingKickoff||"receive")==="receive"?"opp":"ours";
}
function applyHalftimeKickoff(g){
  if(!g||g.halftimeKickoffApplied)return false;
  const next=secondHalfPossessionForGame(g);
  const before=normalizeGameState({possession:g.possession,down:g.down,distance:g.distance});
  const after={possession:next,down:1,distance:10};
  g.plays.push({id:uid(),ts:Date.now(),type:"Halftime Kickoff",sub:next==="ours"?"We Receive":"We Kick",quarter:3,extras:[],stateBefore:{...before},stateAfter:{...after}});
  g.possession=next;g.down=1;g.distance=10;g.halftimeKickoffApplied=true;
  return true;
}

function renderLiveGame(){
  const g=currentGame();if(!g)return;
  ensureScoreModel(g);
  $("#teamGame").textContent=S.team.name;
  $("#oppGame").textContent=g.opponent;
  $("#ourScore").textContent=displayedOurScore(g);
  $("#oppScore").textContent=g.oppScore;
  $("#gameDate").textContent=`${(g.gameType||"regular")==="playoff"?"Playoff":"Regular Season"} • Week ${g.week||String(g.date||"").replace(/\D/g,"")||"?"}`;
  $("#gameLocation").textContent=g.location||"Home";
  $("#gameTypeText").textContent=(g.gameType||"regular")==="playoff"?"Playoff":"Regular Season";
  const initial=(g.opponent||"O").trim().charAt(0).toUpperCase()||"O";
  if(g.opponentLogoData){
    $("#oppBadge").innerHTML=`<img src="${g.opponentLogoData}" alt="${esc(g.opponent)} logo">`;
  }else{
    $("#oppBadge").textContent=initial;
  }
  if(S.team?.logoData){
    $("#gameTeamLogo").innerHTML=`<img src="${S.team.logoData}" alt="${esc(S.team.name)} logo">`;
  }else{
    $("#gameTeamLogo").innerHTML=`<div style="font-size:26px;font-weight:950;color:var(--p)">${esc((S.team.name||"SS").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase())}</div>`;
  }
  if(!g.down||g.down<1||g.down>4)g.down=1;
  if(!g.possession)g.possession="ours";
  $("#possessionMain").textContent=g.possession==="ours"
    ? `${S.team.name} Ball — OUR OFFENSE`
    : `${g.opponent} Ball — OUR DEFENSE`;
  if(!g.distance||g.distance<1)g.distance=10;
  $("#possessionSub").textContent=`${ordinal(g.down)} & ${g.distance||10}`;
  $("#togglePossession").textContent="Correct Possession";

  // Only show play-entry choices that make sense for the current possession.
  $("#actionRush")?.classList.toggle("hidden",g.possession!=="ours");
  $("#actionPass")?.classList.toggle("hidden",g.possession!=="ours");
  $("#actionDefense")?.classList.toggle("hidden",g.possession!=="opp");
  $("#actionPenalty")?.classList.toggle("hidden",g.possession==="opp");
  $("#actionSpecial")?.classList.toggle("hidden",g.possession==="opp");
  $("#quickPunt").classList.toggle("hidden",g.possession==="opp");
  $("#quickPunt").textContent=g.possession==="ours"?"🏈 OUR PUNT":`🏈 ${g.opponent.toUpperCase()} PUNT`;
  $("#quickKickoff").textContent=g.possession==="ours"?"🦵 KICK / RECEIVE":"🦵 KICK / RECEIVE";

$$(".quarter-btn").forEach(b=>b.classList.toggle("active",Number(b.dataset.quarter)===Number(g.quarter||1)));const nq=$("#nextQuarterBtn");if(nq){const q=Number(g.quarter||1);nq.textContent=q<4?`END ${ordinal(q).toUpperCase()} → START ${ordinal(q+1).toUpperCase()}`:"4TH QUARTER";nq.disabled=q>=4;}renderRecent();resetFlow();
}

$("#togglePossession").addEventListener("click",()=>{
  const g=currentGame();if(!g)return;
  syncDerivedGameState(g);
  const next=g.possession==="ours"?"opp":"ours";
  const who=next==="ours"?S.team.name:g.opponent;
  if(confirm(`Correct possession to ${who}? Use this only if the game state got out of sync. Down will reset to 1st & 10.`)){
    g.plays.push({
      id:uid(),
      ts:Date.now(),
      type:"Possession Switch",
      sub:"Manual",
      toPossession:next,
      quarter:Number(g.quarter||1),
      extras:[],
      stateBefore:{possession:g.possession,down:g.down,distance:g.distance||10}
    });
    syncDerivedGameState(g);
    persist();
    renderLiveGame();
    toast(`${who} ball — 1st & 10`);
  }
});


function ordinal(n){return n===1?"1st":n===2?"2nd":n===3?"3rd":"4th"}
function rebuildGameState(g){
  syncDerivedGameState(g);
}

function advanceDownAfterPlay(g,p){
  syncDerivedGameState(g);
}

function populateSignedYardPicker(id,min=-99,max=99){
  const el=$("#"+id);if(!el)return;
  const current=el.value;
  let out='';
  for(let v=min;v<=max;v++)out+=`<option value="${v}">${v>0?"+":""}${v} yards</option>`;
  el.innerHTML=out;
  if(current!==""&&Number(current)>=min&&Number(current)<=max)el.value=current;
  else if(min<=0&&max>=0)el.value="0";
  else el.value=String(min);
}
function resetSignedYardPicker(id,min=-99,max=99){populateSignedYardPicker(id,min,max);const el=$("#"+id);if(el)el.value=(min<=0&&max>=0)?"0":String(min)}
["customYards","defSimpleYardsExact","defYardsExact","penaltyCustomYards"].forEach(id=>populateSignedYardPicker(id));
populateSignedYardPicker("returnYardsExact",0,99);
populateSignedYardPicker("fieldGoalDistanceExact",0,99);

const FLOW_STEP_IDS=["stepSub","stepPenaltyType","stepPenaltyPlayer","stepPenaltyYards","stepPenaltyDown","stepPlayer","stepDefenseCredits","stepDefenseYards","stepDefensePlay","stepDefensePass","stepDefenseSimpleYards","stepDefenseTacklers","stepDefenseOutcome","stepDefenseTurnoverPlayer","stepPassDefended","stepReturnYards","stepTryType","stepTryResult","stepKickoffResult","stepFieldGoalDistance","stepFieldGoalResult","stepIncompleteDrop","stepFumbleRecovery","stepYards","stepExtras"];
function scrollFlowStepIntoView(el){
  if(!el||el.classList.contains("hidden"))return;
  requestAnimationFrame(()=>setTimeout(()=>{
    const header=document.querySelector(".top");
    const offset=(header?.getBoundingClientRect().height||0)+10;
    const y=window.scrollY+el.getBoundingClientRect().top-offset;
    window.scrollTo({top:Math.max(0,y),behavior:"smooth"});
  },20));
}
FLOW_STEP_IDS.forEach(id=>{
  const el=document.getElementById(id);if(!el)return;
  new MutationObserver(ms=>{if(ms.some(m=>m.attributeName==="class")&&!el.classList.contains("hidden"))scrollFlowStepIntoView(el)}).observe(el,{attributes:true,attributeFilter:["class"]});
});

function resetFlow(){
  S.flow={};
  ["#stepSub","#stepPenaltyType","#stepPenaltyPlayer","#stepPenaltyYards","#stepPenaltyDown","#stepPlayer","#stepDefenseCredits","#stepDefenseYards","#stepDefensePlay","#stepDefensePass","#stepDefenseSimpleYards","#stepDefenseTacklers","#stepDefenseOutcome","#stepDefenseTurnoverPlayer","#stepPassDefended","#stepReturnYards","#stepTryType","#stepTryResult","#stepKickoffResult","#stepFieldGoalDistance","#stepFieldGoalResult","#stepIncompleteDrop","#stepFumbleRecovery","#stepYards","#stepExtras"].forEach(id=>{const el=$(id);if(el)el.classList.add("hidden")});
  $("#stepMain").classList.remove("hidden");
  $$(".extra,.choice,.player-select,.def-tackler,.def-turnover-player,.def-simple-yard,.yard,.penalty-choice,.penalty-yard").forEach(b=>{b.classList.remove("sel","selected")});
  $$(".credit-btn").forEach(b=>b.classList.remove("active"));
  resetSignedYardPicker("customYards");resetSignedYardPicker("defSimpleYardsExact");resetSignedYardPicker("defYardsExact");resetSignedYardPicker("penaltyCustomYards");resetSignedYardPicker("returnYardsExact",0,99);resetSignedYardPicker("fieldGoalDistanceExact",0,99);
}
$$(".cancel").forEach(b=>b.addEventListener("click",resetFlow));
$$(".action").forEach(b=>b.addEventListener("click",()=>start(b.dataset.action)));

$$(".def-play").forEach(b=>b.addEventListener("click",()=>{
  const v=b.dataset.defplay;
  if(v==="Run"){
    S.flow={type:"Defense",sub:"Opponent Run",extras:[]};
    showDefenseSimpleYards("Opponent run yards");
  }else if(v==="Pass"){
    S.flow={type:"Defense",sub:null,extras:[]};showDefensePassMenu();
  }else if(v==="Penalty"){
    $("#stepDefensePlay").classList.add("hidden");startPenalty();
  }else if(v==="Punt"){
    $("#stepDefensePlay").classList.add("hidden");$("#quickPunt").click();
  }
}));
$$(".def-pass").forEach(b=>b.addEventListener("click",()=>{
  const v=b.dataset.defpass;
  if(v==="Incomplete"){
    S.flow={type:"Defense",sub:"Incomplete Pass",yards:0,extras:[]};
    $("#stepDefensePass").classList.add("hidden");
    $("#stepPassDefended").classList.remove("hidden");
  }else if(v==="INT"){
    S.flow={type:"Defense",sub:"INT",yards:0,extras:[]};
    showDefenseTurnoverPlayer("Interception");
  }else if(v==="Sack"){
    S.flow={type:"Defense",sub:"Sack",extras:[]};
    showDefenseSimpleYards("Sack yards lost (enter a positive number, e.g. 6)");
  }else{
    S.flow={type:"Defense",sub:"Complete Pass",extras:[]};
    showDefenseSimpleYards("Opponent completion yards");
  }
}));
$$(".def-simple-yard").forEach(b=>b.addEventListener("click",()=>{
  $$(".def-simple-yard").forEach(x=>x.classList.remove("selected"));
  b.classList.add("selected");
  setTimeout(()=>setDefenseYardsAndContinue(b.dataset.y),110);
}));
$("#defSimpleYardsUse").addEventListener("click",()=>setDefenseYardsAndContinue($("#defSimpleYardsExact").value));
$("#defTacklersDone").addEventListener("click",()=>{
  if(!(S.flow.tacklerIds||[]).length)return toast("Select at least one tackler or choose No Tackle / Scored");
  S.flow.tackleKind=Number(S.flow.yards)<0?"TFL":"Tackle";
  showDefenseOutcome();
});
$("#defNoTackle").addEventListener("click",()=>{
  S.flow.tacklerIds=[];S.flow.tackleKind=null;showDefenseOutcome();
});
$$(".def-outcome").forEach(b=>b.addEventListener("click",()=>{
  const v=b.dataset.defout;
  if(v==="None")return finishSimpleDefensePlay();
  if(v==="TD"){
    const returner=S.flow.fumbleRecoveryPlayerId||S.flow.interceptionPlayerId||null;
    if(returner){
      S.flow.defensiveTouchdownPlayerId=returner;
    }else{
      if(!S.flow.extras.includes("TD"))S.flow.extras.push("TD");
    }
    return finishSimpleDefensePlay();
  }
  if(v==="Forced Fumble")return showDefenseTurnoverPlayer("Forced Fumble");
  if(v==="Fumble Recovery")return showDefenseTurnoverPlayer("Fumble Recovery");
}));

$("#noPassDefended").addEventListener("click",()=>{$("#stepPassDefended").classList.add("hidden");finishSimpleDefensePlay()});
$("#yesPassDefended").addEventListener("click",()=>{
  $("#stepPassDefended").classList.add("hidden");
  S.flow.pendingTurnoverCredit="Pass Defended";
  $("#defTurnoverPlayerLabel").textContent="Pass Defended";$("#defTurnoverPlayerTitle").textContent="Who defended it?";
  $("#defTurnoverPlayerGrid").innerHTML=[...(S.roster||[])].sort((a,b)=>Number(a.jersey)-Number(b.jersey)).map(p=>`<button class="player-btn def-pd-player" data-id="${p.id}"><span>#${p.jersey}</span>${esc(p.name)}</button>`).join("");
  $("#stepDefenseTurnoverPlayer").classList.remove("hidden");
  $$(".def-pd-player").forEach(b=>b.addEventListener("click",()=>{
    $$(".def-pd-player").forEach(x=>x.classList.remove("selected"));
    b.classList.add("selected");
    S.flow.passDefendedPlayerId=b.dataset.id;
    setTimeout(()=>{$("#stepDefenseTurnoverPlayer").classList.add("hidden");finishSimpleDefensePlay()},110);
  }));
});

$("#quickKickoff").addEventListener("click",()=>{
  const g=currentGame();if(!g)return;

  if(g.possession==="ours"){
    S.flow={type:"Kickoff",sub:"Kickoff",receivingSide:"opp",extras:[]};
    $("#stepMain").classList.add("hidden");
    showPlayers("Kickoff — select kicker","kickoffKicker");
    return;
  }

  // We are receiving: record returner and return yards.
  S.flow={type:"Kickoff Return",sub:"Kickoff Return",extras:[]};
  $("#stepMain").classList.add("hidden");
  showPlayers("Kickoff return — select returner","kickReturner");

  $("#stepIncompleteDrop").classList.add("hidden");
});
$("#quickPunt").addEventListener("click",()=>{
  const g=currentGame();if(!g)return;
  syncDerivedGameState(g);
  if(g.possession==="opp"){
    if(confirm(`${g.opponent} punts. Change possession to ${S.team.name}?`)){
      const before=normalizeGameState({possession:g.possession,down:g.down,distance:g.distance});
      const p={id:uid(),ts:Date.now(),type:"Punt",sub:"Opponent Punt",player:null,yards:0,quarter:Number(g.quarter||1),extras:[],stateBefore:{...before}};
      const after=applyPlayToState(before,p);p.stateAfter={...after};g.plays.push(p);
      g.possession=after.possession;g.down=after.down;g.distance=after.distance;
      persist();renderLiveGame();toast(`${S.team.name} ball — 1st & 10`);
    }
    return;
  }
  S.flow={type:"Punt",sub:"Punt",extras:[]};
  $("#stepMain").classList.add("hidden");
  showPlayers("Select punter","punter");
});
function start(type){
  S.flow={type,extras:[]};$("#stepMain").classList.add("hidden");
  if(type==="Penalty"){startPenalty();return}
  if(type==="Rush")showPlayers("Who had the ball?","runner");
  else if(type==="Pass")showPlayers("Select QB","qb");
  else if(type==="Defense")showDefensePlayMenu();
  else showSubs("Special teams",["Field Goal","Kick Return","Punt Return","Punt","Forced Fumble","Fumble Recovery"])
}
function showSubs(title,items){
  $("#subTitle").textContent=title;$("#subGrid").innerHTML=items.map(x=>`<button class="choice sub" data-v="${x}">${x}</button>`).join("");$("#stepSub").classList.remove("hidden");
  $$(".sub").forEach(b=>b.addEventListener("click",()=>{
    let v=b.dataset.v;S.flow.sub=v;$("#stepSub").classList.add("hidden");
    if(S.flow.type==="Pass"){
      if(v==="Complete")showPlayers("Complete — select receiver","receiver");
      else if(v==="Incomplete")showPlayers("Incomplete — select intended receiver","intendedIncomplete");
      else if(v==="Intercepted")showPlayers("Intercepted — select intended receiver","intendedIntercepted");
      else recordNow();
    }
    else if(S.flow.type==="Defense"){
      if(v==="Incomplete Pass"){
        S.flow.yards=0;recordNow();
      }else if(v==="Opponent Run"||v==="Complete Pass"){
        S.flow.noDefCredit=true;S.flow.defCredits={};
        $("#defCreditLabel").textContent=v;
        $("#stepDefenseYards").classList.remove("hidden");
        S.flow.defYards=0;resetSignedYardPicker("defYardsExact");
      }else showDefenseCredits(v);
    }
    else if(S.flow.type==="Special"&&v==="Field Goal"){S.flow={type:"Field Goal",sub:"Field Goal",extras:[]};showPlayers("Field goal — select kicker","fieldGoalKicker");}
    else if(S.flow.type==="Special"&&(v==="Forced Fumble"||v==="Fumble Recovery"))showPlayers(`${v} — select player`,"specialTurnover");
    else if(v==="Punt"){S.flow.type="Punt";showPlayers("Punt — select punter","punter")}else showPlayers(`${v} — select returner`,"special")
  }))
}

function showDefensePlayMenu(){
  $("#stepDefensePlay").classList.remove("hidden");
}
function showDefensePassMenu(){
  $("#stepDefensePlay").classList.add("hidden");
  $("#stepDefensePass").classList.remove("hidden");
}
function showDefenseSimpleYards(label){
  $("#stepDefensePlay").classList.add("hidden");
  $("#stepDefensePass").classList.add("hidden");
  $("#defSimpleYardsLabel").textContent=label||"Opponent yards";
  resetSignedYardPicker("defSimpleYardsExact");
  $("#stepDefenseSimpleYards").classList.remove("hidden");
}
function setDefenseYardsAndContinue(y){
  const n=Number(y);
  if(!Number.isFinite(n))return toast("Enter opponent yards");
  S.flow.yards=n;
  $("#stepDefenseSimpleYards").classList.add("hidden");
  showDefenseTacklers();
}
function showDefenseTacklers(){
  S.flow.tacklerIds=[];
  $("#defTacklerLabel").textContent=(Number(S.flow.yards)<0)?"Tackle for loss":"Tackle";
  $("#defTacklerGrid").innerHTML=[...(S.roster||[])].sort((a,b)=>Number(a.jersey)-Number(b.jersey)).map(p=>`<button class="player-btn def-tackler" data-id="${p.id}"><span>#${p.jersey}</span>${esc(p.name)}</button>`).join("");
  $("#stepDefenseTacklers").classList.remove("hidden");
  $$(".def-tackler").forEach(b=>b.addEventListener("click",()=>{
    const id=b.dataset.id;
    const set=new Set(S.flow.tacklerIds||[]);
    if(set.has(id))set.delete(id);else set.add(id);
    S.flow.tacklerIds=[...set];
    b.classList.toggle("selected",set.has(id));
  }));
}
function defenseSplitCredits(ids){
  const arr=[...(ids||[])];
  if(!arr.length)return null;
  const credit=1/arr.length;
  return Object.fromEntries(arr.map(id=>[id,credit]));
}
function showDefenseOutcome(){
  $("#stepDefenseTacklers").classList.add("hidden");
  const parts=[];
  if(S.flow.sub==="Sack")parts.push("Sack");
  if(S.flow.forcedFumblePlayerId)parts.push("Forced Fumble");
  if(S.flow.fumbleRecoveryPlayerId)parts.push("Fumble Recovery");
  if(S.flow.interceptionPlayerId)parts.push("Interception");
  const hasTakeaway=!!(S.flow.fumbleRecoveryPlayerId||S.flow.interceptionPlayerId);
  $("#defOutcomeTitle").textContent=hasTakeaway
    ?`${parts.join(" + ")} — return result?`
    :(parts.length?`${parts.join(" + ")} — anything else?`:"Play outcome");
  const td=$("#defOutcomeTD");
  if(td)td.textContent=hasTakeaway?"Return TD +6":"TD +6";
  $("#stepDefenseOutcome").classList.remove("hidden");
  $$(".def-outcome").forEach(b=>{
    const v=b.dataset.defout;
    b.classList.toggle("selected",
      (v==="Forced Fumble"&&!!S.flow.forcedFumblePlayerId)||
      (v==="Fumble Recovery"&&!!S.flow.fumbleRecoveryPlayerId)||
      (v==="TD"&&!!S.flow.defensiveTouchdownPlayerId)
    );
  });
}
function finishSimpleDefensePlay(){
  const g=currentGame();if(!g)return;
  ensureInitialGameState(g);
  const before=normalizeGameState({possession:g.possession,down:g.down,distance:g.distance||10});
  const p={
    id:uid(),ts:Date.now(),type:"Defense",sub:S.flow.sub,
    yards:Number(S.flow.yards||0),quarter:Number(g.quarter||1),
    defCredits:defenseSplitCredits(S.flow.tacklerIds),
    tackleKind:S.flow.tackleKind||null,
    forcedFumblePlayerId:S.flow.forcedFumblePlayerId||null,
    fumbleRecoveryPlayerId:S.flow.fumbleRecoveryPlayerId||null,
    interceptionPlayerId:S.flow.interceptionPlayerId||null,
    defensiveTouchdownPlayerId:S.flow.defensiveTouchdownPlayerId||null,
    passDefendedPlayerId:S.flow.passDefendedPlayerId||null,
    returnYards:Number(S.flow.returnYards||0),
    extras:[...(S.flow.extras||[])],
    stateBefore:{...before}
  };
  const after=applyPlayToState(before,p);p.stateAfter={...after};
  g.plays.push(p);
  g.possession=after.possession;g.down=after.down;g.distance=after.distance;
  if(p.extras.includes("TD"))g.oppScore=Number(g.oppScore||0)+6;
  g.ourScore=displayedOurScore(g);
  persist();renderLiveGame();
  toast(`${g.possession==="ours"?S.team.name:g.opponent} ball — ${ordinal(g.down)} & ${g.distance}`);
  const ourDefTD=!!p.defensiveTouchdownPlayerId;
  resetFlow();
  if(ourDefTD)showTryMenu();
}
function showTakeawayReturnYards(label){
  $("#returnYardsLabel").textContent=label||"Takeaway return yards";
  $("#returnYardGrid").innerHTML=[0,5,10,15,20,30,40].map(v=>`<button class="choice return-yard" data-v="${v}">${v}</button>`).join("");
  resetSignedYardPicker("returnYardsExact",0,99);
  $("#stepReturnYards").classList.remove("hidden");
  $$(".return-yard").forEach(b=>b.addEventListener("click",()=>{S.flow.returnYards=Number(b.dataset.v);$("#stepReturnYards").classList.add("hidden");showDefenseOutcome()}));
}
$("#returnYardsUse").addEventListener("click",()=>{const v=Number($("#returnYardsExact").value);if(!Number.isFinite(v))return toast("Enter return yards");S.flow.returnYards=v;$("#stepReturnYards").classList.add("hidden");showDefenseOutcome()});

function showDefenseTurnoverPlayer(kind){
  S.flow.pendingTurnoverCredit=kind;
  $("#stepDefenseOutcome").classList.add("hidden");
  $("#defTurnoverPlayerLabel").textContent=kind;
  $("#defTurnoverPlayerTitle").textContent=kind==="Forced Fumble"?"Who forced it?":kind==="Fumble Recovery"?"Who recovered it?":"Who intercepted it?";
  $("#defTurnoverPlayerGrid").innerHTML=[...(S.roster||[])].sort((a,b)=>Number(a.jersey)-Number(b.jersey)).map(p=>`<button class="player-btn def-turnover-player" data-id="${p.id}"><span>#${p.jersey}</span>${esc(p.name)}</button>`).join("");
  $("#stepDefenseTurnoverPlayer").classList.remove("hidden");
  $$(".def-turnover-player").forEach(b=>b.addEventListener("click",()=>{
    const id=b.dataset.id;
    $$(".def-turnover-player").forEach(x=>x.classList.remove("selected"));
    b.classList.add("selected");
    setTimeout(()=>{
    if(S.flow.pendingTurnoverCredit==="Forced Fumble"){
      S.flow.forcedFumblePlayerId=id;
      $("#stepDefenseTurnoverPlayer").classList.add("hidden");
      showDefenseOutcome();
    }else if(S.flow.pendingTurnoverCredit==="Fumble Recovery"){
      S.flow.fumbleRecoveryPlayerId=id;
      $("#stepDefenseTurnoverPlayer").classList.add("hidden");
      showTakeawayReturnYards("Fumble recovery return yards");
    }else{
      S.flow.interceptionPlayerId=id;
      S.flow.sub="INT";
      $("#stepDefenseTurnoverPlayer").classList.add("hidden");
      showTakeawayReturnYards("Interception return yards");
    }
    },110);
  }));
}

function showDefenseCredits(stat){
  S.flow.sub=stat;S.flow.defCredits={};
  $("#defCreditLabel").textContent=stat;
  $("#defCreditGrid").innerHTML=S.roster.map(p=>`<div class="def-credit-row"><div class="def-credit-player"><span>#${p.jersey}</span> ${esc(p.name)}</div><button class="credit-btn def-credit" data-id="${p.id}" data-v="0.5">0.5</button><button class="credit-btn def-credit" data-id="${p.id}" data-v="1">1.0</button></div>`).join("");
  $("#stepDefenseCredits").classList.remove("hidden");
  $$(".def-credit").forEach(b=>b.addEventListener("click",()=>{
    const id=b.dataset.id,val=Number(b.dataset.v),cur=S.flow.defCredits[id];
    if(cur===val){delete S.flow.defCredits[id];b.classList.remove("active")}
    else{S.flow.defCredits[id]=val;document.querySelectorAll(`.def-credit[data-id="${id}"]`).forEach(x=>x.classList.remove("active"));b.classList.add("active")}
  }));
}
$("#recordDefenseCredits").addEventListener("click",()=>{
  const entries=Object.entries(S.flow.defCredits||{});
  if(!entries.length)return toast("Select at least one defender");
  $("#stepDefenseCredits").classList.add("hidden");
  $("#stepDefenseYards").classList.remove("hidden");
  S.flow.defYards=0;
  $("#defYardsExact").value="";
});


$$(".def-yard").forEach(b=>b.addEventListener("click",()=>{
  S.flow.defYards=Number(b.dataset.y);
  $("#defYardsExact").value=S.flow.defYards;
  $$(".def-yard").forEach(x=>x.classList.toggle("selected",x===b));
}));
$("#recordDefenseWithYards").addEventListener("click",()=>{
  const entries=Object.entries(S.flow.defCredits||{});
  if(!S.flow.noDefCredit&&!entries.length)return toast("Select at least one defender");
  const g=currentGame();if(!g)return;
  const exact=$("#defYardsExact").value;
  const y=exact===""?Number(S.flow.defYards||0):Number(exact);
  const p={
    id:uid(),ts:Date.now(),type:"Defense",sub:S.flow.sub,
    defCredits:S.flow.noDefCredit?null:Object.fromEntries(entries.map(([id,v])=>[id,Number(v)])),
    yards:y, quarter:Number(g.quarter||1),
    downAtStart:Number(g.down||1), distanceAtStart:Number(g.distance||10),
    possessionAtStart:g.possession,
    extras:[]
  };
  g.plays.push(p);
  syncDerivedGameState(g);
  g.ourScore=displayedOurScore(g);
  persist();renderLiveGame();
  if(p.sub==="INT")toast(`${S.team.name} ball — 1st down`);
  else if(p.sub==="Fumble Recovery")toast(`${S.team.name} ball — 1st down`);
  else toast("Defensive play recorded");
  resetFlow();
});


const PENALTY_TYPES=["Holding","False Start","Offsides","Encroachment / Neutral Zone","Pass Interference","Facemask","Personal Foul / Unnecessary Roughness","Illegal Formation","Illegal Motion / Shift","Delay of Game","Block in the Back","Illegal Use of Hands","Roughing the Passer","Unsportsmanlike Conduct","Too Many Players","Other"];
function startPenalty(){
  S.flow={type:"Penalty",penaltyType:null,penaltyPlayer:"UNKNOWN",penaltyYards:0,penaltyDownResult:"replay",opponentOffenseAdjustment:currentGame()?.possession==="opp",extras:[]};
  $("#penaltyTypeGrid").innerHTML=PENALTY_TYPES.map(x=>`<button class="penalty-choice penalty-type" data-v="${esc(x)}">${esc(x)}</button>`).join("");
  $("#stepPenaltyType").classList.remove("hidden");
  $$(".penalty-type").forEach(b=>b.addEventListener("click",()=>{S.flow.penaltyType=b.dataset.v;$("#stepPenaltyType").classList.add("hidden");showPenaltyPlayers()}));
}
function showPenaltyPlayers(){
  $("#penaltyPlayerLabel").textContent=S.flow.penaltyType||"Penalty";
  const roster=[...(S.roster||[])].sort((a,b)=>Number(a.jersey)-Number(b.jersey));
  $("#penaltyPlayerGrid").innerHTML=`<button class="choice player-select penalty-player" data-id="UNKNOWN"><strong>TEAM</strong><br><span class="muted">Unknown / Team</span></button>`+
    roster.map(p=>playerSelectButton(p,"penalty-player")).join("");
  $("#stepPenaltyPlayer").classList.remove("hidden");
  $$(".penalty-player").forEach(b=>b.addEventListener("click",()=>{S.flow.penaltyPlayer=b.dataset.id;$("#stepPenaltyPlayer").classList.add("hidden");$("#stepPenaltyYards").classList.remove("hidden");resetSignedYardPicker("penaltyCustomYards");S.flow.penaltyYards=0; $$(".penalty-yard").forEach(x=>x.classList.remove("selected"))}));
}
$$(".penalty-yard").forEach(b=>b.addEventListener("click",()=>{S.flow.penaltyYards=Number(b.dataset.y);populateSignedYardPicker("penaltyCustomYards");$("#penaltyCustomYards").value=String(S.flow.penaltyYards);$$(".penalty-yard").forEach(x=>x.classList.toggle("selected",x===b))}));
$("#penaltyYardsNext").addEventListener("click",()=>{const raw=$("#penaltyCustomYards").value;S.flow.penaltyYards=raw===""?Number(S.flow.penaltyYards||0):Number(raw);if(Number.isNaN(S.flow.penaltyYards))return toast("Enter valid penalty yards");S.flow.penaltyDownResult="replay";$("#stepPenaltyYards").classList.add("hidden");$("#stepPenaltyDown").classList.remove("hidden");$$(".penalty-down").forEach(x=>x.classList.toggle("selected",x.dataset.result==="unchanged"))});
$$(".penalty-down").forEach(b=>b.addEventListener("click",()=>{S.flow.penaltyDownResult=b.dataset.result;$$(".penalty-down").forEach(x=>x.classList.toggle("selected",x===b))}));
function penaltyPlayerName(p){return !p||!p.penaltyPlayer||p.penaltyPlayer==="UNKNOWN"?"Unknown / Team":pname(p.penaltyPlayer)}
$("#recordPenaltyBtn").addEventListener("click",()=>{const g=currentGame();if(!g)return;const p={id:uid(),ts:Date.now(),type:"Penalty",penaltyType:S.flow.penaltyType||"Other",penaltyPlayer:S.flow.penaltyPlayer||"UNKNOWN",penaltyYards:Number(S.flow.penaltyYards||0),penaltyDownResult:S.flow.penaltyDownResult||"unchanged",quarter:Number(g.quarter||1),stateBefore:{possession:g.possession,down:g.down,distance:g.distance||10},extras:[]};g.plays.push(p);rebuildGameState(g);persist();renderLiveGame();toast("Penalty recorded");resetFlow()});

function playerSelectButton(p,extraClass="",extraAttrs=""){
  return `<button class="choice player-select ${extraClass}" data-id="${p.id}" ${extraAttrs}><strong>#${p.jersey}</strong><br><span class="muted">${esc(p.name)}</span></button>`;
}
function showPlayers(text,mode){
  $("#flowText").textContent=text;
  const roster=[...(S.roster||[])].sort((a,b)=>Number(a.jersey)-Number(b.jersey));
  $("#playerGrid").innerHTML=roster.map(p=>playerSelectButton(p,"pick",`data-mode="${mode}"`)).join("");
  $("#stepPlayer").classList.remove("hidden");
  $$(".pick").forEach(b=>b.addEventListener("click",()=>{
    $$(".pick").forEach(x=>x.classList.remove("selected"));
    b.classList.add("selected");
    setTimeout(()=>pick(b.dataset.id,b.dataset.mode),110);
  }))
}
function pick(id,mode){
  $("#stepPlayer").classList.add("hidden");
  if(mode==="qb"){
    S.flow.player=id;
    showSubs("Pass result",["Complete","Incomplete","Intercepted","Sack"]);
  }
  else if(mode==="receiver"){
    S.flow.player2=id;
    showYards();
  }
  else if(mode==="intendedIncomplete"){
    S.flow.player2=id;
    $("#stepIncompleteDrop").classList.remove("hidden");
  }
  else if(mode==="intendedIntercepted"){
    S.flow.player2=id;
    recordNow();
  }
  else if(mode==="kickoffKicker"){S.flow.player=id;$("#stepKickoffResult").classList.remove("hidden");}
  else if(mode==="tryKicker"){S.flow.player=id;showTryResult("2-point kick");}
  else if(mode==="fieldGoalKicker"){S.flow.player=id;showFieldGoalDistance();}
  else if(mode==="tryRunner"){S.flow.player=id;showTryResult("2-point run");}
  else if(mode==="tryQB"){S.flow.player=id;showPlayers("2-point pass — select receiver","tryReceiver");}
  else if(mode==="tryReceiver"){S.flow.player2=id;showTryResult("2-point pass");}
  else if(mode==="runner"||mode==="special"||mode==="punter"||mode==="kickReturner"){
    S.flow.player=id;showYards();
  }
  else if(mode==="specialTurnover"){S.flow.player=id;recordNow()}
  else{S.flow.player=id;recordNow()}
}
function showFieldGoalDistance(){
  const vals=[20,25,30,35,40,45,50];
  $("#fieldGoalDistanceGrid").innerHTML=vals.map(v=>`<button class="choice field-goal-distance" data-v="${v}">${v} YDS</button>`).join("");
  resetSignedYardPicker("fieldGoalDistanceExact",0,99);
  $("#stepFieldGoalDistance").classList.remove("hidden");
  $$(".field-goal-distance").forEach(b=>b.addEventListener("click",()=>{
    $$(".field-goal-distance").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");
    setTimeout(()=>setFieldGoalDistance(+b.dataset.v),110);
  }));
}
function setFieldGoalDistance(v){
  const n=Number(v);if(!Number.isFinite(n)||n<0)return toast("Enter field goal distance");
  S.flow.fieldGoalDistance=n;S.flow.yards=n;
  $("#stepFieldGoalDistance").classList.add("hidden");
  $("#fieldGoalResultLabel").textContent=`${n}-yard field goal`;
  $("#stepFieldGoalResult").classList.remove("hidden");
}
$("#fieldGoalDistanceUse").addEventListener("click",()=>setFieldGoalDistance(parseInt($("#fieldGoalDistanceExact").value,10)));
$$(".field-goal-result").forEach(b=>b.addEventListener("click",()=>{
  $$(".field-goal-result").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");
  S.flow.fieldGoalResult=b.dataset.result;S.flow.points=S.flow.fieldGoalResult==="Good"?3:0;
  setTimeout(()=>{$("#stepFieldGoalResult").classList.add("hidden");recordNow();},110);
}));

function showYards(){
  let vals=S.flow.type==="Kickoff"?[10,20,30,40,50,60]:[-10,-5,-3,-2,-1,0,1,2,3,4,5,6,7,10,15];
  $("#yardGrid").innerHTML=vals.map(v=>`<button class="choice yard" data-v="${v}">${v>0?"+":""}${v}</button>`).join("");
  if(S.flow.type==="Kickoff")resetSignedYardPicker("customYards",0,99);else resetSignedYardPicker("customYards");
  $("#stepYards").classList.remove("hidden");
  $$(".yard").forEach(b=>b.addEventListener("click",()=>{
    $$(".yard").forEach(x=>x.classList.remove("selected"));
    b.classList.add("selected");
    setTimeout(()=>yards(+b.dataset.v),110);
  }))
}
$("#customBtn").addEventListener("click",()=>{let v=parseInt($("#customYards").value,10);if(Number.isNaN(v))return toast("Enter yards");yards(v)});
function yards(v){
  S.flow.yards=v;
  $("#stepYards").classList.add("hidden");
  if(S.flow.type==="Punt"||S.flow.type==="Kickoff Return"||S.flow.type==="Kickoff"){recordNow();return}
  $("#stepExtras").classList.remove("hidden");
}
$$(".extra").forEach(b=>b.addEventListener("click",()=>{let x=b.dataset.extra,i=S.flow.extras.indexOf(x);if(i>=0){S.flow.extras.splice(i,1);b.classList.remove("sel")}else{S.flow.extras.push(x);b.classList.add("sel")}}));
$("#recordPlay").addEventListener("click",recordNow);
$$(".incomplete-drop").forEach(b=>b.addEventListener("click",()=>{
  S.flow.drop=b.dataset.drop==="yes";
  $("#stepIncompleteDrop").classList.add("hidden");
  recordNow();
}));

function showTryMenu(){S.flow={type:"Try",extras:[]};$("#stepMain").classList.add("hidden");$("#stepTryType").classList.remove("hidden");}
function showTryResult(label){$("#tryResultLabel").textContent=label;$("#stepTryResult").classList.remove("hidden");}
$$(".try-type").forEach(b=>b.addEventListener("click",()=>{const t=b.dataset.try;$("#stepTryType").classList.add("hidden");if(t==="None")return resetFlow();S.flow={type:"Try",sub:t,tryType:t,extras:[]};if(t==="Kick")showPlayers("2-point kick — select kicker","tryKicker");else if(t==="Run")showPlayers("2-point run — select runner","tryRunner");else showPlayers("2-point pass — select QB","tryQB");}));
$$(".try-result").forEach(b=>b.addEventListener("click",()=>{S.flow.tryResult=b.dataset.result;S.flow.points=S.flow.tryResult==="Good"?2:0;$("#stepTryResult").classList.add("hidden");recordNow()}));
$$(".kickoff-result").forEach(b=>b.addEventListener("click",()=>{S.flow.kickoffResult=b.dataset.result;$("#stepKickoffResult").classList.add("hidden");if(S.flow.kickoffResult==="Touchback")return recordNow();showYards()}));

$$(".fumble-recovery-choice").forEach(b=>b.addEventListener("click",()=>{
  $$(".fumble-recovery-choice").forEach(x=>x.classList.remove("selected"));
  b.classList.add("selected");
  S.flow.fumbleRecovery=b.dataset.recovery;
  if(S.flow.fumbleRecovery==="opp"&&!S.flow.extras.includes("Fumble Lost"))S.flow.extras.push("Fumble Lost");
  if(S.flow.fumbleRecovery==="ours")S.flow.extras=S.flow.extras.filter(x=>x!=="Fumble Lost");
  setTimeout(()=>{$("#stepFumbleRecovery").classList.add("hidden");recordNow();},110);
}));

function recordNow(){
  const g=currentGame();if(!g)return;

  if(g.possession==="ours"&&S.flow.extras?.includes("Fumble")&&!S.flow.fumbleRecovery){
    $("#stepExtras").classList.add("hidden");
    $("#stepFumbleRecovery").classList.remove("hidden");
    return;
  }

  ensureInitialGameState(g);
  const before=normalizeGameState({possession:g.possession,down:g.down,distance:g.distance||10});
  const p={...JSON.parse(JSON.stringify(S.flow)),id:uid(),ts:Date.now(),quarter:Number(g.quarter||1),stateBefore:{...before}};
  const after=applyPlayToState(before,p);
  p.stateAfter={...after};
  g.plays.push(p);
  g.possession=after.possession;g.down=after.down;g.distance=after.distance;
  g.ourScore=displayedOurScore(g);
  selectedStatsGameId=g.id;
  persist();renderLiveGame();

  if(p.type==="Pass"&&p.sub==="Intercepted")toast(`${g.opponent} ball — 1st down`);
  else if(p.extras?.includes("Fumble Lost"))toast(`${g.opponent} ball — 1st down`);
  else if(p.type==="Punt")toast(`${g.possession==="ours"?S.team.name:g.opponent} ball — 1st & 10`);
  else toast(`Play recorded — ${ordinal(g.down)} & ${g.distance}`);
  const scoredTD=p.extras?.includes("TD");
  resetFlow();
  if(scoredTD)showTryMenu();
}
$("#undo").addEventListener("click",()=>{const g=currentGame();if(!g||!g.plays.length)return toast("Nothing to undo");g.plays.pop();rebuildGameState(g);g.ourScore=displayedOurScore(g);persist();renderLiveGame();toast("Last play removed")});

function player(id){return S.roster.find(p=>p.id===id)}
function pname(id){let p=player(id);return p?`#${p.jersey} ${p.name}`:"#?"}
function sgn(v){return (+v>0?"+":"")+(v||0)}
function ex(p){return p.extras&&p.extras.length?" · "+p.extras.join(", "):""}
function ptext(p){
  if(p.type==="Possession Switch"){
    return p.toPossession==="ours"?`${S.team.name} takes possession`:`${currentGame()?.opponent||"Opponent"} takes possession`;
  }
  if(p.type==="Penalty"){const y=Number(p.penaltyYards||0);return `Penalty — ${p.penaltyType||"Other"} — ${penaltyPlayerName(p)} — ${y>0?"+":""}${y} yds`}
  if(p.type==="Kickoff"){
    const receiver=p.receivingSide==="ours"?S.team.name:(currentGame()?.opponent||"Opponent");
    return `Kickoff — ${p.player?pname(p.player)+" — ":""}${p.kickoffResult||""}${p.kickoffResult?" — ":""}${receiver} receives`;
  }
  if(p.type==="Try"){const who=p.player?pname(p.player):"";const to=p.player2?` → ${pname(p.player2)}`:"";return `${p.sub} 2-point try — ${who}${to} — ${p.tryResult||""}${p.tryResult==="Good"?" +2":""}`;}
  if(p.type==="Field Goal")return `Field Goal — ${pname(p.player)} — ${Number(p.fieldGoalDistance||p.yards||0)} yds — ${p.fieldGoalResult||""}${p.fieldGoalResult==="Good"?" +3":""}`;
  if(p.type==="Rush")return `Rush ${pname(p.player)} ${sgn(p.yards)} yds${ex(p)}${p.extras?.includes("Fumble Lost")?" — LOST":""}`;
  if(p.type==="Pass"){if(p.sub==="Complete")return `Pass ${pname(p.player)} → ${pname(p.player2)} ${sgn(p.yards)} yds${ex(p)}${p.extras?.includes("Fumble Lost")?" — LOST":""}`;return `Pass ${pname(p.player)} — ${p.sub}`}
  if(p.type==="Punt")return `Punt — ${pname(p.player)} ${Math.abs(Number(p.yards)||0)} yds`;
  if(p.type==="Defense"){const bits=[];if(p.defCredits){bits.push(Object.entries(p.defCredits).map(([id,v])=>`${pname(id)}${Number(v)===0.5?" (0.5)":""}`).join(" + "));}if(p.passDefendedPlayerId)bits.push(`PD ${pname(p.passDefendedPlayerId)}`);if(p.interceptionPlayerId)bits.push(`INT ${pname(p.interceptionPlayerId)}${Number.isFinite(Number(p.returnYards))?` ${Number(p.returnYards)} yd return`:""}`);if(p.fumbleRecoveryPlayerId)bits.push(`FR ${pname(p.fumbleRecoveryPlayerId)}${Number.isFinite(Number(p.returnYards))?` ${Number(p.returnYards)} yd return`:""}`);if(p.defensiveTouchdownPlayerId)bits.push(`TD ${pname(p.defensiveTouchdownPlayerId)}`);return `${p.sub}${bits.length?" — "+bits.join(" · "):""}`;}
  return `${p.sub} — ${pname(p.player)} ${sgn(p.yards)} yds${ex(p)}`
}
function renderRecent(){
  const g=currentGame();if(!g){$("#recent").innerHTML='<span class="muted">No game open.</span>';return}
  const arr=[...g.plays].reverse();
  $("#recent").innerHTML=arr.length?arr.map(p=>`<div class="play"><div class="playtop"><div><strong>${esc(ptext(p))}</strong><div class="muted">${new Date(p.ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div></div><div class="playactions"><button class="edit-play" data-id="${p.id}">Edit</button><button class="del delete-play" data-id="${p.id}">Delete</button></div></div></div>`).join(""):'<span class="muted">No plays yet.</span>';
  $$(".delete-play").forEach(b=>b.addEventListener("click",()=>{g.plays=g.plays.filter(p=>p.id!==b.dataset.id);rebuildGameState(g);g.ourScore=displayedOurScore(g);persist();renderLiveGame();toast("Play deleted")}));
  $$(".edit-play").forEach(b=>b.addEventListener("click",()=>openEditor(b.dataset.id)))
}
function playerOptions(selected){return S.roster.map(p=>`<option value="${p.id}" ${p.id===selected?"selected":""}>#${p.jersey} ${esc(p.name)}</option>`).join("")}
function openEditor(id){
  const g=currentGame(),p=g.plays.find(x=>x.id===id);if(!p)return;S.editingPlayId=id;
  if(p.type==="Defense"&&p.defCredits){let html=`<div class="muted">Defense • ${esc(p.sub)}</div><label>Defender credits</label>`;html+=S.roster.map(r=>{const cur=Number(p.defCredits[r.id]||0);return `<div class="def-credit-row"><div class="def-credit-player"><span>#${r.jersey}</span> ${esc(r.name)}</div><button type="button" class="credit-btn edit-def-credit ${cur===0.5?"active":""}" data-id="${r.id}" data-v="0.5">0.5</button><button type="button" class="credit-btn edit-def-credit ${cur===1?"active":""}" data-id="${r.id}" data-v="1">1.0</button></div>`;}).join("");$("#editFields").innerHTML=html;$("#editPlayCard").classList.remove("hidden");const temp={...p.defCredits};$$(".edit-def-credit").forEach(b=>b.addEventListener("click",()=>{const pid=b.dataset.id,v=Number(b.dataset.v);if(Number(temp[pid])===v){delete temp[pid];b.classList.remove("active")}else{temp[pid]=v;document.querySelectorAll(`.edit-def-credit[data-id="${pid}"]`).forEach(x=>x.classList.remove("active"));b.classList.add("active")}$("#editPlayCard").dataset.defCredits=JSON.stringify(temp);}));$("#editPlayCard").dataset.defCredits=JSON.stringify(temp);$("#editPlayCard").scrollIntoView({behavior:"smooth",block:"center"});return;}
  let html=`<div class="muted">${esc(p.type)}${p.sub?" • "+esc(p.sub):""}</div>`;
  if(p.player)html+=`<label>${p.type==="Pass"?"QB / Player":"Player"}</label><select id="editPlayer">${playerOptions(p.player)}</select>`;
  if(p.player2)html+=`<label>Receiver</label><select id="editPlayer2">${playerOptions(p.player2)}</select>`;
  if(p.type==="Rush"||p.type==="Special"||(p.type==="Pass"&&p.sub==="Complete"))html+=`<label>Yards</label><input id="editYards" inputmode="numeric" value="${p.yards||0}">`;
  if(p.type==="Rush"||p.type==="Special"||(p.type==="Pass"&&p.sub==="Complete")){
    const choices=["TD","Fumble","1PT","2PT"];
    html+=`<label>Extras</label><div class="checks">${choices.map(x=>`<label class="check"><input type="checkbox" class="editExtra" value="${x}" ${p.extras?.includes(x)?"checked":""}>${x}</label>`).join("")}</div>`;
  }
  $("#editFields").innerHTML=html;$("#editPlayCard").classList.remove("hidden");$("#editPlayCard").scrollIntoView({behavior:"smooth",block:"center"})
}
$("#cancelEdit").addEventListener("click",()=>{$("#editPlayCard").classList.add("hidden");S.editingPlayId=null});
$("#saveEdit").addEventListener("click",()=>{
  const g=currentGame(),p=g?.plays.find(x=>x.id===S.editingPlayId);if(!p)return;
  if(p.type==="Defense"&&p.defCredits){const credits=JSON.parse($("#editPlayCard").dataset.defCredits||"{}");if(!Object.keys(credits).length)return toast("Select at least one defender");p.defCredits=credits;p.cloudEditedAt=Date.now();rebuildGameState(g);g.ourScore=displayedOurScore(g);persist();$("#editPlayCard").classList.add("hidden");S.editingPlayId=null;renderLiveGame();toast("Play updated");return;}
  if($("#editPlayer"))p.player=$("#editPlayer").value;if($("#editPlayer2"))p.player2=$("#editPlayer2").value;p.cloudEditedAt=Date.now();
  if($("#editYards")){const y=parseInt($("#editYards").value,10);if(Number.isNaN(y))return toast("Enter valid yards");p.yards=y}
  if($$(".editExtra").length)p.extras=$$(".editExtra").filter(x=>x.checked).map(x=>x.value);
  rebuildGameState(g);g.ourScore=displayedOurScore(g);persist();$("#editPlayCard").classList.add("hidden");S.editingPlayId=null;renderLiveGame();toast("Play updated")
});

function agg(g){
  let m={};S.roster.forEach(p=>m[p.id]={id:p.id,j:p.jersey,n:p.name,car:0,ry:0,rtd:0,att:0,cmp:0,py:0,ptd:0,pi:0,rec:0,rey:0,retd:0,tgt:0,drop:0,t:0,tfl:0,sack:0,int:0,ff:0,fr:0,dtd:0,kr:0,kry:0,pr:0,pry:0,punt:0,punty:0,stff:0,stfr:0,ko:0,kotb:0,koYds:0,pd:0,tryKickAtt:0,tryKickMade:0,tryRunAtt:0,tryRunMade:0,tryPassAtt:0,tryPassMade:0,fga:0,fgm:0,fgLong:0,rfd:0,pfd:0,recfd:0});
  (g?.plays||[]).forEach(p=>{let a=m[p.player],b=m[p.player2];
    if(p.type==="Rush"&&a){a.car++;a.ry+=+p.yards||0;if(p.extras?.includes("TD"))a.rtd++;if(offensivePlayEarnedFirstDown(p))a.rfd++}
    if(p.type==="Pass"&&a){if(["Complete","Incomplete","Intercepted"].includes(p.sub))a.att++;if(p.sub==="Complete"){a.cmp++;a.py+=+p.yards||0;if(p.extras?.includes("TD"))a.ptd++;if(offensivePlayEarnedFirstDown(p))a.pfd++;if(b){b.rec++;b.rey+=+p.yards||0;if(p.extras?.includes("TD"))b.retd++;if(offensivePlayEarnedFirstDown(p))b.recfd++}}if(p.sub==="Intercepted")a.pi++}
    if(p.type==="Pass"&&p.player2&&m[p.player2]&&(p.sub==="Complete"||p.sub==="Incomplete"||p.sub==="Intercepted")){
      m[p.player2].tgt++;
      if(p.sub==="Incomplete"&&p.drop)m[p.player2].drop++;
    }
    if(p.type==="Defense"){
      if(p.defCredits){
        Object.entries(p.defCredits).forEach(([id,credit])=>{
          const d=m[id];if(!d)return;const v=Number(credit)||0;
          if(p.tackleKind==="TFL"||p.sub==="TFL")d.tfl+=v;
          else if(p.tackleKind==="Tackle"||p.sub==="Tackle"||p.sub==="Opponent Run"||p.sub==="Complete Pass")d.t+=v;
          if(p.sub==="Sack")d.sack+=v;
        });
      }else if(a){
        if(p.tackleKind==="TFL"||p.sub==="TFL")a.tfl++;
        else if(p.tackleKind==="Tackle"||p.sub==="Tackle")a.t++;
        if(p.sub==="Sack")a.sack++;
      }
      if(p.passDefendedPlayerId&&m[p.passDefendedPlayerId])m[p.passDefendedPlayerId].pd++;
      if(p.interceptionPlayerId&&m[p.interceptionPlayerId])m[p.interceptionPlayerId].int++;
      else if(p.sub==="INT"&&a)a.int++;
      if(p.forcedFumblePlayerId&&m[p.forcedFumblePlayerId])m[p.forcedFumblePlayerId].ff++;
      else if(p.sub==="Forced Fumble"&&a)a.ff++;
      if(p.fumbleRecoveryPlayerId&&m[p.fumbleRecoveryPlayerId])m[p.fumbleRecoveryPlayerId].fr++;
      else if(p.sub==="Fumble Recovery"&&a)a.fr++;
    }
    if(p.type==="Defense"){
      if(p.defensiveTouchdownPlayerId&&m[p.defensiveTouchdownPlayerId]){
        m[p.defensiveTouchdownPlayerId].dtd+=1;
      }else if(p.extras?.includes("Defensive TD")){
        const tdId=p.fumbleRecoveryPlayerId||p.interceptionPlayerId||null;
        if(tdId&&m[tdId])m[tdId].dtd+=1;
      }
    }
    if(p.type==="Special"&&a){
      if(p.sub==="Kick Return"){a.kr++;a.kry+=+p.yards||0}
      else if(p.sub==="Punt Return"){a.pr++;a.pry+=+p.yards||0}
      else if(p.sub==="Forced Fumble"){a.stff++}
      else if(p.sub==="Fumble Recovery"){a.stfr++}
    }
    if(p.type==="Kickoff"&&a){a.ko++;a.koYds+=Math.max(0,Number(p.yards)||0);if(p.kickoffResult==="Touchback")a.kotb++;}
    if(p.type==="Try"&&a){if(p.tryType==="Kick"){a.tryKickAtt++;if(p.tryResult==="Good")a.tryKickMade++}else if(p.tryType==="Run"){a.tryRunAtt++;if(p.tryResult==="Good")a.tryRunMade++}else if(p.tryType==="Pass"){a.tryPassAtt++;if(p.tryResult==="Good")a.tryPassMade++}}
    if(p.type==="Field Goal"&&a){a.fga++;if(p.fieldGoalResult==="Good"){a.fgm++;a.fgLong=Math.max(a.fgLong,Number(p.fieldGoalDistance||p.yards||0));}}
    if(p.type==="Kickoff Return"&&a){a.kr++;a.kry+=+p.yards||0}
    if(p.type==="Punt"&&a){a.punt++;a.punty+=Math.abs(+p.yards||0)}
  });return Object.values(m)
}

function sortedGames(){return [...(S.games||[])].sort((a,b)=>(Number(b.week||0)-Number(a.week||0))||String(b.date||"").localeCompare(String(a.date||"")))}
function latestGame(){return sortedGames()[0]||null}
function selectedStatsGame(){
  const games=sortedGames();
  if(!games.length)return null;
  if(selectedStatsGameId){
    const g=games.find(x=>x.id===selectedStatsGameId);
    if(g)return g;
  }
  const active=currentGame();
  if(active){selectedStatsGameId=active.id;return active}
  selectedStatsGameId=games[0].id;
  return games[0];
}
function renderGameHistoryPicker(){
  const picker=$("#gameHistoryPicker"),sel=$("#statsGameSelect");
  picker.classList.toggle("hidden",statsScope!=="game");
  if(statsScope!=="game")return;
  const games=sortedGames();
  if(!games.length){sel.innerHTML='<option>No games yet</option>';sel.disabled=true;return}
  sel.disabled=false;
  const chosen=selectedStatsGame();
  sel.innerHTML=games.map(g=>{
    const us=displayedOurScore(g),them=Number(g.oppScore||0),result=us>them?"W":us<them?"L":"T";
    const type=(g.gameType||"regular")==="playoff"?"Playoff":"Regular";
    return `<option value="${g.id}" ${chosen&&chosen.id===g.id?"selected":""}>${g.date} — vs ${esc(g.opponent)} — ${result} ${us}-${them} — ${type}</option>`;
  }).join("");
}
$("#statsGameSelect").addEventListener("change",()=>{selectedStatsGameId=$("#statsGameSelect").value;renderStats()});
function statGame(){return currentGame()||latestGame()}
function scopeGames(scope){
  const games=[...(S.games||[])];
  if(scope==="game"){const g=selectedStatsGame();return g?[g]:[]}
  if(scope==="regular")return games.filter(g=>(g.gameType||"regular")==="regular");
  if(scope==="playoff")return games.filter(g=>(g.gameType||"regular")==="playoff");
  return games;
}
function recordFor(games){
  let w=0,l=0,t=0;
  games.forEach(g=>{const us=displayedOurScore(g),them=Number(g.oppScore||0);if(us>them)w++;else if(us<them)l++;else t++});
  return t?`${w}-${l}-${t}`:`${w}-${l}`;
}


function penaltyMetrics(plays){
  const ps=(plays||[]).filter(p=>p.type==="Penalty"&&!p.opponentOffenseAdjustment),byType={},byPlayer={},byQuarter={1:0,2:0,3:0,4:0};
  ps.forEach(p=>{byType[p.penaltyType||"Other"]=(byType[p.penaltyType||"Other"]||0)+1;const n=penaltyPlayerName(p);byPlayer[n]=(byPlayer[n]||0)+1;const q=Number(p.quarter||1);byQuarter[q]=(byQuarter[q]||0)+1});
  const off=ps.filter(p=>p.stateBefore?.possession==="ours"),def=ps.filter(p=>p.stateBefore?.possession==="opp");
  return {penalties:ps.length,penaltyYards:ps.reduce((a,p)=>a+Math.abs(Number(p.penaltyYards||0)),0),offensivePenalties:off.length,offensivePenaltyYards:off.reduce((a,p)=>a+Math.abs(Number(p.penaltyYards||0)),0),defensivePenalties:def.length,defensivePenaltyYards:def.reduce((a,p)=>a+Math.abs(Number(p.penaltyYards||0)),0),unknownPenalties:ps.filter(p=>!p.penaltyPlayer||p.penaltyPlayer==="UNKNOWN").length,byType,byPlayer,byQuarter};
}

function calcTeamMetrics(plays,games=[]){
  const pm=penaltyMetrics(plays);
  const p=plays||[];
  const offense=p.filter(x=>x.type==="Rush"||x.type==="Pass");
  const defense=p.filter(x=>x.type==="Defense");
  const special=p.filter(x=>["Kickoff","Kickoff Return","Punt","Special","Field Goal"].includes(x.type));
  const rush=p.filter(x=>x.type==="Rush"), passes=p.filter(x=>x.type==="Pass");
  const rushY=rush.reduce((a,x)=>a+(Number(x.yards)||0),0);
  const passComp=passes.filter(x=>x.sub==="Complete");
  const passY=passComp.reduce((a,x)=>a+(Number(x.yards)||0),0);
  const firstDowns=offense.filter(offensivePlayEarnedFirstDown).length;
  const turnovers=passes.filter(x=>x.sub==="Intercepted").length+p.filter(x=>x.extras?.includes("Fumble Lost")).length;
  const takeaways=defense.filter(x=>
    !!x.interceptionPlayerId||
    !!x.fumbleRecoveryPlayerId||
    x.sub==="INT"||
    x.sub==="Fumble Recovery"
  ).length;
  const tfl=defense.filter(x=>x.sub==="TFL").length,sacks=defense.filter(x=>x.sub==="Sack").length;
  const explosive10=offense.filter(x=>Math.abs(Number(x.yards)||0)>=10 && (Number(x.yards)||0)>=10).length;
  const explosive20=offense.filter(x=>(Number(x.yards)||0)>=20).length;
  const longestRush=Math.max(0,...rush.map(x=>Number(x.yards)||0));
  const longestPass=Math.max(0,...passComp.map(x=>Number(x.yards)||0));
  const kr=p.filter(x=>x.type==="Kickoff Return"||(x.type==="Special"&&x.sub==="Kick Return"));
  const longestKR=Math.max(0,...kr.map(x=>Number(x.yards)||0));
  const attemptPasses=passes.filter(x=>["Complete","Incomplete","Intercepted"].includes(x.sub));
  const completions=passComp.length,attempts=attemptPasses.length;
  const passTD=passes.filter(x=>x.extras?.includes("TD")).length,ints=passes.filter(x=>x.sub==="Intercepted").length;
  const snapRecords=(games||[]).flatMap(g=>g.snapRecords||[]);
  const snapOpps=snapRecords.length;
  const below10=(S.roster||[]).filter(pl=>snapRecords.reduce((a,r)=>a+((r.playerIds||[]).includes(pl.id)?1:0),0)<10).length;
  return {
    penalties:pm.penalties,penaltyYards:pm.penaltyYards,offensivePenalties:pm.offensivePenalties,offensivePenaltyYards:pm.offensivePenaltyYards,defensivePenalties:pm.defensivePenalties,defensivePenaltyYards:pm.defensivePenaltyYards,unknownPenalties:pm.unknownPenalties,
    offensivePlays:offense.length,defensivePlays:defense.length,totalScrimmage:offense.length+defense.length,specialTeamsPlays:special.length,
    rushAttempts:rush.length,passAttempts:attempts,rushPct:offense.length?rush.length/offense.length:0,passPct:offense.length?attempts/offense.length:0,
    rushingYards:rushY,passingYards:passY,totalOffense:rushY+passY,yardsPerPlay:offense.length?(rushY+passY)/offense.length:0,
    firstDowns,turnovers,takeaways,turnoverMargin:takeaways-turnovers,tfl,sacks,
    explosive10,explosive20,longestRush,longestPass,longestKickReturn:longestKR,
    completions,completionPct:attempts?completions/attempts:0,passingTD:passTD,interceptions:ints,passerRating:passerRating(completions,attempts,passY,passTD,ints),tdIntRatio:ints?passTD/ints:(passTD?passTD:0),
    tflRate:defense.length?tfl/defense.length:0,sackRate:defense.length?sacks/defense.length:0,takeawayRate:defense.length?takeaways/defense.length:0,
    snapOpportunities:snapOpps,playersBelow10:below10
  };
}
function pct(v){return `${(Number(v||0)*100).toFixed(0)}%`}
function renderTeamMetrics(src){
  const box=$("#teamMetricsBox");if(!box)return;
  if(!src){box.innerHTML="";return}
  const m=calcTeamMetrics(src.plays,src.games);
  box.innerHTML=`<h3 style="margin:0 0 10px;color:var(--p)">Team Summary</h3><div class="metric-grid">
    <div class="metric-card"><strong>Offensive plays</strong><div class="metric-main">${m.offensivePlays}</div><div class="metric-sub">${m.rushAttempts} rush • ${m.passAttempts} pass</div></div>
    <div class="metric-card"><strong>Defense</strong><div class="metric-main">${m.defensivePlays}</div><div class="metric-sub">${m.tfl} TFL • ${m.sacks} sacks</div></div>
    <div class="metric-card"><strong>Total offense</strong><div class="metric-main">${m.totalOffense}</div><div class="metric-sub">${m.yardsPerPlay.toFixed(1)} yards/play</div></div>
    <div class="metric-card"><strong>Scrimmage plays</strong><div class="metric-main">${m.totalScrimmage}</div><div class="metric-sub">+ ${m.specialTeamsPlays} special teams</div></div>
    <div class="metric-card"><strong>First downs</strong><div class="metric-main">${m.firstDowns}</div><div class="metric-sub">Explosive: ${m.explosive10} 10+ • ${m.explosive20} 20+</div></div>
    <div class="metric-card"><strong>Turnover margin</strong><div class="metric-main">${m.turnoverMargin>0?"+":""}${m.turnoverMargin}</div><div class="metric-sub">${m.takeaways} takeaways • ${m.turnovers} giveaways</div></div>
    <div class="metric-card"><strong>Passing</strong><div class="metric-main">${m.passerRating==null?"—":m.passerRating.toFixed(1)}</div><div class="metric-sub">RATE • ${m.completions}/${m.passAttempts} • ${pct(m.completionPct)} • ${m.passingTD} TD • ${m.interceptions} INT</div></div>
    <div class="metric-card"><strong>Longest plays</strong><div class="metric-main">${Math.max(m.longestRush,m.longestPass)}</div><div class="metric-sub">Rush ${m.longestRush} • Pass ${m.longestPass} • KR ${m.longestKickReturn}</div></div>
    <div class="metric-card"><strong>Penalties</strong><div class="metric-main">${m.penalties}</div><div class="metric-sub">${m.penaltyYards} yds • Off ${m.offensivePenalties} • Def ${m.defensivePenalties}</div></div>
    <div class="metric-card"><strong>Unknown/team penalties</strong><div class="metric-main">${m.unknownPenalties}</div><div class="metric-sub">Included in penalty totals</div></div>
    <div class="metric-card metric-wide"><strong>Snap compliance</strong><div class="metric-main">${m.playersBelow10} below 10</div><div class="metric-sub">${m.snapOpportunities} snap-tracker plays recorded in this view</div></div>
  </div>`;
}

function teamSpecialCounts(plays){
  const list=plays||[];
  return {
    kickoffs:list.filter(p=>p.type==="Kickoff").length,
    kickoffReturns:list.filter(p=>p.type==="Kickoff Return"||(p.type==="Special"&&p.sub==="Kick Return")).length,
    punts:list.filter(p=>p.type==="Punt").length,
    puntReturns:list.filter(p=>p.type==="Special"&&p.sub==="Punt Return").length,
    fieldGoals:list.filter(p=>p.type==="Field Goal").length
  };
}

function statsSource(scope=statsScope){
  const games=scopeGames(scope);
  if(!games.length)return null;
  if(scope==="game"){
    const g=games[0];
    return {scope,kind:"game",games,plays:g.plays||[],game:g,title:"Game",
      label:`${S.team.name} ${displayedOurScore(g)} – ${g.oppScore} ${g.opponent} • ${g.date} • ${g.location} • ${(g.gameType||"regular")==="playoff"?"Playoff":"Regular Season"}`};
  }
  const labels={regular:"Regular Season Totals",playoff:"Playoff Totals",season:"Season Totals"};
  return {scope,kind:"aggregate",games,plays:games.flatMap(g=>g.plays||[]),title:labels[scope],
    label:`${S.team.season||""} ${labels[scope]} • ${games.length} game${games.length===1?"":"s"} • ${recordFor(games)}`};
}
function tbl(h,rows,totalRow=null){
  if(!rows.length&&!totalRow)return'<div class="muted">No stats yet.</div>';
  return `<div class="stats-table-scroll"><table class="stats-data-table"><tr>${h.map(x=>`<th>${x}</th>`).join("")}</tr>${rows.map(r=>`<tr>${r.map(x=>`<td>${esc(String(x))}</td>`).join("")}</tr>`).join("")}${totalRow?`<tr class="stat-total-row">${totalRow.map(x=>`<td>${esc(String(x))}</td>`).join("")}</tr>`:""}</table></div>`
}


let snapSelections={};

function initializeSnapSelections(){
  snapSelections={};
  (S.roster||[]).forEach(p=>snapSelections[p.id]=true);
}


function snapRecordsForGames(games){return (games||[]).flatMap(g=>(g.snapRecords||[]).map((r,i)=>({...r,gameId:g.id,gameDate:g.date,opponent:g.opponent,gameType:g.gameType||"regular",snapSequence:i+1})))}
function playerSnapCountForGames(playerId,games){return snapRecordsForGames(games).reduce((a,r)=>a+((r.playerIds||[]).includes(playerId)?1:0),0)}

function currentGameSnapCount(playerId){
  const g=currentGame();
  if(!g||!Array.isArray(g.snapRecords))return 0;
  return g.snapRecords.reduce((sum,r)=>sum+(r.playerIds||[]).includes(playerId),0);
}
function renderSnaps(){
  normalizeRoster();
  if(!Object.keys(snapSelections).length)initializeSnapSelections();

  const box=$("#snapRoster");
  if(!S.roster.length){
    box.innerHTML='<span class="muted">Add your roster first.</span>';
    $("#recordSnapBtn").disabled=true;
    $("#snapOnFieldCount").textContent="0 on field";
    $("#snapTotalCount").textContent="0 snaps recorded";
    $("#playersUnderTen").textContent="0";
    return;
  }
  $("#recordSnapBtn").disabled=false;

  const ordered=[...S.roster].sort((a,b)=>a.jersey-b.jersey);
  box.innerHTML=ordered.map(p=>{
    const snaps=currentGameSnapCount(p.id);
    const pct=Math.min(100,(snaps/10)*100);
    const done=snaps>=10;
    return `
    <label class="snap-player ${done?"complete":"needs-snaps"}">
      <input class="snap-check" type="checkbox" data-id="${p.id}" ${snapSelections[p.id]!==false?"checked":""}>
      <div class="snap-player-main">
        <div class="snap-player-name"><span class="num">#${p.jersey}</span>${esc(p.name)}</div>
      </div>
      <div class="snap-progress-wrap">
        <div class="snap-progress-top">
          <span class="snap-progress-count">${snaps} / 10</span>
          <span class="snap-progress-status ${done?"done":""}">${done?"MET":"NEEDS "+Math.max(0,10-snaps)}</span>
        </div>
        <div class="snap-bar"><div class="snap-bar-fill ${done?"done":""}" style="width:${pct}%"></div></div>
      </div>
    </label>`;
  }).join("");

  $$(".snap-check").forEach(ch=>ch.addEventListener("change",()=>{
    snapSelections[ch.dataset.id]=ch.checked;
    updateSnapSummary();
  }));
  updateSnapSummary();
}

function updateSnapSummary(){
  const on=(S.roster||[]).filter(p=>snapSelections[p.id]!==false).length;
  const g=currentGame();const total=g&&Array.isArray(g.snapRecords)?g.snapRecords.reduce((a,r)=>a+(r.playerIds||[]).length,0):0;
  const under=(S.roster||[]).filter(p=>currentGameSnapCount(p.id)<10).length;
  $("#snapOnFieldCount").textContent=`${on} on field`;
  $("#snapTotalCount").textContent=`${total} player-snaps`;
  $("#playersUnderTen").textContent=under;
}

$("#checkAllSnaps").addEventListener("click",()=>{
  initializeSnapSelections();renderSnaps();
});

$("#recordSnapBtn").addEventListener("click",()=>{
  if(!S.roster.length)return toast("Add your roster first");
  const onField=S.roster.filter(p=>snapSelections[p.id]!==false);
  if(!onField.length)return toast("No players selected");

  onField.forEach(p=>p.snaps=(p.snaps||0)+1);

  // Save a snap record to the active game as proof/history.
  const g=currentGame();
  if(g){
    if(!Array.isArray(g.snapRecords))g.snapRecords=[];
    g.snapRecords.push({
      id:uid(),
      ts:Date.now(),
      playerIds:onField.map(p=>p.id)
    });
  }

  persist();
  toast(`Snap recorded for ${onField.length} players`);

  // Keep the current on-field lineup exactly as selected for the next play.
  // The user changes personnel manually or taps Check All when needed.
  renderSnaps();
});


function renderStats(){document.documentElement.style.setProperty("--team-primary",S.team?.primary||"#111111");document.documentElement.style.setProperty("--team-accent",S.team?.secondary||"#f26a00");
  renderGameHistoryPicker();
  const src=statsSource(statsScope);
  $$(".scope-btn").forEach(b=>b.classList.toggle("active",b.dataset.scope===statsScope));
  $("#statsShareTitle").textContent=S.team?.name||"Team";
  $("#shareStatsBtn").textContent={
    game:"Share Game Stats",
    regular:"Share Regular Season Stats",
    playoff:"Share Playoff Stats",
    season:"Share Season Totals"
  }[statsScope];

  if(!src){
    $("#statsGameLabel").textContent="";
    $("#teamMetricsBox").innerHTML="";
    $("#statsBox").innerHTML=`<div class="stats-block"><span class="muted">No ${statsScope==="playoff"?"playoff":statsScope==="regular"?"regular season":"game"} stats yet.</span></div>`;
    return;
  }
  $("#statsGameLabel").textContent=src.label;
  renderTeamMetrics(src);
  const s=agg({plays:src.plays});

  const rushRows=s.filter(x=>x.car).map(x=>[pname(x.id),x.car,x.ry,(x.ry/x.car).toFixed(1),x.rfd,x.rtd]);
  const rushCar=s.reduce((a,x)=>a+x.car,0),rushYds=s.reduce((a,x)=>a+x.ry,0);
  const rushTot=["TEAM TOTAL",rushCar,rushYds,rushCar?(rushYds/rushCar).toFixed(1):"0.0",s.reduce((a,x)=>a+x.rfd,0),s.reduce((a,x)=>a+x.rtd,0)];

  const passRows=s.filter(x=>x.att).map(x=>[pname(x.id),`${x.cmp}/${x.att}`,x.py,(x.py/x.att).toFixed(1),x.pfd,x.ptd,x.pi,passerRatingText(x.cmp,x.att,x.py,x.ptd,x.pi)]);
  const passCmp=s.reduce((a,x)=>a+x.cmp,0),passAtt=s.reduce((a,x)=>a+x.att,0),passYds=s.reduce((a,x)=>a+x.py,0),passTD=s.reduce((a,x)=>a+x.ptd,0),passINT=s.reduce((a,x)=>a+x.pi,0);
  const passTot=["TEAM TOTAL",`${passCmp}/${passAtt}`,passYds,passAtt?(passYds/passAtt).toFixed(1):"0.0",s.reduce((a,x)=>a+x.pfd,0),passTD,passINT,passerRatingText(passCmp,passAtt,passYds,passTD,passINT)];

  const recRows=s.filter(x=>x.tgt||x.rec).map(x=>[
    pname(x.id),x.tgt,x.rec,x.rey,x.rec?fmt1(x.rey/x.rec):"0.0",x.recfd,x.retd,x.drop,x.tgt?`${Math.round((x.rec/x.tgt)*100)}%`:"0%"
  ]);
  const recTot=["TEAM TOTAL",
    s.reduce((a,x)=>a+x.tgt,0),
    s.reduce((a,x)=>a+x.rec,0),
    s.reduce((a,x)=>a+x.rey,0),
    s.reduce((a,x)=>a+x.rec,0)?fmt1(s.reduce((a,x)=>a+x.rey,0)/s.reduce((a,x)=>a+x.rec,0)):"0.0",
    s.reduce((a,x)=>a+x.recfd,0),
    s.reduce((a,x)=>a+x.retd,0),
    s.reduce((a,x)=>a+x.drop,0),
    s.reduce((a,x)=>a+x.tgt,0)?`${Math.round((s.reduce((a,x)=>a+x.rec,0)/s.reduce((a,x)=>a+x.tgt,0))*100)}%`:"0%"
  ];

  const defRows=s.filter(x=>x.t+x.tfl+x.sack+x.pd+x.int+x.ff+x.fr+x.dtd).map(x=>[pname(x.id),fmt(x.t),fmt(x.tfl),fmt(x.sack),fmt(x.pd),fmt(x.int),fmt(x.ff),fmt(x.fr),fmt(x.dtd)]);
  const defTot=["TEAM TOTAL",fmt(s.reduce((a,x)=>a+x.t,0)),fmt(s.reduce((a,x)=>a+x.tfl,0)),fmt(s.reduce((a,x)=>a+x.sack,0)),fmt(s.reduce((a,x)=>a+x.pd,0)),fmt(s.reduce((a,x)=>a+x.int,0)),fmt(s.reduce((a,x)=>a+x.ff,0)),fmt(s.reduce((a,x)=>a+x.fr,0)),fmt(s.reduce((a,x)=>a+x.dtd,0))];

  const specialRows=s.filter(x=>x.kr+x.pr+x.punt+x.stff+x.stfr+x.fga).map(x=>[
    pname(x.id),x.kr,x.kry,x.pr,x.pry,x.punt,x.punty,x.fgm,x.fga,x.fga?`${Math.round((x.fgm/x.fga)*100)}%`:"0%",x.fgLong,x.stff,x.stfr
  ]);
  const teamFGM=s.reduce((a,x)=>a+x.fgm,0),teamFGA=s.reduce((a,x)=>a+x.fga,0);
  const specialTot=["TEAM TOTAL",
    s.reduce((a,x)=>a+x.kr,0),
    s.reduce((a,x)=>a+x.kry,0),
    s.reduce((a,x)=>a+x.pr,0),
    s.reduce((a,x)=>a+x.pry,0),
    s.reduce((a,x)=>a+x.punt,0),
    s.reduce((a,x)=>a+x.punty,0),
    teamFGM,teamFGA,teamFGA?`${Math.round((teamFGM/teamFGA)*100)}%`:"0%",
    Math.max(0,...s.map(x=>x.fgLong||0)),
    s.reduce((a,x)=>a+x.stff,0),
    s.reduce((a,x)=>a+x.stfr,0)
  ];
  const specialTeamCounts=teamSpecialCounts(src.plays);

  const pm=penaltyMetrics(src.plays);
  $("#statsBox").innerHTML=
    `<div class="stats-block"><h3>Rushing</h3>${tbl(["Player","CAR","YDS","AVG","1D","TD"],rushRows,rushRows.length?rushTot:null)}</div>`+
    `<div class="stats-block"><h3>Passing</h3>${tbl(["Player","CMP/ATT","YDS","AVG","1D","TD","INT","RATE"],passRows,passRows.length?passTot:null)}</div>`+
    `<div class="stats-block"><h3>Receiving</h3>${tbl(["Player","TGT","REC","YDS","AVG","1D","TD","CATCH%"],recRows.map(r=>[r[0],r[1],r[2],r[3],r[4],r[5],r[6],r[8]]),recRows.length?[recTot[0],recTot[1],recTot[2],recTot[3],recTot[4],recTot[5],recTot[6],recTot[8]]:null)}</div>`+
    `<div class="stats-block"><h3>Defense</h3>${tbl(["Player","TKL","TFL","SACK","PD","INT","FF","FR","TD"],defRows,defRows.length?defTot:null)}</div>`+
    `<div class="stats-block"><h3>Special Teams</h3>
      <div class="scope-summary" style="margin-bottom:8px">
        <span class="scope-pill">Kickoffs ${specialTeamCounts.kickoffs}</span>
        <span class="scope-pill">Kick Returns ${specialTeamCounts.kickoffReturns}</span>
        <span class="scope-pill">Punts ${specialTeamCounts.punts}</span>
        <span class="scope-pill">Punt Returns ${specialTeamCounts.puntReturns}</span>
        <span class="scope-pill">FG Attempts ${specialTeamCounts.fieldGoals}</span>
      </div>
      ${tbl(["Player","KR","KR YDS","PR","PR YDS","PUNT","PUNT YDS","FGM","FGA","FG%","LONG","FF","FR"],specialRows,specialRows.length?specialTot:null)}
    </div>`+
    `<div class="stats-block"><h3>Penalties</h3><div class="scope-summary"><span class="scope-pill">${pm.penalties} penalties</span><span class="scope-pill">${pm.penaltyYards} yards</span><span class="scope-pill">Offense ${pm.offensivePenalties}</span><span class="scope-pill">Defense ${pm.defensivePenalties}</span><span class="scope-pill">Unknown ${pm.unknownPenalties}</span></div></div>`;
}
$$(".scope-btn").forEach(b=>b.addEventListener("click",()=>{statsScope=b.dataset.scope;renderStats()}));
function summaryText(g){
  if(!g)return "No game recorded.";
  return `${S.team.name} vs ${g.opponent}\n${g.date} • ${g.location}\nScore: ${S.team.name} ${displayedOurScore(g)} - ${g.oppScore} ${g.opponent}\n\n${g.plays.map(ptext).join("\n")}`
}
function shareTable(headers,rows){
  if(!rows.length)return '<div class="muted">No stats recorded.</div>';
  return `<table class="share-stat-table"><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(String(c))}</td>`).join("")}</tr>`).join("")}</table>`
}
function renderShare(){
  const g=statGame();
  $("#shareTeam").textContent=S.team?.name||"Team";
  if(!g){
    $("#shareOurLabel").textContent=S.team?.name||"Team";$("#shareOurScore").textContent="0";
    $("#shareOppLabel").textContent="Opponent";$("#shareOppScore").textContent="0";$("#shareMeta").textContent="";
    $("#shareLeaders").innerHTML='<div class="muted">Record a game first.</div>';$("#shareOffense").innerHTML="";$("#shareDefense").innerHTML="";return
  }
  $("#shareOurLabel").textContent=S.team.name;$("#shareOurScore").textContent=displayedOurScore(g);
  $("#shareOppLabel").textContent=g.opponent;$("#shareOppScore").textContent=g.oppScore;
  $("#shareMeta").textContent=`${g.date} • ${g.location} • ${g.status==="complete"?"FINAL":"LIVE"}`;

  const s=agg(g);
  const rush=[...s].filter(x=>x.car).sort((a,b)=>b.ry-a.ry)[0];
  const pass=[...s].filter(x=>x.att).sort((a,b)=>b.py-a.py)[0];
  const rec=[...s].filter(x=>x.rec).sort((a,b)=>b.rey-a.rey)[0];
  const def=[...s].filter(x=>x.t+x.tfl+x.sack+x.int+x.ff+x.fr).sort((a,b)=>(b.t+b.tfl*2+b.sack*2+b.int*3)-(a.t+a.tfl*2+a.sack*2+a.int*3))[0];

  const leaders=[];
  if(rush)leaders.push(`<div class="leader-card"><strong>Rushing</strong>${esc(pname(rush.id))} • ${rush.car} CAR • ${rush.ry} YDS • ${rush.rtd} TD</div>`);
  if(pass)leaders.push(`<div class="leader-card"><strong>Passing</strong>${esc(pname(pass.id))} • ${pass.cmp}/${pass.att} • ${pass.py} YDS • ${pass.ptd} TD • ${passerRatingText(pass.cmp,pass.att,pass.py,pass.ptd,pass.pi)} RATE</div>`);
  if(rec)leaders.push(`<div class="leader-card"><strong>Receiving</strong>${esc(pname(rec.id))} • ${rec.rec} REC • ${rec.rey} YDS • ${rec.retd} TD</div>`);
  if(def)leaders.push(`<div class="leader-card"><strong>Defense</strong>${esc(pname(def.id))} • ${def.t} TKL • ${def.tfl} TFL • ${def.sack} SACK • ${def.int} INT</div>`);
  $("#shareLeaders").innerHTML=leaders.length?leaders.join(""):'<div class="muted">No individual stats yet.</div>';

  let offense="";
  offense+=`<h4>Rushing</h4>${shareTable(["Player","CAR","YDS","TD"],s.filter(x=>x.car).map(x=>[pname(x.id),x.car,x.ry,x.rtd]))}`;
  offense+=`<h4>Passing</h4>${shareTable(["Player","C/A","YDS","TD","INT","RATE"],s.filter(x=>x.att).map(x=>[pname(x.id),`${x.cmp}/${x.att}`,x.py,x.ptd,x.pi,passerRatingText(x.cmp,x.att,x.py,x.ptd,x.pi)]))}`;
  offense+=`<h4>Receiving</h4>${shareTable(["Player","REC","YDS","TD"],s.filter(x=>x.rec).map(x=>[pname(x.id),x.rec,x.rey,x.retd]))}`;
  $("#shareOffense").innerHTML=offense;
  $("#shareDefense").innerHTML=shareTable(["Player","TKL","TFL","SACK","PD","INT","FF","FR","TD"],s.filter(x=>x.t+x.tfl+x.sack+x.pd+x.int+x.ff+x.fr+x.dtd).map(x=>[pname(x.id),x.t,x.tfl,x.sack,x.pd,x.int,x.ff,x.fr,x.dtd]));
}
function roundRect(ctx,x,y,w,h,r,fill){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
}
function canvasText(ctx,text,x,y,size,weight,color,align="left"){
  ctx.font=`${weight} ${size}px -apple-system,BlinkMacSystemFont,Segoe UI,Arial`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(text,x,y)
}
function createSummaryCanvas(g){
  const W=1200,H=1500,cv=document.createElement("canvas");cv.width=W;cv.height=H;const c=cv.getContext("2d");
  c.fillStyle="#f4f6f5";c.fillRect(0,0,W,H);
  c.fillStyle=S.team.primary;c.fillRect(0,0,W,410);c.fillStyle=S.team.secondary;c.fillRect(0,390,W,20);
  canvasText(c,"SIDELINE STATS • GAME SUMMARY",70,72,28,800,"#ffffff");
  canvasText(c,S.team.name.toUpperCase(),70,135,58,900,"#ffffff");
  canvasText(c,S.team.name,260,235,28,800,"#ffffff","center");canvasText(c,String(displayedOurScore(g)),260,330,100,900,"#ffffff","center");
  canvasText(c,"VS",600,265,30,900,"#ffffffaa","center");
  canvasText(c,g.opponent,940,235,28,800,"#ffffff","center");canvasText(c,String(g.oppScore),940,330,100,900,"#ffffff","center");
  canvasText(c,`${g.date}  •  ${g.location}  •  ${g.status==="complete"?"FINAL":"LIVE"}`,600,370,24,700,"#ffffffdd","center");

  const s=agg(g), rush=[...s].filter(x=>x.car).sort((a,b)=>b.ry-a.ry)[0], rec=[...s].filter(x=>x.rec).sort((a,b)=>b.rey-a.rey)[0],
        pass=[...s].filter(x=>x.att).sort((a,b)=>b.py-a.py)[0], def=[...s].filter(x=>x.t+x.tfl+x.sack+x.int).sort((a,b)=>(b.t+b.tfl*2+b.sack*2+b.int*3)-(a.t+a.tfl*2+a.sack*2+a.int*3))[0];

  canvasText(c,"GAME LEADERS",70,475,30,900,S.team.primary);
  let y=520;
  const cards=[];
  if(rush)cards.push(["RUSHING",`${pname(rush.id)}   ${rush.car} CAR  •  ${rush.ry} YDS  •  ${rush.rtd} TD`]);
  if(pass)cards.push(["PASSING",`${pname(pass.id)}   ${pass.cmp}/${pass.att}  •  ${pass.py} YDS  •  ${pass.ptd} TD  •  ${passerRatingText(pass.cmp,pass.att,pass.py,pass.ptd,pass.pi)} RATE`]);
  if(rec)cards.push(["RECEIVING",`${pname(rec.id)}   ${rec.rec} REC  •  ${rec.rey} YDS  •  ${rec.retd} TD`]);
  if(def)cards.push(["DEFENSE",`${pname(def.id)}   ${def.t} TKL  •  ${def.tfl} TFL  •  ${def.sack} SACK  •  ${def.int} INT`]);
  cards.slice(0,4).forEach(([lab,val])=>{roundRect(c,70,y,1060,105,18,"#ffffff");c.fillStyle=S.team.secondary;c.fillRect(70,y,12,105);canvasText(c,lab,105,y+38,20,900,S.team.primary);canvasText(c,val,105,y+76,27,700,"#152019");y+=125});

  y+=20;canvasText(c,"TEAM STATS",70,y,30,900,S.team.primary);y+=52;
  const rushAtt=s.reduce((a,x)=>a+x.car,0),rushY=s.reduce((a,x)=>a+x.ry,0),passAtt=s.reduce((a,x)=>a+x.att,0),passCmp=s.reduce((a,x)=>a+x.cmp,0),passY=s.reduce((a,x)=>a+x.py,0),
        recs=s.reduce((a,x)=>a+x.rec,0),tackles=s.reduce((a,x)=>a+x.t,0),tfl=s.reduce((a,x)=>a+x.tfl,0),sacks=s.reduce((a,x)=>a+x.sack,0),ints=s.reduce((a,x)=>a+x.int,0);
  const teamPassTD=s.reduce((a,x)=>a+x.ptd,0),teamPassINT=s.reduce((a,x)=>a+x.pi,0);
  const tiles=[["RUSHING",`${rushAtt} CAR`,`${rushY} YDS`],["PASSING",`${passCmp}/${passAtt}`,`${passY} YDS • ${passerRatingText(passCmp,passAtt,passY,teamPassTD,teamPassINT)} RATE`],["RECEIVING",`${recs} REC`,""],["DEFENSE",`${tackles} TKL`,`${tfl} TFL • ${sacks} SACK • ${ints} INT`]];
  tiles.forEach((t,i)=>{let col=i%2,row=Math.floor(i/2),x=70+col*535,yy=y+row*145;roundRect(c,x,yy,500,120,18,"#ffffff");canvasText(c,t[0],x+25,yy+35,19,900,S.team.primary);canvasText(c,t[1],x+25,yy+77,33,900,"#152019");if(t[2])canvasText(c,t[2],x+230,yy+77,22,700,"#68736b")});
  canvasText(c,`${S.team.name} • ${S.team.grade||""} • ${S.team.season||""}`,600,1450,22,700,"#68736b","center");
  return cv
}
const SHARE_W=1170, SHARE_H=2532, SHARE_MARGIN=42;
function rr(c,x,y,w,h,r,fill){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill()}
function tx(c,t,x,y,size,weight,color,align="left"){c.font=`${weight} ${size}px -apple-system,BlinkMacSystemFont,Segoe UI,Arial`;c.fillStyle=color;c.textAlign=align;c.fillText(String(t),x,y)}
function fmt(v){return Number.isInteger(Number(v))?String(Number(v)):Number(v).toFixed(1)}
function fmt1(v){const n=Number(v);return Number.isFinite(n)?n.toFixed(1):"0.0"}
// NFL passer rating: completion %, yards/attempt, TD %, INT %, each component capped 0–2.375; max 158.3.
function passerRating(cmp,att,yds,td,ints){
  const A=Number(att)||0;if(A<=0)return null;
  const clamp=v=>Math.max(0,Math.min(2.375,v));
  const a=clamp(((Number(cmp)||0)/A-.3)*5);
  const b=clamp((((Number(yds)||0)/A)-3)*.25);
  const c=clamp(((Number(td)||0)/A)*20);
  const d=clamp(2.375-((Number(ints)||0)/A)*25);
  return ((a+b+c+d)/6)*100;
}
function passerRatingText(cmp,att,yds,td,ints){const r=passerRating(cmp,att,yds,td,ints);return r==null?"—":r.toFixed(1)}

function shareRgba(hex,a){
  let h=(hex||"#000000").replace("#","");
  if(h.length===3)h=h.split("").map(x=>x+x).join("");
  const r=parseInt(h.slice(0,2),16)||0,g=parseInt(h.slice(2,4),16)||0,b=parseInt(h.slice(4,6),16)||0;
  return `rgba(${r},${g},${b},${a})`;
}
function shareRR(c,x,y,w,h,r,fill){
  c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();
}
function splitTeamName(name){
  const parts=String(name||"").trim().split(/\s+/).filter(Boolean);
  if(parts.length<=1)return {town:parts[0]||"TEAM",mascot:""};
  return {town:parts.slice(0,-1).join(" "),mascot:parts[parts.length-1]};
}
function shareFitTX(c,t,x,y,maxWidth,startSize,minSize,weight,color,align="center"){
  let size=startSize;
  const text=String(t||"");
  while(size>minSize){
    c.font=`${weight} ${size}px -apple-system,BlinkMacSystemFont,Segoe UI,Arial`;
    if(c.measureText(text).width<=maxWidth)break;
    size-=2;
  }
  c.fillStyle=color;
  c.textAlign=align;
  c.fillText(text,x,y);
  return size;
}

function splitTeamDisplayName(name){
  const raw=String(name||"TEAM").trim().replace(/\s+/g," ");
  const parts=raw.split(" ");
  if(parts.length===1)return {place:"",mascot:parts[0]};
  return {place:parts.slice(0,-1).join(" "),mascot:parts[parts.length-1]};
}
function fitTextSize(c,text,maxWidth,startSize,minSize,weight=950){
  let size=startSize;
  const t=String(text||"");
  while(size>minSize){
    c.font=`${weight} ${size}px -apple-system,BlinkMacSystemFont,Segoe UI,Arial`;
    if(c.measureText(t).width<=maxWidth)break;
    size-=1;
  }
  return size;
}
function drawTeamIdentity(c,name,x,y,w,side,accent){
  const d=splitTeamDisplayName(name);
  const place=d.place.toUpperCase();
  const mascot=d.mascot.toUpperCase();

  const placeSize=fitTextSize(c,place||mascot,w,26,16,900);
  const mascotSize=fitTextSize(c,mascot,w,34,22,950);

  if(place){
    shareTX(c,place,x,y,placeSize,900,"#fff","center");
    shareTX(c,mascot,x,y+34,mascotSize,950,accent,"center");
  }else{
    shareTX(c,mascot,x,y+17,mascotSize,950,accent,"center");
  }
}
function shareSportTX(c,t,x,y,size,color,align="center"){
  c.font=`italic 900 ${size}px "Arial Narrow","Helvetica Neue Condensed",Arial,sans-serif`;
  c.fillStyle=color;
  c.textAlign=align;
  c.fillText(String(t),x,y);
}
function shareTX(c,t,x,y,size,weight,color,align="left"){
  c.font=`${weight} ${size}px -apple-system,BlinkMacSystemFont,Segoe UI,Arial`;
  c.fillStyle=color;c.textAlign=align;c.fillText(String(t),x,y);
}
function loadImg(src){
  return new Promise((resolve,reject)=>{
    if(!src)return reject(new Error("Missing image source"));
    const im=new Image();
    im.onload=()=>resolve(im);
    im.onerror=()=>reject(new Error("Image failed to load"));
    im.src=src;
  });
}
async function drawRoundedShareImage(c,src,x,y,w,h,r=18){
  const im=await loadImg(src);
  const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height;
  const scale=Math.min(w/iw,h/ih),dw=iw*scale,dh=ih*scale,dx=x+(w-dw)/2,dy=y+(h-dh)/2;
  c.save();c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();c.clip();c.drawImage(im,dx,dy,dw,dh);c.restore();
}
async function drawShareImage(c,data,x,y,w,h,pad=10){
  if(!data)return false;
  try{
    const im=await loadImg(data);
    shareRR(c,x,y,w,h,Math.min(22,h*.2),"#fff");
    const sc=Math.min((w-pad*2)/im.width,(h-pad*2)/im.height),dw=im.width*sc,dh=im.height*sc;
    c.drawImage(im,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
    return true;
  }catch(e){return false}
}
async function drawBroadcastHeader(c,W,src,opts={}){
  const P=S.team?.primary||"#111111",A=S.team?.secondary||"#f26a00",compact=!!opts.compact,g=src?.kind==="game"?src.game:null;
  const brandH=Math.round(W*(468/1536));
  const scoreBodyH=compact?266:310,metaH=compact?54:62,H=brandH+(g?scoreBodyH+metaH:0);
  c.fillStyle="#071019";c.fillRect(0,0,W,H);
  try{
    const brandIm=await loadImg("brand-header.png");
    c.drawImage(brandIm,0,0,brandIm.naturalWidth||brandIm.width,brandIm.naturalHeight||brandIm.height,0,0,W,brandH);
  }catch(e){
    const grad=c.createLinearGradient(0,0,0,brandH);grad.addColorStop(0,"#040a12");grad.addColorStop(1,"#102018");c.fillStyle=grad;c.fillRect(0,0,W,brandH);
  }

  if(g){
    const bodyY=brandH,bodyBottom=H-metaH,bodyH=bodyBottom-bodyY;
    c.fillStyle=P;c.fillRect(0,bodyY,W,bodyH);
    const edgeTop=compact?205:220,edgeBottom=compact?162:176;c.fillStyle=A;c.beginPath();c.moveTo(0,bodyY);c.lineTo(edgeTop,bodyY);c.lineTo(edgeBottom,bodyBottom);c.lineTo(0,bodyBottom);c.closePath();c.fill();
    c.strokeStyle="#e9eeee";c.lineWidth=2;c.beginPath();c.moveTo(edgeTop+1,bodyY+6);c.lineTo(edgeBottom+1,bodyBottom-6);c.stroke();const rt=W-(compact?184:196),rb=W-(compact?154:166);c.beginPath();c.moveTo(rt,bodyY+6);c.lineTo(rb,bodyBottom-6);c.stroke();
    const ls=compact?116:132,ly=bodyY+(bodyH-ls)/2,lx=compact?22:26,rx=W-(compact?22:26)-ls,pad=6,rad=compact?16:19;shareRR(c,lx-pad,ly-pad,ls+pad*2,ls+pad*2,rad+3,P);shareRR(c,rx-pad,ly-pad,ls+pad*2,ls+pad*2,rad+3,P);if(S.team?.logoData)await drawRoundedShareImage(c,S.team.logoData,lx,ly,ls,ls,rad);if(g.opponentLogoData)await drawRoundedShareImage(c,g.opponentLogoData,rx,ly,ls,ls,rad);
    const lcx=compact?280:292,rcx=W-lcx,nw=compact?170:184,L=splitTeamDisplayName(S.team?.name||"TEAM"),R=splitTeamDisplayName(g.opponent||"OPPONENT"),ny=bodyY+(compact?76:87);
    if(L.place){shareFitTX(c,L.place.toUpperCase(),lcx,ny,nw,compact?21:24,14,950,"#fff","center");shareSportTX(c,L.mascot.toUpperCase(),lcx,ny+(compact?30:34),fitTextSize(c,L.mascot.toUpperCase(),nw,compact?31:35,20,900),A,"center")}else shareSportTX(c,L.mascot.toUpperCase(),lcx,ny+15,30,A,"center");
    if(R.place){shareFitTX(c,R.place.toUpperCase(),rcx,ny,nw,compact?21:24,14,950,"#fff","center");shareSportTX(c,R.mascot.toUpperCase(),rcx,ny+(compact?30:34),fitTextSize(c,R.mascot.toUpperCase(),nw,compact?31:35,20,900),"#fff","center")}else shareSportTX(c,R.mascot.toUpperCase(),rcx,ny+15,30,"#fff","center");
    const sw=100,cw=118,sx=(W-(sw*2+cw))/2,sy=bodyY+(compact?27:31),sh=compact?121:138;c.fillStyle=A;c.fillRect(sx,sy,sw,sh);c.fillStyle=P;c.fillRect(sx+sw+cw,sy,sw,sh);c.strokeStyle="#fff";c.lineWidth=3;c.strokeRect(sx+sw+cw+1.5,sy+1.5,sw-3,sh-3);
    c.beginPath();c.moveTo(sx+sw+14,sy);c.lineTo(sx+sw+cw-14,sy);c.lineTo(sx+sw+cw,sy+sh/2);c.lineTo(sx+sw+cw-14,sy+sh);c.lineTo(sx+sw+14,sy+sh);c.lineTo(sx+sw,sy+sh/2);c.closePath();c.fillStyle=P;c.fill();c.strokeStyle=A;c.lineWidth=2;c.stroke();
    shareSportTX(c,displayedOurScore(g),sx+sw/2,sy+(compact?84:95),compact?66:75,"#fff","center");shareSportTX(c,g.oppScore,sx+sw+cw+sw/2,sy+(compact?84:95),compact?66:75,"#fff","center");shareSportTX(c,"FINAL",W/2,sy+(compact?43:49),compact?21:23,A,"center");
    c.save();c.translate(W/2,sy+(compact?67:74));c.strokeStyle="#fff";c.lineWidth=2.2;c.beginPath();c.ellipse(0,0,17,9,0,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(-5,0);c.lineTo(5,0);c.stroke();[-3,0,3].forEach(xx=>{c.beginPath();c.moveTo(xx,-3);c.lineTo(xx,3);c.stroke()});c.restore();
    if(S.team?.grade){shareRR(c,W/2-58,sy+sh-25,116,23,6,A);shareFitTX(c,String(S.team.grade).toUpperCase(),W/2,sy+sh-8,104,13,9,950,P,"center")}
    c.fillStyle="#f4f4f2";c.fillRect(0,bodyBottom,W,metaH);const gt=(g.gameType||"regular")==="playoff"?"PLAYOFFS":"REGULAR SEASON",labs=[`WEEK ${g.week||1}`,String(g.location||"Home").toUpperCase(),gt],centers=[W/6,W/2,5*W/6];labs.forEach((t,i)=>shareTX(c,t,centers[i],bodyBottom+(compact?35:40),compact?17:19,950,"#111","center"));c.strokeStyle="#929292";c.lineWidth=1.5;[W/3,2*W/3].forEach(x=>{c.beginPath();c.moveTo(x,bodyBottom+9);c.lineTo(x,bodyBottom+metaH-9);c.stroke()});
  }
  return H;
}





async function makeTeamSummaryShare(src){
  const W=1080,H=1900,cv=document.createElement("canvas");cv.width=W;cv.height=H;
  const c=cv.getContext("2d"),P=S.team.primary,A=S.team.secondary,m=calcTeamMetrics(src.plays,src.games);
  c.fillStyle="#f5f7f6";c.fillRect(0,0,W,H);
  const headerH=await drawBroadcastHeader(c,W,src,{compact:false});

  let y=headerH+26;
  c.fillStyle="#0d0f10";c.fillRect(34,y,W-68,66);
  c.fillStyle=A;c.fillRect(34,y,140,66);c.fillRect(W-174,y,140,66);
  shareTX(c,"TEAM GAME SUMMARY",W/2,y+45,36,950,"#fff","center");
  y+=88;

  const pm=penaltyMetrics(src.plays);
  const cards=[
    ["OFFENSE",`${m.offensivePlays} PLAYS`,`${m.totalOffense} YDS • ${m.yardsPerPlay.toFixed(1)} YDS/PLAY`],
    ["RUSH / PASS",`${m.rushAttempts} / ${m.passAttempts}`,`${pct(m.rushPct)} RUSH • ${pct(m.passPct)} PASS`],
    ["FIRST DOWNS",m.firstDowns,`${m.explosive10} plays 10+ • ${m.explosive20} plays 20+`],
    ["TURNOVER MARGIN",`${m.turnoverMargin>0?"+":""}${m.turnoverMargin}`,`${m.takeaways} TAKEAWAYS • ${m.turnovers} GIVEAWAYS`],
    ["DEFENSE",`${m.defensivePlays} PLAYS`,`${m.tfl} TFL • ${m.sacks} SACK • ${pct(m.takeawayRate)} TAKEAWAY RATE`],
    ["PASSING",m.passerRating==null?"—":m.passerRating.toFixed(1),`RATE • ${m.completions}/${m.passAttempts} • ${pct(m.completionPct)} • ${m.passingYards} YDS • ${m.passingTD} TD • ${m.interceptions} INT`],
    ["TOTAL PLAYS",m.totalScrimmage,`${m.specialTeamsPlays} SPECIAL TEAMS PLAYS`],
    ["PENALTIES",`${pm.penalties} / ${pm.penaltyYards} YDS`,`OFF ${pm.offensivePenalties} • DEF ${pm.defensivePenalties} • UNKNOWN ${pm.unknownPenalties}`]
  ];

  const gap=14,cw=(W-80-gap)/2,ch=185;
  cards.forEach((d,i)=>{
    const x=40+(i%2)*(cw+gap),yy=y+Math.floor(i/2)*(ch+14);
    shareRR(c,x,yy,cw,ch,18,"#fff");
    c.strokeStyle=shareRgba(P,.20);c.lineWidth=2;c.stroke();
    c.fillStyle=A;c.fillRect(x,yy,cw,44);
    shareTX(c,d[0],x+18,yy+31,23,950,P);
    shareTX(c,d[1],x+18,yy+105,46,950,P);
    shareTX(c,d[2],x+18,yy+150,20,850,"#222");
  });

  y+=4*(ch+14)+18;
  shareRR(c,40,y,W-80,138,18,P);
  shareTX(c,"SNAP TRACKER",65,y+40,23,950,A);
  shareTX(c,`${m.playersBelow10} players below 10-snap minimum`,65,y+88,34,950,"#fff");
  shareTX(c,`${m.snapOpportunities} tracked team snaps in this view`,65,y+120,20,800,"#fff");

  shareTX(c,"SIDELINE STATS • GRIDIRON EDITION",W/2,H-28,18,850,P,"center");
  return cv;
}


async function makeHybridSharePages(src){
  const W=1080,H=2532,P=S.team.primary,A=S.team.secondary;
  const s=agg({plays:src.plays});
  const pm=penaltyMetrics(src.plays);

  const pass=[...s].filter(x=>x.att).sort((a,b)=>b.py-a.py)[0];
  const rec=[...s].filter(x=>x.rec).sort((a,b)=>b.rey-a.rey)[0];
  const rush=[...s].filter(x=>x.car).sort((a,b)=>b.ry-a.ry)[0];
  const def=[...s].filter(x=>x.t+x.tfl+x.sack+x.int+x.ff+x.fr)
    .sort((a,b)=>(b.t+b.tfl*2+b.sack*2+b.int*3+b.ff*2+b.fr*2)-(a.t+a.tfl*2+a.sack*2+a.int*3+a.ff*2+a.fr*2))[0];

  const sections=[];
  function addTable(title,headers,rows,total){
    if(rows.length)sections.push({kind:"table",title,headers,rows,total});
  }

  let rows=s.filter(x=>x.car).map(x=>[pname(x.id),x.car,x.ry,(x.ry/x.car).toFixed(1),x.rfd,x.rtd]);
  if(rows.length){
    const car=s.reduce((a,x)=>a+x.car,0),yd=s.reduce((a,x)=>a+x.ry,0);
    addTable("RUSHING",["PLAYER","CAR","YDS","AVG","1D","TD"],rows,
      ["TEAM TOTAL",car,yd,car?(yd/car).toFixed(1):"0.0",s.reduce((a,x)=>a+x.rfd,0),s.reduce((a,x)=>a+x.rtd,0)]);
  }

  rows=s.filter(x=>x.att).map(x=>[pname(x.id),`${x.cmp}/${x.att}`,x.py,(x.py/x.att).toFixed(1),x.pfd,x.ptd,x.pi,passerRatingText(x.cmp,x.att,x.py,x.ptd,x.pi)]);
  if(rows.length){
    const att=s.reduce((a,x)=>a+x.att,0),cmp=s.reduce((a,x)=>a+x.cmp,0),yd=s.reduce((a,x)=>a+x.py,0),td=s.reduce((a,x)=>a+x.ptd,0),pi=s.reduce((a,x)=>a+x.pi,0);
    addTable("PASSING",["PLAYER","CMP/ATT","YDS","AVG","1D","TD","INT","RATE"],rows,
      ["TEAM TOTAL",`${cmp}/${att}`,yd,att?(yd/att).toFixed(1):"0.0",s.reduce((a,x)=>a+x.pfd,0),td,pi,passerRatingText(cmp,att,yd,td,pi)]);
  }

  rows=s.filter(x=>x.tgt||x.rec).map(x=>[
    pname(x.id),x.tgt,x.rec,x.rey,x.rec?(x.rey/x.rec).toFixed(1):"0.0",
    x.recfd,x.retd,x.drop,x.tgt?`${Math.round((x.rec/x.tgt)*100)}%`:"0%"
  ]);
  if(rows.length){
    const tgt=s.reduce((a,x)=>a+x.tgt,0),rc=s.reduce((a,x)=>a+x.rec,0),yd=s.reduce((a,x)=>a+x.rey,0);
    addTable("RECEIVING",["PLAYER","TGT","REC","YDS","AVG","1D","TD","DROP","CATCH%"],rows,
      ["TEAM TOTAL",tgt,rc,yd,rc?(yd/rc).toFixed(1):"0.0",s.reduce((a,x)=>a+x.recfd,0),
       s.reduce((a,x)=>a+x.retd,0),s.reduce((a,x)=>a+x.drop,0),tgt?`${Math.round((rc/tgt)*100)}%`:"0%"]);
  }

  rows=s.filter(x=>x.t+x.tfl+x.sack+x.int+x.ff+x.fr).map(x=>[
    pname(x.id),fmt(x.t),fmt(x.tfl),fmt(x.sack),fmt(x.int),fmt(x.ff),fmt(x.fr)
  ]);
  if(rows.length){
    addTable("DEFENSE",["PLAYER","TKL","TFL","SACK","INT","FF","FR"],rows,
      ["TEAM TOTAL",fmt(s.reduce((a,x)=>a+x.t,0)),fmt(s.reduce((a,x)=>a+x.tfl,0)),
       fmt(s.reduce((a,x)=>a+x.sack,0)),fmt(s.reduce((a,x)=>a+x.int,0)),
       fmt(s.reduce((a,x)=>a+x.ff,0)),fmt(s.reduce((a,x)=>a+x.fr,0))]);
  }

  rows=s.filter(x=>x.kr+x.pr+x.punt+x.stff+x.stfr+x.fga).map(x=>[
    pname(x.id),x.kr,x.kry,x.pr,x.pry,x.punt,x.punty,x.fgm,x.fga,x.fga?`${Math.round((x.fgm/x.fga)*100)}%`:"0%",x.fgLong,x.stff,x.stfr
  ]);
  if(rows.length){
    const tfgm=s.reduce((a,x)=>a+x.fgm,0),tfga=s.reduce((a,x)=>a+x.fga,0);
    addTable("SPECIAL TEAMS",["PLAYER","KR","KR YDS","PR","PR YDS","PUNT","PUNT YDS","FGM","FGA","FG%","LONG","FF","FR"],rows,
      ["TEAM TOTAL",s.reduce((a,x)=>a+x.kr,0),s.reduce((a,x)=>a+x.kry,0),
       s.reduce((a,x)=>a+x.pr,0),s.reduce((a,x)=>a+x.pry,0),
       s.reduce((a,x)=>a+x.punt,0),s.reduce((a,x)=>a+x.punty,0),
       tfgm,tfga,tfga?`${Math.round((tfgm/tfga)*100)}%`:"0%",Math.max(0,...s.map(x=>x.fgLong||0)),
       s.reduce((a,x)=>a+x.stff,0),s.reduce((a,x)=>a+x.stfr,0)]);
  }

  sections.push({kind:"penalties",title:"PENALTIES",pm});

  const pages=[];
  function newPage(){
    const cv=document.createElement("canvas");cv.width=W;cv.height=H;
    const c=cv.getContext("2d");c.fillStyle="#f5f7f6";c.fillRect(0,0,W,H);
    pages.push({cv,c,y:0});
    return pages[pages.length-1];
  }

  async function header(page,first){
    const hh=await drawBroadcastHeader(page.c,W,src,{compact:!first});
    page.y=hh+24;
    page.c.fillStyle=A;page.c.fillRect(24,page.y,W-48,60);
    page.c.fillStyle="#101314";page.c.fillRect(W-278,page.y,254,60);
    shareTX(page.c,first?"PLAYER BOX SCORE":"PLAYER BOX SCORE • CONTINUED",W*.46,page.y+42,33,950,"#111","center");
    shareTX(page.c,"PLAYER STATS",W-151,page.y+40,18,950,"#fff","center");
    page.y+=78;
  }

  const page1=newPage();
  await header(page1,true);

  // Top performers are kept together on page 1.
  const cards=[
    ["PASSING",pass,pass?`${pass.cmp}/${pass.att}`:"—","CMP/ATT",pass?pass.py:"—","YDS",pass&&pass.att?`${(pass.py/pass.att).toFixed(1)} AVG • ${pass.ptd} TD • ${passerRatingText(pass.cmp,pass.att,pass.py,pass.ptd,pass.pi)} RATE`:"—"],
    ["RECEIVING",rec,rec?rec.rec:"—","REC",rec?rec.rey:"—","YDS",rec&&rec.rec?`${(rec.rey/rec.rec).toFixed(1)} AVG • ${rec.retd} TD`:"—"],
    ["RUSHING",rush,rush?rush.car:"—","CAR",rush?rush.ry:"—","YDS",rush&&rush.car?`${(rush.ry/rush.car).toFixed(1)} AVG • ${rush.rtd} TD`:"—"],
    ["DEFENSE",def,def?fmt(def.t):"—","TKL",def?fmt(def.tfl):"—","TFL",def?`${fmt(def.sack)} SACK • ${fmt(def.int)} INT`:"—"]
  ];
  let page=page1, y=page.y;
  shareTX(page.c,"TOP PERFORMERS",W/2,y+31,27,950,P,"center");y+=48;
  const gap=14,cw=(W-48-gap)/2,ch=218;
  cards.forEach((d,i)=>{
    const x=24+(i%2)*(cw+gap),yy=y+Math.floor(i/2)*(ch+14);
    shareRR(page.c,x,yy,cw,ch,18,"#fff");
    page.c.strokeStyle=shareRgba(P,.20);page.c.lineWidth=2;page.c.stroke();
    page.c.fillStyle=P;page.c.fillRect(x,yy,cw,44);
    shareTX(page.c,d[0],x+cw/2,yy+31,26,950,"#fff","center");
    shareTX(page.c,d[1]?pname(d[1].id):"—",x+cw/2,yy+78,26,950,"#111","center");
    shareTX(page.c,d[2],x+cw*.27,yy+137,47,950,P,"center");
    shareTX(page.c,d[4],x+cw*.73,yy+137,47,950,P,"center");
    shareTX(page.c,d[3],x+cw*.27,yy+165,18,950,"#333","center");
    shareTX(page.c,d[5],x+cw*.73,yy+165,18,950,"#333","center");
    shareRR(page.c,x+12,yy+178,cw-24,30,8,shareRgba(A,.18));
    shareTX(page.c,d[6],x+cw/2,yy+201,19,950,"#111","center");
  });
  page.y=y+ch*2+42;

  const BOTTOM=H-94;
  const titleH=54,headH=46,rowH=62,gapAfter=16;

  async function ensureSpace(needed){
    if(page.y+needed<=BOTTOM)return;
    page=newPage();
    await header(page,false);
  }

  function columnLayout(headers,w){
    const cols=headers.length;
    let firstW=250;
    if(cols>=9)firstW=205;
    else if(cols>=7)firstW=225;
    const rem=(w-firstW)/(cols-1);
    return {cols,firstW,rem};
  }

  async function drawTableSection(sec){
    const x=24,w=W-48;
    // Repeat table title/header after a page break and split only at row boundaries.
    let remaining=[...sec.rows];
    let firstChunk=true;
    while(remaining.length){
      const fixed=titleH+headH+rowH+gapAfter; // includes TEAM TOTAL
      const available=BOTTOM-page.y-fixed;
      let fit=Math.floor(available/rowH);
      if(fit<1){
        page=newPage();await header(page,false);
        fit=Math.floor((BOTTOM-page.y-fixed)/rowH);
      }
      fit=Math.max(1,fit);
      const chunk=remaining.splice(0,fit);

      shareRR(page.c,x,page.y,w,titleH,13,P);
      shareTX(page.c,firstChunk?sec.title:`${sec.title} • CONTINUED`,x+20,page.y+38,32,950,"#fff");
      page.y+=titleH;
      page.c.fillStyle=A;page.c.fillRect(x,page.y,w,headH);

      const lay=columnLayout(sec.headers,w);
      sec.headers.forEach((h,i)=>{
        const xx=i===0?x+14:x+lay.firstW+lay.rem*(i-1)+lay.rem/2;
        shareTX(page.c,h,xx,page.y+31,lay.cols>=9?17:20,950,P,i===0?"left":"center");
      });
      page.y+=headH;

      function row(r,totalRow=false){
        page.c.fillStyle=totalRow?shareRgba(A,.18):"#fff";page.c.fillRect(x,page.y,w,rowH);
        page.c.strokeStyle=shareRgba(P,.13);page.c.beginPath();page.c.moveTo(x,page.y+rowH);page.c.lineTo(x+w,page.y+rowH);page.c.stroke();
        r.forEach((v,i)=>{
          const xx=i===0?x+14:x+lay.firstW+lay.rem*(i-1)+lay.rem/2;
          const sz=i===0?25:(lay.cols>=9?21:27);
          shareTX(page.c,v,xx,page.y+41,sz,totalRow?950:(i===0?900:800),totalRow?P:"#111",i===0?"left":"center");
        });
        page.y+=rowH;
      }
      chunk.forEach(r=>row(r));
      if(!remaining.length)row(sec.total,true);
      page.y+=gapAfter;
      firstChunk=false;

      if(remaining.length){
        page=newPage();await header(page,false);
      }
    }
  }

  for(const sec of sections){
    if(sec.kind==="table"){
      await drawTableSection(sec);
    }else if(sec.kind==="penalties"){
      const needed=190;
      await ensureSpace(needed);
      shareRR(page.c,24,page.y,W-48,54,13,P);
      shareTX(page.c,"PENALTIES",44,page.y+38,32,950,"#fff");
      page.y+=66;
      const labels=[
        ["TOTAL",sec.pm.penalties],
        ["YARDS",sec.pm.penaltyYards],
        ["OFFENSE",sec.pm.offensivePenalties],
        ["DEFENSE",sec.pm.defensivePenalties],
        ["UNKNOWN",sec.pm.unknownPenalties]
      ];
      const gw=(W-48-4*10)/5;
      labels.forEach((d,i)=>{
        const x=24+i*(gw+10);
        shareRR(page.c,x,page.y,gw,92,14,"#fff");
        page.c.strokeStyle=shareRgba(P,.16);page.c.lineWidth=2;page.c.stroke();
        shareTX(page.c,d[0],x+gw/2,page.y+30,16,950,P,"center");
        shareTX(page.c,d[1],x+gw/2,page.y+70,30,950,"#111","center");
      });
      page.y+=112;
    }
  }

  // Add page numbers after total count is known.
  const totalPages=pages.length;
  pages.forEach((p,i)=>{
    shareRR(p.c,0,H-68,W,68,0,P);
    shareTX(p.c,`${S.team.name.toUpperCase()}  •  PLAYER BOX SCORE`,36,H-27,18,900,A);
    shareTX(p.c,`PAGE ${i+1} OF ${totalPages}`,W-36,H-27,18,950,"#fff","right");
  });

  return pages.map(p=>p.cv);
}

// Backward-compatible wrapper for any old internal call.
async function makeHybridShare(src){
  const pages=await makeHybridSharePages(src);
  return pages[0];
}

function gameLabel(g){
  return `${(g.gameType||"regular")==="playoff"?"Playoff":"Regular Season"} • Week ${g.week||"?"} • ${g.location||"Home"}`;
}
async function makeSnapParticipationShare(g){
  const roster=[...(S.roster||[])].sort((a,b)=>Number(a.jersey)-Number(b.jersey));
  const W=1080,rowH=68,headerH=405,footerH=245,H=Math.max(1450,headerH+(roster.length*rowH)+footerH);
  const cv=document.createElement("canvas");cv.width=W;cv.height=H;const c=cv.getContext("2d");
  const P=S.team?.primary||"#177b46",A=S.team?.secondary||"#f0b33b";
  const counts=roster.map(p=>({p,snaps:currentGameSnapCount(p.id)}));
  const met=counts.filter(x=>x.snaps>=10).length;
  const allMet=roster.length>0&&met===roster.length;

  c.fillStyle="#f5f7f6";c.fillRect(0,0,W,H);
  await drawBroadcastHeader(c,W,{kind:"game",game:g},{compact:true});

  let y=335;
  c.fillStyle="#155f31";c.fillRect(38,y,W-76,58);
  c.fillStyle=A;c.fillRect(38,y,120,58);c.fillRect(W-158,y,120,58);
  shareTX(c,"SNAP PARTICIPATION REPORT",W/2,y+40,29,950,"#fff","center");
  y+=76;

  shareRR(c,38,y,W-76,54,12,P);
  shareTX(c,"PLAYER",58,y+36,20,900,"#ffffff");
  shareTX(c,"REQUIREMENT",650,y+36,18,900,"#ffffff","center");
  shareTX(c,"TOTAL SNAPS",850,y+36,18,900,"#ffffff","center");
  shareTX(c,"STATUS",1010,y+36,18,900,"#ffffff","right");
  y+=54;

  counts.forEach((x,i)=>{
    c.fillStyle=i%2===0?"#ffffff":"#f0f3f1";c.fillRect(38,y,W-76,rowH);
    c.strokeStyle="#d8dedb";c.lineWidth=1;c.beginPath();c.moveTo(38,y+rowH);c.lineTo(W-38,y+rowH);c.stroke();
    shareTX(c,`#${x.p.jersey}`,58,y+43,24,950,P);
    shareTX(c,x.p.name,135,y+43,23,800,"#142019");
    shareTX(c,x.snaps>=10?"10 / 10 ✓":`${x.snaps} / 10`,650,y+43,22,900,x.snaps>=10?P:"#9b4300","center");
    shareTX(c,x.snaps,850,y+43,25,950,"#142019","center");
    shareTX(c,x.snaps>=10?"MET":`NEEDS ${10-x.snaps}`,1010,y+43,19,950,x.snaps>=10?P:"#9b4300","right");
    y+=rowH;
  });

  y+=30;
  shareRR(c,38,y,W-76,150,22,"#ffffff");
  c.fillStyle=A;c.fillRect(38,y,12,150);
  shareTX(c,allMet?"COMPLIANCE ACHIEVED":"MINIMUM NOT YET MET",78,y+48,28,950,P);
  shareTX(c,`${met} of ${roster.length} players have reached the 10-snap minimum`,78,y+91,23,800,"#142019");
  shareTX(c,`Team snap opportunities recorded: ${(g.snapRecords||[]).length}`,78,y+126,20,700,"#65716a");
  y+=190;
  shareTX(c,"SIDELINE STATS • GRIDIRON EDITION",W/2,y,20,850,P,"center");
  shareTX(c,"Participation totals generated from the game Snap Tracker",W/2,y+34,17,650,"#65716a","center");
  return cv;
}

async function canvasFile(cv,name){const blob=await new Promise(res=>cv.toBlob(res,"image/png"));return new File([blob],name,{type:"image/png"})}

$("#shareSnapsBtn").addEventListener("click",async()=>{
  const g=currentGame();if(!g)return toast("Open a game first");
  if(!(S.roster||[]).length)return toast("Add your roster first");
  try{
    const safe=(S.team?.name||"team").replace(/[^a-z0-9]/gi,"_");
    const file=await canvasFile(await makeSnapParticipationShare(g),`${safe}_week_${g.week||"game"}_participation.png`);
    if(navigator.canShare&&navigator.canShare({files:[file]})&&navigator.share){
      await navigator.share({title:`${S.team.name} Participation Report`,text:`${gameLabel(g)} vs ${g.opponent}`,files:[file]});
    }else{
      downloadBlob(file,file.name);toast("Participation image saved");
    }
  }catch(e){console.error(e);toast("Could not share participation report")}
});

$("#shareStatsBtn").addEventListener("click",async()=>{
  const src=statsSource(statsScope);if(!src)return toast("No stats in this view yet");
  try{
    const safe=S.team.name.replace(/[^a-z0-9]/gi,"_");
    const suffix={game:"game",regular:"regular_season",playoff:"playoffs",season:"season_totals"}[statsScope];
    const files=[await canvasFile(await makeTeamSummaryShare(src),`${safe}_${suffix}_01_team_summary.png`)];
    const boxPages=await makeHybridSharePages(src);
    for(let i=0;i<boxPages.length;i++){
      files.push(await canvasFile(boxPages[i],`${safe}_${suffix}_${String(i+2).padStart(2,"0")}_player_box_score_page_${i+1}_of_${boxPages.length}.png`));
    }
    const shareTitle={game:"Game Stats",regular:"Regular Season Stats",playoff:"Playoff Stats",season:"Season Totals"}[statsScope];
    if(navigator.canShare&&navigator.canShare({files})&&navigator.share){
      await navigator.share({title:`${S.team.name} ${shareTitle}`,text:`${src.label} • ${boxPages.length} player box score page${boxPages.length===1?"":"s"}`,files});
    }else{
      for(const f of files)downloadBlob(f,f.name);
      toast(`${files.length} stats image${files.length===1?"":"s"} saved`);
    }
  }catch(e){console.error(e);toast("Could not share stats on this browser")}
});


function defensiveExportEvents(p){
  const events=[];
  if(p.type==="Defense"&&p.sub)events.push(p.sub);
  if(p.passDefendedPlayerId&&!events.includes("Pass Defended"))events.push("Pass Defended");
  if(p.forcedFumblePlayerId&&!events.includes("Forced Fumble"))events.push("Forced Fumble");
  if(p.fumbleRecoveryPlayerId&&!events.includes("Fumble Recovery"))events.push("Fumble Recovery");
  if(p.interceptionPlayerId&&!events.includes("Interception"))events.push("Interception");
  if(p.defensiveTouchdownPlayerId&&!events.includes("Defensive TD"))events.push("Defensive TD");
  return events;
}
function exportedSubtype(p){
  if(p.type!=="Defense")return p.sub||"";
  const events=defensiveExportEvents(p);
  return events.length?events.join(" + "):(p.sub||"");
}
function playRows(){
  const rows=[];
  (S.games||[]).forEach(g=>(g.plays||[]).forEach((p,i)=>{
    const credits=p.defCredits?Object.entries(p.defCredits).map(([id,v])=>`${pname(id)}:${v}`).join(" | "):"";
    const isDefInt=!!p.interceptionPlayerId||p.sub==="INT";
    const isDefFR=!!p.fumbleRecoveryPlayerId||p.sub==="Fumble Recovery";
    const isDefFF=!!p.forcedFumblePlayerId||p.sub==="Forced Fumble";
    const isDefTD=!!p.defensiveTouchdownPlayerId||p.extras?.includes("Defensive TD");
    const takeaway=p.type==="Defense"&&(isDefInt||isDefFR);
    const giveaway=(p.type==="Pass"&&p.sub==="Intercepted")||p.extras?.includes("Fumble Lost");
    const touchdown=(p.extras||[]).includes("TD")||isDefTD;
    const firstDown=offensivePlayEarnedFirstDown(p);
    rows.push({
      GameID:g.id,
      Date:g.date,
      Opponent:g.opponent,
      GameType:g.gameType||"regular",
      Location:g.location,
      PlaySequence:i+1,
      Timestamp:p.ts?new Date(p.ts).toISOString():"",
      Possession:p.stateBefore?.possession||"",
      Down:p.stateBefore?.down||"",
      Distance:p.stateBefore?.distance||"",
      AfterPossession:p.stateAfter?.possession||"",
      AfterDown:p.stateAfter?.down||"",
      AfterDistance:p.stateAfter?.distance||"",
      PlayType:p.type||"",
      Subtype:exportedSubtype(p),
      RawSubtype:p.sub||"",
      Player1:p.player?pname(p.player):"",
      Player2:p.player2?pname(p.player2):"",
      Target:(p.type==="Pass"&&p.player2&&["Complete","Incomplete","Intercepted"].includes(p.sub))?1:0,
      Drop:p.drop?1:0,
      PassDefended:p.passDefendedPlayerId?1:0,
      PassDefendedPlayer:p.passDefendedPlayerId?pname(p.passDefendedPlayerId):"",
      ReturnYards:Number(p.returnYards||0),
      TryType:p.type==="Try"?(p.tryType||p.sub||""):"",
      TryResult:p.type==="Try"?(p.tryResult||""):"",
      TryPoints:p.type==="Try"?Number(p.points||0):0,
      KickoffResult:p.type==="Kickoff"?(p.kickoffResult||""):"",
      FieldGoalAttempt:p.type==="Field Goal"?1:0,
      FieldGoalResult:p.type==="Field Goal"?(p.fieldGoalResult||""):"",
      FieldGoalDistance:p.type==="Field Goal"?Number(p.fieldGoalDistance||p.yards||0):0,
      FieldGoalPoints:p.type==="Field Goal"&&p.fieldGoalResult==="Good"?3:0,
      Yards:Number(p.yards)||0,
      PenaltyType:p.penaltyType||"",
      PenaltyPlayer:p.type==="Penalty"?penaltyPlayerName(p):"",
      PenaltyYards:p.type==="Penalty"?Number(p.penaltyYards||0):0,
      PenaltyDownResult:p.penaltyDownResult||"",
      Quarter:Number(p.quarter||1),
      Extras:(p.extras||[]).join(" | "),
      DefensiveCredits:credits,
      TackleKind:p.tackleKind||"",
      ForcedFumble:isDefFF?1:0,
      ForcedFumblePlayer:p.forcedFumblePlayerId?pname(p.forcedFumblePlayerId):(p.sub==="Forced Fumble"&&p.player?pname(p.player):""),
      FumbleRecovery:isDefFR?1:0,
      FumbleRecoveryPlayer:p.fumbleRecoveryPlayerId?pname(p.fumbleRecoveryPlayerId):(p.sub==="Fumble Recovery"&&p.player?pname(p.player):""),
      DefensiveInterception:isDefInt?1:0,
      InterceptionPlayer:p.interceptionPlayerId?pname(p.interceptionPlayerId):(p.sub==="INT"&&p.player?pname(p.player):""),
      DefensiveTD:isDefTD?1:0,
      DefensiveTDPlayer:p.defensiveTouchdownPlayerId?pname(p.defensiveTouchdownPlayerId):((p.extras||[]).includes("Defensive TD")?pname(p.fumbleRecoveryPlayerId||p.interceptionPlayerId||p.player):""),
      Takeaway:takeaway?1:0,
      Giveaway:giveaway?1:0,
      TurnoverMarginImpact:(takeaway?1:0)-(giveaway?1:0),
      Touchdown:touchdown?1:0,
      FirstDown:firstDown?1:0,
      FumbleLost:(p.extras||[]).includes("Fumble Lost")?1:0
    });
  }));return rows;
}
function gameRows(){return (S.games||[]).map(g=>({GameID:g.id,Date:g.date,Opponent:g.opponent,GameType:g.gameType||"regular",Location:g.location,OurScore:displayedOurScore(g),OpponentScore:Number(g.oppScore||0),Result:displayedOurScore(g)>g.oppScore?"W":displayedOurScore(g)<g.oppScore?"L":"T",Status:g.status||"",PlayCount:(g.plays||[]).length,SnapTrackerPlays:(g.snapRecords||[]).length}))}
function playerGameRows(){const out=[];(S.games||[]).forEach(g=>agg(g).forEach(x=>{const snaps=playerSnapCountForGames(x.id,[g]),opp=(g.snapRecords||[]).length;out.push({GameID:g.id,Date:g.date,Opponent:g.opponent,GameType:g.gameType||"regular",Jersey:x.j,Player:x.n,RushAtt:x.car,RushYds:x.ry,RushAvg:x.car?x.ry/x.car:0,Rush1D:x.rfd,RushTD:x.rtd,PassAtt:x.att,Completions:x.cmp,PassYds:x.py,PassAvg:x.att?x.py/x.att:0,Pass1D:x.pfd,PassTD:x.ptd,PassINT:x.pi,PasserRating:passerRating(x.cmp,x.att,x.py,x.ptd,x.pi)??"",Receptions:x.rec,RecYds:x.rey,RecAvg:x.rec?x.rey/x.rec:0,Rec1D:x.recfd,RecTD:x.retd,Tackles:x.t,TFL:x.tfl,Sacks:x.sack,PassDefended:x.pd||0,DefINT:x.int,ForcedFumbles:x.ff,FumbleRecoveries:x.fr,DefTD:x.dtd||0,TryKickAtt:x.tryKickAtt||0,TryKickMade:x.tryKickMade||0,TryRunAtt:x.tryRunAtt||0,TryRunMade:x.tryRunMade||0,TryPassAtt:x.tryPassAtt||0,TryPassMade:x.tryPassMade||0,FieldGoalAtt:x.fga||0,FieldGoalMade:x.fgm||0,FieldGoalPct:x.fga?x.fgm/x.fga:0,FieldGoalLong:x.fgLong||0,Kickoffs:x.ko||0,KickoffYds:x.koYds||0,KickoffTouchbacks:x.kotb||0,KickReturns:x.kr,KickReturnYds:x.kry,PuntReturns:x.pr,PuntReturnYds:x.pry,Punts:x.punt,PuntYds:x.punty,SpecialTeamsForcedFumbles:x.stff||0,SpecialTeamsFumbleRecoveries:x.stfr||0,Snaps:snaps,SnapOpportunities:opp,ParticipationPct:opp?snaps/opp:0,Met10SnapMinimum:snaps>=10?"Yes":"No",Penalties:(g.plays||[]).filter(p=>p.type==="Penalty"&&p.penaltyPlayer===x.id).length,PenaltyYards:(g.plays||[]).filter(p=>p.type==="Penalty"&&p.penaltyPlayer===x.id).reduce((a,p)=>a+Math.abs(Number(p.penaltyYards||0)),0)})}));return out}
function teamGameRows(){return (S.games||[]).map(g=>{const m=calcTeamMetrics(g.plays||[],[g]);return {GameID:g.id,Date:g.date,Opponent:g.opponent,GameType:g.gameType||"regular",...m}})}
function snapCountRows(){const out=[];(S.games||[]).forEach(g=>(S.roster||[]).forEach(p=>{const snaps=playerSnapCountForGames(p.id,[g]),opp=(g.snapRecords||[]).length;out.push({GameID:g.id,Date:g.date,Opponent:g.opponent,GameType:g.gameType||"regular",Jersey:p.jersey,Player:p.name,Snaps:snaps,SnapOpportunities:opp,ParticipationPct:opp?snaps/opp:0,Met10SnapMinimum:snaps>=10?"Yes":"No",SnapsNeeded:Math.max(0,10-snaps)})}));return out}
function snapRecordRows(){const out=[];(S.games||[]).forEach(g=>(g.snapRecords||[]).forEach((r,i)=>{(r.playerIds||[]).forEach(id=>{const p=S.roster.find(x=>x.id===id);out.push({GameID:g.id,Date:g.date,Opponent:g.opponent,GameType:g.gameType||"regular",SnapSequence:i+1,Timestamp:r.ts?new Date(r.ts).toISOString():"",PlayerID:id,Jersey:p?.jersey||"",Player:p?.name||""})})}));return out}
function specialRowsExport(){const out=[];(S.games||[]).forEach(g=>agg(g).filter(x=>x.kr+x.pr+x.punt+x.ko+x.tryKickAtt+x.tryRunAtt+x.tryPassAtt+x.fga).forEach(x=>out.push({GameID:g.id,Date:g.date,Opponent:g.opponent,Jersey:x.j,Player:x.n,Kickoffs:x.ko||0,KickoffYds:x.koYds||0,KickoffTouchbacks:x.kotb||0,KickReturns:x.kr,KickReturnYds:x.kry,PuntReturns:x.pr,PuntReturnYds:x.pry,Punts:x.punt,PuntYds:x.punty,FieldGoalAtt:x.fga||0,FieldGoalMade:x.fgm||0,FieldGoalPct:x.fga?x.fgm/x.fga:0,FieldGoalLong:x.fgLong||0,TryKickAtt:x.tryKickAtt||0,TryKickMade:x.tryKickMade||0,TryRunAtt:x.tryRunAtt||0,TryRunMade:x.tryRunMade||0,TryPassAtt:x.tryPassAtt||0,TryPassMade:x.tryPassMade||0,SpecialTeamsForcedFumbles:x.stff||0,SpecialTeamsFumbleRecoveries:x.stfr||0})));return out}
function penaltyRowsExport(){const out=[];(S.games||[]).forEach(g=>(g.plays||[]).filter(p=>p.type==="Penalty").forEach((p,i)=>out.push({GameID:g.id,Date:g.date,Opponent:g.opponent,GameType:g.gameType||"regular",Quarter:Number(p.quarter||1),PlaySequence:(g.plays||[]).indexOf(p)+1,Possession:p.stateBefore?.possession||"",Down:p.stateBefore?.down||"",Distance:p.stateBefore?.distance||"",Penalty:p.penaltyType||"Other",Player:penaltyPlayerName(p),Yards:Number(p.penaltyYards||0),DownResult:p.penaltyDownResult||"unchanged"})));return out}

function seasonRows(){return ["regular","playoff","season"].map(scope=>{const games=scopeGames(scope),plays=games.flatMap(g=>g.plays||[]),m=calcTeamMetrics(plays,games);return {Scope:scope,Games:games.length,Record:recordFor(games),...m}})}
function dataDictionaryRows(){return [
  {Field:"GameType",Meaning:"regular or playoff"},
  {Field:"Possession",Meaning:"ours = our offense; opp = opponent offense / our defense"},
  {Field:"Down",Meaning:"Down at the start of the recorded play"},
  {Field:"Distance",Meaning:"Yards to go at the start of the recorded play"},
  {Field:"Subtype",Meaning:"Human-readable play event. Compound defensive plays include Forced Fumble, Fumble Recovery, Interception and/or Defensive TD so dashboard tools can see the full event in one field."},
  {Field:"RawSubtype",Meaning:"Original stored subtype before compound defensive event labels are added for export."},
  {Field:"PassDefendedPlayer",Meaning:"Defender credited with a pass breakup on an opponent incomplete pass."},
  {Field:"ReturnYards",Meaning:"Return yards after a defensive interception or fumble recovery."},
  {Field:"TryType",Meaning:"Post-touchdown 2-point try type: Kick, Run or Pass."},
  {Field:"TryResult",Meaning:"Good or No Good for a post-touchdown try."},
  {Field:"TryPoints",Meaning:"Points awarded by the try; currently 2 when successful."},
  {Field:"KickoffResult",Meaning:"Our kickoff result: Touchback, Returned, Out of Bounds or Onside."},
  {Field:"FieldGoalResult",Meaning:"Field goal attempt result: Good or No Good."},
  {Field:"FieldGoalDistance",Meaning:"Recorded distance in yards of the field goal attempt."},
  {Field:"DefensiveCredits",Meaning:"Tackle/TFL/sack credit by player. Fractional values are shared tackle credit."},
  {Field:"TackleKind",Meaning:"Tackle or TFL classification used by current defensive player stats."},
  {Field:"ForcedFumble",Meaning:"1 when this play credits a defensive forced fumble."},
  {Field:"ForcedFumblePlayer",Meaning:"Player receiving the forced-fumble credit in current Defense stats."},
  {Field:"FumbleRecovery",Meaning:"1 when this play credits a defensive fumble recovery. Included in Takeaway and current Defense FR stats."},
  {Field:"FumbleRecoveryPlayer",Meaning:"Player receiving the fumble-recovery credit in current Defense stats."},
  {Field:"DefensiveInterception",Meaning:"1 when this play credits a defensive interception. Included in Takeaway and current Defense INT stats."},
  {Field:"InterceptionPlayer",Meaning:"Player receiving the defensive interception credit in current Defense stats."},
  {Field:"DefensiveTD",Meaning:"1 when this play credits a defensive return touchdown."},
  {Field:"DefensiveTDPlayer",Meaning:"Player receiving the defensive TD credit in current Defense stats."},
  {Field:"Takeaway",Meaning:"1 for a defensive fumble recovery or defensive interception; same event logic used by Team Summary takeaways and turnover margin."},
  {Field:"Giveaway",Meaning:"1 for our offensive interception or fumble lost; same event logic used by Team Summary turnovers."},
  {Field:"TurnoverMarginImpact",Meaning:"+1 takeaway, -1 giveaway, 0 otherwise. Summing this field by game equals Team Game Stats turnoverMargin."},
  {Field:"Touchdown",Meaning:"1 for any recorded touchdown, including defensive return touchdowns."},
  {Field:"PasserRating",Meaning:"NFL passer rating calculated from completions, official pass attempts (sacks excluded), passing yards, passing TDs and interceptions; each component is capped from 0 to 2.375 and the maximum rating is 158.3."},
  {Field:"FirstDown",Meaning:"Derived first down using the same offensive first-down logic used by current Rushing/Passing/Receiving and Team Summary stats."},
  {Field:"Extras",Meaning:"Legacy/additional tags such as TD, first down, fumble, PAT or 2PT."},
  {Field:"Player-snaps",Meaning:"Snap Tracker participation records; separate from team play count"},
  {Field:"ParticipationPct",Meaning:"Player tracked snaps divided by tracked team snap opportunities"},
  {Field:"OffensivePlays",Meaning:"Rush attempts plus pass attempts"},
  {Field:"DefensivePlays",Meaning:"Recorded opponent scrimmage plays via Defense entries"},
  {Field:"TotalScrimmage",Meaning:"Offensive plays plus defensive plays"},
  {Field:"SpecialTeamsPlays",Meaning:"Kickoff, kickoff return, punt, return and field goal events"},
  {Field:"Explosive10/20",Meaning:"Offensive plays gaining at least 10 / 20 yards"},
  {Field:"PenaltyYards",Meaning:"Signed yardage applied to the offense; negative hurts the team with possession, positive helps it"},
  {Field:"PenaltyDownResult",Meaning:"unchanged, automatic1st, replay, or loss"},
  {Field:"PenaltyPlayer",Meaning:"Roster player ID or Unknown / Team"}
]}
function analyticsPayload(){return {exportedAt:new Date().toISOString(),team:S.team,games:gameRows(),plays:playRows(),playerGameStats:playerGameRows(),teamGameStats:teamGameRows(),snapCounts:snapCountRows(),snapRecords:snapRecordRows(),specialTeams:specialRowsExport(),penalties:penaltyRowsExport(),seasonTotals:seasonRows(),dataDictionary:dataDictionaryRows()}}
function csvEscape(v){const s=String(v??"");return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function rowsToCsv(rows){if(!rows.length)return "";const cols=Object.keys(rows[0]);return [cols.join(","),...rows.map(r=>cols.map(c=>csvEscape(r[c])).join(","))].join("\n")}
$("#exportRawBtn").addEventListener("click",()=>downloadJson(analyticsPayload(),`${(S.team?.name||"team").replace(/[^a-z0-9]/gi,"_")}_raw_analytics.json`));
$("#exportExcelBtn").addEventListener("click",()=>{
  const data=analyticsPayload(),safe=(S.team?.name||"team").replace(/[^a-z0-9]/gi,"_");
  if(window.XLSX){
    const wb=XLSX.utils.book_new();
    const sheets=[["Games",data.games],["Plays",data.plays],["Player Game Stats",data.playerGameStats],["Team Game Stats",data.teamGameStats],["Snap Counts",data.snapCounts],["Snap Records",data.snapRecords],["Special Teams",data.specialTeams],["Penalties",data.penalties],["Season Totals",data.seasonTotals],["Data Dictionary",data.dataDictionary]];
    sheets.forEach(([name,rows])=>{const ws=XLSX.utils.json_to_sheet(rows);XLSX.utils.book_append_sheet(wb,ws,name.slice(0,31))});
    XLSX.writeFile(wb,`${safe}_sideline_stats_analytics.xlsx`);
  }else{
    downloadBlob(new Blob([rowsToCsv(data.plays)],{type:"text/csv"}),`${safe}_plays_fallback.csv`);toast("Excel library unavailable; exported raw plays CSV instead");
  }
});

function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}

normalizeRoster();normalizeGames();populateSetup();syncChrome();renderRoster();initializeSnapSelections();
if(teamExists())go("roster");else go("setup");
initCloud();
})();
