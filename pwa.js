const SIDELINE_STATS_VERSION="4.5.28";

document.title=`Sideline Stats V${SIDELINE_STATS_VERSION}`;
window.addEventListener("DOMContentLoaded",()=>{
  const heroVersion=document.querySelector('[data-screen="setup"] .hero .muted');
  if(heroVersion)heroVersion.textContent=`V${SIDELINE_STATS_VERSION} • SMART VOICE ENTRY • GRIDIRON EDITION`;

  // Sideline voice cadence: one tap opens Voice Play and immediately starts
  // listening. The existing microphone button becomes Stop & Transcribe.
  const voicePlayBtn=document.querySelector("#voicePlayBtn");
  const voiceStartBtn=document.querySelector("#voiceStartBtn");
  if(voicePlayBtn&&voiceStartBtn){
    voicePlayBtn.addEventListener("click",()=>{
      window.setTimeout(()=>{
        const modal=document.querySelector("#voicePlayModal");
        if(modal&&!modal.classList.contains("hidden")&&voiceStartBtn.textContent.includes("Start Listening"))voiceStartBtn.click();
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
