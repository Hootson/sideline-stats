const SIDELINE_STATS_VERSION=window.SIDELINE_STATS_VERSION||"current";
const CHECKOUT_CANCEL_KEY="sidelinePendingCheckoutCancellation";
let sidelineInstallPrompt=null;
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();sidelineInstallPrompt=event;document.querySelector("#installAppBtn")?.classList.remove("hidden")});
window.addEventListener("appinstalled",()=>{sidelineInstallPrompt=null;document.querySelector("#installAppBtn")?.classList.add("hidden");const help=document.querySelector("#installHelp");if(help){help.textContent="Sideline Stats is installed on this device.";help.classList.remove("hidden")}});
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
    const link=document.createElement('link');link.rel='stylesheet';link.href='./voice-followup.css';link.dataset.ssFollowupCss='1';document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-owner-business-css]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='./owner-business.css';link.dataset.ownerBusinessCss='1';document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-owner-business]')){
    const script=document.createElement('script');script.src='./owner-business.js';script.dataset.ownerBusiness='1';document.body.appendChild(script);
  }
  if(!document.querySelector('script[data-player-profile]')){
    const script=document.createElement('script');script.src=`./player-profile.js?release=${encodeURIComponent(SIDELINE_STATS_VERSION)}`;script.dataset.playerProfile='1';document.body.appendChild(script);
  }
  const installBtn=document.querySelector("#installAppBtn"),installHelp=document.querySelector("#installHelp");
  const standalone=window.matchMedia?.("(display-mode: standalone)")?.matches||navigator.standalone===true;
  if(standalone)installBtn?.classList.add("hidden");
  installBtn?.addEventListener("click",async()=>{
    if(sidelineInstallPrompt){sidelineInstallPrompt.prompt();await sidelineInstallPrompt.userChoice;sidelineInstallPrompt=null;installBtn.classList.add("hidden");return}
    if(!installHelp)return;
    const ios=/iphone|ipad|ipod/i.test(navigator.userAgent||"");
    installHelp.textContent=ios?"In Safari, tap Share, then Add to Home Screen.":"Open your browser menu and choose Install app or Add to Home screen.";
    installHelp.classList.remove("hidden");
  });
});
if("serviceWorker" in navigator){
  window.addEventListener("load",async()=>{
    try{
      const swUrl=`./service-worker.js?release=${encodeURIComponent(SIDELINE_STATS_VERSION)}`;
      const reg=await navigator.serviceWorker.register(swUrl,{updateViaCache:"none"});
      await reg.update();
      if(reg.waiting)reg.waiting.postMessage?.({type:"SKIP_WAITING"});
    }catch(err){console.warn("Offline cache registration failed",err)}
  });
}
