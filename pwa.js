const SIDELINE_STATS_VERSION="4.5.25";

document.title=`Sideline Stats V${SIDELINE_STATS_VERSION}`;
window.addEventListener("DOMContentLoaded",()=>{
  const heroVersion=document.querySelector('[data-screen="setup"] .hero .muted');
  if(heroVersion)heroVersion.textContent=`V${SIDELINE_STATS_VERSION} • INTERACTIVE FIELD PICKER • GRIDIRON EDITION`;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch(err => console.warn("Offline cache registration failed", err));
  });
}
