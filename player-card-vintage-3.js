(()=>{
const BASE='./player-card-vintage-2.js?base=4.6.48';
async function boot(){
 try{
  let src=await fetch(BASE,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('card base '+r.status);return r.text()});
  const replacement=`async function drawBack(ctx,X,Y,CW,CH,p,week,season,team,opp,g,rows,positions,colors){
   if(window.BBSBackMaster){
    const ok=await window.BBSBackMaster.draw(ctx,X,Y,CW,CH,{headshot,actionPhoto,headCrop,season,team,opp,ourScore:g?.team_score,oppScore:g?.opponent_score,rows,positions,primary:colors.primary,accent:colors.accent});
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
