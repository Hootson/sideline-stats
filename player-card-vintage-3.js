(()=>{
const load=(src)=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
(async()=>{
  try{
    await load('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js');
  }catch(_){ }
  await load('./player-card-vintage-4.js?release=4.6.49');
})();
