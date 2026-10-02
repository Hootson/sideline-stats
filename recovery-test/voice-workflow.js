/* Sideline Stats: preserve parsed voice facts; ask only for missing/ambiguous facts. */
(function(root){
  const has=v=>v!==undefined&&v!==null&&v!=='';
  function merge(base,patch){const out={...(base||{})};Object.entries(patch||{}).forEach(([k,v])=>{if(has(v))out[k]=v});return out}
  function needs(play){
    const p=play||{},out=[];
    if(!has(p.type))out.push({key:'type',kind:'choice',prompt:'Run or pass?',options:['Run','Pass']});
    if(['Run','Pass'].includes(p.type)&&!has(p.playerId)&&!has(p.playerNumber)&&!has(p.playerName))out.push({key:'player',kind:'roster',prompt:'Who made the play?'});
    if(p.fumble===true&&!has(p.fumbleRecoveryPlayerId)&&!has(p.recoveredByOpponent))out.push({key:'fumbleRecovery',kind:'roster-or-opponent',prompt:'Who recovered the fumble?'});
    if(p.penalty===true&&!has(p.penaltyPlayerId)&&!p.teamPenalty&& !p.unknownPenaltyPlayer)out.push({key:'penaltyPlayer',kind:'roster-team-unknown',prompt:'Who was the penalty on?'});
    if(p.needsEndSpot===true&&!has(p.endSpot)&&!has(p.yards))out.push({key:'endSpot',kind:'field',prompt:'Where did the play end?'});
    return out;
  }
  function next(play){return needs(play)[0]||null}
  function applyAnswer(play,key,value){
    const p={...(play||{})};
    if(key==='type')p.type=value;
    else if(key==='player')Object.assign(p,value||{});
    else if(key==='fumbleRecovery')Object.assign(p,value||{});
    else if(key==='penaltyPlayer'){
      if(value==='team')p.teamPenalty=true;else if(value==='unknown')p.unknownPenaltyPlayer=true;else Object.assign(p,value||{});
    } else p[key]=value;
    return p;
  }
  function correctionKey(teamId,heard){return `${teamId||'local'}|${String(heard||'').trim().toLowerCase()}`}
  function learn(store,teamId,heard,resolved){const out={...(store||{})};out[correctionKey(teamId,heard)]={resolved,updatedAt:new Date().toISOString()};return out}
  function recall(store,teamId,heard){return store?.[correctionKey(teamId,heard)]?.resolved||null}
  root.SidelineVoiceWorkflow={merge,needs,next,applyAnswer,correctionKey,learn,recall};
})(typeof globalThis!=='undefined'?globalThis:this);
