(function(){
  if(typeof document==='undefined'||document.querySelector('link[data-ss-followup-css]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';link.href='./voice-followup.css';link.dataset.ssFollowupCss='1';
  document.head.appendChild(link);
})();
