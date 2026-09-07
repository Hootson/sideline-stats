(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.SidelineVoice=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const ONES={zero:0,oh:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19};
  const TENS={twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
  const NUMBER_WORDS=Object.keys(ONES).concat(Object.keys(TENS)).join("|");
  const NUMBER_PATTERN="(?:\\d+|(?:"+NUMBER_WORDS+")(?:\\s+(?:"+Object.keys(ONES).filter(function(x){return ONES[x]<10}).join("|")+"))?)";

  function normalize(value){
    return String(value||"").toLowerCase().replace(/[–—-]/g," ").replace(/[^a-z0-9#' ]+/g," ").replace(/\s+/g," ").trim();
  }
  function spokenNumber(value){
    const s=normalize(value);
    if(/^\d+$/.test(s))return Number(s);
    const words=s.split(" ");
    let total=0,found=false;
    words.forEach(function(word){
      if(Object.prototype.hasOwnProperty.call(ONES,word)){total+=ONES[word];found=true}
      else if(Object.prototype.hasOwnProperty.call(TENS,word)){total+=TENS[word];found=true}
    });
    return found?total:null;
  }
  function escapeRegex(value){return String(value).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}
  function playerMentions(text,roster){
    const clean=normalize(text),seen=new Map();
    (roster||[]).forEach(function(player){
      const name=normalize(player.name),jersey=String(player.jersey??"").trim();
      let at=-1;
      if(name){
        const hit=new RegExp("(^|\\s)"+escapeRegex(name)+"(?=\\s|$)").exec(clean);
        if(hit)at=hit.index+hit[1].length;
      }
      if(jersey){
        const jerseyHit=new RegExp("(?:#\\s*|number\\s+)"+escapeRegex(jersey)+"(?=\\s|$)").exec(clean);
        if(jerseyHit&&(at<0||jerseyHit.index<at))at=jerseyHit.index;
      }
      if(at>=0&&!seen.has(player.id))seen.set(player.id,{player:player,index:at});
    });
    return Array.from(seen.values()).sort(function(a,b){return a.index-b.index});
  }
  function extractYards(text){
    const clean=normalize(text);
    const re=new RegExp("(loss\\s+of|minus|negative)?\\s*("+NUMBER_PATTERN+")\\s*(?:yard|yards|yd|yds)\\b","i");
    const hit=re.exec(clean);
    if(!hit)return null;
    const amount=spokenNumber(hit[2]);
    if(amount===null)return null;
    return /loss|minus|negative/.test(hit[1]||"")?-Math.abs(amount):amount;
  }
  function label(player){return "#"+String(player.jersey??"")+" "+String(player.name||"Player")}
  function fail(message,transcript){return {ok:false,error:message,transcript:String(transcript||"")}}

  function interpretVoiceCommand(transcript,roster,context){
    const clean=normalize(transcript),mentions=playerMentions(clean,roster),ctx=context||{};
    if(!clean)return fail("Say or type a play first.",transcript);
    if(ctx.possession==="opp")return fail("Voice entry currently supports our offense. Use the Defense buttons for this play.",transcript);
    const touchdown=/\b(touchdown|td)\b/.test(clean);
    const extras=touchdown?["TD"]:[];
    const isPass=/\b(pass|complete|completed|completion|incomplete|intercepted|interception|picked off)\b/.test(clean);
    if(isPass){
      let sub=null;
      if(/\b(intercepted|interception|picked off)\b/.test(clean))sub="Intercepted";
      else if(/\b(incomplete|incompletion)\b/.test(clean))sub="Incomplete";
      else if(/\b(complete|completed|completion|caught)\b/.test(clean))sub="Complete";
      if(!sub)return fail("Include complete, incomplete, or intercepted.",transcript);
      if(mentions.length<2)return fail("I need both the quarterback and receiver by name or jersey number.",transcript);
      const qb=mentions[0].player,receiver=mentions[1].player;
      if(qb.id===receiver.id)return fail("Quarterback and receiver must be different players.",transcript);
      const yards=extractYards(clean);
      if(sub==="Complete"&&yards===null)return fail("Include the yards gained or lost.",transcript);
      const flow={type:"Pass",sub:sub,player:qb.id,player2:receiver.id,yards:sub==="Complete"?yards:0,extras:extras};
      if(sub==="Incomplete"&&/\b(drop|dropped)\b/.test(clean))flow.drop=true;
      const detail=sub==="Complete"?(String(yards>0?"+":"")+String(yards)+" yards"):sub;
      return {ok:true,transcript:String(transcript||""),flow:flow,summary:"Pass — "+label(qb)+" to "+label(receiver)+" — "+detail+(touchdown?" — TOUCHDOWN":"")};
    }
    if(/\b(run|rush|rushed|carry|carried)\b/.test(clean)){
      if(!mentions.length)return fail("I couldn't match the runner. Say the player's name or jersey number.",transcript);
      const yards=extractYards(clean);
      if(yards===null)return fail("Include the yards gained or lost.",transcript);
      const runner=mentions[0].player;
      return {ok:true,transcript:String(transcript||""),flow:{type:"Rush",player:runner.id,yards:yards,extras:extras},summary:"Rush — "+label(runner)+" — "+(yards>0?"+":"")+String(yards)+" yards"+(touchdown?" — TOUCHDOWN":"")};
    }
    return fail("Try a run or pass phrase, such as “Cohen run 15 yards.”",transcript);
  }

  return {normalize:normalize,spokenNumber:spokenNumber,extractYards:extractYards,playerMentions:playerMentions,interpretVoiceCommand:interpretVoiceCommand};
});
