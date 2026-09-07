(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.SidelineFieldPosition=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  function validSpot(value){if(value===null||value===undefined||value==="")return null;const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=100?n:null}
  function spotFromSide(side,yard,possession){
    if(side==="midfield")return 50;
    if(side==="endzone")return possession==="opp"?0:100;
    const n=Number(yard);
    if(!Number.isFinite(n)||n<0||n>49)return null;
    return side==="opp"?100-n:n;
  }
  function yardsBetween(start,end,possession){
    const a=validSpot(start),b=validSpot(end);if(a===null||b===null)return null;
    return possession==="opp"?a-b:b-a;
  }
  function advanceSpot(start,yards,possession){
    const a=validSpot(start),y=Number(yards);if(a===null||!Number.isFinite(y))return null;
    return Math.max(0,Math.min(100,a+(possession==="opp"?-y:y)));
  }
  function label(spot,teamName,opponentName){
    const n=validSpot(spot);if(n===null)return "Starting position needed";
    if(n===50)return "Midfield";
    if(n===0)return `${teamName||"Our"} goal line`;
    if(n===100)return `${opponentName||"Opponent"} goal line`;
    return n<50?`${teamName||"Our"} ${n}`:`${opponentName||"Opponent"} ${100-n}`;
  }
  return {validSpot,spotFromSide,yardsBetween,advanceSpot,label};
});
