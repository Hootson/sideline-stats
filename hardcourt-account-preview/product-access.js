// Account-level product model. Authentication belongs to Bleacher Butt Stats;
// editions and team data are children of that identity. This file never imports a sport runtime.
export const BLEACHER_PRODUCTS=Object.freeze({
 gridiron:Object.freeze({id:'gridiron',label:'Gridiron Edition',sport:'Football',icon:'🏈',runtimeStatus:'protected'}),
 hardcourt:Object.freeze({id:'hardcourt',label:'Hardcourt Edition',sport:'Basketball',icon:'🏀',runtimeStatus:'preview'})
});
export function hardcourtProductState(contexts){const rows=Array.isArray(contexts)?contexts.filter(r=>r&&r.teamId):[],real=rows.filter(r=>String(r.teamName||'').trim()&&r.teamName!=='My Team'),setup=rows.filter(r=>!String(r.teamName||'').trim()||r.teamName==='My Team');return{enabled:rows.length>0,configured:real.length>0,teams:real,setupTeams:setup,needsSetup:real.length===0,teamCount:real.length}}
export function accountProductSummary({gridiron=false,hardcourt=false}={}){return{gridiron:{enabled:!!gridiron,...BLEACHER_PRODUCTS.gridiron},hardcourt:{enabled:!!hardcourt,...BLEACHER_PRODUCTS.hardcourt}}}
export function productForSport(sport=''){const key=String(sport).toLowerCase();return Object.values(BLEACHER_PRODUCTS).find(p=>p.sport.toLowerCase()===key||p.id===key)||null}
export function editionRegistry(extra=[]){const base=Object.values(BLEACHER_PRODUCTS),seen=new Set(base.map(x=>x.id));return Object.freeze([...base,...(Array.isArray(extra)?extra:[]).filter(x=>x?.id&&!seen.has(x.id))])}
export function editionLaunchPreference(){const id=localStorage.getItem('bbs-umbrella-choice');return BLEACHER_PRODUCTS[id]||null}
export function rememberEdition(id){if(BLEACHER_PRODUCTS[id])localStorage.setItem('bbs-umbrella-choice',id)}
