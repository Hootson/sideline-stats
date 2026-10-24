// Hardcourt persistent-account helpers.
// Kept separate from the game engine so account/team UX can evolve without
// destabilizing live stat entry.

export async function loadHardcourtTeams(sb){
  const {data,error}=await sb.rpc("get_hardcourt_cloud_context");
  if(error) throw error;
  return Array.isArray(data)?data:[];
}

export async function createHardcourtTeam(sb,profile){
  const {data,error}=await sb.rpc("create_hardcourt_team",{
    p_name:String(profile?.name||"My Team").trim(),
    p_grade:String(profile?.grade||""),
    p_primary:profile?.primary||"#111111",
    p_accent:profile?.accent||"#39a852"
  });
  if(error) throw error;
  return Array.isArray(data)?data[0]:data;
}

export function rememberHardcourtTeam(teamId){
  if(teamId) localStorage.setItem("hardcourt-active-team-id",String(teamId));
}

export function preferredHardcourtTeam(contexts){
  if(!contexts?.length) return null;
  const remembered=localStorage.getItem("hardcourt-active-team-id");
  return contexts.find(x=>String(x.teamId)===remembered)||contexts[0];
}

export async function persistHardcourtRoster(sb,seasonId,roster){
  const {data,error}=await sb.rpc("sync_hardcourt_roster",{
    p_season_id:seasonId,
    p_players:(roster||[]).map(p=>({
      cloudId:p.cloudId||null,
      jersey:String(p.num||""),
      name:String(p.name||"Player").trim()||"Player"
    }))
  });
  if(error) throw error;
  return Array.isArray(data)?data:[];
}

export function applyCloudRoster(rows,existing=[]){
  const priorByCloud=new Map(existing.filter(p=>p.cloudId).map(p=>[String(p.cloudId),p]));
  return (rows||[]).map((r,i)=>{
    const id=String(r.id||r.cloudId||"");
    const old=priorByCloud.get(id)||existing.find(p=>String(p.num)===String(r.jersey||r.jersey_number)&&String(p.name).toLowerCase()===String(r.name).toLowerCase());
    return {
      id:old?.id||`p${i}`,
      num:r.jersey??r.jersey_number??"",
      name:r.name||"Player",
      headshot:old?.headshot||"",
      cloudId:r.id||r.cloudId||null
    };
  });
}
