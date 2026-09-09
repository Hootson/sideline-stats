(function(){
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const number=value=>Number.isFinite(Number(value))?Number(value):0;
  const pct=value=>`${Math.round(number(value)*100)}%`;
  const avg=(total,count)=>count?(total/count).toFixed(1):"0.0";
  const ordinal=n=>({1:"1ST",2:"2ND",3:"3RD",4:"4TH"}[Number(n)]||`${n}TH`);
  const possession=play=>play?.stateBefore?.possession||(play?.type==="Rush"||play?.type==="Pass"?"ours":play?.type==="Defense"?"opp":null);
  const offense=plays=>(plays||[]).filter(play=>possession(play)==="ours"&&(play.type==="Rush"||play.type==="Pass"));
  const defense=plays=>(plays||[]).filter(play=>possession(play)==="opp"&&play.type==="Defense");
  const playYards=play=>play?.type==="Pass"&&play?.sub!=="Complete"?0:number(play?.yards);
  const down=play=>Math.min(4,Math.max(1,number(play?.stateBefore?.down)||1));
  const distance=play=>Math.max(1,number(play?.stateBefore?.distance)||10);
  const successful=play=>{
    const gained=playYards(play),needed=distance(play),d=down(play);
    if(play?.firstDown===true||play?.extras?.includes("First Down"))return true;
    return gained>=needed*(d===1?.4:d===2?.6:1);
  };
  const explosive=play=>play?.type==="Rush"?playYards(play)>=10:play?.type==="Pass"&&play?.sub==="Complete"&&playYards(play)>=15;
  const turnover=play=>play?.sub==="Intercepted"||play?.extras?.includes("Fumble Lost");
  const distanceBucket=play=>distance(play)<=3?"short":distance(play)<=6?"medium":"long";
  const fieldZone=play=>{
    const spot=number(play?.stateBefore?.ballSpot);
    if(spot>=80)return "red";
    if(spot>=60)return "opp";
    if(spot>=40)return "mid";
    return "own";
  };
  const allPlays=games=>(games||[]).flatMap(game=>(game.plays||[]).map(play=>({...play,__game:game})));
  function selectedGames(games,selection){
    const list=[...(games||[])];
    if(!selection||selection==="season")return list;
    if(selection==="regular")return list.filter(game=>(game.gameType||"regular")==="regular");
    if(selection==="playoff")return list.filter(game=>(game.gameType||"regular")==="playoff");
    const id=String(selection).replace(/^game:/,"");
    return list.filter(game=>String(game.id)===id);
  }
  function metricSet(games){
    const plays=allPlays(games),off=offense(plays),def=defense(plays),rush=off.filter(p=>p.type==="Rush"),pass=off.filter(p=>p.type==="Pass"),completed=pass.filter(p=>p.sub==="Complete");
    const offYards=off.reduce((sum,p)=>sum+playYards(p),0),successes=off.filter(successful).length;
    const giveaways=off.filter(turnover).length,takeaways=def.filter(p=>p.interceptionPlayerId||p.fumbleRecoveryPlayerId||p.sub==="INT"||p.sub==="Fumble Recovery").length;
    const penalties=plays.filter(p=>p.type==="Penalty"&&!p.opponentOffenseAdjustment);
    const allowed=def.reduce((sum,p)=>sum+Math.max(0,number(p.yards)),0);
    return {plays,off,def,rush,pass,completed,offYards,successes,successRate:off.length?successes/off.length:0,yardsPerPlay:off.length?offYards/off.length:0,explosives:off.filter(explosive).length,giveaways,takeaways,turnoverMargin:takeaways-giveaways,penalties:penalties.length,penaltyYards:penalties.reduce((s,p)=>s+Math.abs(number(p.penaltyYards)),0),defYardsPerPlay:def.length?allowed/def.length:0};
  }
  function coachRead(metrics){
    if(!metrics.off.length)return "Record offensive plays to generate a Coach Read.";
    const first=metrics.off.filter(p=>down(p)===1),third=metrics.off.filter(p=>down(p)===3);
    const firstRate=first.length?first.filter(successful).length/first.length:null,thirdRate=third.length?third.filter(successful).length/third.length:null;
    const parts=[];
    if(firstRate!==null)parts.push(`${pct(firstRate)} of first-down plays have been successful.`);
    if(metrics.explosives)parts.push(`${metrics.explosives} explosive play${metrics.explosives===1?" has":"s have"} driven the offense.`);
    if(thirdRate!==null&&thirdRate<.5)parts.push("Third-down efficiency is the clearest practice opportunity.");
    if(metrics.turnoverMargin>0)parts.push(`The team is +${metrics.turnoverMargin} in turnover margin.`);
    return parts.slice(0,3).join(" ")||"The current sample is still developing; keep recording down, distance and play calls.";
  }
  function bar(label,value,max,color="primary",detail=""){
    const width=max?Math.max(3,Math.min(100,(number(value)/max)*100)):0;
    return `<div class="coach-bar-row"><div class="coach-bar-label"><strong>${esc(label)}</strong><span>${esc(detail||String(value))}</span></div><div class="coach-bar-track"><div class="coach-bar-fill ${color}" style="width:${width}%"></div></div></div>`;
  }
  function renderOverview(ctx){
    const metrics=metricSet(selectedGames(ctx.games,ctx.selection));
    const total=metrics.rush.length+metrics.pass.length,rushPct=total?metrics.rush.length/total:0,passPct=total?metrics.pass.length/total:0;
    const quarter=[1,2,3,4].map(q=>({q,yards:metrics.off.filter(p=>number(p.quarter)===q).reduce((s,p)=>s+playYards(p),0)}));
    const maxQuarter=Math.max(1,...quarter.map(x=>x.yards));
    return `<div class="coach-title-block"><div class="coach-kicker">COACH PRO</div><h2>GAME OVERVIEW</h2></div>
      <div class="coach-read"><div class="coach-read-icon">↗</div><div><strong>COACH READ</strong><p>${esc(coachRead(metrics))}</p></div></div>
      <div class="coach-metric-grid">
        <div class="coach-metric"><strong>${metrics.yardsPerPlay.toFixed(1)}</strong><span>YDS / PLAY</span></div>
        <div class="coach-metric"><strong>${pct(metrics.successRate)}</strong><span>SUCCESSFUL PLAYS</span></div>
        <div class="coach-metric"><strong>${metrics.explosives}</strong><span>EXPLOSIVE PLAYS</span></div>
        <div class="coach-metric"><strong>${metrics.turnoverMargin>0?"+":""}${metrics.turnoverMargin}</strong><span>TURNOVER MARGIN</span></div>
        <div class="coach-metric"><strong>${metrics.penalties}</strong><span>PENALTIES • ${metrics.penaltyYards} YDS</span></div>
        <div class="coach-metric"><strong>${metrics.defYardsPerPlay.toFixed(1)}</strong><span>DEF YDS / PLAY</span></div>
      </div>
      <div class="coach-chart-grid">
        <section class="coach-panel"><h3>RUN / PASS</h3><div class="coach-donut" style="--run:${Math.round(rushPct*100)}"><div><strong>${pct(rushPct)}</strong><span>Run</span></div></div><div class="coach-legend"><span><i class="black"></i>${metrics.rush.length} Run</span><span><i class="orange"></i>${metrics.pass.length} Pass</span></div></section>
        <section class="coach-panel"><h3>YARDS BY QUARTER</h3><div class="coach-quarter-chart">${quarter.map(x=>`<div><span>${x.yards}</span><i style="height:${Math.max(5,(x.yards/maxQuarter)*105)}px"></i><small>Q${x.q}</small></div>`).join("")}</div></section>
      </div>`;
  }
  function callGroups(plays){
    const groups=new Map();
    for(const play of plays){
      if(!play.playCall)continue;
      const key=String(play.playCall.id||`${play.playCall.number}:${play.playCall.name}`);
      if(!groups.has(key))groups.set(key,{id:key,number:play.playCall.number,name:play.playCall.name,plays:[]});
      groups.get(key).plays.push(play);
    }
    return [...groups.values()].sort((a,b)=>b.plays.length-a.plays.length||number(a.number)-number(b.number));
  }
  function cellClass(plays){
    if(plays.length<2)return "low";
    const rate=plays.filter(successful).length/plays.length;
    return rate>=.6?"strong":rate>=.4?"mixed":"weak";
  }
  function cellValue(plays,metric){
    if(!plays.length)return `<span>—</span><small>0 calls</small>`;
    if(metric==="calls")return `<span>${plays.length}</span><small>calls</small>`;
    if(metric==="yards")return `<span>${avg(plays.reduce((s,p)=>s+playYards(p),0),plays.length)}</span><small>avg yds • ${plays.length}</small>`;
    if(metric==="explosive")return `<span>${pct(plays.filter(explosive).length/plays.length)}</span><small>${plays.length} calls</small>`;
    return `<span>${pct(plays.filter(successful).length/plays.length)}</span><small>${plays.length} calls</small>`;
  }
  function playCallRead(groups,selectedDown){
    const candidates=[];
    for(const group of groups)for(const key of ["short","medium","long"]){
      const plays=group.plays.filter(p=>distanceBucket(p)===key);
      if(plays.length<2)continue;
      candidates.push({group,key,plays,rate:plays.filter(successful).length/plays.length});
    }
    candidates.sort((a,b)=>b.rate-a.rate||b.plays.length-a.plays.length);
    if(!candidates.length)return `More ${ordinal(selectedDown).toLowerCase()}-down play calls are needed before a reliable tendency appears.`;
    const best=candidates[0],labels={short:"1–3 yards",medium:"4–6 yards",long:"7+ yards"};
    return `Best call: ${best.group.name} with ${labels[best.key]} needed — ${pct(best.rate)} success across ${best.plays.length} calls.`;
  }
  function renderPlayCalls(ctx){
    const games=selectedGames(ctx.games,ctx.selection),selectedDown=number(ctx.down)||1,metric=ctx.metric||"success";
    const plays=offense(allPlays(games)).filter(p=>down(p)===selectedDown&&p.playCall),groups=callGroups(plays).slice(0,15),buckets=[{key:"short",label:"1–3 YDS"},{key:"medium",label:"4–6 YDS"},{key:"long",label:"7+ YDS"}];
    const zones=["own","mid","opp","red"].map(key=>{const list=plays.filter(p=>fieldZone(p)===key);return {key,list,rate:list.length?list.filter(successful).length/list.length:null}});
    const playbookCount=(ctx.playbook||[]).length,usedCount=new Set(offense(allPlays(games)).filter(p=>p.playCall).map(p=>p.playCall.id||`${p.playCall.number}:${p.playCall.name}`)).size;
    return `<div class="coach-title-block"><div class="coach-kicker">COACH PRO • ${playbookCount} PLAYBOOK CALLS • ${usedCount} USED</div><h2>PLAY CALLS</h2></div>
      <div class="coach-control-row"><label>Down<select id="coachDownSelect"><option value="1" ${selectedDown===1?"selected":""}>1st Down</option><option value="2" ${selectedDown===2?"selected":""}>2nd Down</option><option value="3" ${selectedDown===3?"selected":""}>3rd Down</option><option value="4" ${selectedDown===4?"selected":""}>4th Down</option></select></label><label>Show<select id="coachMetricSelect"><option value="success" ${metric==="success"?"selected":""}>Success %</option><option value="calls" ${metric==="calls"?"selected":""}>Calls</option><option value="yards" ${metric==="yards"?"selected":""}>Average Yards</option><option value="explosive" ${metric==="explosive"?"selected":""}>Explosive %</option></select></label></div>
      <div class="heat-legend"><span><i class="strong"></i>Strong</span><span><i class="mixed"></i>Mixed</span><span><i class="weak"></i>Needs Work</span><span><i class="low"></i>Low Sample</span></div>
      <section class="coach-panel heat-panel"><h3>WHAT’S WORKED ON ${ordinal(selectedDown)} DOWN</h3>${groups.length?`<div class="heat-table"><div class="heat-head">PLAY CALL</div>${buckets.map(b=>`<div class="heat-head">${b.label}</div>`).join("")}${groups.map(group=>`<div class="heat-name"><b>${esc(group.number)}</b> ${esc(group.name)}</div>${buckets.map(bucket=>{const list=group.plays.filter(p=>distanceBucket(p)===bucket.key);return `<button class="heat-cell ${cellClass(list)}" data-call-id="${esc(group.id)}" data-bucket="${bucket.key}">${cellValue(list,metric)}</button>`}).join("")}`).join("")}</div>`:`<div class="coach-empty">No play calls have been recorded for ${ordinal(selectedDown).toLowerCase()} down in this view.</div>`}</section>
      <div class="coach-read compact"><div class="coach-read-icon">↗</div><div><strong>COACH READ</strong><p>${esc(playCallRead(groups,selectedDown))}</p></div></div>
      <section class="coach-panel"><h3>BEST FIELD ZONE</h3><div class="field-zone-strip">${zones.map(zone=>`<div class="${zone.rate===null?"low":zone.rate>=.6?"strong":zone.rate>=.4?"mixed":"weak"}"><strong>${{own:"OWN",mid:"MIDFIELD",opp:"OPP",red:"RED ZONE"}[zone.key]}</strong><span>${zone.rate===null?"—":pct(zone.rate)}</span><small>${zone.list.length} calls</small></div>`).join("")}</div></section>`;
  }
  function playerMetrics(ctx){
    const games=selectedGames(ctx.games,ctx.selection),plays=allPlays(games),snaps=games.flatMap(g=>g.snapRecords||[]),map=new Map((ctx.roster||[]).map(p=>[p.id,{...p,rushes:0,rushYards:0,targets:0,receptions:0,recYards:0,passAtt:0,passCmp:0,passYards:0,tackles:0,tfl:0,sacks:0,int:0,ff:0,fr:0,snaps:0}]));
    for(const p of plays){const a=map.get(p.player),b=map.get(p.player2);if(p.type==="Rush"&&a){a.rushes++;a.rushYards+=playYards(p)}if(p.type==="Pass"&&a&&["Complete","Incomplete","Intercepted"].includes(p.sub)){a.passAtt++;if(p.sub==="Complete"){a.passCmp++;a.passYards+=playYards(p)}}if(p.type==="Pass"&&b){b.targets++;if(p.sub==="Complete"){b.receptions++;b.recYards+=playYards(p)}}if(p.type==="Defense"){for(const [id,val] of Object.entries(p.defCredits||{})){const d=map.get(id);if(!d)continue;const n=number(val);if(p.sub==="Sack")d.sacks+=n;else if(p.sub==="TFL"||p.tackleKind==="TFL")d.tfl+=n;else d.tackles+=n}const ip=map.get(p.interceptionPlayerId);if(ip)ip.int++;const ff=map.get(p.forcedFumblePlayerId);if(ff)ff.ff++;const fr=map.get(p.fumbleRecoveryPlayerId);if(fr)fr.fr++}}
    for(const snap of snaps)for(const id of snap.playerIds||[]){const p=map.get(id);if(p)p.snaps++}
    return {players:[...map.values()],snapTotal:snaps.length};
  }
  function renderPlayers(ctx){
    const data=playerMetrics(ctx),mode=ctx.playerMode||"offense";
    const tabs=`<div class="coach-segments"><button data-player-mode="offense" class="${mode==="offense"?"active":""}">Offense</button><button data-player-mode="defense" class="${mode==="defense"?"active":""}">Defense</button><button data-player-mode="snaps" class="${mode==="snaps"?"active":""}">Snaps</button></div>`;
    let rows=[];
    if(mode==="defense")rows=data.players.filter(p=>p.tackles+p.tfl+p.sacks+p.int+p.ff+p.fr).sort((a,b)=>(b.tackles+b.tfl*2+b.sacks*2+b.int*3)-(a.tackles+a.tfl*2+a.sacks*2+a.int*3)).map(p=>`<div class="coach-player-row"><div><b>#${esc(p.jersey)} ${esc(p.name)}</b><small>${p.tackles} TKL • ${p.tfl} TFL • ${p.sacks} SACK</small></div><strong>${p.int+p.ff+p.fr}</strong><span>TAKEAWAY PLAYS</span></div>`);
    else if(mode==="snaps")rows=data.players.sort((a,b)=>b.snaps-a.snaps).map(p=>`<div class="coach-player-row"><div><b>#${esc(p.jersey)} ${esc(p.name)}</b><small>${p.snaps} of ${data.snapTotal} snaps</small><div class="coach-mini-track"><i style="width:${data.snapTotal?Math.min(100,p.snaps/data.snapTotal*100):0}%"></i></div></div><strong>${data.snapTotal?pct(p.snaps/data.snapTotal):"0%"}</strong><span>SNAP RATE</span></div>`);
    else rows=data.players.filter(p=>p.rushes+p.targets+p.passAtt).sort((a,b)=>(b.rushYards+b.recYards+b.passYards)-(a.rushYards+a.recYards+a.passYards)).map(p=>`<div class="coach-player-row"><div><b>#${esc(p.jersey)} ${esc(p.name)}</b><small>${p.rushes} CAR • ${p.receptions}/${p.targets} REC • ${p.passCmp}/${p.passAtt} PASS</small></div><strong>${p.rushYards+p.recYards+p.passYards}</strong><span>TOTAL YARDS</span></div>`);
    return `<div class="coach-title-block"><div class="coach-kicker">COACH PRO</div><h2>PLAYERS</h2></div>${tabs}<section class="coach-panel coach-player-list">${rows.length?rows.join(""):'<div class="coach-empty">No player data is available in this view.</div>'}</section>`;
  }
  function renderTrends(ctx){
    const games=[...(ctx.games||[])].sort((a,b)=>number(a.week)-number(b.week)),rows=games.map(game=>({game,metrics:metricSet([game])})),maxYpp=Math.max(1,...rows.map(x=>x.metrics.yardsPerPlay)),maxPoints=Math.max(1,...rows.map(x=>number(x.game.displayScore??x.game.ourScore)));
    return `<div class="coach-title-block"><div class="coach-kicker">COACH PRO</div><h2>SEASON TRENDS</h2></div>
      <section class="coach-panel"><h3>YARDS PER PLAY</h3>${rows.map(x=>bar(`W${x.game.week} vs ${x.game.opponent}`,x.metrics.yardsPerPlay,maxYpp,"primary",`${x.metrics.yardsPerPlay.toFixed(1)} yds`)).join("")||'<div class="coach-empty">No games yet.</div>'}</section>
      <section class="coach-panel"><h3>SUCCESSFUL PLAYS</h3>${rows.map(x=>bar(`W${x.game.week} vs ${x.game.opponent}`,x.metrics.successRate,1,x.metrics.successRate>=.6?"good":x.metrics.successRate>=.4?"warn":"bad",pct(x.metrics.successRate))).join("")}</section>
      <section class="coach-panel"><h3>POINTS BY GAME</h3>${rows.map(x=>bar(`W${x.game.week} vs ${x.game.opponent}`,number(x.game.displayScore??x.game.ourScore),maxPoints,"accent",`${number(x.game.displayScore??x.game.ourScore)} points`)).join("")}</section>`;
  }
  function debriefField(label,key,value,placeholder){return `<label class="debrief-field">${label}<textarea data-debrief-field="${key}" rows="3" placeholder="${esc(placeholder)}">${esc(value||"")}</textarea></label>`}
  function renderDebrief(ctx){
    const selected=selectedGames(ctx.games,ctx.selection),game=selected.length===1?selected[0]:null,own=ctx.ownDebrief||{},fields=own.structured_context||{};
    if(!game)return `<div class="coach-title-block"><div class="coach-kicker">COACH PRO</div><h2>DEBRIEF</h2></div><div class="coach-empty card">Select one game to open its shared coaching debrief.</div>`;
    const shared=(ctx.debriefs||[]).filter(d=>d.status==="submitted"&&d.coach_user_id!==ctx.userId);
    return `<div class="coach-title-block"><div class="coach-kicker">COACH PRO</div><h2>GAME DEBRIEF</h2></div>
      <section class="coach-panel"><h3>YOUR DEBRIEF • WEEK ${esc(game.week)} VS ${esc(game.opponent)}</h3>
        <div class="debrief-ratings"><label>Energy<select id="debriefEnergy"><option value="">—</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${number(own.energy_rating)===n?"selected":""}>${n}</option>`).join("")}</select></label><label>Execution<select id="debriefExecution"><option value="">—</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${number(own.execution_rating)===n?"selected":""}>${n}</option>`).join("")}</select></label></div>
        ${debriefField("What worked","what_worked",fields.what_worked,"What should we repeat?")}${debriefField("What needs attention","needs_attention",fields.needs_attention,"What should we correct?")}${debriefField("Offensive tendencies","offensive_tendencies",fields.offensive_tendencies,"Calls, situations or formations")}${debriefField("Defensive tendencies","defensive_tendencies",fields.defensive_tendencies,"Fits, pressure or coverage")}${debriefField("Personnel observations","personnel_observations",fields.personnel_observations,"Player or position observations")}${debriefField("Practice priorities","practice_priorities",fields.practice_priorities,"Next practice priorities")}${debriefField("Questions for staff","questions",fields.questions,"Topics to discuss together")}
        <div class="debrief-actions"><button class="btn ghost" id="saveDebriefDraft">Save Draft</button><button class="btn" id="submitDebrief">Share With Coaches</button></div><div class="muted debrief-status">${own.updated_at?`Last saved ${esc(new Date(own.updated_at).toLocaleString())}`:"Not saved yet"}</div>
      </section>
      <section class="coach-panel"><h3>SHARED COACH NOTES</h3>${shared.length?shared.map(d=>`<article class="shared-debrief"><strong>${esc(d.coach_email||"Coach")}</strong><p>${esc(d.transcript_text||"")}</p></article>`).join(""):'<div class="coach-empty">No other coaches have shared a debrief yet.</div>'}</section>`;
  }
  function render(tab,ctx){
    if(tab==="playcalls")return renderPlayCalls(ctx);
    if(tab==="players")return renderPlayers(ctx);
    if(tab==="trends")return renderTrends(ctx);
    if(tab==="debrief")return renderDebrief(ctx);
    return renderOverview(ctx);
  }
  window.SidelineCoachAnalytics={render,selectedGames,metricSet,successful,explosive};
})();
