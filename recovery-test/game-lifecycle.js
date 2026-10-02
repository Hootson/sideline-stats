/* Sideline Stats: canonical game lifecycle + duplicate prevention. */
(function(root){
  const ACTIVE=new Set(['scheduled','live']);
  const CLOSED=new Set(['final','archived']);
  function normalizeStatus(s){s=String(s||'scheduled').toLowerCase();if(s==='complete'||s==='completed')return'final';return ['scheduled','live','final','archived'].includes(s)?s:'scheduled'}
  function key(g){return [g?.team_id||g?.teamId||'',g?.season_id||g?.seasonId||'',String(g?.week??''),String(g?.opponent_name||g?.opponent||'').trim().toLowerCase(),String(g?.game_type||g?.gameType||'regular').toLowerCase()].join('|')}
  function findDuplicate(candidate,games){const k=key(candidate);return (games||[]).find(g=>!g?.deleted_at&&key(g)===k)||null}
  function canTransition(from,to){from=normalizeStatus(from);to=normalizeStatus(to);return from===to||({scheduled:['live','archived'],live:['final','archived'],final:['archived','live'],archived:[]}[from]||[]).includes(to)}
  function transition(game,to){to=normalizeStatus(to);const from=normalizeStatus(game?.status);if(!canTransition(from,to))return {ok:false,reason:`invalid-transition:${from}->${to}`};return {ok:true,value:{...game,status:to,updated_at:new Date().toISOString()}}}
  function validTime(value){if(value===null||value===undefined||value==='')return null;const n=typeof value==='number'?value:Date.parse(value);return Number.isFinite(n)&&n>0?n:null}
  function stableEndedAt(game){
    if(normalizeStatus(game?.status)!=='final')return null;
    const explicit=game?.finalizedAt??game?.ended_at;
    if(validTime(explicit)!==null)return typeof explicit==='string'?explicit:new Date(explicit).toISOString();
    const candidates=[game?.startedAt,game?.started_at,game?.createdAt,game?.created_at];
    for(const play of game?.plays||[])candidates.push(play?.ts,play?.client_created_at,play?.created_at);
    for(const snap of game?.snapRecords||[])candidates.push(snap?.ts,snap?.client_created_at,snap?.created_at);
    const times=candidates.map(validTime).filter(n=>n!==null);
    return times.length?new Date(Math.max(...times)).toISOString():null;
  }
  function visible(g){return !g?.deleted_at&&normalizeStatus(g?.status)!=='archived'}
  function active(g){return !g?.deleted_at&&ACTIVE.has(normalizeStatus(g?.status))}
  function closed(g){return !!g?.deleted_at||CLOSED.has(normalizeStatus(g?.status))}
  root.SidelineGameLifecycle={normalizeStatus,key,findDuplicate,canTransition,transition,stableEndedAt,visible,active,closed};
})(typeof globalThis!=='undefined'?globalThis:this);
