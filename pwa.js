const SIDELINE_STATS_VERSION="4.5.39";
window.SIDELINE_STATS_VERSION=SIDELINE_STATS_VERSION;

document.title=`Sideline Stats V${SIDELINE_STATS_VERSION}`;
window.addEventListener("DOMContentLoaded",()=>{
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