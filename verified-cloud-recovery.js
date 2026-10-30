/* V4.6.89 - on-demand, read-only recovery of a newer cloud game.
 * All cloud calls are SELECTs. No automatic cloud import, deletion, or overwrite. */
(function(root) {
  "use strict";
  function install(api) {
    const button = document.getElementById("cloudRecoverNewerGameBtn");
    if (!button || button.dataset.boundRecovery === "1") return;
    button.dataset.boundRecovery = "1";
    const clone = x => JSON.parse(JSON.stringify(x));
    const sig = x => JSON.stringify(x, function(k,v) {
      if (v && typeof v === "object" && !Array.isArray(v))
        return Object.fromEntries(Object.keys(v).sort().map(key => [key,v[key]]));
      return v;
    });
    function cleanPlay(raw) {
      const value = clone(raw);
      delete value.cloudRevision; delete value.cloudEditedAt;
      if (value.playCall && value.playCall.demo) delete value.playCall;
      return sig(value);
    }
    function error(message) { throw Error(message); }
    button.addEventListener("click", async () => {
      if(root.SidelineRecoveryInProgress || root.SidelineSafeWriteGrant || !api.canRun()) {
        alert("Another game operation is running. Retry when it finishes."); return;
      }
      const state=api.getState(),client=api.getClient(),user=api.getUser();
      if(!client || !user || !api.isOwner() || !api.isConnected() || navigator.onLine===false) {
        alert("Sign in as the team statkeeper on this phone and connect to the internet.");return;
      }
      const candidates=(state.games||[]).filter(g=>api.eligible(g) &&
        state.cloud?.safeSyncGames?.[g.id]?.lastSnapshotHash!==api.fingerprint(g) &&
        (state.cloud?.gameIds?.[g.id] || state.cloud?.safeSyncGames?.[g.id]?.cloudId));
      if(candidates.length!==1) {
        alert("Recovery requires exactly one eligible, pending new game. Nothing changed.");return;
      }
      const g=candidates[0],ticket=state.cloud.safeSyncGames[g.id];
      const cloudId=state.cloud.gameIds?.[g.id] || ticket.cloudId;
      if(!confirm("Check the newer Supabase game against the phone before restoring?\n\n"+
        "This performs read-only checks. If the histories match, you can choose to recover.")) return;
      const sourceHash=api.fingerprint(g),seasonId=state.cloud.seasonId,teamId=state.cloud.teamId;
      root.SidelineRecoveryInProgress=true;
      button.disabled=true;button.textContent="Verifying cloud history…";
      try {
        if(!/^[0-9a-f-]{36}$/i.test(String(cloudId))) error("Invalid linked cloud game ID.");
        const [head,playsResponse,snapsResponse] = await Promise.all([
          client.from("games").select("*").eq("id",cloudId).single(),
          client.from("plays").select("*",{count:"exact"}).eq("game_id",cloudId)
            .is("deleted_at",null).order("sequence"),
          client.from("snap_events").select("*",{count:"exact"}).eq("game_id",cloudId)
            .eq("active",true).order("snap_number")
        ]);
        for(const result of [head,playsResponse,snapsResponse])
          if(result.error) error(result.error.message||"Supabase read failed.");
        const h=head.data,plays=playsResponse.data||[],snaps=snapsResponse.data||[];
        if(!h || h.season_id!==seasonId || h.opponent_name!==g.opponent ||
          Number(h.week_number)!==Number(g.week) ||
          String(h.game_type)!==String(g.gameType||"regular") ||
          !["live","final"].includes(h.status) ||
          h.created_by!==user.id) error("Cloud identity, status, or game owner differs.");
        if(plays.length!==playsResponse.count||snaps.length!==snapsResponse.count)
          error("Cloud history is paginated. No partial recovery allowed.");
        if(plays.length<(g.plays||[]).length||snaps.length<(g.snapRecords||[]).length)
          error("Phone contains plays or snaps not present in the cloud.");
        if(Number(h.revision||0)<=Number(ticket.lastRevision||0))
          error("Cloud game is not newer than the last known phone checkpoint.");
        const rawIds=new Set(),cloudPlayIds=new Set();
        for(let i=0;i<plays.length;i++){
          const row=plays[i],raw=row.event_data?.raw,localId=String(row.event_data?.local_id||"");
          if(!localId || !raw || typeof raw!=="object" || String(raw.id)!==localId ||
            rawIds.has(localId)||cloudPlayIds.has(row.id))error("Cloud play identity is invalid or duplicated.");
          if(!Number.isInteger(Number(row.sequence)) || (i && Number(row.sequence)<=Number(plays[i-1].sequence)))
            error("Cloud play ordering is invalid.");
          rawIds.add(localId); cloudPlayIds.add(row.id);
          if(i<(g.plays||[]).length && (String(g.plays[i].id)!==localId ||
            cleanPlay(g.plays[i])!==cleanPlay(raw)))
            error("Phone play "+(i+1)+" differs from cloud. No records were replaced.");
        }
        for(const other of state.games||[]){
          if(other.id===g.id)continue;
          if((other.plays||[]).some(p=>rawIds.has(String(p.id))))
            error("The recovered play IDs overlap another phone game.");
        }
        // A phone deletion is never silently undone.
        for(const marker of Object.values(state.cloud?.pendingPlayDeletes||{}))
          if(marker?.localGameId===g.id)
            error("Pending play deletion detected. Resolve it before recovery.");
        const playIds=plays.map(p=>p.id),snapIds=snaps.map(r=>r.id);
        const [credits,participants,penaltiesQ]=await Promise.all([
          playIds.length?api.selectAllByIds(client,{
            table:"play_credits",column:"play_id",ids:playIds,
            columns:"id,play_id,player_id,credit_type,value,metadata"}):[],
          snapIds.length?api.selectAllByIds(client,{
            table:"snap_participants",column:"snap_event_id",ids:snapIds,
            columns:"snap_event_id,player_id"}):[],
          client.from("penalties").select("id,play_id,accepted").eq("game_id",cloudId)
            .eq("accepted",true)
        ]);
        if(penaltiesQ.error)error(penaltiesQ.error.message||"Could not verify penalties.");
        const penalties=penaltiesQ.data||[];
        const playerIdMap=state.cloud?.playerIds||{};
        const cloudToLocal=new Map(Object.entries(playerIdMap).map(([local,remote])=>
          [String(remote),local]));
        for(const person of state.roster||[])if(!cloudToLocal.has(String(person.id)))
          cloudToLocal.set(String(person.id),person.id);
        // Compare every active stat credit, not only counts, to avoid marking a
        // partially uploaded game as fully backed up.
        const creditByPlay=new Map();
        for(const c of credits){
          if(c.metadata?.active===false||Number(c.value)===0)continue;
          if(!creditByPlay.has(c.play_id))creditByPlay.set(c.play_id,[]);
          creditByPlay.get(c.play_id).push(c);
        }
        const credKey=c=>String(c.player_id)+"|"+c.credit_type+"|"+Number(c.value);
        for(let i=0;i<plays.length;i++){
          const row=plays[i],raw=row.event_data.raw,expected=api.credits(raw).map(c=>({
            player_id:playerIdMap[c.playerLocalId]||c.playerLocalId,
            credit_type:c.credit_type,value:c.value}));
          const current=creditByPlay.get(row.id)||[];
          if(sig(expected.map(credKey).sort())!==sig(current.map(credKey).sort()))
            error("Cloud player stats differ at play "+(i+1)+". No data was replaced.");
          if(raw.type==="Penalty"&&!penalties.some(p=>p.play_id===row.id))
            error("Cloud penalty is incomplete at play "+(i+1)+".");
        }
        const snapsNew=[],partBySnap=new Map();
        for(const item of participants){
          if(!partBySnap.has(item.snap_event_id))partBySnap.set(item.snap_event_id,[]);
          partBySnap.get(item.snap_event_id).push(item.player_id);
        }
        for(let i=0;i<snaps.length;i++){
          const row=snaps[i],date=Date.parse(row.client_created_at||row.created_at||"");
          if(!Number.isFinite(date)||Number(row.snap_number)!==i+1)
            error("Cloud snap timestamps or sequence are invalid.");
          const people=(partBySnap.get(row.id)||[]).map(id=>cloudToLocal.get(String(id)));
          if(people.some(x=>!x)||new Set(people).size!==people.length)
            error("Cloud snap player IDs cannot be matched to the phone roster.");
          const record={id:row.id,ts:date,quarter:Number(row.quarter||1),
            snapKind:row.snap_kind||"regular",playerIds:people};
          if(i<(g.snapRecords||[]).length){
            const prior=g.snapRecords[i];
            if(Number(prior.quarter||1)!==record.quarter||
              String(prior.snapKind||"regular")!==record.snapKind||
              sig([...(prior.playerIds||[])].sort())!==sig([...people].sort()))
              error("Phone snap "+(i+1)+" differs from cloud.");
          }
          snapsNew.push(record);
        }
        if(!api.canRun() || api.getState()!==state || api.getState().cloud?.teamId!==teamId ||
          api.getState().cloud?.seasonId!==seasonId || api.fingerprint(g)!==sourceHash)
          error("Phone game changed during verification. Retry.");
        const final=await client.from("games").select("revision,status")
          .eq("id",cloudId).single();
        if(final.error)error(final.error.message||"Could not confirm cloud revision.");
        if(Number(final.data?.revision)!==Number(h.revision) ||
          final.data?.status!==h.status)
          error("Cloud changed while verifying. Retry.");
        const addedPlays=plays.length-(g.plays||[]).length;
        const addedSnaps=snaps.length-(g.snapRecords||[]).length;
        button.textContent="Review recovery…";
        if(!confirm("Verified: "+(g.plays||[]).length+" existing phone plays match the cloud.\n"+
          "Recover "+addedPlays+" additional plays and "+addedSnaps+" additional snaps for "+
          g.opponent+"?\n\nSupabase will not be modified. A pre-recovery phone backup "+
          "will be requested before the local game is updated."))return;
        const before=api.getState();
        api.backup(before,"gridiron_pre_recovery_"+new Date().toISOString().slice(0,10)+".json");
        const next=clone(before),ng=clone(g);
        ng.plays=plays.map(p=>clone(p.event_data.raw));
        ng.snapRecords=snapsNew;
        ng.status=h.status==="final"?"complete":"live";
        ng.ourScore=Number(h.team_score||0);
        ng.oppScore=Number(h.opponent_score||0);
        ng.scoreModelVersion=2;
        ng.scoreAdjustment=ng.ourScore-api.autoPoints(ng);
        ng.quarter=Number(h.current_quarter||1);
        ng.down=Number(h.current_down||1);
        ng.distance=Number(h.current_distance||10);
        ng.possession=h.possession==="opponent"?"opp":"ours";
        ng.ballSpot=api.validSpot(h.current_state?.ballSpot);
        ng.cloudRevision=Number(h.revision||0);
        ng.finalizedAt=h.status==="final"?h.ended_at||ng.finalizedAt||null:null;
        if(Array.isArray(h.game_plan))ng.gamePlan=clone(h.game_plan);
        if(!ng.opponentLogoData && h.opponent_logo_data)
          ng.opponentLogoData=h.opponent_logo_data;
        next.games=next.games.map(x=>x.id===g.id?ng:x);
        next.cloud.gameIds[g.id]=cloudId;
        next.cloud.deleteRevisions["games:"+cloudId]=Number(h.revision);
        for(let i=0;i<plays.length;i++){
          const row=plays[i],play=ng.plays[i];
          next.cloud.playIds[play.id]=row.id;
          next.cloud.deleteRevisions["plays:"+row.id]=Number(row.revision||1);
          next.cloud.playHashes[play.id]=api.hash(api.playPayload(ng,play,i,cloudId));
          for(const credit of api.credits(play)){
            const key=api.creditKey(play.id,credit),
              playerId=playerIdMap[credit.playerLocalId]||credit.playerLocalId;
            const c=credits.find(x=>x.play_id===row.id&&x.player_id===playerId
              &&x.credit_type===credit.credit_type&&Number(x.value)===Number(credit.value)
              &&x.metadata?.active!==false);
            if(!c)error("A validated cloud credit disappeared.");
            next.cloud.creditIds[key]=c.id;
            next.cloud.creditHashes[key]=api.hash(credit);
          }
          if(play.type==="Penalty"){
            const match=penalties.find(p=>p.play_id===row.id);
            next.cloud.penaltyIds[play.id]=match.id;
            next.cloud.penaltyHashes[play.id]=api.hash(
              api.penaltyPayload(ng,play,cloudId,row.id));
          }
        }
        for(let i=0;i<snapsNew.length;i++){
          const item=snapsNew[i];
          next.cloud.snapIds[item.id]=item.id;
          next.cloud.snapHashes[item.id]=api.hash(api.snapPayload(ng,item,i,cloudId));
        }
        next.cloud.gameHashes[g.id]=api.hash(api.gamePayload(ng));
        next.cloud.safeSyncGames[g.id]={...ticket,cloudId,
          lastRevision:Number(h.revision),
          lastSnapshotHash:api.fingerprint(ng),lastError:null};
        next.cloud.lastSyncAt=new Date().toISOString();
        next.cloud.lastSyncError=null;
        next.cloud.remoteFingerprint=null;
        if(!api.canRun() || api.getState()!==before || api.fingerprint(g)!==sourceHash)
          error("The phone changed while preparing recovery. Nothing was replaced.");
        if(!await api.save(next,g.id))error("Device storage could not verify the recovered snapshot. Backup kept.");
        alert("Recovered "+plays.length+" plays and "+snapsNew.length+" snaps on this phone.\n"+
          "No Supabase records were changed. Confirm the game and stats before finalizing.");
      } catch(e) {
        console.error("Protected game recovery stopped",e);
        alert("Recovery stopped safely: "+String(e?.message||e)+
          "\nNo cloud records were changed.");
      } finally {
        root.SidelineRecoveryInProgress=false;
        button.disabled=false;button.textContent="Recover Newer Cloud Game";
        api.refresh();
      }
    });
  }
  root.SidelineVerifiedCloudRecovery={install};
})(typeof globalThis!=="undefined"?globalThis:this);
