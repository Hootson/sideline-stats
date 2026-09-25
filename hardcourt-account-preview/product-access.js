// Account-level product model. Authentication belongs to Bleacher Butt Stats;
// sport access and team data are children of that identity.
export const BLEACHER_PRODUCTS=Object.freeze({
 gridiron:Object.freeze({id:'gridiron',label:'Gridiron Edition',sport:'Football'}),
 hardcourt:Object.freeze({id:'hardcourt',label:'Hardcourt Edition',sport:'Basketball'})
});
export function hardcourtProductState(contexts){
 const rows=Array.isArray(contexts)?contexts:[];
 const real=rows.filter(r=>r&&r.teamId&&String(r.teamName||'').trim()&&r.teamName!=='My Team');
 return {enabled:real.length>0,teams:real,needsSetup:real.length===0};
}
export function accountProductSummary({gridiron=false,hardcourt=false}={}){
 return {gridiron:{enabled:!!gridiron,...BLEACHER_PRODUCTS.gridiron},hardcourt:{enabled:!!hardcourt,...BLEACHER_PRODUCTS.hardcourt}};
}
