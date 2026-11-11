import{isThreePoint,rimZone,createEvent,derive}from"./engine.js";
const $=id=>document.getElementById(id),defaults=Array.from({length:10},(_,i)=>({id:"p"+i,num:[2,5,11,14,22,3,7,10,20,24][i],name:["Mason Reed","Liam Carter","Noah Brooks","Ethan Hayes","Caleb Turner","Owen Parker","Jack Bennett","Luke Foster","Henry Collins","Wyatt Cooper"][i],headshot:""}));
let stored;try{stored=JSON.parse(localStorage.getItem("hardcourt-alpha")||"null")}catch{stored=null}
let roster=(stored?.roster||[]).map((p,i)=>({...defaults[i],...p}));let state=stored||{events:[],active:roster.slice(0,5).map(x=>x.id),period:1,clockMs:480000,running:false,fast:false,offenseRight:true,minutes:{},lastTick:null,statsScope:"game",chartMode:"shots"};state.teamId??=globalThis.crypto?.randomUUID?.()||"team-"+Date.now();state.gameId??=globalThis.crypto?.randomUUID?.()||"game-"+Date.now();state.clientId??=localStorage.getItem("hardcourt-client-id")||globalThis.crypto?.randomUUID?.()||"local";state.timeScope??="game";state.analyticsDetailTab??="fast";localStorage.setItem("hardcourt-client-id",state.clientId);let timer;const SUPABASE_URL="https://eyuvgzhkhcpwtcbmsvct.supabase.co",SUPABASE_PUBLISHABLE_KEY="sb_publishable_uMOkwO4jyHen4pz4zCkIuQ_Ss-wUf2l" ,HARDCOURT_AUTH_STORAGE_KEY="sb-eyuvgzhkhcpwtcbmsvct-auth-token";const hardcourtAuthOptions={auth:{storageKey:HARDCOURT_AUTH_STORAGE_KEY,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}};let SB=null,cloudUser=null,cloudChannel=null;
function refreshCloudPlayerMap(){state.cloudPlayerMap=Object.fromEntries(roster.filter(p=>p.cloudId).map(p=>[p.id,p.cloudId]))}
let cloudLoading=false,cloudSyncRunning=false,cloudSyncRequested=false,lastCloudSyncError="";
function cloudStoreKey(){return cloudUser?.id?"hardcourt-owner-team-"+cloudUser.id:null;}

function elapsedGameMs(){const regulation=Math.min(state.period-1,state.periods||4)*(state.periodMinutes||8)*60000,ot=Math.max(0,state.period-(state.periods||4)-1)*(state.otMinutes||3)*60000,currentLen=state.period>(state.periods||4)?(state.otMinutes||3)*60000:(state.periodMinutes||8)*60000;return Math.max(0,regulation+ot+(currentLen-state.clockMs))}
function archiveGame(){if(!state.gameId||!state.gameStartedAt)return;const games=JSON.parse(localStorage.getItem("hardcourt-games")||"[]"),snap={gameId:state.gameId,teamId:state.teamId,opponent:state.opp||"Opponent",createdAt:state.gameStartedAt||Date.now(),playoffs:state.gameType==="playoffs",events:state.events,minutes:state.minutes||{},elapsedMs:elapsedGameMs()};const i=games.findIndex(g=>g.gameId===snap.gameId);if(i>=0)games[i]=snap;else games.push(snap);localStorage.setItem("hardcourt-games",JSON.stringify(games))}
let lastSave=0;
async function syncRosterCloud(){
  if(state.helperMode)return false;
  if(!cloudUser||!await ensureCloudContext())return false;
  const response=await SB.rpc("sync_hardcourt_roster",{
    p_season_id:state.cloudSeasonId,
    p_players:roster.map(p=>({cloudId:p.cloudId||null,jersey:String(p.num??""),name:p.name||"Player"}))
  });
  if(response.error){lastCloudSyncError=response.error.message;console.warn("Hardcourt roster sync",response.error.message);updateCloudStatus();return false;}
  for(const row of response.data||[]){
    const p=roster.find(x=>String(x.num)===String(row.jersey)&&String(x.name).toLowerCase()===String(row.name).toLowerCase());
    if(p)p.cloudId=row.id;
  }
  refreshCloudPlayerMap();lastCloudSyncError="";save(true);
  return true;
}
function viewerScore(events){let us=0,them=0;for(const e of events||[]){if(e.type==="shot"&&e.payload?.made)us+=e.payload.three?3:2;else if(e.type==="free_throw"&&e.payload?.made)us++;else if(e.type==="opp_score")them+=+e.payload?.points||0;else if(e.type==="opp_free_throw"&&e.payload?.made)them++}return{us,them}}
async function renderViewer(token){$("setup").classList.add("hidden");$("shell").classList.add("hidden");$("viewerView").classList.remove("hidden");const {data,error}=await SB.rpc("get_public_team_viewer",{p_token:token});if(error){$("viewerView").innerHTML='<div class="viewer-card"><h2>Viewer link unavailable</h2><p>'+error.message+'</p></div>';return}const games=(data.games||[]).filter(g=>g.sport==="basketball"),live=games.find(g=>g.status==="live")||games.at(-1),events=(data.events||[]).filter(e=>!live||e.game_id===live.id),score=viewerScore(events);$("viewerView").innerHTML='<div class="viewer-brand"><img src="../brand-header.png" alt="Bleacher Butt Stats"><b>HARDCOURT EDITION</b></div><div class="viewer-score"><div><small>'+data.team.name+'</small><strong>'+score.us+'</strong></div><span>LIVE STATS</span><div><small>'+(live?.opponent_name||"Opponent")+'</small><strong>'+score.them+'</strong></div></div><div class="viewer-card"><h3>Team Stats</h3><div id="viewerStats"></div></div><div class="viewer-card"><h3>Games</h3>'+(games.map(g=>'<p>'+new Date(g.started_at||g.created_at).toLocaleDateString()+' · '+g.opponent_name+'</p>').join("")||"<p>No games yet.</p>")+'</div>';const rows=(data.players||[]).map(p=>{const pe=events.filter(e=>String(e.payload?.cloudPlayerId)===String(p.id)),s=viewerScore(pe);return'<div class="viewer-stat-row"><b>#'+(p.jersey||"")+' '+p.name+'</b><span>'+s.us+' PTS</span></div>'}).join("");$("viewerStats").innerHTML=rows||"<p>Stats will appear when the game starts.</p>";setTimeout(()=>renderViewer(token),5000)}
async function initViewerMode(){const token=new URL(location.href).searchParams.get("viewer");if(!token)return false;if(!window.supabase?.createClient)return false;SB=SB||window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,hardcourtAuthOptions);await renderViewer(token);return true}
function updateCloudStatus(){
  const s=lastCloudSyncError?"Backup needs attention: "+lastCloudSyncError:cloudUser?
    (state.cloudGameId?(state.helperMode?"Statkeeper · cloud connected":"Game backed up · cloud connected"):"Signed in · "+(state.team||"Basketball Team")):
    "Sign in to save your basketball team";
  if($("cloudStatus"))$("cloudStatus").textContent=s;
  if($("liveCloudStatus"))$("liveCloudStatus").textContent=s;
  if($("accountBtn")){
    $("accountBtn").textContent="☁ Account";
    $("accountBtn").classList.toggle("connected",!!cloudUser&&!lastCloudSyncError);
  }
  if($("hcSyncDot"))$("hcSyncDot").className="hc-sync-dot"+(lastCloudSyncError?" warning":cloudUser?" online":"");
}
function openAccount(){
  if(!SB)return openModal("Account","<p>Account services are unavailable; reconnect to the internet.</p>");
  if(cloudUser){
    openModal("Hardcourt Account",'<p>Signed in as <b>'+esc(cloudUser.email||"your account")+'</b>.</p>'+
      '<p>Basketball team: <b>'+esc(state.team||"Not assigned")+'</b></p>'+
      '<button id="refreshHardcourtTeam" class="primary">Reload My Basketball Team</button>'+
      '<button id="signOutHardcourt" class="choice">Sign Out</button>');
    $("refreshHardcourtTeam").onclick=async()=>{state.cloudOwnerUserId=null;closeModal();await bootstrapHardcourt(true);};
    $("signOutHardcourt").onclick=async()=>{await SB.auth.signOut({scope:"local"});closeModal();};
    return;
  }
  openModal("Sign in to Bleacher Butt Stats",
    '<p>Use the <b>same email and password</b> as Gridiron. Game substitutes use their own email.</p>'+
    '<div class="team-editor"><label>Email<input id="hcEmail" type="email" autocomplete="email"></label>'+
    '<label>Password<input id="hcPassword" type="password" autocomplete="current-password"></label>'+
    '<button id="hcSignIn" class="primary">Sign In</button>'+
    '<button id="hcSignUp" class="choice">Create Account</button><p id="hcAuthMsg" class="error"></p></div>');
  $("hcSignIn").onclick=async()=>{
    const {error}=await SB.auth.signInWithPassword({email:$("hcEmail").value.trim(),password:$("hcPassword").value});
    $("hcAuthMsg").textContent=error?.message||"";
    if(!error)closeModal();
  };
  $("hcSignUp").onclick=async()=>{
    const {error}=await SB.auth.signUp({email:$("hcEmail").value.trim(),password:$("hcPassword").value});
    $("hcAuthMsg").textContent=error?.message||"Check your email to confirm your account.";
  };
}
function openSettings(){
  const signed=!!cloudUser,email=cloudUser?.email||"";
  openModal("Settings",'<div class="hc-settings">'+
    '<div class="hc-settings-team"><span class="score-logo">'+imgOrInitial(state.teamLogo,state.team)+'</span><div><h3>'+esc(state.team||"Team")+'</h3><small>'+esc([state.grade,state.division].filter(Boolean).join(" · "))+'</small><p>'+(signed?esc(email):"Not signed in")+'</p></div></div>'+
    '<div class="hc-settings-card"><b>TEAM & ACCOUNT</b><button id="settingsEditTeam">Edit '+esc(state.team||"Team")+'</button><button id="settingsRoster">Edit Season Roster</button><button id="settingsAccount">'+(signed?"Account / Sign Out":"Sign In / Create Account")+'</button></div>'+
    '<div class="hc-settings-card"><b>SHARING & ACCESS</b><p>Use the same account-and-invite pattern across Bleacher Butt Stats.</p><button id="settingsParent">Invite Parents / Viewers</button><button id="settingsCoach">Invite Coach</button><button id="settingsHelper">Invite Game Statkeeper</button></div>'+
    '<div class="hc-settings-card"><b>GAME</b><button id="settingsGame">Game Setup</button><button id="settingsNewGame">New Game</button><button id="settingsHistory">Prior Games</button><button id="settingsCloudGames">Cloud Games</button></div>'+
  '</div>');
  $("settingsEditTeam").onclick=()=>{closeModal();openTeamEditor()};
  $("settingsRoster").onclick=()=>{closeModal();openRosterEditor()};
  $("settingsAccount").onclick=()=>{closeModal();openAccount()};
  $("settingsParent").onclick=()=>{closeModal();shareTeam()};
  $("settingsCoach").onclick=()=>{closeModal();inviteCoach()};
  $("settingsHelper").onclick=()=>{closeModal();inviteHelper()};
  $("settingsGame").onclick=()=>{closeModal();if(state.gameStartedAt)openGameSettings();else showAdminPage("games")};
  $("settingsNewGame").onclick=()=>{closeModal();newGame()};
  $("settingsHistory").onclick=()=>{closeModal();gameHistory()};
  $("settingsCloudGames").onclick=()=>{closeModal();openCloudGames()};
  if(state.helperMode)for(const id of ["settingsEditTeam","settingsRoster","settingsParent","settingsCoach","settingsHelper","settingsNewGame"]){const el=$(id);if(el){el.disabled=true;el.title="Only the team owner can use this setting";}}
}
async function inviteCoach(){
  if(!cloudUser)return openAccount();
  if(!await ensureCloudContext())return;
  openModal("Invite Coach",'<div class="hc-invite"><p>Enter the coach’s email. The invitation is locked to that email address.</p><label>Coach email<input id="coachEmail" type="email" autocomplete="email" placeholder="coach@example.com"></label><button id="createCoachLink" class="primary">Create Email-Locked Coach Link</button><div id="coachResult"></div></div>');
  $("createCoachLink").onclick=async()=>{
    const email=$("coachEmail").value.trim().toLowerCase();
    if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)){ $("coachResult").textContent="Enter a valid email address.";return }
    const {data,error}=await SB.rpc("create_coach_invite",{p_team_id:state.cloudTeamId,p_email:email,p_expires_days:7});
    if(error){$("coachResult").textContent=error.message;return}
    const token=String(data||"");const url=location.origin+location.pathname+"?coachInvite="+encodeURIComponent(token);
    $("coachResult").innerHTML='<input id="coachLink" readonly value="'+url+'"><button id="copyCoachLink" class="choice">Copy Link</button>';
    $("copyCoachLink").onclick=async()=>{await navigator.clipboard?.writeText(url);$("copyCoachLink").textContent="Copied"};
  }
}
async function shareTeam(){if(!cloudUser)return openAccount();if(!await ensureCloudContext())return;const {data,error}=await SB.rpc("create_team_invite",{p_team_id:state.cloudTeamId,p_role:"viewer",p_expires_days:3650});if(error)return openModal("Share Team","<p>"+error.message+"</p>");const url=location.origin+location.pathname+"?viewer="+encodeURIComponent(data);openModal("Parent / Viewer Link",'<p>This permanent team link can be saved once and reused for every game.</p><input id="viewerLink" readonly value="'+url+'"><button id="copyViewerLink" class="primary">Copy Link</button>');$("copyViewerLink").onclick=async()=>{await navigator.clipboard?.writeText(url);$("copyViewerLink").textContent="Copied"}}
async function inviteHelper(){
  if(!cloudUser)return openAccount();
  if(state.helperMode){openModal("Game access","Only the team owner can invite another statkeeper.");return}
  if(!state.cloudGameId){
    openModal("Prepare Game First","<p>Save Friday’s game from the Game Setup screen before creating a substitute-statkeeper link.</p>");
    return;
  }
  openModal("Invite Game Statkeeper",
    '<p>Send an email-locked link for <b>'+esc(state.team)+'</b> vs <b>'+esc(state.opp||"Opponent")+'</b>. The recipient signs in with their own email and can record this game, not manage your team.</p>'+
    '<label>Substitute’s email<input id="helperEmail" type="email" autocomplete="email" placeholder="statkeeper@example.com"></label>'+
    '<button id="createHelperLink" class="primary">Generate Secure Invitation</button><div id="helperResult"></div>');
  $("createHelperLink").onclick=async()=>{
    const email=$("helperEmail").value.trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){$("helperResult").textContent="Enter the substitute’s actual email address.";return}
    $("createHelperLink").disabled=true;
    const {data,error}=await SB.rpc("create_game_statkeeper_invite",{
      p_game_id:state.cloudGameId,p_email:email,p_expires_days:3
    });
    $("createHelperLink").disabled=false;
    if(error){$("helperResult").textContent=error.message;return}
    const row=Array.isArray(data)?data[0]:data;
    if(!row?.token){$("helperResult").textContent="Invitation could not be generated. Please retry.";return}
    const url=location.origin+location.pathname+"?gameStatkeeperInvite="+encodeURIComponent(row.token);
    $("helperResult").innerHTML='<p>Send this link to <b>'+esc(email)+'</b>. It is single-recipient and expires after three days.</p>'+
      '<input id="helperLink" readonly><button id="copyHelperLink" class="choice">Copy Invitation Link</button>';
    $("helperLink").value=url;
    $("copyHelperLink").onclick=async()=>{
      try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);
        else{$("helperLink").select();document.execCommand("copy");}
        $("copyHelperLink").textContent="Copied";
      }catch(_){$("helperLink").select();$("copyHelperLink").textContent="Select and copy the link above";}
    };
  };
}
async function redeemInviteFromUrl(){
  if(!SB||!cloudUser)return false;
  const u=new URL(location.href);
  const teamToken=u.searchParams.get("coachInvite")||u.searchParams.get("teamInvite");
  if(teamToken){
    const {data,error}=await SB.rpc("redeem_team_invite",{p_token:teamToken});
    if(error){openModal("Invitation Issue","<p>"+esc(error.message)+"</p>");return true}
    const row=Array.isArray(data)?data[0]:data;
    u.searchParams.delete("coachInvite");u.searchParams.delete("teamInvite");
    history.replaceState({},"",u);
    state.cloudTeamId=row.team_id||null;state.cloudSeasonId=null;
    await ensureCloudContext();save(true);return true;
  }
  const token=u.searchParams.get("gameStatkeeperInvite");
  if(!token)return false;
  const {data,error}=await SB.rpc("redeem_game_statkeeper_invite",{p_token:token});
  if(error){openModal("Statkeeper Invitation Issue",'<p>'+esc(error.message)+'</p><p>Check that you signed in using the email address the invitation was sent to.</p>');return true;}
  const row=Array.isArray(data)?data[0]:data;
  if(!row?.game_id){openModal("Invitation Issue","The invitation did not include a game.");return true;}
  archiveGame(); // Leave any previous local game in its existing backup.
  state.helperMode=true;state.cloudOwnerUserId=null;state.cloudTeamId=row.team_id;state.cloudSeasonId=row.season_id;
  state.cloudGameId=row.game_id;state.gameId=row.game_id;state.team=row.team_name;state.opp=row.opponent_name;
  state.events=[];state.minutes={};state.active=[];
  const opened=await openCloudGame(row.game_id,true);
  if(!opened)return true;
  u.searchParams.delete("gameStatkeeperInvite");history.replaceState({},"",u);
  return true;
}
async function openCloudGame(gameId,helper=false){
  if(!SB||!cloudUser||!gameId)return false;
  cloudLoading=true;
  try{
    const {data:g,error}=await SB.from("games")
      .select("id,season_id,opponent_name,game_type,status,started_at,created_at,game_date,location_type,current_quarter,current_state")
      .eq("id",gameId).eq("sport","basketball").single();
    if(error||!g)throw error||Error("Game not found");
    if(!helper&&state.gameId!==gameId)archiveGame();
    state.cloudGameId=g.id;state.gameId=g.id;state.cloudSeasonId=g.season_id;
    state.helperMode=!!helper;state.cloudGameOwner=!helper;
    state.opp=g.opponent_name;state.gameType=g.game_type==="playoff"?"playoffs":"regular";
    state.gameDate=g.game_date||null;state.gameLocation=g.location_type||"home";
    state.gameStartedAt=Date.parse(g.started_at||g.created_at||"")||Date.now();
    state.period=Math.max(1,Number(g.current_quarter||1));
    const config=g.current_state?.hardcourt||{};
    if(config.periods===2||config.periods===4)state.periods=config.periods;
    if(Number(config.periodMinutes)>0)state.periodMinutes=config.periodMinutes;
    if(Number(config.foulLimit)>0)state.foulLimit=config.foulLimit;
    if(config.bonusRule)state.bonusRule=config.bonusRule;
    if(config.timeoutMode)state.timeoutMode=config.timeoutMode;
    if(Number.isFinite(Number(config.timeoutCount)))state.timeoutCount=config.timeoutCount;
    if(Number(config.otMinutes)>0)state.otMinutes=config.otMinutes;
    if(typeof config.offenseRight==="boolean")state.offenseRight=config.offenseRight;
    state.clockMs=(state.periodMinutes||8)*60000;
    state.timeoutsUs=state.timeoutCount??3;state.timeoutsOpp=state.timeoutCount??3;
    state.events=[];state.minutes={};state.active=[];
    await restoreCloudRoster();
    const starters=g.current_state?.hardcourt?.starters;
    if(Array.isArray(starters)&&starters.length===5){
      const translated=starters.map(cid=>roster.find(p=>p.cloudId===cid)?.id);
      if(translated.every(Boolean)&&new Set(translated).size===5)state.active=translated;
    }
    if(roster.length<5)throw Error("The assigned game does not have five roster players yet. Ask the team owner to save the roster.");
    if(!await pullCloudEvents())throw Error("Could not read all cloud game events. Retry before statkeeping.");
    startCloudRealtime();
    startUI();render();save(true);updateCloudStatus();
    return true;
  }catch(e){
    console.warn("Hardcourt game load",e);
    openModal("Could Not Open Game","<p>"+esc(e?.message||e)+"</p>");
    return false;
  }finally{cloudLoading=false;}
}
async function openCloudGames(){
  if(!cloudUser)return openAccount();
  if(!state.helperMode&&!await ensureCloudContext())return;
  const {data,error}=await SB.rpc("get_hardcourt_games",{p_team_id:state.cloudTeamId});
  if(error){openModal("Saved Games","<p>"+esc(error.message)+"</p>");return}
  const list=Array.isArray(data)?data:[];
  openModal("Saved Basketball Games",'<div id="hardcourtCloudGames" class="history-list"></div>');
  const host=$("hardcourtCloudGames");
  if(!list.length){host.textContent="No cloud games yet. Prepare your first game from the setup screen.";return}
  for(const g of list){
    const b=document.createElement("button");b.className="choice";
    b.textContent=(g.opponent_name||"Opponent")+" · "+(g.status||"live")+" · "+(g.event_count||0)+" events";
    b.onclick=async()=>{closeModal();await openCloudGame(g.game_id,state.helperMode)};
    host.appendChild(b);
  }
}
async function restoreCloudRoster(){
  if(!SB||!state.cloudSeasonId)return false;
  const {data,error}=await SB.from("players").select("id,jersey_number,name").eq("season_id",state.cloudSeasonId).eq("active",true).order("jersey_number");
  if(error){console.warn("Could not load roster",error.message);return false;}
  const oldByCloud=new Map(roster.filter(p=>p.cloudId).map(p=>[p.cloudId,p]));
  const incoming=data||[];
  if(incoming.length)roster=incoming.map((r,i)=>{
    const old=oldByCloud.get(r.id)||roster.find(p=>String(p.num)===String(r.jersey_number)&&String(p.name).toLowerCase()===String(r.name).toLowerCase());
    return {id:old?.id||r.id,num:r.jersey_number,name:r.name,headshot:old?.headshot||"",cloudId:r.id};
  });
  else if(!state.hasUnsyncedRoster)roster=[]; // Never fabricate sample players or upload a demo roster.
  refreshCloudPlayerMap();
  if(!Array.isArray(state.active))state.active=[];
  state.active=state.active.filter(id=>roster.some(p=>p.id===id));
  if(state.active.length!==5)state.active=roster.slice(0,5).map(p=>p.id);
  setupRoster();applyProfileToSetup();render();save(true);return true;
}
async function ensureCloudContext(){
  if(!SB||!cloudUser)return false;
  if(state.helperMode)return !!(state.cloudTeamId&&state.cloudSeasonId);
  if(state.cloudTeamId&&state.cloudSeasonId&&state.cloudOwnerUserId===cloudUser.id)return true;
  const {data,error}=await SB.rpc("get_hardcourt_cloud_context");
  if(error){lastCloudSyncError=error.message;console.warn("Hardcourt team lookup",error.message);return false;}
  const contexts=Array.isArray(data)?data:[];
  if(!contexts.length)return false;
  const preferred=localStorage.getItem(cloudStoreKey()||"");
  const ctx=contexts.find(x=>x.teamId===preferred)||contexts.find(x=>x.teamId===state.cloudTeamId)||contexts[0];
  if(contexts.length>1&&!preferred&&!contexts.some(x=>x.teamId===state.cloudTeamId)){
    openModal("Select Basketball Team",'<p>Choose the team to open:</p><div id="hardcourtTeamChoices" class="choices"></div>');
    const host=$("hardcourtTeamChoices");
    for(const option of contexts){
      const b=document.createElement("button");b.className="choice";b.textContent=option.teamName||"Basketball Team";
      b.onclick=async()=>{closeModal();await applyCloudContext(option)};
      host.appendChild(b);
    }
    return false;
  }
  return applyCloudContext(ctx);
}
async function applyCloudContext(ctx){
  if(!ctx||!cloudUser)return false;
  const priorTeam=state.cloudTeamId;
  state.cloudTeamId=ctx.teamId;state.cloudSeasonId=ctx.seasonId;state.cloudOwnerUserId=cloudUser.id;
  if(priorTeam&&priorTeam!==ctx.teamId){
    archiveGame();state.cloudGameId=null;state.gameId=crypto.randomUUID();state.gameStartedAt=null;state.events=[];state.minutes={};
  }
  state.team=ctx.teamName||state.team||"Basketball Team";state.grade=ctx.grade||"5th Grade";
  state.primary=ctx.primary||state.primary||"#111111";state.accent=ctx.accent||state.accent||"#39a852";
  state.teamLogo=ctx.logo||state.teamLogo||"";
  if(cloudStoreKey())localStorage.setItem(cloudStoreKey(),ctx.teamId);
  const loaded=await restoreCloudRoster();
  applyProfileToSetup();setupRoster();updateCloudStatus();save(true);
  return loaded;
}
async function ensureCloudGame(){
  if(state.cloudGameId){
    if(!state.helperMode&&!state.events?.length){
      const {data,error}=await SB.from("games").select("opponent_name,sport,status").eq("id",state.cloudGameId).single();
      if(error||data?.sport!=="basketball"||data?.opponent_name!==state.opp){
        lastCloudSyncError="The saved game's opponent does not match. Select New Game to prepare a different opponent.";
        return false;
      }
      if(data?.status==="final"||data?.status==="archived"){lastCloudSyncError="This game is already finalized.";return false;}
    }
    return true;
  }
  if(state.helperMode)return false;
  if(!await ensureCloudContext())return false;
  if(!state.opp||state.opp==="Opponent"){lastCloudSyncError="Enter the opponent before preparing the game.";return false;}
  const {data,error}=await SB.rpc("create_hardcourt_game",{
    p_season_id:state.cloudSeasonId,p_opponent:state.opp,p_game_type:state.gameType||"regular"
  });
  if(error){lastCloudSyncError=error.message;console.warn("Hardcourt game create",error.message);updateCloudStatus();return false}
  state.cloudGameId=data;state.cloudGameOwner=true;state.gameId=String(data);
  startCloudRealtime();updateCloudStatus();save(true);return true;
}
async function savePreparedGameConfiguration(){
  if(!SB||!cloudUser||state.helperMode||!state.cloudGameId)return false;
  const {data:prior,error:readErr}=await SB.from("games").select("id,current_state,opponent_name,status")
    .eq("id",state.cloudGameId).single();
  if(readErr||!prior||prior.opponent_name!==state.opp||prior.status!=="live")return false;
  const starterCloudIds=state.active.map(id=>state.cloudPlayerMap?.[id]).filter(Boolean);
  if(starterCloudIds.length!==5)return false;
  const config={
    periods:state.periods,periodMinutes:state.periodMinutes,
    foulLimit:state.foulLimit,bonusRule:state.bonusRule,
    timeoutMode:state.timeoutMode,timeoutCount:state.timeoutCount,
    otMinutes:state.otMinutes,offenseRight:state.offenseRight,
    starters:starterCloudIds
  };
  const next={...(prior.current_state||{}),hardcourt:config};
  const {data,error}=await SB.from("games").update({current_state:next,game_date:state.gameDate||null,location_type:state.gameLocation||"home"}).eq("id",state.cloudGameId)
    .eq("status","live").select("id");
  if(error||!data?.length){lastCloudSyncError=error?.message||"Game preparation could not be confirmed.";return false;}
  return true;
}
function mergeRemoteEvents(rows){let changed=false;for(const r of rows||[]){const existing=state.events.find(e=>e.id===r.id);if(r.deleted_at){if(existing){state.events=state.events.filter(e=>e.id!==r.id);changed=true}continue}if(existing){const payload={...(r.payload||{})};if(payload.cloudPlayerId)payload.playerId=roster.find(p=>p.cloudId===payload.cloudPlayerId)?.id||payload.playerId;if(payload.cloudLineup?.length)payload.lineup=payload.cloudLineup.map(cid=>roster.find(p=>p.cloudId===cid)?.id).filter(Boolean);existing.payload=payload;existing.period=r.period;existing.clockMs=r.clock_ms;existing.syncState="synced";changed=true;continue;}const payload={...(r.payload||{})};if(payload.cloudPlayerId)payload.playerId=roster.find(p=>p.cloudId===payload.cloudPlayerId)?.id||payload.playerId;if(payload.cloudLineup?.length)payload.lineup=payload.cloudLineup.map(cid=>roster.find(p=>p.cloudId===cid)?.id).filter(Boolean);if(r.event_type==="lineup"&&payload.lineup?.length===5)state.active=[...payload.lineup];if(r.event_type==="overtime_start"){state.period=r.period;state.clockMs=r.clock_ms;state.running=false}if(r.event_type==="clock_start"){state.period=r.period;state.clockMs=r.clock_ms;state.running=false}if(r.event_type==="clock_stop"){state.period=r.period;state.clockMs=r.clock_ms;state.running=false}state.events.push({id:r.id,type:r.event_type,period:r.period,clockMs:r.clock_ms,payload,createdAt:r.client_created_at,syncState:"synced"});changed=true}if(changed){save(true);render()}}
async function pullCloudEvents(){
  if(!SB||!state.cloudGameId)return false;
  const {data,error}=await SB.from("hardcourt_events").select("*")
    .eq("game_id",state.cloudGameId).is("deleted_at",null).order("client_created_at");
  if(error){lastCloudSyncError=error.message;console.warn("Hardcourt cloud read",error.message);return false}
  mergeRemoteEvents(data);return true;
}
function startCloudRealtime(){if(!SB||!state.cloudGameId)return;if(cloudChannel)SB.removeChannel(cloudChannel);cloudChannel=SB.channel("hardcourt-"+state.cloudGameId).on("postgres_changes",{event:"*",schema:"public",table:"hardcourt_events",filter:"game_id=eq."+state.cloudGameId},p=>mergeRemoteEvents([p.new||p.old])).subscribe();pullCloudEvents()}
async function syncCloudEvents(){
  if(!SB||!cloudUser||cloudLoading)return false;
  if(cloudSyncRunning){cloudSyncRequested=true;return false}
  if(!state.events?.some(e=>e.syncState!=="synced"))return true;
  cloudSyncRunning=true;let allOkay=true;
  try{
    // Never create a cloud game implicitly from stale browser/demo events.
    // Only an explicit Game Setup action may create the team's next game.
    if(!state.cloudGameId)return false;
    for(const e of state.events.filter(x=>x.syncState!=="synced")){
      // Keep all player and lineup identities stable across the owner and helper
      // devices. Sync the roster first; never publish unknown local player IDs.
      const payload={...(e.payload||{})};
      if(payload.playerId){
        const cloudId=state.cloudPlayerMap?.[payload.playerId]||payload.cloudPlayerId;
        if(!cloudId){lastCloudSyncError="Player roster not synced to the cloud";allOkay=false;break}
        payload.cloudPlayerId=cloudId;
      }
      if(Array.isArray(payload.lineup)){
        const ids=payload.lineup.map(id=>state.cloudPlayerMap?.[id]).filter(Boolean);
        if(ids.length!==payload.lineup.length){lastCloudSyncError="One or more lineup players are not synced";allOkay=false;break}
        payload.cloudLineup=ids;
      }
      const {error}=await SB.rpc("sync_hardcourt_event",{
        p_id:e.id,p_game_id:state.cloudGameId,p_event_type:e.type,
        p_period:e.period,p_clock_ms:e.clockMs,p_payload:payload,
        p_client_id:state.clientId,p_client_created_at:new Date(typeof e.createdAt==="string"?e.createdAt:Number(e.createdAt||Date.now())).toISOString()
      });
      if(error){
        lastCloudSyncError=error.message;console.warn("Hardcourt event sync",error.message);
        allOkay=false;break;
      }
      e.syncState="synced";
    }
    if(allOkay)lastCloudSyncError="";
    try{localStorage.setItem("hardcourt-alpha",JSON.stringify({...state,running:false,lastTick:null,roster}))}catch(_){}
    return allOkay;
  }finally{
    cloudSyncRunning=false;updateCloudStatus();
    if(cloudSyncRequested){cloudSyncRequested=false;
      if(state.events.some(e=>e.syncState!=="synced"))setTimeout(()=>syncCloudEvents(),1200);}
  }
}
function save(force=false){
  const now=Date.now();
  if(!force&&state.running&&now-lastSave<1200)return;
  lastSave=now;archiveGame();
  try{localStorage.setItem("hardcourt-alpha",JSON.stringify({...state,running:false,lastTick:null,roster}))}
  catch(e){console.warn("Hardcourt local save limit reached",e);lastCloudSyncError="Device storage is full; free space without clearing Hardcourt data."}
  if(!cloudLoading&&state.events?.some(e=>e.syncState!=="synced"))void syncCloudEvents();
}
function initials(s){return String(s||"?").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase()}
function imgOrInitial(src,label){return src?'<img src="'+src+'" alt="">':initials(label)}
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function fileData(file,cb){if(!file)return;const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const max=640,scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);cb(c.toDataURL("image/jpeg",.82))};img.onerror=()=>URL.revokeObjectURL(url);img.src=url}
function applyProfileToSetup(){
  state.team??="Your Basketball Team";
  state.grade??="5th Grade";
  if(state.team==="Erie Elite"&&!state.division)state.division="Gold";
  state.division??="";
  state.primary??="#111111";state.accent??="#39a852";
  $("setupTeamLabel").textContent=state.team;
  $("setupTeamMeta").textContent=[state.grade,state.division].filter(Boolean).join(" · ");
  const holder=$("hcAdminTeamLogo");
  if(holder){
    holder.textContent="";
    if(state.teamLogo){const photo=new Image();photo.alt="Team logo";photo.src=state.teamLogo;holder.appendChild(photo);}
    else holder.textContent=initials(state.team);
  }
  $("oppName").value=state.opp||"";
  $("gameType").value=state.gameType||"regular";
  if($("hcGameDate"))$("hcGameDate").value=state.gameDate||"";
  if($("hcGameLocation"))$("hcGameLocation").value=state.gameLocation||"home";
}
function setupRoster(){
  if(!Array.isArray(state.active))state.active=[];
  state.active=state.active.filter(id=>roster.some(p=>p.id===id));
  if(state.active.length!==5)state.active=roster.slice(0,5).map(p=>p.id);
  $("setupRoster").innerHTML=roster.length?roster.map(p=>
    '<label class="starter-choice"><input type="checkbox" data-start="'+esc(p.id)+'" '+(state.active.includes(p.id)?"checked":"")+'><span><b>#'+esc(p.num)+'</b> '+esc(p.name)+'</span></label>').join("")
    :'<p>No players yet. Add your Erie Elite roster before preparing Friday’s game.</p>';
  const review=$("setupReview");
  if(review)review.textContent=roster.length+" players on the season roster. Select five starters.";
  renderAdminRoster();
}

// Gridiron-style administrative navigation; the basketball game screen stays independent.
function showAdminPage(page="roster"){
  if($("setup")?.classList.contains("hidden"))return;
  const isInfo=!["roster","games"].includes(page);
  const target=isInfo?"hcAdminInfoPage":page==="games"?"hcAdminGamesPage":"hcAdminRosterPage";
  for(const id of ["hcAdminRosterPage","hcAdminGamesPage","hcAdminInfoPage"]){
    $(id)?.classList.toggle("hidden",id!==target);
  }
  for(const b of document.querySelectorAll("#hcAdminNav [data-hc-admin]"))
    b.classList.toggle("active",b.dataset.hcAdmin===page);
  if(isInfo){
    const name={time:"Playing Time",stats:"Stats",analytics:"Analytics"}[page]||"Stats";
    if($("hcInfoHeading"))$("hcInfoHeading").textContent=name;
    if($("hcInfoMessage"))$("hcInfoMessage").textContent=
      "Open a basketball game to view "+name.toLowerCase()+". Your saved roster remains available for every game.";
  }
  if(page==="games")void renderAdminSavedGames();
  window.scrollTo?.({top:0,behavior:"auto"});
}
function renderAdminRoster(){
  if(!$("hcAdminRosterList"))return;
  if($("hcRosterCount"))$("hcRosterCount").textContent=roster.length+" / 30";
  const target=$("hcAdminRosterList");
  target.innerHTML=roster.length?roster
    .slice().sort((a,b)=>Number(a.num||0)-Number(b.num||0))
    .map(p=>'<div class="hc-player-row"><strong class="hc-player-jersey">#'+esc(p.num)+'</strong>'+
      '<span class="hc-player-name">'+esc(p.name)+'</span>'+
      '<button type="button" class="hc-player-edit" data-edit-hc-player="'+esc(p.id)+'">Edit</button></div>').join("")
    :'<p class="hc-muted">No players yet. Add the boys to your season roster to get started.</p>';
  target.querySelectorAll("[data-edit-hc-player]").forEach(b=>b.onclick=openRosterEditor);
}
async function addAdminPlayer(){
  const status=$("hcRosterAddStatus");
  if(!cloudUser){openAccount();return}
  if(state.helperMode){status.textContent="Only the team owner can edit the season roster.";return}
  if(state.events?.length&&state.gameStartedAt){
    status.textContent="Finish recording the current game before changing roster identities.";return;
  }
  const number=$("hcRosterAddJersey").value.trim(),name=$("hcRosterAddName").value.trim();
  if(!/^\d{1,3}$/.test(number)||!name){status.textContent="Enter a numeric jersey number and the player’s name.";return}
  if(roster.some(p=>Number(p.num)===Number(number))){
    status.textContent="Jersey #"+number+" is already on the roster.";return;
  }
  if(roster.length>=30){status.textContent="The roster limit is 30 players.";return;}
  const btn=$("hcAdminAddPlayer");btn.disabled=true;
  roster.push({id:crypto.randomUUID(),num:String(Number(number)),name,cloudId:null,headshot:""});
  state.hasUnsyncedRoster=true;setupRoster();save(true);
  if(await syncRosterCloud()){
    state.hasUnsyncedRoster=false;save(true);
    $("hcRosterAddJersey").value="";$("hcRosterAddName").value="";
    status.textContent="Saved #"+number+" "+name+" to your basketball roster.";
  }else{
    status.textContent="Player saved on this phone, but cloud backup failed. Retry while online before inviting your substitute.";
  }
  btn.disabled=false;setupRoster();
}
async function renderAdminSavedGames(){
  const host=$("hcSavedGames");if(!host)return;
  if(!cloudUser){host.innerHTML='<p class="hc-muted">Sign in to load saved team games.</p>';return;}
  if(!state.cloudTeamId){host.innerHTML='<p class="hc-muted">Your basketball team is still loading.</p>';return;}
  host.innerHTML='<p class="hc-muted">Loading cloud games…</p>';
  const {data,error}=await SB.rpc("get_hardcourt_games",{p_team_id:state.cloudTeamId});
  if(error){host.innerHTML='<p class="hc-error">Could not load saved games: '+esc(error.message)+'</p>';return;}
  const games=Array.isArray(data)?data:[];
  if(!games.length){host.innerHTML='<p class="hc-muted">No games saved yet. Set up Friday’s game above.</p>';return;}
  host.innerHTML=games.map(g=>{
    const final=["final","archived","complete","completed"].includes(String(g.status||"").toLowerCase());
    return '<div class="hc-saved-row"><div class="hc-saved-row-copy"><strong>'+esc(g.opponent_name||"Opponent")+'</strong>'+
      '<small>'+esc(g.status||"Saved")+' · '+Number(g.event_count||0)+' events</small></div>'+
      '<button type="button" class="hc-btn hc-btn-small hc-btn-ghost" data-open-hc-cloud="'+esc(g.game_id)+'" '+
      (final?'disabled title="Finalized games are protected"':'')+'>'+
      (final?"Final":"Open")+'</button></div>';
  }).join("");
  host.querySelectorAll("[data-open-hc-cloud]").forEach(b=>b.onclick=async()=>{
    b.disabled=true;const opened=await openCloudGame(b.dataset.openHcCloud,false);
    if(!opened)b.disabled=false;
  });
}
function selectAdminNav(page){
  if(["time","stats","analytics"].includes(page)&&state.gameStartedAt&&roster.length>=5){
    startUI();
    const destination={time:"timeView",stats:"statsView",analytics:"analyticsView"}[page];
    showView(destination,page);
    return;
  }
  showAdminPage(page);
}
$("hcAdminNav")?.addEventListener("click",e=>{
  const b=e.target.closest("[data-hc-admin]");if(!b)return;
  selectAdminNav(b.dataset.hcAdmin);
});
$("hcRosterContinue")?.addEventListener("click",()=>showAdminPage("games"));
$("hcInfoGoGame")?.addEventListener("click",()=>showAdminPage("games"));
$("hcAdminAddPlayer")?.addEventListener("click",addAdminPlayer);
$("hcRefreshCloudGames")?.addEventListener("click",renderAdminSavedGames);

applyProfileToSetup();setupRoster();$("setupEditTeam").onclick=openTeamEditor;$("setupEditRoster")?.addEventListener("click",openRosterEditor);$("rosterEditBtn")?.addEventListener("click",openRosterEditor);
["teamLogo","oppLogo"].forEach(id=>{const el=$(id);if(el)el.onchange=()=>fileData(el.files[0],d=>{state[id]=d;save()})});
function readGameSetup(){
  const picked=[...document.querySelectorAll("[data-start]:checked")].map(x=>x.dataset.start);
  if(roster.length<5){$("setupError").textContent="Add at least five real players to the Erie Elite roster.";return false;}
  if(picked.length!==5){$("setupError").textContent="Select exactly five starters.";return false;}
  const opponent=$("oppName").value.trim();
  if(!opponent){$("setupError").textContent="Enter Friday’s opponent before preparing the game.";return false;}
  $("setupError").textContent="";
  Object.assign(state,{
    active:picked,
    clockMs:Number($("periodMinutes").value||8)*60000,
    periodMinutes:Number($("periodMinutes").value||8),
    periods:Number($("periodMode").value||4),
    opp:opponent,gameType:$("gameType").value,
    gameDate:$("hcGameDate")?.value||null,
    gameLocation:$("hcGameLocation")?.value||"home",
    offenseRight:$("startDirection").value==="right",
    foulLimit:Number($("foulLimit").value||5),
    bonusRule:$("bonusRule").value,
    timeoutMode:$("timeoutMode").value,
    timeoutCount:Number($("timeoutCount").value||3),
    otMinutes:Number($("otMinutes").value||3),
    timeoutsUs:Number($("timeoutCount").value||3),
    timeoutsOpp:Number($("timeoutCount").value||3)
  });
  return true;
}
async function requireCloudReady(){
  if(!cloudUser){openAccount();return false;}
  if(state.helperMode)return true;
  if(!await ensureCloudContext()){
    $("setupError").textContent="Could not load your basketball team. Check Account and try again.";return false;
  }
  if(!await syncRosterCloud()){
    $("setupError").textContent="Roster could not be backed up to your account. Retry before using a substitute.";return false;
  }
  return true;
}
async function prepareGameForHelper(){
  if(!readGameSetup()||!await requireCloudReady())return;
  const button=$("prepareHelperGame");if(button)button.disabled=true;
  try{
    if(!await ensureCloudGame())throw Error(lastCloudSyncError||"Could not create Friday’s game.");
    if(!await savePreparedGameConfiguration())throw Error(lastCloudSyncError||"Game rules and starters could not be saved.");
    save(true);
    void renderAdminSavedGames();
    openModal("Game Ready for Friday",
      "<p><b>"+esc(state.team)+"</b> vs <b>"+esc(state.opp)+"</b> is linked to your account.</p>"+
      "<p>You can invite your substitute now. The game can be opened on their own device without using your password.</p>"+
      '<button id="invitePreparedHelper" class="primary">Invite Substitute Statkeeper</button>');
    $("invitePreparedHelper").onclick=()=>inviteHelper();
  }catch(e){$("setupError").textContent=e?.message||"Could not prepare game.";}
  finally{if(button)button.disabled=false;}
}
$("prepareHelperGame")?.addEventListener("click",prepareGameForHelper);
$("startGame").onclick=async()=>{
  if(!readGameSetup()||!await requireCloudReady())return;
  if(!await ensureCloudGame()){$("setupError").textContent=lastCloudSyncError||"Could not connect the game to cloud backup.";return}
  if(!await savePreparedGameConfiguration()){$("setupError").textContent="Could not save the game rules and starting five. Retry.";return}
  state.gameStartedAt=state.gameStartedAt||Date.now();
  startUI();save(true);
};
function productHeaders(){document.querySelectorAll(".product-header").forEach(h=>{h.innerHTML='<img class="hardcourt-arena-header" src="./hardcourt-header-arena-ui71.jpg?v=ui71" alt="Bleacher Butt Stats Hardcourt Edition">';h.removeAttribute("role");h.removeAttribute("aria-label")})}
function openRosterEditor(){
  if(!cloudUser)return openAccount();
  if(state.helperMode){openModal("Roster","Only the team owner can edit the roster.");return;}
  if(state.events?.length&&state.gameStartedAt){
    openModal("Roster Locked","<p>Finish the current game before changing roster identities. Existing player statistics are protected.</p>");
    return;
  }
  let draft=roster.map(p=>({...p}));
  const redraw=()=>{
    $("modalBody").innerHTML=
      '<p>Enter each Erie Elite player’s jersey number and name. Saving keeps this roster with your basketball account.</p>'+
      '<div id="hcRosterRows"></div><button id="addHcPlayer" class="choice">+ Add Player</button>'+
      '<button id="saveHcRoster" class="primary">Save Erie Elite Roster</button><p id="hcRosterError" class="error"></p>';
    const host=$("hcRosterRows");
    draft.forEach((p,i)=>{
      const row=document.createElement("div");row.className="hc-roster-row";
      row.innerHTML='<label>Jersey<input inputmode="numeric" maxlength="3" data-jersey="'+i+'"></label>'+
        '<label>Player Name<input maxlength="80" data-player-name="'+i+'"></label>'+
        '<button type="button" data-remove-player="'+i+'" aria-label="Remove roster player">×</button>';
      row.querySelector("[data-jersey]").value=p.num??"";
      row.querySelector("[data-player-name]").value=p.name||"";
      row.querySelector("[data-remove-player]").onclick=()=>{
        if(!confirm("Remove this player from the season roster?"))return;
        readEdits();draft.splice(i,1);redraw();
      };
      host.appendChild(row);
    });
    function readEdits(){draft=draft.map((p,i)=>({...p,num:host.querySelector('[data-jersey="'+i+'"]')?.value.trim(),name:host.querySelector('[data-player-name="'+i+'"]')?.value.trim()}))}
    $("addHcPlayer").onclick=()=>{readEdits();if(draft.length>=30){$("hcRosterError").textContent="Maximum 30 players.";return}draft.push({id:crypto.randomUUID(),num:"",name:"",cloudId:null,headshot:""});redraw()};
    $("saveHcRoster").onclick=async()=>{
      readEdits();
      if(draft.some(p=>!/^\d{1,3}$/.test(String(p.num))||!p.name)){
        $("hcRosterError").textContent="Every player needs a name and a numeric jersey number.";return;
      }
      if(new Set(draft.map(p=>String(Number(p.num)))).size!==draft.length){
        $("hcRosterError").textContent="Jersey numbers must be unique.";return;
      }
      const button=$("saveHcRoster");button.disabled=true;button.textContent="Saving roster…";
      roster=draft.map(p=>({...p,num:String(Number(p.num))}));
      state.hasUnsyncedRoster=true;
      setupRoster();refreshCloudPlayerMap();save(true);
      if(await syncRosterCloud()){
        state.hasUnsyncedRoster=false;save(true);closeModal();setupRoster();render();
      }else{
        button.disabled=false;button.textContent="Retry Roster Save";
        $("hcRosterError").textContent="Saved on this device, but not in Supabase. Retry while online before inviting a substitute.";
      }
    };
  };
  openModal("Edit Season Roster","");redraw();
}
function openTeamEditor(){
  if(!cloudUser)return openAccount();
  if(state.helperMode)return openModal("Team Settings","Only the team owner can change the team.");
  openModal("Edit Basketball Team",
    '<div class="team-editor"><label>Team name<input id="editTeamName"></label>'+
    '<label>Grade<select id="editGrade"><option>5th Grade</option><option>6th Grade</option><option>7th Grade</option><option>8th Grade</option></select></label>'+
    '<label>Division<input id="editDivision"></label>'+
    '<div class="team-color-row"><label>Primary<input id="editPrimary" type="color"></label><label>Accent<input id="editAccent" type="color"></label></div>'+
    '<label>Team logo<input id="editTeamLogo" type="file" accept="image/*"></label>'+
    '<button id="saveTeamProfile" class="primary">Save Team</button><p id="teamSaveError" class="error"></p></div>');
  $("editTeamName").value=state.team||"";$("editGrade").value=state.grade||"5th Grade";
  $("editDivision").value=state.division||"";$("editPrimary").value=state.primary||"#111111";
  $("editAccent").value=state.accent||"#39a852";
  let nextLogo=state.teamLogo||"";
  $("editTeamLogo").onchange=()=>fileData($("editTeamLogo").files[0],d=>nextLogo=d);
  $("saveTeamProfile").onclick=async()=>{
    if(!await ensureCloudContext()){$("teamSaveError").textContent="Could not load your basketball team.";return}
    const name=$("editTeamName").value.trim();
    if(!name){$("teamSaveError").textContent="Team name is required.";return}
    const info={p_team_id:state.cloudTeamId,p_name:name,p_grade:$("editGrade").value,
      p_primary:$("editPrimary").value,p_accent:$("editAccent").value,p_logo_data:nextLogo};
    const {error}=await SB.rpc("update_hardcourt_team_profile",info);
    if(error){$("teamSaveError").textContent=error.message;return}
    state.team=name;state.grade=info.p_grade;state.division=$("editDivision").value.trim();
    state.primary=info.p_primary;state.accent=info.p_accent;state.teamLogo=nextLogo;
    closeModal();applyProfileToSetup();if(state.gameStartedAt)startUI();else{$("shell").classList.add("hidden");$("setup").classList.remove("hidden");}
    updateCloudStatus();save(true);
  };
}
function parseClockInput(v){
  const m=String(v||"").trim().match(/^(\d{1,2}):(\d{2})$/);
  if(!m)return null;
  const min=+m[1],sec=+m[2];
  if(sec>59||min>99)return null;
  return (min*60+sec)*1000;
}
function openGameSettings(){
  stopClock();
  const prefix=state.periods===2?"H":"Q";
  openModal("Game Setup",'<div class="team-editor game-settings-editor">'+
    '<label>Opponent<input id="editGameOpponent"></label>'+
    '<label>Game type<select id="editGameTypeLive"><option value="regular">Regular Season</option><option value="playoffs">Playoffs</option></select></label>'+
    '<label>Opponent logo<input id="editGameOppLogo" type="file" accept="image/*"></label>'+
    '<div class="team-color-row"><label>Periods<select id="editGamePeriods"><option value="4">4 Quarters</option><option value="2">2 Halves</option></select></label><label>Minutes / period<input id="editGamePeriodMinutes" type="number" min="1" max="30"></label></div>'+
    '<div class="team-color-row"><label>Current period<input id="editCurrentPeriod" type="number" min="1" max="20"></label><label>Current clock (M:SS)<input id="editCurrentClock" inputmode="numeric"></label></div>'+
    '<label>Offensive side<select id="editGameDirection"><option value="right">Attack right →</option><option value="left">← Attack left</option></select></label>'+
    '<div class="team-color-row"><label>Player foul limit<input id="editGameFoulLimit" type="number" min="1" max="10"></label><label>Overtime minutes<input id="editGameOtMinutes" type="number" min="1" max="10"></label></div>'+
    '<label>Bonus rule<select id="editGameBonus"><option value="none">No automatic bonus</option><option value="oneone">1-and-1 at 7 / double at 10</option><option value="twoshots">2 shots at 5 per quarter</option></select></label>'+
    '<div class="team-color-row"><label>Timeout allocation<select id="editGameTimeoutMode"><option value="game">Per Game</option><option value="half">Per Half</option></select></label><label>Timeouts per allocation<input id="editGameTimeoutCount" type="number" min="0" max="10"></label></div>'+
    '<button id="saveLiveGameSettings" class="primary">Save Game Setup</button>'+
    '</div>');
  $("editGameOpponent").value=state.opp||"";
  $("editGameTypeLive").value=state.gameType||"regular";
  $("editGamePeriods").value=String(state.periods||4);
  $("editGamePeriodMinutes").value=state.periodMinutes||8;
  $("editCurrentPeriod").value=state.period||1;
  $("editCurrentClock").value=fmt(state.clockMs);
  $("editGameDirection").value=state.offenseRight?"right":"left";
  $("editGameFoulLimit").value=state.foulLimit||5;
  $("editGameOtMinutes").value=state.otMinutes||3;
  $("editGameBonus").value=state.bonusRule||"none";
  $("editGameTimeoutMode").value=state.timeoutMode||"game";
  $("editGameTimeoutCount").value=state.timeoutCount??3;
  let nextOppLogo=state.oppLogo||"";
  $("editGameOppLogo").onchange=()=>fileData($("editGameOppLogo").files[0],d=>nextOppLogo=d);
  $("saveLiveGameSettings").onclick=()=>{
    const clock=parseClockInput($("editCurrentClock").value);
    if(clock==null){alert("Enter the current clock as minutes:seconds, for example 7:58.");return}
    state.opp=$("editGameOpponent").value.trim()||"Opponent";
    state.gameType=$("editGameTypeLive").value;
    state.oppLogo=nextOppLogo;
    state.periods=+$("editGamePeriods").value;
    state.periodMinutes=Math.max(1,+$("editGamePeriodMinutes").value||8);
    state.period=Math.max(1,+$("editCurrentPeriod").value||1);
    state.clockMs=clock;
    state.offenseRight=$("editGameDirection").value==="right";
    state.foulLimit=Math.max(1,+$("editGameFoulLimit").value||5);
    state.otMinutes=Math.max(1,+$("editGameOtMinutes").value||3);
    state.bonusRule=$("editGameBonus").value;
    state.timeoutMode=$("editGameTimeoutMode").value;
    state.timeoutCount=Math.max(0,+$("editGameTimeoutCount").value||0);
    closeModal();startUI();applyDirection();render();save(true);
  };
}
function applyHelperMode(){
  if(!state.helperMode)return;
  // A substitute MUST control the game clock, substitutions, fouls and timeout
  // tracking. Disable only team/owner administration and new-game creation.
  for(const id of ["newGameBtn","liveHelperBtn","liveShareTeamBtn"]){
    const el=$(id);if(el){el.disabled=true;el.classList.add("helper-disabled");}
  }
}
function colorIsLight(hex){
  const raw=String(hex||"").replace("#","");
  if(!/^[0-9a-f]{6}$/i.test(raw))return false;
  const r=parseInt(raw.slice(0,2),16),g=parseInt(raw.slice(2,4),16),b=parseInt(raw.slice(4,6),16);
  const lum=(0.2126*r+0.7152*g+0.0722*b)/255;
  return lum>.64;
}
function startUI(){if(roster.length<5){$("setupError").textContent="Add five roster players before opening a game.";return}$("setup").classList.add("hidden");$("shell").classList.remove("hidden");document.body.classList.add("game-active");document.documentElement.style.setProperty("--primary",state.primary||"#111");document.documentElement.style.setProperty("--accent",state.accent||"#39a852");document.body.classList.toggle("accent-light",colorIsLight(state.accent||"#39a852"));$("homeLabel").textContent=state.team||"Our Team";if($("homeMeta"))$("homeMeta").textContent=[state.grade,state.division].filter(Boolean).join(" · ");$("awayLabel").textContent=state.opp||"Opponent";if($("awayMeta"))$("awayMeta").textContent=[state.grade,state.division].filter(Boolean).join(" · ")||"Opponent";$("homeLogo").innerHTML=imgOrInitial(state.teamLogo,state.team);$("awayLogo").innerHTML=imgOrInitial(state.oppLogo,state.opp);$("ourGroupLabel").textContent="OTHER STATS";if($("opponentGroupLabel"))$("opponentGroupLabel").textContent=(state.opp||"OPPONENT").toUpperCase()+" STATS";productHeaders();populateShotFilters();applyDirection();applyHelperMode();render()}if(state.gameStartedAt&&roster.length>=5)startUI();
function fmt(ms){let s=Math.max(0,Math.ceil(ms/1000));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
function accrue(){if(!state.running||!state.lastTick)return;const now=Date.now(),d=Math.min(now-state.lastTick,state.clockMs);state.lastTick=now;state.clockMs=Math.max(0,state.clockMs-d);state.active.forEach(id=>state.minutes[id]=(state.minutes[id]||0)+d);if(state.clockMs<=0){state.running=false;state.lastTick=null;clearInterval(timer)}}
function startClock(){if(!state.running&&state.clockMs>0){state.running=true;state.lastTick=Date.now();state.events.push(createEvent("clock_start",{lineup:[...state.active]},state));timer=setInterval(()=>{accrue();render()},250);render()}}function stopClock(){if(state.running){accrue();state.running=false;state.lastTick=null;state.events.push(createEvent("clock_stop",{lineup:[...state.active]},state));clearInterval(timer);save();render()}}$("startClock").onclick=startClock;$("stopClock").onclick=stopClock;
function render(){const d=derive(state.events,roster);renderSecondary(d);$("homeScore").textContent=d.us;$("awayScore").textContent=d.them;$("clock").textContent=fmt(state.clockMs);$("periodLabel").textContent=(state.period>(state.periods||4)?"OT"+(state.period-(state.periods||4)):(state.periods===2?"H":"Q")+state.period);$("gameMeta").textContent="Fouls "+teamFoulCount("us")+"–"+teamFoulCount("opp")+" · TO "+(state.timeoutsUs??state.timeoutCount??3)+"–"+(state.timeoutsOpp??state.timeoutCount??3);$("fastBtn").classList.toggle("armed",state.fast);if($("gameClockBtn")){$("gameClockBtn").classList.toggle("running",state.running);$("gameClockBtn").innerHTML=state.running?"Ⅱ <small>Stop Clock</small>":"▶ <small>Start Clock</small>"}$("startClock").classList.toggle("clock-active",state.running);$("stopClock").classList.toggle("clock-active",!state.running);$("nextPeriod").classList.toggle("period-ready",state.clockMs<=0);$("nextPeriod").textContent=state.clockMs<=0&&state.period>=(state.periods||4)&&d.us===d.them?"Start Overtime":"Next Period";$("activeFive").innerHTML=state.active.map(id=>{const p=roster.find(x=>x.id===id),s=d.players[id],pf=s.pf||0,limit=state.foulLimit||5,fc=pf>=limit?"pf-out":pf===limit-1?"pf-danger":pf===limit-2?"pf-warn":"pf-ok";return'<button class="player-tile '+fc+'">#'+p.num+" "+p.name+"<small>"+s.pts+" pts · "+fmt(state.minutes[id]||0)+" · "+pf+" PF</small></button>"}).join("");save()}
function chainId(){return globalThis.crypto?.randomUUID?.()||"chain-"+Date.now()}
async function cloudDeleteEvents(events){if(!SB||!cloudUser||!state.cloudGameId)return;for(const e of events.filter(x=>x.syncState==="synced"))await SB.rpc("delete_hardcourt_event",{p_id:e.id})}
function undoLastChain(){const last=state.events.at(-1);if(!last)return;const chain=last.payload?.chainId,removed=state.events.filter(e=>chain?e.payload?.chainId===chain:e.id===last.id);state.events=state.events.filter(e=>!removed.includes(e));cloudDeleteEvents(removed);render();save(true)}
$("fastBtn").onclick=()=>{state.fast=!state.fast;render()};$("undoBtn").onclick=undoLastChain;
const court=$("court");court.onclick=e=>{if(e.target.closest(".overlay,.controls,.offense-tools,.game-manage,.fast-wrap,.offense-hint,.game-menu-trigger,.side-switch,.opponent-quick"))return;const r=court.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;const inActiveZone=state.offenseRight?x>=.64:x<=.36;if(!inActiveZone)return;shotPopup(x,y,e.clientX-r.left,e.clientY-r.top)};
function clearPendingShot(){$("shotPrompt").classList.add("hidden");document.querySelector(".shot-marker")?.remove()}
function shotPopup(x,y,left,top){
 clearPendingShot();
 const courtProfile=matchMedia("(max-height:600px) and (orientation:landscape)").matches?"iphone":"ipad",three=isThreePoint(x,y,state.offenseRight,courtProfile),o=$("shotPrompt"),m=document.createElement("i");
 m.className="shot-marker";m.style.left=x*100+"%";m.style.top=y*100+"%";court.appendChild(m);
 const zone=shotZone({payload:{x,y,three,rimZone:rimZone(x,y,state.offenseRight)}});
 let selected=state.active[0];
 const ow=Math.min(390,court.clientWidth*.46);
 o.style.width=ow+"px";o.style.left=Math.max(8,Math.min(left-ow/2,court.clientWidth-ow-8))+"px";o.style.top=Math.max(8,Math.min(top-125,court.clientHeight-290))+"px";o.classList.remove("hidden");
 const draw=()=>{
   o.innerHTML='<div class="shot-head"><div><b>🏀 Record Shot</b><small>'+zone+' · '+(three?"3PT":"2PT")+'</small></div><button class="shot-close">×</button></div><div class="shot-player-grid">'+state.active.map(id=>{const p=roster.find(x=>x.id===id);return '<button class="'+(id===selected?"selected":"")+'" data-pick="'+id+'"><b>#'+p.num+'</b><small>'+p.name+'</small></button>'}).join("")+'</div><div class="shot-actions"><button class="shot-made" data-made="1">✓<small>Made</small></button><button class="shot-missed" data-made="0">×<small>Missed</small></button></div><div class="assist-note">□ Add Assist <small>(optional after a made shot)</small></div>';
   o.querySelector(".shot-close").onclick=e=>{e.stopPropagation();clearPendingShot()};
   o.querySelectorAll("[data-pick]").forEach(btn=>btn.onclick=e=>{e.stopPropagation();selected=btn.dataset.pick;draw()});
   o.querySelectorAll("[data-made]").forEach(btn=>btn.onclick=e=>{e.stopPropagation();const made=btn.dataset.made==="1",chain=chainId();state.pendingChain=chain;state.events.push(createEvent("shot",{playerId:selected,made,three,x,y,rimZone:rimZone(x,y,state.offenseRight),fastBreak:state.fast,lineup:[...state.active],chainId:chain},state));state.fast=false;clearPendingShot();render();made?promptAssist(selected):promptMissRebound()});
 };
 draw();
}
function modal(title,choices,cb){openModal(title,'<div class="choices">'+choices.map(x=>'<button class="choice" data-choice="'+x.value+'">'+x.label+"</button>").join("")+"</div>");document.querySelectorAll("[data-choice]").forEach(b=>b.onclick=()=>{closeModal();cb(b.dataset.choice)})}
const hardcourtAdminModalTitles=new Set([
  "Settings","Hardcourt Account","Sign in to Bleacher Butt Stats","Account",
  "Edit Basketball Team","Edit Season Roster","Invite Game Statkeeper",
  "Invite Coach","Parent / Viewer Link","Share Team","Game Helper",
  "Game Setup","Game Ready for Friday","Prepare Game First",
  "Select Basketball Team","Create Your Basketball Team",
  "Saved Basketball Games","Game History","Saved Games",
  "Invitation Issue","Statkeeper Invitation Issue",
  "Could Not Open Game","Roster Locked","Roster",
  "Game Access","Team Settings"
]);
function openModal(t,b){
  $("modalTitle").textContent=t;$("modalBody").innerHTML=b;
  document.body.classList.toggle("hc-admin-dialog",hardcourtAdminModalTitles.has(t));
  $("modal").classList.remove("hidden");
}
function closeModal(){
  $("modal").classList.add("hidden");document.body.classList.remove("hc-admin-dialog");
}
$("modalClose").onclick=closeModal;
function choosePlayer(title,type){modal(title,state.active.map(id=>{const p=roster.find(x=>x.id===id);return{label:"#"+p.num+" "+p.name,value:id}}),id=>{state.events.push(createEvent(type,{playerId:id,lineup:[...state.active]},state));render()})}
$("turnoverBtn").onclick=()=>choosePlayer("Turnover","turnover");$("stealBtn").onclick=()=>choosePlayer("Steal","steal");$("reboundBtn").onclick=()=>choosePlayer("Rebound","rebound");$("blockBtn").onclick=()=>choosePlayer("Block","block");$("foulBtn").onclick=foulFlow;
function foulFlow(){modal("Foul by",[{label:state.team,value:"us"},{label:state.opp,value:"opp"}],side=>{if(side==="us")modal("Who committed the foul?",state.active.map(id=>{const p=roster.find(x=>x.id===id);return{label:"#"+p.num+" "+p.name,value:id}}),id=>{state.events.push(createEvent("foul",{playerId:id,team:"us",lineup:[...state.active]},state));foulSituation("opp")});else{state.events.push(createEvent("foul",{team:"opp",lineup:[...state.active]},state));foulSituation("us")}})}
function teamFoulCount(side){const currentHalf=state.periods===2?state.period:Math.ceil(state.period/2);return state.events.filter(e=>e.type==="foul"&&(side==="us"?e.payload.team==="us":e.payload.team==="opp")&&(state.bonusRule==="oneone"?(state.periods===2?e.period:Math.ceil(e.period/2))===currentHalf:state.bonusRule==="twoshots"?e.period===state.period:true)).length}
function bonusFor(side){const n=teamFoulCount(side);if(state.bonusRule==="oneone")return n>=10?{n:2,one:false,label:"Double bonus"}:n>=7?{n:2,one:true,label:"Bonus · 1-and-1"}:null;if(state.bonusRule==="twoshots")return n>=5?{n:2,one:false,label:"Bonus · 2 shots"}:null;return null}
function foulSituation(side){const offender=side==="us"?"opp":"us",auto=bonusFor(offender);modal("Foul situation",[{label:auto?"Non-shooting · "+auto.label:"Non-shooting · no free throws",value:auto?"auto":"none"},{label:"Shooting foul · 2 shots",value:"2"},{label:"Shooting foul · 3 shots",value:"3"},{label:"And-one · 1 shot",value:"1"},{label:"Bonus · 1-and-1",value:"11"},{label:"Double bonus · 2 shots",value:"2b"},{label:"Technical · 2 shots",value:"2t"}],kind=>{if(kind==="none"){render();return}const n=kind==="auto"?auto.n:kind==="3"?3:kind==="1"?1:2;if(side==="us")modal("Free-throw shooter",state.active.map(id=>{const p=roster.find(x=>x.id===id);return{label:"#"+p.num+" "+p.name,value:id}}),id=>freeThrowBoard("us",id,n,kind==="11"||(kind==="auto"&&auto?.one)));else freeThrowBoard("opp",null,n,kind==="11"||(kind==="auto"&&auto?.one))})}
function freeThrowBoard(side,playerId,total,oneAndOne=false){const chain=chainId(),who=side==="us"?roster.find(p=>p.id===playerId)?.name:state.opp,results=Array(total).fill(null);openModal(who+" · Free Throws","");const draw=()=>{const secondLocked=oneAndOne&&results[0]!=="make";$("modalBody").innerHTML='<div class="ft-board">'+results.map((v,i)=>'<div class="ft-row"><b>FT '+(i+1)+'</b><button class="ft-choice make '+(v==="make"?"selected":"")+'" data-ft="'+i+'" data-v="make" '+(i===1&&secondLocked?"disabled":"")+'>MAKE</button><button class="ft-choice miss '+(v==="miss"?"selected":"")+'" data-ft="'+i+'" data-v="miss" '+(i===1&&secondLocked?"disabled":"")+'>MISS</button></div>').join("")+'<button id="recordFT" class="primary ft-submit" '+((oneAndOne&&results[0]==="miss")||results.every(Boolean)?"":"disabled")+'>GOOD TO GO</button></div>';document.querySelectorAll("[data-ft]").forEach(b=>b.onclick=()=>{results[+b.dataset.ft]=b.dataset.v;if(oneAndOne&&+b.dataset.ft===0&&b.dataset.v==="miss")results[1]=null;draw()});$("recordFT").onclick=()=>{closeModal();const actual=oneAndOne&&results[0]==="miss"?results.slice(0,1):results;actual.forEach(v=>{const made=v==="make";if(side==="us")state.events.push(createEvent("free_throw",{playerId,made,lineup:[...state.active],chainId:chain},state));else state.events.push(createEvent("opp_free_throw",{made,lineup:[...state.active],chainId:chain},state))});render();if(actual.at(-1)==="miss"){state.pendingChain=chain;promptMissRebound()}}};draw()}
function promptAssist(shooter){const opts=state.active.filter(x=>x!==shooter).map(id=>({label:roster.find(p=>p.id===id).name,value:id}));opts.push({label:"None",value:"none"});modal("Assist?",opts,id=>{if(id!=="none")state.events.push(createEvent("assist",{playerId:id,chainId:state.pendingChain||null},state));state.pendingChain=null;render()})}
function promptMissRebound(context="ourMiss"){const ours=context!=="oppMiss",opts=state.active.map(id=>({label:roster.find(p=>p.id===id).name,value:id}));opts.push({label:"Opponent",value:"opp"},{label:"Team / Dead Ball",value:"team"},{label:"None",value:"none"});modal("Rebound?",opts,id=>{const kind=ours?"offensive":"defensive";if(id==="opp")state.events.push(createEvent("opp_rebound",{team:"opponent",kind:ours?"defensive":"offensive",lineup:[...state.active],chainId:state.pendingChain||null},state));else if(id==="team")state.events.push(createEvent("team_rebound",{team:"us",kind,chainId:state.pendingChain||null},state));else if(id!=="none")state.events.push(createEvent("rebound",{playerId:id,kind,lineup:[...state.active],chainId:state.pendingChain||null},state));state.pendingChain=null;render()})}
document.addEventListener("click",e=>{if(e.target.id==="oppMiss"){state.pendingChain=chainId();promptMissRebound("oppMiss")}if(e.target.id==="oppReb"){state.events.push(createEvent("opp_rebound",{team:"opponent",lineup:[...state.active]},state));render()}if(e.target.id==="opp2"||e.target.id==="opp3"){state.events.push(createEvent("opp_score",{points:e.target.id==="opp3"?3:2,lineup:[...state.active]},state));render()}if(e.target.id==="nextPeriod"){stopClock();const d=derive(state.events,roster);if(state.period<(state.periods||4)){state.period++;state.clockMs=(state.periodMinutes||8)*60000;if((state.periods===4&&state.period===3)||(state.periods===2&&state.period===2)){state.offenseRight=!state.offenseRight;if(state.timeoutMode==="half"){state.timeoutsUs=state.timeoutCount;state.timeoutsOpp=state.timeoutCount}}applyDirection();render()}else if(d.us===d.them){state.period++;state.clockMs=(state.otMinutes||3)*60000;state.events.push(createEvent("overtime_start",{number:state.period-(state.periods||4)},state));render()}}});
$("timeoutBtn").onclick=()=>{stopClock();modal("Timeout",[{label:state.team+" · "+(state.timeoutsUs??state.timeoutCount??3)+" remaining",value:"us"},{label:state.opp+" · "+(state.timeoutsOpp??state.timeoutCount??3)+" remaining",value:"opp"}],side=>{const left=side==="us"?(state.timeoutsUs??state.timeoutCount??3):(state.timeoutsOpp??state.timeoutCount??3);if(left<=0&&!confirm("No timeouts remain. Record this timeout anyway?"))return;if(side==="us")state.timeoutsUs=Math.max(0,left-1);else state.timeoutsOpp=Math.max(0,left-1);state.events.push(createEvent("timeout",{team:side,overLimit:left<=0},state));render()})};$("flipDirection").onclick=()=>{state.offenseRight=!state.offenseRight;clearPendingShot();applyDirection();render()};
$(
"subBtn").onclick=()=>{accrue();const benchNow=new Set(roster.filter(p=>!state.active.includes(p.id)).map(p=>p.id));openModal("Substitution","");const draw=()=>{$("modalBody").innerHTML='<div class="sub-board"><p><b>Select the players who are on the bench.</b> Everyone left unchecked will be on the court and available for shots and player stats.</p><div class="bench-select-list">'+roster.map(p=>'<label class="bench-select-row"><input type="checkbox" data-bench-id="'+p.id+'" '+(benchNow.has(p.id)?"checked":"")+'><span><b>#'+p.num+'</b> '+p.name+'</span><small>'+(benchNow.has(p.id)?"BENCH":"ON COURT")+'</small></label>').join("")+'</div><div id="benchCountNote" class="sub-count-note"></div><div class="sub-actions"><button id="resetBench" class="choice">Reset</button><button id="confirmBench" class="primary">Confirm Bench</button></div></div>';document.querySelectorAll("[data-bench-id]").forEach(cb=>cb.onchange=()=>{cb.checked?benchNow.add(cb.dataset.benchId):benchNow.delete(cb.dataset.benchId);draw()});const onCount=roster.length-benchNow.size;$("benchCountNote").textContent=onCount===5?"5 players on court · ready":onCount+" players would be on court · select the bench so exactly 5 remain unchecked";$("benchCountNote").classList.toggle("error",onCount!==5);$("resetBench").onclick=()=>{benchNow.clear();draw()};$("confirmBench").onclick=()=>{const next=roster.filter(p=>!benchNow.has(p.id)).map(p=>p.id);if(next.length!==5){alert("Leave exactly five players unchecked so five players are on the court.");return}const prior=[...state.active];state.active=next;state.events.push(createEvent("lineup",{players:[...next],from:prior,lineup:[...next]},state));if(state.running)state.lastTick=Date.now();closeModal();render();save(true)}};draw()};
function lineupAnalytics(events=scopeEvents()){const map=new Map();for(const e of events){const ids=e.payload?.lineup;if(!Array.isArray(ids)||ids.length!==5)continue;const key=[...ids].sort().join("|"),r=map.get(key)||{ids:[...ids],pf:0,pa:0,min:0};if(e.type==="shot"&&e.payload.made)r.pf+=e.payload.three?3:2;else if(e.type==="free_throw"&&e.payload.made)r.pf++;else if(e.type==="opp_score")r.pa+=e.payload.points||0;else if(e.type==="opp_free_throw"&&e.payload.made)r.pa++;map.set(key,r)}const mins=scopeMinutes();for(const r of map.values())r.min=Math.min(...r.ids.map(id=>mins[id]||0));return[...map.values()].sort((a,b)=>b.min-a.min||(b.pf-b.pa)-(a.pf-a.pa))}
function signed(n){return(n>0?"+":"")+n}
function analyticsEmpty(text){return'<div class="analytics-empty"><span>◌</span><b>More game data needed</b><small>'+text+'</small></div>'}
function renderLineupAnalytics(){
 const host=$("analyticsDetailContent");if(!host)return;
 const tab=state.analyticsDetailTab||"fast",all=scopeEvents();
 document.querySelectorAll("#analyticsDetailTabs button").forEach(b=>b.classList.toggle("active",b.dataset.analyticsDetail===tab));
 if(tab==="fast"){
   const shots=all.filter(e=>e.type==="shot"),fast=shots.filter(e=>e.payload.fastBreak),made=fast.filter(e=>e.payload.made),points=made.reduce((n,e)=>n+(e.payload.three?3:2),0),rate=fast.length?Math.round(made.length/fast.length*100):0,share=shots.length?Math.round(fast.length/shots.length*100):0;
   const leaders=roster.map(p=>{const attempts=fast.filter(e=>e.payload.playerId===p.id),makes=attempts.filter(e=>e.payload.made),pts=makes.reduce((n,e)=>n+(e.payload.three?3:2),0);return{p,attempts:attempts.length,makes:makes.length,pts}}).filter(x=>x.attempts).sort((a,b)=>b.pts-a.pts||b.makes-a.makes),max=Math.max(1,...leaders.map(x=>x.pts));
   host.innerHTML='<div class="analytics-hero"><span>⚡</span><div><small>TRANSITION ATTACK</small><b>'+points+' fast-break points</b><p>'+fast.length+' tagged attempts · '+rate+'% conversion</p></div><div class="analytics-ring" style="--value:'+rate+'"><b>'+rate+'%</b><small>FG</small></div></div><div class="analytics-kpis"><div><b>'+fast.length+'</b><span>ATTEMPTS</span></div><div><b>'+made.length+'</b><span>MAKES</span></div><div><b>'+points+'</b><span>POINTS</span></div><div><b>'+share+'%</b><span>OF ALL SHOTS</span></div></div><section class="analytics-visual-card"><h4>FAST-BREAK SCORING</h4>'+(leaders.length?leaders.map(x=>'<div class="analytics-player-bar"><span class="mini-avatar">'+imgOrInitial(x.p.headshot,x.p.name)+'</span><div><b>#'+x.p.num+' '+x.p.name+'</b><small>'+x.makes+'/'+x.attempts+' · '+x.pts+' pts</small><i><em style="width:'+Math.max(6,x.pts/max*100)+'%"></em></i></div></div>').join(""):analyticsEmpty("Tag Fast Break before a shot to build this view."))+'</section>';
   return;
 }
 if(tab==="lineups"){
   const rows=lineupAnalytics().slice(0,8),max=Math.max(1,...rows.map(r=>Math.abs(r.pf-r.pa)));
   host.innerHTML='<div class="analytics-section-intro"><span>⑤</span><div><small>FIVE TOGETHER</small><b>Lineup Performance</b><p>Compare scoring margin and time together without reading a table.</p></div></div><div class="lineup-card-grid">'+(rows.length?rows.map((r,i)=>{const diff=r.pf-r.pa,pct=Math.max(5,Math.abs(diff)/max*50);return'<article class="visual-lineup-card"><header><small>LINEUP '+(i+1)+'</small><b class="'+(diff>0?"positive":diff<0?"negative":"neutral")+'">'+signed(diff)+'</b></header><div class="lineup-five">'+r.ids.map(id=>{const p=roster.find(x=>x.id===id);return'<span title="'+(p?.name||"Player")+'">#'+(p?.num||"?")+'</span>'}).join("")+'</div><div class="plusminus-track"><i></i><em class="'+(diff>=0?"positive":"negative")+'" style="width:'+pct+'%"></em></div><footer><span>'+fmt(r.min)+' together</span><span>'+r.pf+' PF · '+r.pa+' PA</span></footer></article>'}).join(""):analyticsEmpty("Lineup combinations will appear after substitutions and scoring are tracked."))+'</div>';
   return;
 }
 const lineupEvents=all.filter(e=>Array.isArray(e.payload?.lineup)&&e.payload.lineup.length===5),minutes=scopeMinutes(),rows=roster.map(p=>{const on=lineupEvents.filter(e=>e.payload.lineup.includes(p.id)),off=lineupEvents.filter(e=>!e.payload.lineup.includes(p.id)),onD=derive(on,roster),offD=derive(off,roster),onDiff=onD.us-onD.them,offDiff=offD.us-offD.them;return{p,onDiff,offDiff,swing:onDiff-offDiff,min:minutes[p.id]||0}}).sort((a,b)=>b.swing-a.swing),max=Math.max(1,...rows.flatMap(x=>[Math.abs(x.onDiff),Math.abs(x.offDiff)]));
 host.innerHTML='<div class="analytics-section-intro"><span>↕</span><div><small>PLAYER IMPACT</small><b>On Court vs Off Court</b><p>Visual scoring-margin comparison for every player.</p></div></div><div class="impact-grid">'+(lineupEvents.length?rows.map(x=>'<article class="impact-card"><header><span class="impact-avatar">'+imgOrInitial(x.p.headshot,x.p.name)+'</span><div><b>#'+x.p.num+' '+x.p.name+'</b><small>'+fmt(x.min)+' played</small></div><strong class="'+(x.swing>0?"positive":x.swing<0?"negative":"neutral")+'">'+signed(x.swing)+'</strong></header><div class="impact-comparison"><label><span>ON</span><i><em class="on" style="width:'+Math.max(3,Math.abs(x.onDiff)/max*100)+'%"></em></i><b>'+signed(x.onDiff)+'</b></label><label><span>OFF</span><i><em class="off" style="width:'+Math.max(3,Math.abs(x.offDiff)/max*100)+'%"></em></i><b>'+signed(x.offDiff)+'</b></label></div></article>').join(""):analyticsEmpty("Player impact appears once lineup-based scoring has been recorded."))+'</div>';
}
function renderSecondary(d){if(!$("statsBody"))return;const scoped=derive(scopeEvents(),roster),scopedMinutes=scopeMinutes();const timeMinutes=scopeMinutes(state.timeScope||"game"),timeGames=scopeGames(state.timeScope||"game"),timeAvail=(state.timeScope||"game")==="game"?elapsedGameMs():timeGames.reduce((n,g)=>n+(g.elapsedMs||Math.max(...Object.values(g.minutes||{}),0)),0);document.querySelectorAll("#statsScope button").forEach(x=>x.classList.toggle("active",x.dataset.scope===(state.statsScope||"game")));document.querySelectorAll("#timeScope button").forEach(x=>x.classList.toggle("active",x.dataset.timeScope===(state.timeScope||"game")));$("rosterCards").innerHTML=roster.map(p=>'<div class="card"><span class="avatar">'+imgOrInitial(p.headshot,p.name)+'</span><div><b>#'+p.num+" "+p.name+"</b><br><small>"+(state.active.includes(p.id)?"On court":"Bench")+"</small></div></div>").join("");const elapsed=elapsedGameMs(),expected=elapsed*5,used=Object.values(state.minutes).reduce((a,b)=>a+b,0),bad=(state.timeScope||"game")==="game"&&Math.abs(used-expected)>=1500;$("timeCheck").classList.toggle("hidden",!bad);$("timeCheck").textContent=bad?"⚠ Playing-time totals are out of sync with elapsed game time.":"";$("timeTable").innerHTML=roster.slice().sort((a,b)=>(timeMinutes[b.id]||0)-(timeMinutes[a.id]||0)).map(p=>{const m=timeMinutes[p.id]||0,totalAvail=timeAvail,pct=totalAvail?Math.min(100,Math.round(m/totalAvail*100)):0;return'<div class="time-row"><b>#'+p.num+" "+p.name+"</b><span>"+fmt(m)+"</span><span>"+pct+'%</span><span class="time-bar"><i style="width:'+pct+'%"></i></span></div>'}).join("");$("statsBody").innerHTML=roster.map(p=>{const s=scoped.players[p.id];return'<tr><th data-player="'+p.id+'">#'+p.num+" "+p.name+"</th><td>"+fmt(scopedMinutes[p.id]||0)+"</td><td>"+s.pts+"</td><td>"+s.fgm+"/"+s.fga+"</td><td>"+s.threeM+"/"+s.threeA+"</td><td>"+s.ftM+"/"+s.ftA+"</td><td>"+s.reb+"</td><td>"+s.ast+"</td><td>"+s.stl+"</td><td>"+s.blk+"</td><td>"+s.to+"</td><td>"+s.pf+"</td><td>"+(s.plusMinus>0?"+":"")+s.plusMinus+"</td></tr>"}).join("");const totals=Object.values(scoped.players).reduce((t,s)=>{for(const k of ["pts","fgm","fga","threeM","threeA","ftM","ftA","reb","ast","stl","blk","to","pf"])t[k]=(t[k]||0)+(s[k]||0);return t},{}),totalMin=Object.values(scopedMinutes).reduce((n,v)=>n+v,0),teamDiff=scoped.us-scoped.them;$("statsBody").insertAdjacentHTML("beforeend",'<tr class="team-total"><th>Team Total</th><td>'+fmt(totalMin)+'</td><td>'+totals.pts+'</td><td>'+totals.fgm+'/'+totals.fga+'</td><td>'+totals.threeM+'/'+totals.threeA+'</td><td>'+totals.ftM+'/'+totals.ftA+'</td><td>'+totals.reb+'</td><td>'+totals.ast+'</td><td>'+totals.stl+'</td><td>'+totals.blk+'</td><td>'+totals.to+'</td><td>'+totals.pf+'</td><td>'+(teamDiff>0?"+":"")+teamDiff+'</td></tr>');document.querySelectorAll("[data-player]").forEach(x=>x.onclick=()=>openPlayer(x.dataset.player,scoped));renderLineupAnalytics();renderShotAnalytics()}
function openPlayer(id,d){const p=roster.find(x=>x.id===id),s=d.players[id],sm=scopeMinutes(),shots=scopeEvents().filter(e=>e.type==="shot"&&e.payload.playerId===id),m=shots.filter(e=>e.payload.made).length;$("playerDetail").innerHTML='<div class="player-hero"><span class="avatar">'+imgOrInitial(p.headshot,p.name)+'</span><div><h2>#'+p.num+" "+p.name+'</h2><p>'+scopeLabel()+'</p></div></div><div class="player-kpis">'+[["PTS",s.pts],["MIN",fmt(sm[id]||0)],["REB",s.reb],["AST",s.ast],["TO",s.to],["PF",s.pf],["FG",s.fgm+"/"+s.fga],["3PT",s.threeM+"/"+s.threeA],["FT",s.ftM+"/"+s.ftA],["+/-",(s.plusMinus>0?"+":"")+s.plusMinus]].map(x=>'<div class="kpi"><small>'+x[0]+'</small><b>'+x[1]+"</b></div>").join("")+'</div><h3>Shooting</h3><p>'+m+"/"+shots.length+" · "+(shots.length?Math.round(m/shots.length*100):0)+"%</p>";showView("playerView",null);renderPlayerCourt(shots)}
$("backStats").onclick=()=>showView("statsView","stats");

function eventLabel(e){const p=e.payload?.playerId&&roster.find(x=>x.id===e.payload.playerId);if(e.type==="opp_free_throw")return state.opp+" "+(e.payload.made?"made":"missed")+" FT";if(e.type==="shot")return (p?.name||"Player")+" "+(e.payload.made?"made ":"missed ")+(e.payload.three?"3PT":"2PT");if(e.type==="free_throw")return (p?.name||"Player")+" "+(e.payload.made?"made":"missed")+" FT";if(e.type==="opp_score")return state.opp+" +"+e.payload.points;if(e.type==="foul")return "Foul · "+(p?.name||state.opp);if(e.type==="lineup")return "Lineup change";return e.type.replaceAll("_"," ")}
function editScoringEvent(id){const e=state.events.find(x=>x.id===id);if(!e)return;if(e.type==="shot"||e.type==="free_throw"||e.type==="opp_free_throw"){e.payload={...e.payload,made:!e.payload.made};if(e.syncState==="synced"&&SB)SB.rpc("update_hardcourt_event_payload",{p_id:e.id,p_payload:e.payload});closeModal();render();save(true);return}if(e.type==="opp_score"){e.payload={...e.payload,points:e.payload.points===3?2:3};if(e.syncState==="synced"&&SB)SB.rpc("update_hardcourt_event_payload",{p_id:e.id,p_payload:e.payload});closeModal();render();save(true)}}
function openRecentEditor(){const recent=state.events.slice(-12).reverse();const rows=recent.map(e=>"<div class=\"edit-row\"><span><b>"+eventLabel(e)+"</b><small>"+((state.periods===2?"H":"Q")+e.period)+" · "+fmt(e.clockMs)+"</small></span><button data-delete-event=\""+e.id+"\">Remove</button></div>").join("");openModal("Recent Plays / Corrections","<div class=\"edit-list\">"+(rows||"<p>No recorded events yet.</p>")+"</div><button id=\"scoreCorrection\" class=\"choice\">Score Correction</button>");document.querySelectorAll(".edit-row").forEach((row,i)=>{const e=recent[i];if(["shot","free_throw","opp_free_throw","opp_score"].includes(e?.type)){const b=document.createElement("button");b.textContent="Edit";b.className="quick-edit";b.onclick=()=>editScoringEvent(e.id);row.appendChild(b)}});document.querySelectorAll("[data-delete-event]").forEach(b=>b.onclick=()=>{const target=state.events.find(e=>e.id===b.dataset.deleteEvent),chain=target?.payload?.chainId;const removed=state.events.filter(e=>chain?e.payload?.chainId===chain:e.id===b.dataset.deleteEvent);state.events=state.events.filter(e=>!removed.includes(e));cloudDeleteEvents(removed);closeModal();render();save(true)});$("scoreCorrection").onclick=scoreCorrection}
function scoreCorrection(){const d=derive(state.events,roster);openModal("Score Correction","<div class=\"score-correction\"><label>"+state.team+" official score<input id=\"correctUs\" type=\"number\" min=\"0\" value=\""+d.us+"\"></label><label>"+state.opp+" official score<input id=\"correctThem\" type=\"number\" min=\"0\" value=\""+d.them+"\"></label><button id=\"applyScoreCorrection\" class=\"primary\">Apply Correction</button></div>");$("applyScoreCorrection").onclick=()=>{const now=derive(state.events,roster),us=+$("correctUs").value,them=+$("correctThem").value;if(us!==now.us)state.events.push(createEvent("score_correction",{team:"us",delta:us-now.us},state));if(them!==now.them)state.events.push(createEvent("score_correction",{team:"opp",delta:them-now.them},state));closeModal();render()}}
function scopeLabel(){return({game:"Game",regular:"Regular Season",playoffs:"Playoffs",season:"Season Total"})[state.statsScope||"game"]}
function liveGameSnapshot(){return{gameId:state.gameId,teamId:state.teamId,opponent:state.opp||"Opponent",createdAt:state.gameStartedAt||Date.now(),playoffs:state.gameType==="playoffs",events:state.events||[],minutes:state.minutes||{},elapsedMs:elapsedGameMs(),live:true}}
function scopeGames(scope=state.statsScope||"game"){
  if(scope==="game")return[liveGameSnapshot()];
  let games=JSON.parse(localStorage.getItem("hardcourt-games")||"[]").filter(g=>g.teamId===state.teamId&&g.gameId!==state.gameId);
  if(state.gameStartedAt)games.push(liveGameSnapshot());
  if(scope==="playoffs")return games.filter(g=>g.playoffs);
  if(scope==="regular")return games.filter(g=>!g.playoffs);
  return games;
}
function scopeEvents(){return state.historyPreview?.events||scopeGames().flatMap(g=>g.events||[])}
function scopeMinutes(scope=state.statsScope||"game"){if(state.historyPreview?.minutes&&scope==="game")return state.historyPreview.minutes;return scopeGames(scope).reduce((out,g)=>{for(const [id,ms] of Object.entries(g.minutes||{}))out[id]=(out[id]||0)+ms;return out},{})}
$("timeScope").onclick=e=>{const b=e.target.closest("[data-time-scope]");if(!b)return;state.timeScope=b.dataset.timeScope;document.querySelectorAll("#timeScope button").forEach(x=>x.classList.toggle("active",x===b));render();save(true)};
$("statsScope").onclick=e=>{const b=e.target.closest("[data-scope]");if(!b)return;state.historyPreview=null;state.statsScope=b.dataset.scope;document.querySelectorAll("#statsScope button").forEach(x=>x.classList.toggle("active",x===b));render()};
function applyDirection(){document.querySelector(".half.left").classList.toggle("offense",!state.offenseRight);document.querySelector(".half.right").classList.toggle("offense",state.offenseRight);$("teamControls")?.classList.toggle("controls-right",!state.offenseRight);$("opponentQuick")?.classList.toggle("opponent-right",!state.offenseRight);$("fastWrap")?.classList.toggle("fast-left",!state.offenseRight);$("offenseHint")?.classList.toggle("hint-left",!state.offenseRight);if($("offenseHint"))$("offenseHint").innerHTML=state.offenseRight?"OFFENSE →<small>TAP COURT<br>FOR SHOT</small>":"← OFFENSE<small>TAP COURT<br>FOR SHOT</small>";document.body.classList.toggle("offense-left",!state.offenseRight);document.body.classList.toggle("offense-right",state.offenseRight)}
function resetGameViewport(){if(!matchMedia("(max-width:899px)").matches)return;const meta=document.querySelector('meta[name="viewport"]');if(!meta)return;const normal="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=yes";meta.setAttribute("content","width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover");document.documentElement.style.zoom="1";window.scrollTo(0,0);document.body.scrollLeft=0;document.body.scrollTop=0;requestAnimationFrame(()=>window.scrollTo(0,0));setTimeout(()=>{meta.setAttribute("content",normal);document.documentElement.style.zoom="";window.scrollTo(0,0)},350)}
function showView(id,tab){document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));$(id).classList.remove("hidden");if(tab){document.querySelectorAll("nav button").forEach(x=>x.classList.toggle("active",x.dataset.tab===tab))}const phone=matchMedia("(max-width:899px)").matches;document.body.classList.toggle("needs-portrait",phone&&id!=="gameView");document.body.classList.toggle("needs-landscape",phone&&id==="gameView");document.body.classList.toggle("game-active",id==="gameView");if(id==="gameView")resetGameViewport();render()}
document.querySelectorAll("nav [data-tab]").forEach(b=>b.onclick=()=>showView({roster:"rosterView",game:"gameView",time:"timeView",stats:"statsView",analytics:"analyticsView"}[b.dataset.tab],b.dataset.tab));
function populateShotFilters(){const s=$("shotPlayerFilter");s.innerHTML='<option value="team">Whole Team</option>'+roster.map(p=>'<option value="'+p.id+'">#'+p.num+" "+p.name+"</option>").join("");const per=$("shotPeriodFilter"),prefix=state.periods===2?"H":"Q";per.innerHTML='<option value="all">All</option>'+Array.from({length:state.periods||4},(_,i)=>'<option value="'+(i+1)+'">'+prefix+(i+1)+"</option>").join("");["shotPlayerFilter","shotTimeFilter","shotPeriodFilter","shotTypeFilter"].forEach(id=>$(id).onchange=renderShotAnalytics)}
function shotZone(e){let x=e.payload.x,y=e.payload.y;if(e.payload.rimZone)return e.payload.rimZone==="left_finish"?"Left Finish":e.payload.rimZone==="right_finish"?"Right Finish":"Center Rim";const bx=x>.5?1:0,dx=Math.abs(x-bx),dy=y-.5;if(!e.payload.three){if(dx<.28&&Math.abs(dy)<.22)return dy<-.07?"Left Paint":dy>.07?"Right Paint":"Center Paint";if(Math.abs(dy)>.25)return dy<0?"Left Baseline":"Right Baseline";return dy<-.08?"Left Wing Mid":dy>.08?"Right Wing Mid":"Top Midrange"}if(Math.abs(dy)>.36)return dy<0?"Left Corner 3":"Right Corner 3";return dy<-.13?"Left Wing 3":dy>.13?"Right Wing 3":"Top 3"}
function filteredShots(){let a=scopeEvents().filter(e=>e.type==="shot"),pf=$("shotPlayerFilter")?.value||"team",tf=$("shotTimeFilter")?.value||"game",per=$("shotPeriodFilter")?.value||"all",sf=$("shotTypeFilter")?.value||"all";if(pf!=="team")a=a.filter(e=>e.payload.playerId===pf);if(tf!=="game"){const half=state.periods===2?1:2;a=a.filter(e=>tf==="first"?e.period<=half:e.period>half)}if(per!=="all")a=a.filter(e=>String(e.period)===per);if(sf!=="all")a=a.filter(e=>sf==="3"?e.payload.three:!e.payload.three);return a}
const zoneRects={"Left Corner 3":[[0,.02,.16,.16],[.84,.02,.16,.16]],"Left Wing 3":[[.08,.16,.22,.27],[.70,.16,.22,.27]],"Top 3":[[.28,.28,.22,.44],[.50,.28,.22,.44]],"Right Wing 3":[[.08,.57,.22,.27],[.70,.57,.22,.27]],"Right Corner 3":[[0,.82,.16,.16],[.84,.82,.16,.16]],"Left Baseline":[[0,.18,.20,.16],[.80,.18,.20,.16]],"Right Baseline":[[0,.66,.20,.16],[.80,.66,.20,.16]],"Left Wing Mid":[[.16,.18,.18,.24],[.66,.18,.18,.24]],"Top Midrange":[[.20,.38,.18,.24],[.62,.38,.18,.24]],"Right Wing Mid":[[.16,.58,.18,.24],[.66,.58,.18,.24]],"Left Paint":[[0,.32,.19,.12],[.81,.32,.19,.12]],"Center Paint":[[0,.44,.19,.12],[.81,.44,.19,.12]],"Right Paint":[[0,.56,.19,.12],[.81,.56,.19,.12]],"Left Finish":[[.02,.37,.11,.09],[.87,.37,.11,.09]],"Center Rim":[[.02,.455,.11,.09],[.87,.455,.11,.09]],"Right Finish":[[.02,.54,.11,.09],[.87,.54,.11,.09]]};
function renderPlayerCourt(shots){if(!$("playerCourt"))return;$("playerCourt").innerHTML=courtLines()+shots.map(e=>"<i class=\"shot-dot "+(e.payload.made?"make":"miss")+"\" style=\"left:"+(e.payload.x*100)+"%;top:"+(e.payload.y*100)+"%\"></i>").join("")}
function courtLines(){return '<div class="court-lines ui51-hidden-lines"><i class="a-mid"></i><i class="a-center"></i><i class="a-paint l"></i><i class="a-paint r"></i><i class="a-ft l"></i><i class="a-ft r"></i><i class="a-arc l"></i><i class="a-arc r"></i><i class="a-corner l top"></i><i class="a-corner l bottom"></i><i class="a-corner r top"></i><i class="a-corner r bottom"></i><i class="a-board l"></i><i class="a-board r"></i><i class="a-rim l"></i><i class="a-rim r"></i><i class="a-restricted l"></i><i class="a-restricted r"></i></div><img class="analytics-brand" src="../brand-field.png" alt="">'}
function renderShotAnalytics(){if(!$("analyticsCourt"))return;const shots=filteredShots(),made=shots.filter(e=>e.payload.made),threes=shots.filter(e=>e.payload.three),tm=threes.filter(e=>e.payload.made),twos=shots.filter(e=>!e.payload.three),twoM=twos.filter(e=>e.payload.made);$("shootingSummary").textContent="FG "+made.length+"/"+shots.length+" · "+(shots.length?Math.round(made.length/shots.length*100):0)+"% | 3PT "+tm.length+"/"+threes.length+" · "+(threes.length?Math.round(tm.length/threes.length*100):0)+"% | 2PT "+twoM.length+"/"+twos.length+" · "+(twos.length?Math.round(twoM.length/twos.length*100):0)+"%";const zones={};shots.forEach(e=>{const z=shotZone(e);zones[z]??={a:0,m:0,pts:0};zones[z].a++;if(e.payload.made){zones[z].m++;zones[z].pts+=e.payload.three?3:2}});let heat="";if(state.chartMode!=="shots")heat=Object.entries(zones).map(([z,v])=>{const rs=zoneRects[z];if(!rs)return"";const r=rs[(shots.find(e=>shotZone(e)===z)?.payload.x||0)>.5?1:0];const pct=v.m/v.a,confidence=Math.min(1,v.a/4),score=.5+(pct-.5)*confidence,cls=score<.28?"cold3":score<.4?"cold2":score<.48?"cold1":score<.55?"neutral":score<.67?"hot1":score<.78?"hot2":"hot3";return'<i class="heat-zone '+cls+'" style="left:'+r[0]*100+'%;top:'+r[1]*100+'%;width:'+r[2]*100+'%;height:'+r[3]*100+'%"></i>'}).join("");const dots=state.chartMode==="heat"?"":shots.map(e=>'<i class="shot-dot '+(e.payload.made?"make":"miss")+'" style="left:'+e.payload.x*100+'%;top:'+e.payload.y*100+'%"></i>').join("");$("analyticsCourt").innerHTML=heat+courtLines()+dots;$("zoneTable").innerHTML=Object.entries(zones).sort((a,b)=>b[1].a-a[1].a).map(([z,v])=>'<div class="zone-cell"><b>'+z+"</b><span>"+v.m+"/"+v.a+" · "+Math.round(v.m/v.a*100)+'%</span><small>'+(v.pts/v.a).toFixed(2)+" pts/shot · "+Math.round(v.a/shots.length*100)+"% of shots</small></div>").join("")||'<div class="zone-cell">No shots for these filters yet.</div>'}
$("chartMode").onclick=e=>{const b=e.target.closest("[data-chart]");if(!b)return;state.chartMode=b.dataset.chart;document.querySelectorAll("#chartMode button").forEach(x=>x.classList.toggle("active",x===b));renderShotAnalytics();save()};
$("analyticsDetailTabs").onclick=e=>{const b=e.target.closest("[data-analytics-detail]");if(!b)return;state.analyticsDetailTab=b.dataset.analyticsDetail;renderLineupAnalytics();save()};
function newGame(){
  if(state.helperMode){openModal("Game Access","Only the team owner can create another game.");return}
  if(state.events?.length&&state.gameStartedAt&&!confirm("Start a new game? Your current game will remain saved, but make sure all stats have synced first."))return;
  stopClock();archiveGame();
  if(cloudChannel&&SB){SB.removeChannel(cloudChannel);cloudChannel=null}
  state.cloudGameId=null;state.cloudGameOwner=false;state.helperMode=false;state.historyPreview=null;
  state.gameId=crypto.randomUUID();state.gameStartedAt=null;state.opp="";state.gameDate=null;state.gameLocation="home";state.events=[];state.minutes={};
  state.period=1;state.clockMs=(state.periodMinutes||8)*60000;
  state.timeoutsUs=state.timeoutCount??3;state.timeoutsOpp=state.timeoutCount??3;
  state.fast=false;state.pendingChain=null;
  $("shell").classList.add("hidden");$("setup").classList.remove("hidden");document.body.classList.remove("game-active");$("oppName").value="";
  setupRoster();applyProfileToSetup();showAdminPage("games");save(true);
}
function gameHistory(){const games=JSON.parse(localStorage.getItem("hardcourt-games")||"[]").filter(g=>g.teamId===state.teamId).sort((a,b)=>b.createdAt-a.createdAt),rows=games.map(g=>'<div class="history-row"><span><b>'+g.opponent+'</b><small>'+new Date(g.createdAt).toLocaleDateString()+' · '+(g.playoffs?"Playoffs":"Regular Season")+'</small></span><button data-load-game="'+g.gameId+'">View</button></div>').join("");openModal("Game History",'<div class="history-list">'+(rows||"<p>No saved games yet.</p>")+"</div>");document.querySelectorAll("[data-load-game]").forEach(b=>b.onclick=()=>{const g=games.find(x=>x.gameId===b.dataset.loadGame);if(!g)return;state.statsScope="game";state.historyPreview={events:g.events||[],minutes:g.minutes||{},opponent:g.opponent};closeModal();showView("statsView","stats");render()})}
$("gameClockBtn").onclick=()=>state.running?stopClock():startClock();$("gameHistoryBtn").onclick=gameHistory;
window.addEventListener("pagehide",()=>{accrue();save()});document.addEventListener("visibilitychange",()=>{if(document.hidden&&state.running){stopClock()}});applyDirection();render();
refreshCloudPlayerMap();
let hardcourtBootPromise=null,lastHardcourtBootUser=null;
async function bootstrapHardcourt(force=false){
  if(!cloudUser||!SB)return false;
  const u=new URL(location.href);
  const hasInvite=u.searchParams.has("gameStatkeeperInvite")||u.searchParams.has("coachInvite")||u.searchParams.has("teamInvite");
  if(hardcourtBootPromise)return hardcourtBootPromise;
  if(!force&&lastHardcourtBootUser===cloudUser.id&&!hasInvite)return true;
  hardcourtBootPromise=(async()=>{
    cloudLoading=true;
    const handled=await redeemInviteFromUrl();
    if(handled){
      lastHardcourtBootUser=cloudUser.id;
      updateCloudStatus();return true;
    }
    if(state.helperMode&&state.cloudGameId){
      const opened=await openCloudGame(state.cloudGameId,true);
      if(opened)lastHardcourtBootUser=cloudUser.id;
      return opened;
    }
    // Always authenticate team ownership against Supabase; do not trust an
    // old local team ID from another signed-in session.
    state.cloudOwnerUserId=null;
    const loaded=await ensureCloudContext();
    if(!loaded){
      const {data}=await SB.rpc("get_hardcourt_cloud_context");
      if(Array.isArray(data)&&data.length===0){
        openModal("Create Your Basketball Team",
          '<p>No basketball team exists in this account yet.</p>'+
          '<label>Team name<input id="newHcTeamName" value="Erie Elite"></label>'+
          '<button id="createMyHcTeam" class="primary">Create Basketball Team</button>'+
          '<p id="createMyHcError" class="error"></p>');
        $("createMyHcTeam").onclick=async()=>{
          const name=$("newHcTeamName").value.trim();
          if(!name){$("createMyHcError").textContent="Enter a team name.";return}
          const {error}=await SB.rpc("create_hardcourt_team",{p_name:name,p_grade:"5th Grade",p_primary:"#111111",p_accent:"#39a852"});
          if(error){$("createMyHcError").textContent=error.message;return}
          closeModal();lastHardcourtBootUser=null;await bootstrapHardcourt(true);
        };
      }
      return false;
    }
    lastHardcourtBootUser=cloudUser.id;
    if(state.cloudGameId&&state.cloudOwnerUserId===cloudUser.id){
      startCloudRealtime();await pullCloudEvents();
    }
    applyProfileToSetup();setupRoster();updateCloudStatus();
    return true;
  })().catch(e=>{console.warn("Hardcourt account load",e);lastCloudSyncError=e.message;updateCloudStatus();return false})
    .finally(()=>{cloudLoading=false;hardcourtBootPromise=null;});
  return hardcourtBootPromise;
}
async function initCloud(){
  if(await initViewerMode())return;
  if(!window.supabase?.createClient)return;
  SB=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,hardcourtAuthOptions);
  SB.auth.onAuthStateChange((event,session)=>{
    const prev=cloudUser?.id||null;cloudUser=session?.user||null;updateCloudStatus();
    if(!cloudUser){lastHardcourtBootUser=null;return}
    if(event==="SIGNED_IN"||event==="INITIAL_SESSION"||prev!==cloudUser.id)
      setTimeout(()=>void bootstrapHardcourt(),0);
  });
  const {data}=await SB.auth.getSession();cloudUser=data?.session?.user||null;
  updateCloudStatus();
  if(cloudUser){await bootstrapHardcourt();void syncCloudEvents();}
  else if(new URL(location.href).searchParams.has("gameStatkeeperInvite"))openAccount();
}
initCloud();
window.addEventListener("online",()=>{if(cloudUser){void syncCloudEvents();if(state.cloudGameId)void pullCloudEvents();}});
if("serviceWorker" in navigator)window.addEventListener("load",async()=>{try{const r=await navigator.serviceWorker.register("./service-worker.js?v=ui68",{updateViaCache:"none"});await r.update();if(r.waiting)r.waiting.postMessage("SKIP_WAITING");r.addEventListener("updatefound",()=>{const w=r.installing;if(w)w.addEventListener("statechange",()=>{if(w.state==="installed"&&navigator.serviceWorker.controller)w.postMessage("SKIP_WAITING")})});navigator.serviceWorker.addEventListener("controllerchange",()=>{if(!sessionStorage.getItem("ui68-reloaded")){sessionStorage.setItem("ui68-reloaded","1");location.reload()}})}catch(e){}});

$("accountBtn").onclick=openSettings;$("shareTeamBtn").onclick=shareTeam;$("liveShareTeamBtn").onclick=shareTeam;$("helperBtn").onclick=inviteHelper;$("liveHelperBtn").onclick=inviteHelper;$("teamMenuBtn").onclick=openSettings;updateCloudStatus();
