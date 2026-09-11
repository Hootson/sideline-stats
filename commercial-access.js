(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SidelineCommercialAccess=api})(typeof window!=='undefined'?window:globalThis,function(){
  function time(v){const n=v?Date.parse(v):NaN;return Number.isFinite(n)?n:null}
  function resolve(row,now=Date.now()){
    const source=String(row?.access_source||'standard'),complimentary=!!row?.complimentary||['founder_comp','internal_test'].includes(source),tier=['coach','pro'].includes(row?.tier)?'team_pro':String(row?.tier||'free');
    const ts=time(row?.trial_started_at),te=time(row?.trial_ends_at),ps=time(row?.paid_access_starts_at),pe=time(row?.paid_access_ends_at);
    const trial=tier==='trial'&&ts!==null&&te!==null&&ts<=now&&now<te,paid=['statkeeper','team_pro'].includes(tier)&&ps!==null&&ps<=now&&(pe===null||now<pe),active=complimentary||trial||paid;
    return {tier:complimentary?'team_pro':tier,status:complimentary?'complimentary':trial?'trial':paid?'active':row?.trial_used?'expired':'not_started',complimentary,active,coachAccess:active&&(complimentary||trial||tier==='team_pro'),recordAccess:active&&(complimentary||trial||['statkeeper','team_pro'].includes(tier)),daysRemaining:trial?Math.max(1,Math.ceil((te-now)/86400000)):null,trialEndsAt:row?.trial_ends_at||null};
  }
  function label(a){return a.status==='complimentary'?'Complimentary Team Pro':a.status==='trial'?`Team Pro trial • ${a.daysRemaining} day${a.daysRemaining===1?'':'s'} left`:a.active&&a.tier==='team_pro'?'Team Pro':a.active&&a.tier==='statkeeper'?'Statkeeper':a.status==='expired'?'Access expired':'Free Viewer'}
  return {resolve,label};
});
