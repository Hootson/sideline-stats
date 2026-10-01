export function createHardcourtGameCloud({sb,getState,writeState}){
 let channel=null;
 async function listGames(){const s=getState();if(!s.cloudTeamId)return[];const {data,error}=await sb.rpc('get_hardcourt_games',{p_team_id:s.cloudTeamId});if(error)throw error;return data||[]}
 async function resume(gameId){const {data,error}=await sb.rpc('resume_hardcourt_game',{p_game_id:gameId});if(error)throw error;const row=Array.isArray(data)?data[0]:data;if(!row)throw new Error('Game is not available to this account.');const events=await loadEvents(gameId);const s=getState();s.cloudGameId=row.game_id;s.cloudTeamId=row.team_id;s.cloudSeasonId=row.season_id;s.opp=row.opponent_name;s.gameType=row.game_type||'regular';s.cloudGameOwner=!!row.can_statkeep;s.cloudGameFinal=row.status==='final';s.helperMode=false;s.events=events.map(e=>({id:e.id,type:e.event_type||e.type,payload:e.payload||{},period:e.period,clockMs:e.clock_ms,clientCreatedAt:e.client_created_at,syncState:'synced'}));writeState(s);return{...row,events:s.events}}
 async function finalize(gameId){const {data,error}=await sb.rpc('finalize_hardcourt_game',{p_game_id:gameId});if(error)throw error;return data===true}
 async function loadEvents(gameId){const {data,error}=await sb.from('hardcourt_events').select('*').eq('game_id',gameId).is('deleted_at',null).order('client_created_at');if(error)throw error;return data||[]}
 async function helperStatus(gameId){const {data,error}=await sb.rpc('get_game_statkeeper_status',{p_game_id:gameId});if(error)throw error;return Array.isArray(data)?data[0]||null:data}
 async function inviteHelper(gameId,email){const {data,error}=await sb.rpc('create_game_statkeeper_invite',{p_game_id:gameId,p_email:String(email||'').trim().toLowerCase(),p_expires_days:7});if(error)throw error;return Array.isArray(data)?data[0]:data}
 async function revokeHelper(gameId){const {error}=await sb.rpc('revoke_game_statkeeper',{p_game_id:gameId});if(error)throw error;return true}
 function subscribe(gameId,onChange){unsubscribe();channel=sb.channel('hc-account-game-'+gameId).on('postgres_changes',{event:'*',schema:'public',table:'hardcourt_events',filter:'game_id=eq.'+gameId},onChange).subscribe();return channel}
 function unsubscribe(){if(channel){sb.removeChannel(channel);channel=null}}
 return{listGames,resume,finalize,loadEvents,helperStatus,inviteHelper,revokeHelper,subscribe,unsubscribe}
}
