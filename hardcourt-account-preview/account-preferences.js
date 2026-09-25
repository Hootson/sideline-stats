// Shared local preferences for the Bleacher Butt Stats umbrella. No sport runtime dependencies.
const KEY='bbs-account-preferences';
const defaults={lastEdition:null,lastHardcourtTeam:null,launch:'chooser',updatedAt:0};
export function readAccountPreferences(){try{return{...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return{...defaults}}}
export function updateAccountPreferences(patch={}){const next={...readAccountPreferences(),...patch,updatedAt:Date.now()};localStorage.setItem(KEY,JSON.stringify(next));return next}
export function rememberEdition(id){return updateAccountPreferences({lastEdition:id||null})}
export function rememberHardcourtTeam(id){return updateAccountPreferences({lastHardcourtTeam:id||null,lastEdition:'hardcourt'})}
export function setLaunchBehavior(launch){return updateAccountPreferences({launch:launch==='last'?'last':'chooser'})}
export function shouldShowChooser({ownedCount=0,forced=false}={}){const p=readAccountPreferences();if(forced)return true;if(ownedCount>1)return p.launch!=='last';return ownedCount!==1}
