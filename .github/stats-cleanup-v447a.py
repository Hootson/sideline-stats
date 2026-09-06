from pathlib import Path

p=Path('app.js')
s=p.read_text()

def rep(old,new):
    global s
    n=s.count(old)
    if n!=1:
        raise SystemExit(f'Expected 1 match, found {n}: {old[:80]}')
    s=s.replace(old,new,1)

rep('drop:0,t:0,tfl:0,sack:0','drop:0,rfum:0,recfum:0,t:0,tfl:0,sack:0')
rep('if(p.type==="Rush"&&a){a.car++;a.ry+=+p.yards||0;if(p.extras?.includes("TD"))a.rtd++;if(offensivePlayEarnedFirstDown(p))a.rfd++}','if(p.type==="Rush"&&a){a.car++;a.ry+=+p.yards||0;if(p.extras?.includes("TD"))a.rtd++;if(p.extras?.includes("Fumble"))a.rfum++;if(offensivePlayEarnedFirstDown(p))a.rfd++}')
rep('if(b){b.rec++;b.rey+=+p.yards||0;if(p.extras?.includes("TD"))b.retd++;if(offensivePlayEarnedFirstDown(p))b.recfd++}','if(b){b.rec++;b.rey+=+p.yards||0;if(p.extras?.includes("TD"))b.retd++;if(p.extras?.includes("Fumble"))b.recfum++;if(offensivePlayEarnedFirstDown(p))b.recfd++}')
rep('const rushRows=s.filter(x=>x.car).map(x=>[pname(x.id),x.car,x.ry,(x.ry/x.car).toFixed(1),x.rfd,x.rtd]);','const rushRows=s.filter(x=>x.car).sort((a,b)=>b.ry-a.ry||b.rtd-a.rtd||b.car-a.car).map(x=>[pname(x.id),x.car,x.ry,(x.ry/x.car).toFixed(1),x.rfd,x.rtd,x.rfum]);')
rep('const rushTot=["TEAM TOTAL",rushCar,rushYds,rushCar?(rushYds/rushCar).toFixed(1):"0.0",s.reduce((a,x)=>a+x.rfd,0),s.reduce((a,x)=>a+x.rtd,0)];','const rushTot=["TEAM TOTAL",rushCar,rushYds,rushCar?(rushYds/rushCar).toFixed(1):"0.0",s.reduce((a,x)=>a+x.rfd,0),s.reduce((a,x)=>a+x.rtd,0),s.reduce((a,x)=>a+x.rfum,0)];')
rep('const passRows=s.filter(x=>x.att).map(x=>[pname(x.id),`${x.cmp}/${x.att}`,x.py,(x.py/x.att).toFixed(1),x.pfd,x.ptd,x.pi,passerRatingText(x.cmp,x.att,x.py,x.ptd,x.pi)]);','const passRows=s.filter(x=>x.att).sort((a,b)=>b.py-a.py||b.ptd-a.ptd||b.cmp-a.cmp).map(x=>[pname(x.id),`${x.cmp}/${x.att}`,x.py,(x.py/x.att).toFixed(1),x.pfd,x.ptd,x.pi,passerRatingText(x.cmp,x.att,x.py,x.ptd,x.pi)]);')
rep('const recRows=s.filter(x=>x.tgt||x.rec).map(x=>[','const recRows=s.filter(x=>x.tgt||x.rec).sort((a,b)=>b.rey-a.rey||b.rec-a.rec||b.retd-a.retd).map(x=>[')
rep('pname(x.id),x.tgt,x.rec,x.rey,x.rec?fmt1(x.rey/x.rec):"0.0",x.recfd,x.retd,x.drop,x.tgt?`${Math.round((x.rec/x.tgt)*100)}%`:"0%"','pname(x.id),x.tgt,x.rec,x.rey,x.rec?fmt1(x.rey/x.rec):"0.0",x.recfd,x.retd,x.recfum,x.drop,x.tgt?`${Math.round((x.rec/x.tgt)*100)}%`:"0%"')
rep('s.reduce((a,x)=>a+x.retd,0),\n    s.reduce((a,x)=>a+x.drop,0),','s.reduce((a,x)=>a+x.retd,0),\n    s.reduce((a,x)=>a+x.recfum,0),\n    s.reduce((a,x)=>a+x.drop,0),')
rep('const defRows=s.filter(x=>x.t+x.tfl+x.sack+x.pd+x.int+x.ff+x.fr+x.dtd).map(x=>[pname(x.id),fmt(x.t),fmt(x.tfl),fmt(x.sack),fmt(x.pd),fmt(x.int),fmt(x.ff),fmt(x.fr),fmt(x.dtd)]);','const defRows=s.filter(x=>x.t+x.tfl+x.sack+x.pd+x.int+x.ff+x.fr+x.dtd).sort((a,b)=>b.t-a.t||b.tfl-a.tfl||b.sack-a.sack).map(x=>[pname(x.id),fmt(x.t),fmt(x.tfl),fmt(x.sack),fmt(x.pd),fmt(x.int),fmt(x.ff),fmt(x.fr),fmt(x.dtd)]);')
rep('const specialRows=s.filter(x=>x.kr+x.pr+x.punt+x.stff+x.stfr+x.fga).map(x=>[','const specialRows=s.filter(x=>x.kr+x.pr+x.punt+x.stff+x.stfr+x.fga).sort((a,b)=>(b.kry+b.pry)-(a.kry+a.pry)||b.kry-a.kry||b.pry-a.pry).map(x=>[')
rep('${tbl(["Player","CAR","YDS","AVG","1D","TD"],rushRows,rushRows.length?rushTot:null)}','${tbl(["Player","CAR","YDS","AVG","1D","TD","FUM"],rushRows,rushRows.length?rushTot:null)}')
rep('${tbl(["Player","TGT","REC","YDS","AVG","1D","TD","CATCH%"],recRows.map(r=>[r[0],r[1],r[2],r[3],r[4],r[5],r[6],r[8]]),recRows.length?[recTot[0],recTot[1],recTot[2],recTot[3],recTot[4],recTot[5],recTot[6],recTot[8]]:null)}','${tbl(["Player","TGT","REC","YDS","AVG","1D","TD","FUM","DROP","CATCH%"],recRows,recRows.length?recTot:null)}')
rep('offense+=`<h4>Rushing</h4>${shareTable(["Player","CAR","YDS","TD"],s.filter(x=>x.car).map(x=>[pname(x.id),x.car,x.ry,x.rtd]))}`;','offense+=`<h4>Rushing</h4>${shareTable(["Player","CAR","YDS","TD","FUM"],s.filter(x=>x.car).sort((a,b)=>b.ry-a.ry).map(x=>[pname(x.id),x.car,x.ry,x.rtd,x.rfum]))}`;')
rep('offense+=`<h4>Passing</h4>${shareTable(["Player","C/A","YDS","TD","INT","RATE"],s.filter(x=>x.att).map(x=>[pname(x.id),`${x.cmp}/${x.att}`,x.py,x.ptd,x.pi,passerRatingText(x.cmp,x.att,x.py,x.ptd,x.pi)]))}`;','offense+=`<h4>Passing</h4>${shareTable(["Player","C/A","YDS","TD","INT","RATE"],s.filter(x=>x.att).sort((a,b)=>b.py-a.py).map(x=>[pname(x.id),`${x.cmp}/${x.att}`,x.py,x.ptd,x.pi,passerRatingText(x.cmp,x.att,x.py,x.ptd,x.pi)]))}`;')
rep('offense+=`<h4>Receiving</h4>${shareTable(["Player","REC","YDS","TD"],s.filter(x=>x.rec).map(x=>[pname(x.id),x.rec,x.rey,x.retd]))}`;','offense+=`<h4>Receiving</h4>${shareTable(["Player","REC","YDS","TD","FUM","DROP"],s.filter(x=>x.tgt||x.rec).sort((a,b)=>b.rey-a.rey).map(x=>[pname(x.id),x.rec,x.rey,x.retd,x.recfum,x.drop]))}`;')
rep('$("#shareDefense").innerHTML=shareTable(["Player","TKL","TFL","SACK","PD","INT","FF","FR","TD"],s.filter(x=>x.t+x.tfl+x.sack+x.pd+x.int+x.ff+x.fr+x.dtd).map(x=>[pname(x.id),x.t,x.tfl,x.sack,x.pd,x.int,x.ff,x.fr,x.dtd]));','$("#shareDefense").innerHTML=shareTable(["Player","TKL","TFL","SACK","PD","INT","FF","FR","TD"],s.filter(x=>x.t+x.tfl+x.sack+x.pd+x.int+x.ff+x.fr+x.dtd).sort((a,b)=>b.t-a.t||b.tfl-a.tfl||b.sack-a.sack).map(x=>[pname(x.id),x.t,x.tfl,x.sack,x.pd,x.int,x.ff,x.fr,x.dtd]));')
p.write_text(s)

idx=Path('index.html')
t=idx.read_text()
old='V4.4.7 • STATKEEPER / VIEWER SYNC • GRIDIRON EDITION'
if t.count(old)!=1: raise SystemExit('Version label not found exactly once')
idx.write_text(t.replace(old,'V4.4.7a • STATS CLEANUP • GRIDIRON EDITION',1))

sw=Path('service-worker.js')
u=sw.read_text()
old="const CACHE='sideline-stats-v4-4-7-modular';"
if u.count(old)!=1: raise SystemExit('Cache label not found exactly once')
sw.write_text(u.replace(old,"const CACHE='sideline-stats-v4-4-7a-stats-cleanup';",1))
