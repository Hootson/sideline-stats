from pathlib import Path

p=Path('app.js')
s=p.read_text()

def rep(old,new):
    global s
    n=s.count(old)
    if n!=1:
        raise SystemExit(f'Expected 1 match, found {n}: {old[:100]}')
    s=s.replace(old,new,1)

rep('let rows=s.filter(x=>x.car).map(x=>[pname(x.id),x.car,x.ry,(x.ry/x.car).toFixed(1),x.rfd,x.rtd]);','let rows=s.filter(x=>x.car).sort((a,b)=>b.ry-a.ry||b.rtd-a.rtd||b.car-a.car).map(x=>[pname(x.id),x.car,x.ry,(x.ry/x.car).toFixed(1),x.rfd,x.rtd,x.rfum]);')
rep('addTable("RUSHING",["PLAYER","CAR","YDS","AVG","1D","TD"],rows,\n      ["TEAM TOTAL",car,yd,car?(yd/car).toFixed(1):"0.0",s.reduce((a,x)=>a+x.rfd,0),s.reduce((a,x)=>a+x.rtd,0)]);','addTable("RUSHING",["PLAYER","CAR","YDS","AVG","1D","TD","FUM"],rows,\n      ["TEAM TOTAL",car,yd,car?(yd/car).toFixed(1):"0.0",s.reduce((a,x)=>a+x.rfd,0),s.reduce((a,x)=>a+x.rtd,0),s.reduce((a,x)=>a+x.rfum,0)]);')
rep('rows=s.filter(x=>x.att).map(x=>[pname(x.id),`${x.cmp}/${x.att}`,x.py,(x.py/x.att).toFixed(1),x.pfd,x.ptd,x.pi,passerRatingText(x.cmp,x.att,x.py,x.ptd,x.pi)]);','rows=s.filter(x=>x.att).sort((a,b)=>b.py-a.py||b.ptd-a.ptd||b.cmp-a.cmp).map(x=>[pname(x.id),`${x.cmp}/${x.att}`,x.py,(x.py/x.att).toFixed(1),x.pfd,x.ptd,x.pi,passerRatingText(x.cmp,x.att,x.py,x.ptd,x.pi)]);')
rep('rows=s.filter(x=>x.tgt||x.rec).map(x=>[\n    pname(x.id),x.tgt,x.rec,x.rey,x.rec?(x.rey/x.rec).toFixed(1):"0.0",\n    x.recfd,x.retd,x.drop,x.tgt?`${Math.round((x.rec/x.tgt)*100)}%`:"0%"\n  ]);','rows=s.filter(x=>x.tgt||x.rec).sort((a,b)=>b.rey-a.rey||b.rec-a.rec||b.retd-a.retd).map(x=>[\n    pname(x.id),x.tgt,x.rec,x.rey,x.rec?(x.rey/x.rec).toFixed(1):"0.0",\n    x.recfd,x.retd,x.recfum,x.drop,x.tgt?`${Math.round((x.rec/x.tgt)*100)}%`:"0%"\n  ]);')
rep('addTable("RECEIVING",["PLAYER","TGT","REC","YDS","AVG","1D","TD","DROP","CATCH%"],rows,\n      ["TEAM TOTAL",tgt,rc,yd,rc?(yd/rc).toFixed(1):"0.0",s.reduce((a,x)=>a+x.recfd,0),\n       s.reduce((a,x)=>a+x.retd,0),s.reduce((a,x)=>a+x.drop,0),tgt?`${Math.round((rc/tgt)*100)}%`:"0%"]);','addTable("RECEIVING",["PLAYER","TGT","REC","YDS","AVG","1D","TD","FUM","DROP","CATCH%"],rows,\n      ["TEAM TOTAL",tgt,rc,yd,rc?(yd/rc).toFixed(1):"0.0",s.reduce((a,x)=>a+x.recfd,0),\n       s.reduce((a,x)=>a+x.retd,0),s.reduce((a,x)=>a+x.recfum,0),s.reduce((a,x)=>a+x.drop,0),tgt?`${Math.round((rc/tgt)*100)}%`:"0%"]);')
rep('rows=s.filter(x=>x.t+x.tfl+x.sack+x.int+x.ff+x.fr).map(x=>[','rows=s.filter(x=>x.t+x.tfl+x.sack+x.int+x.ff+x.fr).sort((a,b)=>b.t-a.t||b.tfl-a.tfl||b.sack-a.sack).map(x=>[')
rep('rows=s.filter(x=>x.kr+x.pr+x.punt+x.stff+x.stfr+x.fga).map(x=>[','rows=s.filter(x=>x.kr+x.pr+x.punt+x.stff+x.stfr+x.fga).sort((a,b)=>(b.kry+b.pry)-(a.kry+a.pry)||b.kry-a.kry||b.pry-a.pry).map(x=>[')
rep('const def=[...s].filter(x=>x.t+x.tfl+x.sack+x.int+x.ff+x.fr)\n    .sort((a,b)=>(b.t+b.tfl*2+b.sack*2+b.int*3+b.ff*2+b.fr*2)-(a.t+a.tfl*2+a.sack*2+a.int*3+a.ff*2+a.fr*2))[0];','const def=[...s].filter(x=>x.t+x.tfl+x.sack+x.int+x.ff+x.fr)\n    .sort((a,b)=>b.t-a.t||b.tfl-a.tfl||b.sack-a.sack)[0];')

p.write_text(s)

idx=Path('index.html')
t=idx.read_text()
old='V4.4.7a • STATS CLEANUP • GRIDIRON EDITION'
if t.count(old)!=1: raise SystemExit('Expected current version label once')
idx.write_text(t.replace(old,'V4.4.7b • SHARE STATS CLEANUP • GRIDIRON EDITION',1))

sw=Path('service-worker.js')
u=sw.read_text()
old="const CACHE='sideline-stats-v4-4-7a-stats-cleanup';"
if u.count(old)!=1: raise SystemExit('Expected current cache label once')
sw.write_text(u.replace(old,"const CACHE='sideline-stats-v4-4-7b-share-stats';",1))
