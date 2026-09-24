(function(root){
  const ROSTER_PLAYER_COLUMNS="id,season_id,jersey_number,name,active,created_at,updated_at";

  function installSlimRosterSelectPatch(){
    const supabase=root.supabase;
    if(!supabase||typeof supabase.createClient!=="function"||supabase.__sidelineSlimRosterSelectPatch)return;
    const originalCreateClient=supabase.createClient.bind(supabase);
    supabase.createClient=function(...args){
      const client=originalCreateClient(...args);
      const originalFrom=client.from.bind(client);
      client.from=function(table){
        const builder=originalFrom(table);
        if(table==="players"&&builder&&typeof builder.select==="function"){
          const originalSelect=builder.select.bind(builder);
          builder.select=function(columns="*",options){
            if(columns==="*"){
              const stack=(new Error()).stack||"";
              if(stack.includes("loadTeamFromCloud"))columns=ROSTER_PLAYER_COLUMNS;
            }
            return originalSelect(columns,options);
          };
        }
        return builder;
      };
      return client;
    };
    supabase.__sidelineSlimRosterSelectPatch=true;
  }

  installSlimRosterSelectPatch();

  async function selectAllByIds(client,{table,column,ids,columns="*",chunkSize=75,pageSize=500}){
    const unique=[...new Set((ids||[]).filter(Boolean))];
    if(!unique.length)return [];
    const rows=[];
    for(let start=0;start<unique.length;start+=chunkSize){
      const chunk=unique.slice(start,start+chunkSize);
      for(let from=0;;from+=pageSize){
        const {data,error}=await client.from(table).select(columns).in(column,chunk).order("id",{ascending:true}).range(from,from+pageSize-1);
        if(error)throw error;
        const page=data||[];rows.push(...page);
        if(page.length<pageSize)break;
      }
    }
    return rows;
  }
  const api={selectAllByIds};
  root.SidelineCloudPagination=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
