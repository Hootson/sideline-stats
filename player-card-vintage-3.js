(()=>{
const BASE='./player-card-vintage-2.js?base=4.6.48';
async function boot(){
 try{
  let src=await fetch(BASE,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('card base '+r.status);return r.text()});
  const replacement=`function cardSummary(playerId){
   let att=0,cmp=0,passY=0,passTd=0,passInt=0,car=0,rushY=0,rushTd=0,tgt=0,rec=0,recY=0,recTd=0,tkl=0,tfl=0,sack=0,defInt=0,teamRush=0,teamPass=0;
   for(const play of selectedPlays()){
    const r=raw(play),type=String(r.type||play.play_type||''),yards=Number(r.yards??play.yards??0),sub=String(r.sub||play.subtype||'');
    if(type==='Rush'){teamRush+=yards;if(String(r.player)===String(playerId)){car++;rushY+=yards;if(has(r,'TD'))rushTd++}}
    if(type==='Pass'){
     if(sub==='Complete')teamPass+=yards;
     if(String(r.player)===String(playerId)){att++;if(sub==='Complete'){cmp++;passY+=yards;if(has(r,'TD'))passTd++}if(sub==='Intercepted')passInt++}
     if(String(r.player2)===String(playerId)){tgt++;if(sub==='Complete'){rec++;recY+=yards;if(has(r,'TD'))recTd++}}
    }
    if(type==='Defense'){
     const v=Number((r.defCredits||{})[playerId]||0);if(v){tkl+=v;if(r.tackleKind==='TFL')tfl+=v;if(r.tackleKind==='Sack')sack+=v}
     if(String(r.interceptionPlayerId)===String(playerId))defInt++;
    }
   }
   const cats=[];
   if(att)cats.push({name:'PASSING',headers:['CMP/ATT','YDS','TD','INT'],values:[cmp+'/'+att,passY,passTd,passInt]});
   if(car)cats.push({name:'RUSHING',headers:['CAR','YDS','AVG','TD'],values:[car,rushY,car?(rushY/car).toFixed(1):'—',rushTd]});
   if(tgt)cats.push({name:'RECEIVING',headers:['TGT','REC','YDS','AVG','TD'],values:[tgt,rec,recY,rec?(recY/rec).toFixed(1):'—',recTd]});
   if(tkl||tfl||sack||defInt)cats.push({name:'DEFENSE',headers:['TKL','TFL','SACK','INT'],values:[fmt(tkl),fmt(tfl),fmt(sack),defInt]});
   return{categories:cats,team:{rushY:teamRush,passY:teamPass,totalY:teamRush+teamPass}};
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
  (0,eval)(src+'\n//# sourceURL=player-card-vintage-3-runtime.js');
 }catch(e){console.error('Player card master integration failed',e)}
}
boot();
})();
