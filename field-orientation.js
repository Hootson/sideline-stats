/* Sideline Stats — quarter-aware visual field orientation.
   Visual only: never changes canonical ball spot, down, distance, or possession. */
(function(root){
  function quarterNumber(value){
    const m=String(value??'').match(/(?:Q|Quarter\s*)?(\d+)/i);
    const n=m?Number(m[1]):Number(value);
    return Number.isFinite(n)&&n>=1?n:1;
  }
  function ourAttackDirection(quarter){return quarterNumber(quarter)%2===1?'right':'left'}
  function shouldMirror(quarter){return ourAttackDirection(quarter)==='left'}
  function visualPercent(spot,quarter){
    const n=Math.max(0,Math.min(100,Number(spot)||0));
    return shouldMirror(quarter)?100-n:n;
  }
  function canonicalPercent(percent,quarter){
    const n=Math.max(0,Math.min(100,Number(percent)||0));
    return shouldMirror(quarter)?100-n:n;
  }
  root.SidelineFieldOrientation={quarterNumber,ourAttackDirection,shouldMirror,visualPercent,canonicalPercent};
})(typeof globalThis!=='undefined'?globalThis:this);
