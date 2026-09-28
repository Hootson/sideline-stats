// Bleacher Butt Stats umbrella launcher. One identity -> editions -> teams -> games.
import{readAccountPreferences,rememberEdition,setLaunchBehavior,preferredEdition}from'./account-preferences.js';
export function installBleacherUmbrella({sb,hardcourtContexts=()=>[],onHardcourt=()=>{}}={}){
 document.getElementById('bbsUmbrella')?.remove();const params=new URLSearchParams(location.search),force=params.get('umbre