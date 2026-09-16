(()=>{
const SUPABASE_URL='https://eyuvgzhkhcpwtcbmsvct.supabase.co';
const KEY='sb_publishable_uMOkwO4jyHen4pz4zCkIuQ_Ss-wUf2l';
const $=s=>document.querySelector(s);
const fmt=n=>new Intl.NumberFormat().format(Number(n||0));
const pct=n=>`${Number(n||0).toFixed(Number(n||0)%1?1:0)}%`;
function metric(label,value,detail=''){return `<article class="owner-biz-metric"><small>${label}</small><strong>${value}</strong>${detail?`<span>${detail}</span>`:''}</article>`}
function close(){ $('#ownerDashboardModal')?.classList.add('hidden') }
async function load(){
 const target=$('#ownerMetrics'); if(!target)return;
 target.innerHTML='<div class="inline-note">Loading business analytics…</div>';
 try{
   const sb=window.supabase?.createClient?.(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});if(!sb)throw new Error('Supabase is unavailable');
   const {data:{session},error:sessionError}=await sb.auth.getSession();if(sessionError||!session?.access_token)throw new Error('Sign in again to view business analytics');
   const {data,error}=await sb.functions.invoke('owner-metrics',{headers:{Authorization:`Bearer ${session.access_token}`}});if(error)throw error;if(!data)throw new Error('No metrics were returned');
   const conversionDetail=data.trialsStarted?`${fmt(data.convertedTrials)} of ${fmt(data.trialsStarted)} trials purchased`:'No completed trial cohort yet';
   const avg=data.averageHoursToPurchase==null?'—':data.averageHoursToPurchase<48?`${data.averageHoursToPurchase} hrs`:`${(data.averageHoursToPurchase/24).toFixed(1)} days`;
   const checkoutRate=data.checkoutStarted?Math.round((Number(data.checkoutCompleted||0)/Number(data.checkoutStarted))*1000)/10:0;
   const planRows=(data.planIntent||[]).map(x=>`<div class="owner-biz-row"><span>${x.plan==='team_pro'?'Team Pro':'Statkeeper'}</span><b>${fmt(x.count)}</b></div>`).join('')||'<div class="muted">No plan choices yet.</div>';
   const activity=(data.recentSignups||[]).map(x=>`<div class="owner-biz-trend"><span>${x.day}</span><i style="width:${Math.max(3,Math.min(100,Number(x.percent||0)))}%"></i><b>${fmt(x.count)}</b></div>`).join('')||'<div class="muted">No recent signups.</div>';
   target.innerHTML=`
    <section class="owner-biz-section"><div class="owner-biz-kicker">TRIAL FUNNEL</div><div class="owner-biz-grid">
      ${metric('Trials started',fmt(data.trialsStarted),`${fmt(data.activeTrials)} active now`)}
      ${metric('Converted trials',fmt(data.convertedTrials),conversionDetail)}
      ${metric('Conversion rate',pct(data.conversionRate),'Trial → paid')}
      ${metric('Expired / no purchase',fmt(data.expiredNoPurchase),'Trials that ended without payment')}
      ${metric('Avg. time to purchase',avg,'From trial start')}
      ${metric('Paid teams',fmt(data.paidTeams),'Non-complimentary')}
    </div></section>
    <section class="owner-biz-section"><div class="owner-biz-kicker">CHECKOUT FUNNEL</div><div class="owner-biz-grid owner-biz-grid-3">
      ${metric('Checkout started',fmt(data.checkoutStarted))}
      ${metric('Completed',fmt(data.checkoutCompleted),`${pct(checkoutRate)} of started checkouts`)}
      ${metric('Expired / cancelled',fmt(data.checkoutAbandoned))}
    </div></section>
    <section class="owner-biz-section"><div class="owner-biz-kicker">PRODUCT TRACTION</div><div class="owner-biz-grid owner-biz-grid-3">
      ${metric('Accounts',fmt(data.accounts))}${metric('Teams',fmt(data.teams))}${metric('Games',fmt(data.games),`${fmt(data.plays)} recorded plays`)}
    </div></section>
    <section class="owner-biz-section"><h3>Plan interest</h3>${planRows}</section>
    <section class="owner-biz-section"><h3>New accounts — last 14 days</h3><div class="owner-biz-trends">${activity}</div></section>`;
 }catch(e){console.error('Owner business analytics failed',e);target.innerHTML=`<div class="inline-note error">${e?.message||'Could not load business analytics'}</div>`}
}
function open(e){e?.preventDefault();e?.stopImmediatePropagation();$('#authModal')?.classList.add('hidden');$('#ownerDashboardModal')?.classList.remove('hidden');const title=$('#ownerDashboardModal h2');if(title)title.textContent='Sideline Stats Business';const sub=$('#ownerDashboardModal .muted');if(sub)sub.textContent='Private owner view • live production funnel';load()}
window.addEventListener('DOMContentLoaded',()=>{
 const btn=$('#ownerDashboardBtn');if(btn){btn.textContent='Business Dashboard';btn.addEventListener('click',open,true)}
 $('#ownerDashboardCloseBtn')?.addEventListener('click',e=>{e.stopImmediatePropagation();close()},true);
});
})();