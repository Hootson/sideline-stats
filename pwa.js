const SIDELINE_STATS_VERSION="4.5.27";

document.title=`Sideline Stats V${SIDELINE_STATS_VERSION}`;
window.addEventListener("DOMContentLoaded",()=>{
  const heroVersion=document.querySelector('[data-screen="setup"] .hero .muted');
  if(heroVersion)heroVersion.textContent=`V${SIDELINE_STATS_VERSION} • SMART VOICE ENTRY • GRIDIRON EDITION`;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch(err => console.warn("Offline cache registration failed", err));
  });
}
