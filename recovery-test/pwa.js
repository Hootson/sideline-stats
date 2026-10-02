const SIDELINE_STATS_VERSION=window.SIDELINE_STATS_VERSION||"current";
const CHECKOUT_CANCEL_KEY="sidelinePendingCheckoutCancellation";
const ROSTER_DATA_KEY="sidelineStatsData";
const ROSTER_RECOVERY_KEY="sidelineStatsRecovery";
let sidelineInstallPrompt=null;
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();sidelineInstallPrompt=event;document.querySelector("#installAppBtn")?.classList.remove("hidden")});
window.addEventListener("appinstalled",()=>{sidelineInstallPrompt=null;document.querySelector("#installAppBtn")?.classList.add("hidden");const help=document.querySelector("#installHelp");if(help){help.textContent="Sideline Stats is installed on this device.";help.classList.remove("hidden")}});
try{const q=new URLSearchParams(location.search);if(q.get("checkout")==="cancelled"&&/^[0-9a-f-]{36}$/i.test(q.get("subscription_id")||""))sessionStorage.setItem(CHECKOUT_CANCEL_KEY,q.get("subscription_id"))}catch(_){}
async function recordPendingCheckoutCancellation(){try{const subscriptionId=sessionStorage.getItem(CHECKOUT_CANCEL_KEY);if(!subscriptionId||!window.supabase?.createClient)return;const sb=window.supabase.createClient("https://eyuvgzhkhcpwtcbmsvct.supabase.co","sb_publishable_uMOkwO4jyHen4pz4zCkIuQ_Ss-wUf2l",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)return;const {error}=await sb.functions.invoke("cancel-stripe-checkout",{body:{subscriptionId},headers:{Authorization:`Bearer ${session.access_token}`}});if(error)throw error;sessionStorage.removeItem(CHECKOUT_CANCEL_KEY)}catch(e){console.warn("Checkout cancellation analytics skipped",e)}}
function installRosterEditing(){
  const decorate=()=>{
    const list=document.querySelector("#rosterList");if(!list)return false;
    list.querySelectorAll(".player").forEach(row=>{const remove=row.querySelector("button.remove[data-id]");if(!remove||row.querySelector("button.roster-edit"))return;const edit=document.createElement("button");edit.type="button";edit.className="choice roster-edit";edit.dataset.id=remove.dataset.id;edit.textContent="Edit";edit.setAttribute("aria-label","Edit player");edit.style.cssText="min-height:auto;padding:6px 10px;margin-left:auto";remove.style.marginLeft="6px";remove.before(edit)});
    if(list.dataset.rosterEditBound!=="1"){
      list.dataset.rosterEditBound="1";
      list.addEventListener("click",async event=>{
        const button=event.target.closest("button.roster-edit");if(!button)return;event.preventDefault();event.stopImmediatePropagation();
        try{
          const raw=localStorage.getItem(ROSTER_DATA_KEY);if(!raw)return alert("Roster data could not be loaded.");
          const data=JSON.parse(raw),player=(data.roster||[]).find(p=>String(p.id)===String(button.dataset.id));if(!player)return alert("That player could not be found.");
          const nameInput=prompt("Edit player name:",player.name||"");if(nameInput===null)return;const name=nameInput.trim();if(!name)return alert("Enter a player name.");
          const jerseyInput=prompt("Edit jersey number:",String(player.jersey??""));if(jerseyInput===null)return;const jersey=Number(jerseyInput.trim());
          if(!Number.isInteger(jersey)||jersey<0||jersey>99)return alert("Enter a jersey number from 0 to 99.");
          if((data.roster||[]).some(p=>String(p.id)!==String(player.id)&&Number(p.jersey)===jersey))return alert("That jersey number already exists.");
          player.name=name;player.jersey=jersey;localStorage.setItem(ROSTER_RECOVERY_KEY,raw);localStorage.setItem(ROSTER_DATA_KEY,JSON.stringify(data));
          try{const cloudPlayerId=data.cloud?.playerIds?.[player.id];if(cloudPlayerId&&window.supabase?.createClient){const sb=window.supabase.createClient("https://eyuvgzhkhcpwtcbmsvct.supabase.co","sb_publishable_uMOkwO4jyHen4pz4zCkIuQ_Ss-wUf2l",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const {data:{session}}=await sb.auth.getSession();if(session?.access_token){const {error}=await sb.from("players").update({name,jersey_number:jersey}).eq("id",cloudPlayerId);if(error)throw error}}}catch(syncError){console.warn("Direct player cloud update deferred to normal sync",syncError)}
          location.reload();
        }catch(e){console.error("Roster edit failed",e);alert("That player could not be updated.")}
      },true);
      new MutationObserver(decorate).observe(list,{childList:true,subtree:true});
    }
    return true;
  };
  decorate();let attempts=0;const timer=setInterval(()=>{decorate();if(++attempts>=80)clearInterval(timer)},250);
}
document.title=`Sideline Stats V${SIDELINE_STATS_VERSION}`;
window.addEventListener("DOMContentLoaded",()=>{
  setTimeout(recordPendingCheckoutCancellation,600);installRosterEditing();
  const heroVersion=document.querySelector('[data-screen="setup"] .hero .muted');if(heroVersion)heroVersion.textContent=`V${SIDELINE_STATS_VERSION} • SMART VOICE ENTRY • GRIDIRON EDITION`;
  const voicePlayBtn=document.querySelector("#voicePlayBtn"),voiceStartBtn=document.querySelector("#voiceStartBtn");if(voicePlayBtn&&voiceStartBtn){voicePlayBtn.addEventListener("click",()=>{window.setTimeout(()=>{const modal=document.querySelector("#voicePlayModal");if(modal&&!modal.classList.contains("hidden")&&/Start Listening/i.test(voiceStartBtn.textContent||""))voiceStartBtn.click()},80)})}
  if(!document.querySelector('link[data-ss-followup-css]')){const link=document.createElement('link');link.rel='stylesheet';link.href='./voice-followup.css';link.dataset.ssFollowupCss='1';document.head.appendChild(link)}
  if(!document.querySelector('link[data-owner-business-css]')){const link=document.createElement('link');link.rel='stylesheet';link.href='./owner-business.css';link.dataset.ownerBusinessCss='1';document.head.appendChild(link)}
  if(!document.querySelector('script[data-owner-business]')){const script=document.createElement('script');script.src='./owner-business.js';script.dataset.ownerBusiness='1';document.body.appendChild(script)}
  if(!document.querySelector('script[data-player-profile]')){const script=document.createElement('script');script.src=`./player-profile.js?release=${encodeURIComponent(SIDELINE_STATS_VERSION)}`;script.dataset.playerProfile='1';document.body.appendChild(script)}
  const installBtn=document.querySelector("#installAppBtn"),installHelp=document.querySelector("#installHelp");const standalone=window.matchMedia?.("(display-mode: standalone)")?.matches||navigator.standalone===true;if(standalone)installBtn?.classList.add("hidden");installBtn?.addEventListener("click",async()=>{if(sidelineInstallPrompt){sidelineInstallPrompt.prompt();await sidelineInstallPrompt.userChoice;sidelineInstallPrompt=null;installBtn.classList.add("hidden");return}if(!installHelp)return;const ios=/iphone|ipad|ipod/i.test(navigator.userAgent||"");installHelp.textContent=ios?"In Safari, tap Share, then Add to Home Screen.":"Open your browser menu and choose Install app or Add to Home screen.";installHelp.classList.remove("hidden")})
});
if(document.readyState!=="loading")installRosterEditing();
if("serviceWorker" in navigator){window.addEventListener("load",async()=>{try{const swUrl=`./service-worker.js?release=${encodeURIComponent(SIDELINE_STATS_VERSION)}`;const reg=await navigator.serviceWorker.register(swUrl,{updateViaCache:"none"});await reg.update();if(reg.waiting)reg.waiting.postMessage?.({type:"SKIP_WAITING"})}catch(err){console.warn("Offline cache registration failed",err)}})}
