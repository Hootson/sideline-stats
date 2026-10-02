/* Loaded by V4.5.35 integration. Kept separate so the large app source is not replaced through the contents API. */
(function(){
  if(typeof document==='undefined')return;
  const add=()=>{
    if(!document.querySelector('link[data-ss-followup-css]')){
      const link=document.createElement('link');link.rel='stylesheet';link.href='./voice-followup.css';link.dataset.ssFollowupCss='1';document.head.appendChild(link);
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add,{once:true});else add();
})();
