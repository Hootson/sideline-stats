/* Sideline Stats: canonical editable play fields by phase. UI-independent model. */
(function(root){
  const COMMON=['type','yards','endSpot','down','distance','quarter','penalty','penaltyType','penaltyYards','penaltyPlayerId','teamPenalty','unknownPenaltyPlayer','playCall'];
  const OFFENSE=[...COMMON,'runnerId','passerId','receiverId','complete','intercepted','fumble','fumblePlayerId','fumbleRecoveryPlayerId','recoveredByOpponent','touchdown','firstDown','twoPointResult'];
  const DEFENSE=[...COMMON,'tackles','tackleForLoss','sack','passDefendedPlayerId','interceptionPlayerId','forcedFumblePlayerId','fumbleRecoveryPlayerId','returnYards','defensiveTouchdownPlayerId'];
  const SPECIAL=[...COMMON,'kickerId','punterId','returnerId','kickType','kickResult','kickDistance','returnYards','touchback','fairCatch','fieldGoalResult','extraPointResult','blockedByPlayerId','fumble','fumbleRecoveryPlayerId'];
  function phase(play){const t=String(play?.type||'').toLowerCase();if(['defense','defensive'].includes(t))return'defense';if(['kickoff','punt','field goal','extra point','special teams','try'].includes(t))return'special';return'offense'}
  function fields(play){return phase(play)==='defense'?DEFENSE:phase(play)==='special'?SPECIAL:OFFENSE}
  function snapshot(play){const out={};fields(play).forEach(k=>{if(play&&Object.prototype.hasOwnProperty.call(play,k))out[k]=play[k]});return out}
  function apply(play,changes){const allowed=new Set(fields({...play,...changes}));const out={...(play||{})};Object.entries(changes||{}).forEach(([k,v])=>{if(allowed.has(k))out[k]=v});out.cloudEditedAt=new Date().toISOString();return out}
  root.SidelineEditPlay={COMMON,OFFENSE,DEFENSE,SPECIAL,phase,fields,snapshot,apply};
})(typeof globalThis!=='undefined'?globalThis:this);
