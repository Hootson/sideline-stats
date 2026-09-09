(function(root,factory){
  const field=typeof module==="object"&&module.exports?require("./field-position.js"):root.SidelineFieldPosition;
  const api=factory(field);
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.SidelineVoice=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(field){
  const SMALL=["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
  const TENS_WORDS=["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];
  function spellNumber(n){const x=Number(n);if(!Number.isInteger(x)||x<0||x>99)return null;if(x<20)return SMALL[x];const tens=TENS_WORDS[Math.floor(x/10)],ones=x%10;return ones?`${tens} ${SMALL[ones]}`:tens}
  const NUMBER_WORDS=Object.freeze(Object.fromEntries(Array.from({length:100},(_,n)=>[n,spellNumber(n)])));
  const WORD_NUMBERS=Object.freeze(Object.fromEntries(Object.entries(NUMBER_WORDS).map(([n,word])=>[word,Number(n)])));
  const NUMBER_HOMOPHONES={oh:0,o:0,won:1,to:2,too:2,for:4,ate:8,fourty:40};
  function normalize(v){return String(v||"").toLowerCase().replace(/[–—-]/g," ").replace(/[^a-z0-9#' ]+/g," ").replace(/\s+/g," ").trim()}
  function spokenNumber(v,allowHomophones=false){let s=normalize(v);if(/^\d+$/.test(s)){const n=Number(s);return n<=99?n:null}if(s in WORD_NUMBERS)return WORD_NUMBERS[s];if(allowHomophones){const parts=s.split(" ").map(w=>w in NUMBER_HOMOPHONES?spellNumber(NUMBER_HOMOPHONES[w]):w);s=parts.join(" ");if(s in WORD_NUMBERS)return WORD_NUMBERS[s]}return null}
  const NUMBER_PATTERN=[...Object.keys(WORD_NUMBERS),...Object.keys(NUMBER_HOMOPHONES)].sort((a,b)=>b.length-a.length).map(x=>x.replace(/ /g,"\\s+")).join("|");
  function canonicalizeJerseyReferences(v){let clean=normalize(v);clean=clean.replace(new RegExp(`\\b(number|jersey)\\s+(?:#\\s*)?(${NUMBER_PATTERN}|\\d{1,2})\\b`,"g"),(all,label,value)=>{const n=spokenNumber(value,true);return n===null?all:`${label} ${n}`});clean=clean.replace(new RegExp(`#\\s*(${NUMBER_PATTERN}|\\d{1,2})\\b`,"g"),(all,value)=>{const n=spokenNumber(value,true);return n===null?all:`#${n}`});return clean}
  function applyCorrections(v,corrections){let clean=normalize(v);for(const [heard,intended] of Object.entries(corrections||{}).sort((a,b)=>b[0].length-a[0].length)){const from=normalize(heard),to=normalize(intended);if(!from||!to)continue;clean=clean.replace(new RegExp(`\\b${from.replace(/[.*+?^${}()|[\\]\\]/g,"\\$&")}\\b`,"g"),to)}return clean}
  function distance(a,b){const x=normalize(a),y=normalize(b),dp=Array.from({length:x.length+1},(_,i)=>[i]);for(let j=1;j<=y.length;j++)dp[0][j]=j;for(let i=1;i<=x.length;i++)for(let j=1;j<=y.length;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(x[i-1]===y[j-1]?0:1));return dp[x.length][y.length]}
  function playerMentions(text,roster){
    const clean=canonicalizeJerseyReferences(text),found=[];
    for(const p of roster||[]){const name=normalize(p.name),jersey=String(p.jersey??"").trim();let at=-1;
      if(name){const i=` ${clean} `.indexOf(` ${name} `);if(i>=0)at=i}
      if(jersey){const m=new RegExp(`(?:#\\s*|(?:number|jersey)\\s+)${jersey}(?=\\s|$)`).exec(clean);if(m&&(at<0||m.index<at))at=m.index}
      if(at<0&&name){const words=clean.split(" ");for(let i=0;i<words.length;i++)if(name.length>=3&&distance(words[i],name)<=1){at=i;break}}
      if(at>=0)found.push({player:p,index:at});
    }
    return found.sort((a,b)=>a.index-b.index).filter((x,i,a)=>a.findIndex(q=>q.player.id===x.player.id)===i);
  }
  function sideAliases(team,opp){const out={our:"ours",ours:"ours",own:"ours",are:"ours",their:"opp",theirs:"opp",there:"opp","they're":"opp",opponent:"opp"};for(const word of normalize(team).split(" "))if(word.length>2)out[word]="ours";for(const word of normalize(opp).split(" "))if(word.length>2)out[word]="opp";return out}
  function parsePositions(text,context){
    const clean=normalize(text),aliases=sideAliases(context.teamName,context.opponentName),words=Object.keys(aliases).sort((a,b)=>b.length-a.length).join("|");
    const num="(?:\\d+|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty)(?:\\s+(?:one|two|three|four|five|six|seven|eight|nine))?)";
    const hits=[];let m;const re=new RegExp(`\\b(${words})\\s+(?:yard\\s+line\\s+)?(${num})\\b`,"g");
    while((m=re.exec(clean))){const yard=spokenNumber(m[2]);if(yard!==null&&yard<=49)hits.push({spot:field.spotFromSide(aliases[m[1]],yard,context.possession),index:m.index})}
    const mid=/\b(?:the\s+)?(?:50|fifty|midfield)\b/g;while((m=mid.exec(clean)))hits.push({spot:50,index:m.index});
    return hits.sort((a,b)=>a.index-b.index).filter((x,i,a)=>!i||x.index!==a[i-1].index);
  }
  function extractYards(text){const clean=normalize(text),m=/(loss\s+of|minus|negative)?\s*(\d+|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty)(?:\s+(?:one|two|three|four|five|six|seven|eight|nine))?)\s*(?:yard|yards|yd|yds)\b/.exec(clean);if(!m)return null;const n=spokenNumber(m[2]);return /loss|minus|negative/.test(m[1]||"")?-Math.abs(n):n}
  function fail(message,transcript,missing,partial){return {ok:false,error:message,transcript:String(transcript||""),missing:missing||null,partial:partial||null}}
  function interpretVoiceCommand(transcript,roster,context){
    const ctx=context||{},clean=applyCorrections(transcript,ctx.voiceCorrections),mentions=playerMentions(clean,roster),positions=parsePositions(clean,ctx);
    if(!clean)return fail("Say or type a play first.",transcript);
    const isDefense=ctx.possession==="opp",isPass=/\b(pass|complete|completed|completion|incomplete|intercepted|interception|picked|sack)\b/.test(clean);
    const isRun=/\b(run|runs|ran|rush|rushes|rushed|carry|carries|carried)\b/.test(clean);
    if(!isPass&&!isRun)return fail("Say whether it was a run or pass.",transcript,"playType");
    let start=positions.length>1?positions[0].spot:null,end=positions.length>1?positions[positions.length-1].spot:(positions.length===1?positions[0].spot:null);
    if(positions.length===1&&/\b(?:from|starting(?: at)?|started(?: at)?)\s*$/.test(clean.slice(0,positions[0].index))){start=end;end=null}
    const spokenStart=start;
    if(start===null&&field.validSpot(ctx.ballSpot)!==null)start=Number(ctx.ballSpot);
    if(/\b(touchdown|end zone|td)\b/.test(clean))end=field.spotFromSide("endzone",0,ctx.possession);
    const directYards=extractYards(clean);let yards=start!==null&&end!==null?field.yardsBetween(start,end,ctx.possession):directYards;
    const partial={startSpot:start,endSpot:end};
    const conflict=spokenStart!==null&&field.validSpot(ctx.ballSpot)!==null&&Number(spokenStart)!==Number(ctx.ballSpot)?{spoken:Number(spokenStart),current:Number(ctx.ballSpot)}:null;
    const decorate=result=>{const locations=start!==null?`${field.label(start,ctx.teamName,ctx.opponentName)}${end!==null?` → ${field.label(end,ctx.teamName,ctx.opponentName)}`:""}`:"";if(locations)result.summary+=` • ${locations}`;if(conflict)result.conflict=conflict;return result};
    if(start===null)return fail("What was the starting field position?",transcript,"startSpot",partial);
    if((isRun||/\b(complete|completed|completion|caught|tackled|sack)\b/.test(clean))&&end===null&&yards===null)return fail("Where did the play end?",transcript,"endSpot",partial);
    const extras=/\b(touchdown|end zone|td)\b/.test(clean)?["TD"]:[];
    if(isDefense){
      let sub=isRun?"Opponent Run":/\bsack\b/.test(clean)?"Sack":/\bincomplete\b/.test(clean)?"Incomplete Pass":/\b(intercepted|interception|picked)\b/.test(clean)?"INT":"Complete Pass";
      if(sub==="Incomplete Pass")yards=0;
      const tacklers=mentions.map(x=>x.player.id);
      if(!["Incomplete Pass","INT"].includes(sub)&&!tacklers.length)return fail("Who made the tackle?",transcript,"tackler",partial);
      const flow={type:"Defense",sub,yards:Number(yards||0),tacklerIds:tacklers,startSpot:start,endSpot:end,extras};
      const who=tacklers.map(id=>{const p=(roster||[]).find(x=>x.id===id);return p?`#${p.jersey} ${p.name}`:""}).filter(Boolean).join(" + ");
      return decorate({ok:true,flow,summary:`${sub} — ${Number(yards||0)} yards${who?` — ${who}`:""}`,transcript:String(transcript)});
    }
    if(isRun){if(!mentions.length)return fail("Who carried the ball?",transcript,"runner",partial);const p=mentions[0].player;return decorate({ok:true,flow:{type:"Rush",player:p.id,yards:Number(yards||0),startSpot:start,endSpot:end,extras},summary:`Rush — #${p.jersey} ${p.name} — ${Number(yards||0)} yards`,transcript:String(transcript)})}
    let sub=/\b(intercepted|interception|picked)\b/.test(clean)?"Intercepted":/\bincomplete\b/.test(clean)?"Incomplete":/\b(complete|completed|completion|caught|tackled)\b/.test(clean)?"Complete":null;
    if(!sub)return fail("Was the pass complete, incomplete, or intercepted?",transcript,"passResult",partial);
    if(mentions.length<2)return fail("Who threw it and who was the intended receiver?",transcript,"players",partial);
    const qb=mentions[0].player,receiver=mentions[1].player;const flow={type:"Pass",sub,player:qb.id,player2:receiver.id,yards:sub==="Complete"?Number(yards||0):0,startSpot:start,endSpot:sub==="Complete"?end:start,extras};
    return decorate({ok:true,flow,summary:`Pass — #${qb.jersey} ${qb.name} to #${receiver.jersey} ${receiver.name} — ${sub}${sub==="Complete"?` for ${flow.yards} yards`:""}`,transcript:String(transcript)});
  }
  return {NUMBER_WORDS,normalize,spokenNumber,canonicalizeJerseyReferences,applyCorrections,distance,playerMentions,parsePositions,extractYards,interpretVoiceCommand};
});
