(()=>{
const BASE='./player-card-vintage-2.js?base=4.6.48';
async function boot(){
 try{
  let src=await fetch(BASE,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('card base '+r.status);return r.text()});
  const replacement=`function cardSummary(playerId){
   let att=0,cmp=0,passY=0,passTd=0,passInt=0,passFum=0,car=0,rushY=0,rushTd=0,rushFum=0,tgt=0,rec=0,recY=0,recTd=0,tkl=0,tfl=0,sack=0,defInt=0,ff=0,fr=0,teamRush=0,teamPass=0,teamRushTd=0,teamPassTd=0,teamSacks=0,teamTakeaways=0,oppRush=0,oppPass=0;
   const isPlayer=(v)=>String(v||'')===String(playerId), extra=(r,n)=>Array.isArray(r.extras)&&r.extras.some(x=>String(x).toLowerCase()===String(n).toLowerCase());
   for(const play of selectedPlays()){
    const r=raw(play),type=String(r.type||play.play_type||''),yards=Number(r.yards??play.yards??0),sub=String(r.sub||play.subtype||'');
    const fum=extra(r,'Fumble')||extra(r,'FUM')||r.fumble===true||r.fumbled===true;
    if(type==='Rush'){teamRush+=yards;if(has(r,'TD'))teamRushTd++;if(isPlayer(r.player)){car++;rushY+=yards;if(has(r,'TD'))rushTd++;if(fum)rushFum++}}
    if(type==='Pass'){
     if(sub==='Complete'){teamPass+=yards;if(has(r,'TD'))teamPassTd++}
     if(isPlayer(r.player)){att++;if(sub==='Complete'){cmp++;passY+=yards;if(has(r,'TD'))passTd++}if(sub==='Intercepted')passInt++;if(fum)passFum++}
     if(isPlayer(r.player2)){tgt++;if(sub==='Complete'){rec++;recY+=yards;if(has(r,'TD'))recTd++}}
    }
    if(type==='Defense'){
     if(sub==='Opponent Run')oppRush+=yards;if(sub==='Complete Pass')oppPass+=yards;
     if(r.tackleKind==='Sack')teamSacks++;
     if(r.interceptionPlayerId||r.fumbleRecoveryPlayerId)teamTakeaways++;
     const v=Number((r.defCredits||{})[playerId]||0);if(v){tkl+=v;if(r.tackleKind==='TFL')tfl+=v;if(r.tackleKind==='Sack')sack+=v}
     if(isPlayer(r.interceptionPlayerId))defInt++;
     if(isPlayer(r.forcedFumblePlayerId)||isPlayer(r.forced_fumble_player_id)||isPlayer(r.ffPlayerId)||isPlayer(r.fumbleForcedBy))ff++;
     if(isPlayer(r.fumbleRecoveryPlayerId)||isPlayer(r.fumble_recovery_player_id)||isPlayer(r.frPlayerId)||isPlayer(r.recoveredBy))fr++;
    }
   }
   function rating(){if(!att)return '—';const a=Math.max(0,Math.min(2.375,(cmp/att-.3)*5)),b=Math.max(0,Math.min(2.375,(passY/att-3)*.25)),cc=Math.max(0,Math.min(2.375,(passTd/att)*20)),d=Math.max(0,Math.min(2.375,2.375-(passInt/att)*25));const v=((a+b+cc+d)/6)*100;return (Math.round(v*10)/10).toFixed(1)}
   const cats=[];
   if(att)cats.push({name:'PASSING',headers:['CMP/ATT','YDS','AVG','TD','INT','FUM','RATE'],values:[cmp+'/'+att,passY,(passY/att).toFixed(1),passTd,passInt,passFum,rating()]});
   if(car)cats.push({name:'RUSHING',headers:['CAR','YDS','AVG','TD','FUM'],values:[car,rushY,(rushY/car).toFixed(1),rushTd,rushFum]});
   if(tgt)cats.push({name:'RECEIVING',headers:['TGT','REC','YDS','AVG','TD'],values:[tgt,rec,recY,rec?(recY/rec).toFixed(1):'—',recTd]});
   if(tkl||tfl||sack||defInt||ff||fr)cats.push({name:'DEFENSE',headers:['TKL','TFL','SACK','INT','FF','FR'],values:[fmt(tkl),fmt(tfl),fmt(sack),defInt,ff,fr]});
   const gs=selectedGames(),ourPts=gs.reduce((n,g)=>n+Number(g.team_score||0),0),oppPts=gs.reduce((n,g)=>n+Number(g.opponent_score||0),0);
   return{categories:cats,team:{rushY:teamRush,passY:teamPass,totalY:teamRush+teamPass,rushTd:teamRushTd,passTd:teamPassTd,points:ourPts,oppPoints:oppPts,oppRush,oppPass,oppTotal:oppRush+oppPass,sacks:teamSacks,takeaways:teamTakeaways}};
  }
  async function drawBack(ctx,X,Y,CW,CH,p,week,season,team,opp,g,rows,positions,colors){
   if(window.BBSBackMaster){
    const summary=cardSummary(p.id);
    const ok=await window.BBSBackMaster.draw(ctx,X,Y,CW,CH,{headshot,actionPhoto,headCrop,season,team,opp,ourScore:g?.team_score,oppScore:g?.opponent_score,rows,positions,summary,primary:colors.primary,accent:colors.accent});
    if(ok)return;
   }
  }`;
  src=src.replace(/async function drawBack\([\s\S]*?\nfunction gesturePoint/,replacement+'\nfunction gesturePoint');
  src=src.replace("head={x:X+58,y:BY+62,w:300,h:305}","head={x:X+83,y:BY+66,w:332,h:350}");
  src=src.replace("mode==='head'?{crop:headCrop,img:headshot||actionPhoto,w:300,h:305}","mode==='head'?{crop:headCrop,img:headshot||actionPhoto,w:332,h:350}");
  src=src.replace("await navigator.share({files:[f]});return","await navigator.share({files:[f],title:'Bleacher Butt Stats',text:'Keep stats for your team with Bleacher Butt Stats',url:'https://bleacherbuttstats.com/'});return");
  src=src.replace("btn.onclick=async()=>{modal.classList.remove('hidden');await loadData();populate();await useProfile();await build()}","btn.onclick=async()=>{modal.classList.remove('hidden');await loadData();populate();await useProfile();await build();try{window.bbsTrackPlayerCard?.('player_card_open',$('#pcPlayer')?.value||null)}catch(_){}}");
  src=src.replace("$('#pcBuild').onclick=()=>build();","$('#pcBuild').onclick=()=>{try{window.bbsTrackPlayerCard?.('player_card_generate',$('#pcPlayer')?.value||null)}catch(_){}return build()};");
  src=src.replace("await navigator.share({files:[f],title:'Bleacher Butt Stats',text:'Keep stats for your team with Bleacher Butt Stats',url:'https://bleacherbuttstats.com/'});return","await navigator.share({files:[f],title:'Bleacher Butt Stats',text:'Keep stats for your team with Bleacher Butt Stats',url:'https://bleacherbuttstats.com/'});try{window.bbsTrackPlayerCard?.('player_card_share',$('#pcPlayer')?.value||null)}catch(_){}return");
  src=src.replace("function save(){if(!lastBlob)return;","function save(){if(!lastBlob)return;try{window.bbsTrackPlayerCard?.('player_card_save',$('#pcPlayer')?.value||null)}catch(_){}");
  (0,eval)(src+'\n//# sourceURL=player-card-vintage-3-runtime.js');
 }catch(e){console.error('Player card master integration failed',e)}
}
boot();
})();
