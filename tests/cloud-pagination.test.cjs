const assert = require('node:assert/strict');
const {selectAllByIds} = require('../cloud-pagination.js');

function mockClient(source){
  return {
    from(table){
      const state={table,column:null,ids:[],from:0,to:0};
      const query={
        select(){return query},
        in(column,ids){state.column=column;state.ids=ids;return query},
        order(){return query},
        range(from,to){state.from=from;state.to=to;return Promise.resolve({data:source.filter(row=>state.ids.includes(row[state.column])).sort((a,b)=>a.id.localeCompare(b.id)).slice(from,to+1),error:null})}
      };
      return query;
    }
  };
}

(async()=>{
  const source=[];
  for(let group=0;group<160;group++)for(let row=0;row<11;row++)source.push({id:`${String(group).padStart(3,'0')}-${String(row).padStart(2,'0')}`,snap_event_id:`snap-${group}`,player_id:`player-${row}`});
  const ids=Array.from({length:160},(_,i)=>`snap-${i}`);
  const result=await selectAllByIds(mockClient(source),{table:'snap_participants',column:'snap_event_id',ids,chunkSize:75,pageSize:500});
  assert.equal(result.length,1760,'every snap participant must survive chunking and pagination');
  assert.equal(new Set(result.map(row=>row.id)).size,1760,'paginated rows must not be duplicated');
  assert.equal((await selectAllByIds(mockClient(source),{table:'snap_participants',column:'snap_event_id',ids:[]})).length,0,'empty id lists must not query');
  console.log('cloud pagination checks passed');
})().catch(error=>{console.error(error);process.exitCode=1});
