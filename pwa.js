const SIDELINE_STATS_VERSION="4.5.30";

document.title=`Sideline Stats V${SIDELINE_STATS_VERSION}`;
window.addEventListener("DOMContentLoaded",()=>{
  const heroVersion=document.querySelector('[data-screen="setup"] .hero .muted');
  if(heroVersion)heroVersion.textContent=`V${SIDELINE_STATS_VERSION} • SMART VOICE ENTRY • GRIDIRON EDITION`;

  // One tap on Record Voice opens Voice Play and immediately starts listening.
  const voicePlayBtn=document.querySelector("#voicePlayBtn");
  const voiceStartBtn=document.querySelector("#voiceStartBtn");
  if(voicePlayBtn&&voiceStartBtn){
    voicePlayBtn.addEventListener("click",()=>{
      window.setTimeout(()=>{
        const modal=document.querySelector("#voicePlayModal");
        if(modal&&!modal.classList.contains("hidden")&&/Start Listening/i.test(voiceStartBtn.textContent||""))voiceStartBtn.click();
      },80);
    });
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch(err => console.warn("Offline cache registration failed", err));
  });
}
