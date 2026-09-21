(function(root){
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
