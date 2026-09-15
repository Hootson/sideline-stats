/* Sideline Stats: revision-aware cloud/local conflict protection. */
(function(root){
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const stamp=v=>{const n=Date.parse(v||'');return Number.isFinite(n)?n:0};
  function versionOf(x){return {revision:num(x?.revision),updatedAt:stamp(x?.updated_at||x?.updatedAt||x?.cloudEditedAt)}}
  function compare(local,remote){
    const l=versionOf(local),r=versionOf(remote);
    if(l.revision!==r.revision)return l.revision>r.revision?1:-1;
    if(l.updatedAt!==r.updatedAt)return l.updatedAt>r.updatedAt?1:-1;
    return 0;
  }
  function canWrite(local,remote){
    if(!remote)return {ok:true,reason:'new'};
    const c=compare(local,remote);
    if(c<0)return {ok:false,reason:'remote-newer',remote};
    return {ok:true,reason:c>0?'local-newer':'same-version'};
  }
  function nextRevision(local,remote){return Math.max(num(local?.revision),num(remote?.revision))+1}
  function prepareWrite(local,remote){
    const check=canWrite(local,remote);
    if(!check.ok)return check;
    return {ok:true,value:{...local,revision:nextRevision(local,remote),updated_at:new Date().toISOString()}};
  }
  root.SidelineCloudConflict={versionOf,compare,canWrite,nextRevision,prepareWrite};
})(typeof globalThis!=='undefined'?globalThis:this);
