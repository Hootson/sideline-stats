import {HARDCOURT_COMMERCIAL,hardcourtPlanLabel,hardcourtPriceLabel} from './commercial-config.js';

function accessFromRow(row){
  const now=Date.now(),parse=v=>v?Date.parse(v):NaN,trialEnd=parse(row?.trial_ends_at),paidEnd=parse(row?.paid_access_ends_at),tier=String(row?.tier||'free');
  const trial=Number.isFinite(trialEnd)&&now<trialEnd;
  const paid=['statkeeper','team_pro'].includes(tier)&&(!Number.isFinite(paidEnd)||now<paidEnd);
  const complimentary=!!row?.complimentary||['founder_comp','internal_test'].includes(String(row?.access_source||''));
  return {tier:complimentary?'team_pro':tier,status:complimentary?'complimentary':trial?'trial':paid?'active':row?.trial_used?'expired':'not_started',active:complimentary||trial||paid,daysRemaining:trial?Math.max(1,Math.ceil((trialEnd-now)/86400000)):null};
}

export function createHardcourtCommerce({sb,getState,writeState,escapeHtml}){
  let access={tier:'free',status:'not_started',active:false};
  async function refresh(){
    const state=getState();
    if(!state.cloudTeamId)return access;
    const {data,error}=await sb.rpc('get_team_commercial_access',{p_team_id:state.cloudTeamId});
    if(!error){const row=Array.isArray(data)?data[0]:data;access=accessFromRow(row||{});state.hardcourtAccess=access;writeState(state)}
    return access;
  }
  function label(){return access.status==='trial'?`Team Pro Trial · ${access.daysRemaining} day${access.daysRemaining===1?'':'s'} left`:access.status==='complimentary'?'Complimentary Team Pro':access.active?hardcourtPlanLabel(access.tier):access.status==='expired'?'Trial Expired':'Hardcourt Account'}
  async function checkout(plan){
    const state=getState();
    const {data:{session}}=await sb.auth.getSession();
    if(!session||!state.cloudTeamId)throw new Error('Sign in and select a team before purchasing.');
    const response=await fetch(`${SUPABASE_FUNCTION_URL()}/create-checkout-session`,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({teamId:state.cloudTeamId,plan,edition:'hardcourt',successUrl:new URL('./?checkout=success',location.href).href,cancelUrl:new URL('./?checkout=cancel',location.href).href})});
    const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||'Unable to start checkout.');if(!payload.url)throw new Error('Checkout did not return a payment URL.');location.assign(payload.url);
  }
  function SUPABASE_FUNCTION_URL(){return 'https://eyuvgzhkhcpwtcbmsvct.supabase.co/functions/v1'}
  function pricingMarkup(){return `<div class="hc-paywall"><h2>Keep using Hardcourt</h2><p>Your trial is complete. Choose the access level for this team.</p><button data-hc-buy="statkeeper"><b>${hardcourtPlanLabel('statkeeper')}</b><span>${hardcourtPriceLabel('statkeeper')} / team season</span><small>Live stat entry + team stats</small></button><button data-hc-buy="team_pro"><b>${hardcourtPlanLabel('team_pro')}</b><span>${hardcourtPriceLabel('team_pro')} / team season</span><small>Everything in Stat Keeper + analytics + up to ${HARDCOURT_COMMERCIAL.plans.team_pro.coachSeats} coach seats</small></button><div class="hc-buy-msg"></div></div>`}
  function installAccountBar({email,teams,onTeamChange}){
    document.getElementById('hcCommercialBar')?.remove();const bar=document.createElement('div');bar.id='hcCommercialBar';bar.innerHTML=`<style>#hcCommercialBar{position:fixed;right:10px;top:10px;z-index:90000;max-width:330px;padding:9px 11px;border:1px solid #d7e1dc;border-radius:13px;background:#fffffff2;color:#10231a;box-shadow:0 8px 28px #0003;font:12px system-ui}#hcCommercialBar b{display:block;font-size:13px}#hcCommercialBar span{color:#238c50;font-weight:800}#hcCommercialBar select{max-width:150px;margin-left:6px}.hc-paywall{position:fixed;inset:0;z-index:99998;display:grid;align-content:center;gap:12px;padding:24px;background:#07110def;color:#fff;text-align:center;font-family:system-ui}.hc-paywall>button{width:min(480px,100%);margin:auto;padding:18px;border:1px solid #3b5c49;border-radius:15px;background:#fff;color:#10231a;text-align:left}.hc-paywall b,.hc-paywall span,.hc-paywall small{display:block}.hc-paywall span{margin:3px 0;font-weight:800;color:#238c50}.hc-buy-msg{min-height:20px;color:#ffb4b4}</style><b>${escapeHtml(email)}</b><span>${escapeHtml(label())}</span>${teams?.length>1?`<label> Team <select id="hcBarTeam">${teams.map(t=>`<option value="${escapeHtml(t.teamId)}" ${String(t.teamId)===String(getState().cloudTeamId)?'selected':''}>${escapeHtml(t.teamName||'Team')}</option>`).join('')}</select></label>`:''}`;document.body.appendChild(bar);bar.querySelector('#hcBarTeam')?.addEventListener('change',e=>onTeamChange?.(e.target.value));
    if(!access.active&&access.status==='expired'){const wall=document.createElement('div');wall.innerHTML=pricingMarkup();document.body.appendChild(wall.firstElementChild);document.querySelectorAll('[data-hc-buy]').forEach(btn=>btn.onclick=async()=>{const msg=document.querySelector('.hc-buy-msg');try{btn.disabled=true;msg.textContent='Opening secure checkout…';await checkout(btn.dataset.hcBuy)}catch(e){msg.textContent=e.message;btn.disabled=false}})}
  }
  function handleCheckoutReturn(){const p=new URLSearchParams(location.search),result=p.get('checkout');if(!result)return;const clean=new URL(location.href);clean.searchParams.delete('checkout');history.replaceState({},'',clean);if(result==='success'){const note=document.createElement('div');note.style='position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:100002;background:#143d25;color:#fff;padding:12px 18px;border-radius:12px;font:700 13px system-ui';note.textContent='Payment received. Updating your Hardcourt access…';document.body.appendChild(note);setTimeout(()=>location.reload(),1800)}}
  return {refresh,checkout,installAccountBar,handleCheckoutReturn,getAccess:()=>({...access})};
}
