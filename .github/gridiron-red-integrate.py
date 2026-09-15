from pathlib import Path

idx=Path('index.html')
s=idx.read_text()
marker='<script src="./field-position.js"></script>'
block='''<script src="./field-orientation.js"></script>\n<script src="./cloud-conflict.js"></script>\n<script src="./game-lifecycle.js"></script>\n<script src="./voice-workflow.js"></script>\n<script src="./edit-play-model.js"></script>'''
if block not in s:
    if s.count(marker)!=1: raise SystemExit(f'index field-position marker count={s.count(marker)}')
    s=s.replace(marker,marker+'\n'+block,1)
    idx.write_text(s)

# Quarter-aware visual conversion. Stored/canonical spots remain unchanged.
p=Path('field-position.js')
f=p.read_text()
old='''  function currentPossession(){return /OUR DEFENSE/i.test(document.getElementById("possessionMain")?.textContent||"")?"opp":"ours"}\n  function visualPercent(spot,poss=currentPossession()){const n=validSpot(spot);if(n===null)return 50;return poss==="opp"?100-n:n}\n  function underlyingFromVisual(percent,poss=currentPossession()){const p=Math.max(0,Math.min(100,percent));return poss==="opp"?100-p:p}'''
new='''  function currentPossession(){return /OUR DEFENSE/i.test(document.getElementById("possessionMain")?.textContent||"")?"opp":"ours"}\n  function currentQuarter(){const raw=document.getElementById("quarterSelect")?.value||document.getElementById("quarter")?.value||document.getElementById("quarterMain")?.textContent||"1";const m=String(raw).match(/([1-4])/);return m?Number(m[1]):1}\n  function visualPercent(spot,poss=currentPossession()){const n=validSpot(spot);if(n===null)return 50;const canonical=poss==="opp"?100-n:n;return window.SidelineFieldOrientation?window.SidelineFieldOrientation.visualPercent(canonical,currentQuarter()):canonical}\n  function underlyingFromVisual(percent,poss=currentPossession()){const p=Math.max(0,Math.min(100,percent));const canonical=window.SidelineFieldOrientation?window.SidelineFieldOrientation.canonicalPercent(p,currentQuarter()):p;return poss==="opp"?100-canonical:canonical}'''
if new not in f:
    if f.count(old)!=1: raise SystemExit(f'field visual conversion block count={f.count(old)}')
    f=f.replace(old,new,1)
    p.write_text(f)

# Cache the enhancement modules for game-day/offline use.
sw=Path('service-worker.js')
w=sw.read_text()
needle="'./field-position.js'"
assets="'./field-orientation.js','./cloud-conflict.js','./game-lifecycle.js','./voice-workflow.js','./edit-play-model.js'"
if assets not in w:
    if w.count(needle)!=1: raise SystemExit(f'SW field-position asset count={w.count(needle)}')
    w=w.replace(needle,needle+','+assets,1)
    sw.write_text(w)

print('Gridiron red modules integrated safely')
