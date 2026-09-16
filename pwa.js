const SIDELINE_STATS_VERSION="4.5.41";
window.SIDELINE_STATS_VERSION=SIDELINE_STATS_VERSION;
const CHECKOUT_CANCEL_KEY="sidelinePendingCheckoutCancellation";
try{const q=new URLSearchParams(location.search);if(q.get("checkout")==="cancelled"&&/^[0-9a-f-]{36}$/i.test(q.get("subscription_id")||""))sessionStorage.setItem(CHECKOUT_CANCEL_KEY,q.get("subscription_id"))}catch(_){}
async function recordPendingCheckoutCancellation(){
  try{
    const subscriptionId=sessionStorage.getItem(CHECKOUT_CANCEL_KEY);if(!subscriptionId||!window.supabase?.createClient)return;
    const sb=window.supabase.createClient("https://eyuvgzhkhcpwtcbmsvct.supabase.co","sb_publishable_uMOkwO4jyHen4pz4zCkIuQ_Ss-wUf2l",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)return;
    const {error}=await sb.functions.invoke("cancel-stripe-checkout",{body:{subscriptionId},headers:{Authorization:`Bearer ${session.access_token}`}});if(error)throw error;
    sessionStorage.removeItem(CHECKOUT_CANCEL_KEY);
  }catch(e){console.warn("Checkout cancellation analytics skipped",e)}
}

document.title=`Sideline Stats V${SIDELINE_STATS_VERSION}`;
window.addEventListener("DOMContentLoaded",()=>{
  setTimeout(recordPendingCheckoutCancellation,600);
  const heroVersion=document.querySelector('[data-screen="setup"] .hero .muted');
  if(heroVersion)heroVersion.textContent=`V${SIDELINE_STATS_VERSION} • SMART VOICE ENTRY • GRIDIRON EDITION`;
  const voicePlayBtn=document.querySelector("#voicePlayBtn");
  const voiceStartBtn=document.querySelector("#voiceStartBtn");
  if(voicePlayBtn&&voiceStartBtn){voicePlayBtn.addEventListener("click",()=>{window.setTimeout(()=>{const modal=document.querySelector("#voicePlayModal");if(modal&&!modal.classList.contains("hidden")&&/Start Listening/i.test(voiceStartBtn.textContent||""))voiceStartBtn.click()},80)})}
  if(!document.querySelector('link[data-ss-followup-css]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./voice-followup.css';
    link.dataset.ssFollowupCss='1';
    document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-owner-business-css]')){
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='./owner-business.css';link.dataset.ownerBusinessCss='1';document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-owner-business]')){
    const script=document.createElement('script');script.src='./owner-business.js';script.dataset.ownerBusiness='1';document.body.appendChild(script);
  }
});
if("serviceWorker" in navigator){window.addEventListener("load",()=>{navigator.serviceWorker.register("./service-worker.js").catch(err=>console.warn("Offline cache registration failed",err))})}