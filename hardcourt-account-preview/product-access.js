// Account-level product model. Authentication belongs to Bleacher Butt Stats;
// sport access and team data are children of that identity.
export const BLEACHER_PRODUCTS=Object.freeze({
 gridiron:Object.freeze({id:'gridiron',label:'Gridiron Edition',sport:'Football'}),
 hardcourt:Object.freeze({id:'hardcourt',label:'Hardcourt Edition',sport:'Basketball'})
});
export function hardcourtProductState(contexts){
 const rows=Array.isArray(contexts)?contexts.filter(r=>r&&r.teamId):[];
 const real=rows.filter(r=>String(r.teamName||'').trim()&&r.teamName!=='My Team');
 const setup=rows.filter(r=>!String(r.teamName||'').trim()||r.teamName==='My Team');
 return {enabled:rows.length>0,teams:real,setupTeams:setup,needsSetup:real.length===0,teamCount:real.length};
}
export function accountProductSummary({gridiron=false,hardcourt=false}={}){
 return {gridiron:{enabled:!!gridiron,...BLEACHER_PRODUCTS.gridiron},hardcourt:{enabled:!!hardcourt,...BLEACHER_PRODUCTS.hardcourt}};
}
export function productForSport(sport=''){const key=String(sport).toLowerCase();return Object.values(BLEACHER_PRODUCTS).find(p=>p.sport.toLowerCase()===key||p.id===key)||null}
