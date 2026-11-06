import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Crosshair, X, Users, Layers3, Radio, Activity, Cpu, Zap, Shield, ChevronRight, Compass, Wifi, Clock3 } from 'lucide-react';
import { families as importedFamilies } from './data.js';
import towers from './towers.js';

const discovered = importedFamilies.filter(f => f.discovered);
const seededRandom = (n) => { let x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const fmt = n => n.toLocaleString('en-US');
function distanceText(f) { return f.daysAway === 0 ? 'HOME' : f.daysAway < 1 ? `${Math.max(1,Math.round(f.hoursAway||6))} HOURS AWAY` : `${fmt(f.daysAway)} DAYS AWAY`; }

function App() {
  const canvasRef = useRef(null), wrapRef = useRef(null);
  const [origin, setOrigin] = useState(null); // Deliberately session-only: refresh returns to the search gate.
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({x:0,y:0});
  const [towerData, setTowerData] = useState({});
  const [toast, setToast] = useState('');
  const drag = useRef(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(v=>v+1);
      setTowerData(old => {
        const next={...old};
        towers.forEach((t,i)=>{
          const r=seededRandom(t.seed + Math.floor(Date.now()/9000));
          const previous=old[t.id]||{};
          next[t.id]={status:r>.965?'TOWER UPDATING':r>.91?'RECONNECTING':'ON ACTIVE',
            heat:Math.round(34+r*49),connections:Math.round(120+r*880),
            spikes:Array.from({length:22},(_,j)=>.12+seededRandom(t.seed+j+Math.floor(Date.now()/3500))*r*.88),
            lastCutoff: previous.lastCutoff || 'No recent cutoff'};
        });
        return next;
      });
    },1800);
    return ()=>clearInterval(timer);
  },[]);
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext('2d'); let raf;
    const draw=()=>{
      const rect=canvas.getBoundingClientRect(), dpr=Math.min(window.devicePixelRatio||1,2);
      if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;}
      ctx.setTransform(dpr,0,0,dpr,0,0); const w=rect.width,h=rect.height;
      ctx.clearRect(0,0,w,h);
      const bg=ctx.createRadialGradient(w*.48,h*.5,0,w*.48,h*.5,Math.max(w,h)*.85);
      bg.addColorStop(0,'#172333');bg.addColorStop(1,'#080c14');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
      // faint cartographic grid
      ctx.strokeStyle='rgba(88,155,196,.055)';ctx.lineWidth=1;
      const step=56*zoom; for(let x=((pan.x%step)+step)%step;x<w;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
      for(let y=((pan.y%step)+step)%step;y<h;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
      const point=(f)=>({x:w/2+(f.x-.5)*w*zoom+pan.x,y:h/2+(f.y-.5)*h*zoom+pan.y});
      const visible=[...families];
      // Connections for configured family records
      ctx.lineWidth=1;
      families.forEach(f=>f.connections?.forEach(id=>{
        const target=families.find(q=>q.id===id); if(!target||f.id>target.id)return;
        const a=point(f),b=point(target);
        ctx.strokeStyle=`${f.color}35`;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      }));
      // Infinite-feeling procedural territories, culled to viewport
      const clusters=[{x:.12,y:.20,c:'#4aaaff'},{x:.36,y:.29,c:'#a77aff'},{x:.72,y:.19,c:'#ff626d'},{x:.81,y:.69,c:'#ffb75e'},{x:.25,y:.76,c:'#52e5b1'},{x:.58,y:.84,c:'#4caeff'}];
      for(let i=0;i<1150;i++){
        const cl=clusters[i%clusters.length], a=seededRandom(i+12)*Math.PI*2, r=Math.sqrt(seededRandom(i+908))*Math.min(w,h)*(.025+(i%5)*.006);
        const px=w/2+(cl.x-.5)*w*zoom+Math.cos(a)*r*zoom+pan.x, py=h/2+(cl.y-.5)*h*zoom+Math.sin(a)*r*zoom+pan.y;
        if(px<-10||py<-10||px>w+10||py>h+10)continue;
        const s=1+seededRandom(i+440)*1.7;ctx.fillStyle=cl.c+(i%7===0?'aa':'48');ctx.beginPath();ctx.arc(px,py,s,0,Math.PI*2);ctx.fill();
      }
      // Family nodes
      families.forEach(f=>{
        const p=point(f), isHome=origin?.id===f.id, selected=active?.type==='family'&&active.item.id===f.id, pulse=1+Math.sin(Date.now()/650+f.x*9)*.13;
        if(p.x<-50||p.y<-50||p.x>w+50||p.y>h+50)return;
        const radius=(f.discovered?5.2:3.2)*Math.min(1.5,zoom)*pulse;
        const glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,selected?34:22);
        glow.addColorStop(0,f.color+'aa');glow.addColorStop(1,f.color+'00');
        ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,selected?34:22,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=f.color;ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle=isHome?'#e8fbff':f.color+'aa';ctx.lineWidth=isHome?2:1;ctx.beginPath();ctx.arc(p.x,p.y,radius+4,0,Math.PI*2);ctx.stroke();
        if(zoom>.72){ctx.font='11px Inter, sans-serif';ctx.fillStyle='#d7e8f6';ctx.fillText(f.username,p.x+12,p.y-7);ctx.font='9px Inter, sans-serif';ctx.fillStyle='#6caec9';ctx.fillText(isHome?'HOME':distanceText(f),p.x+12,p.y+7);}
      });
      // Server tower glyphs
      towers.forEach(t=>{
        const p=point(t), activeTower=active?.type==='tower'&&active.item.id===t.id;
        if(p.x<-30||p.y<-30||p.x>w+30||p.y>h+30)return;
        const pulse=1+Math.sin(Date.now()/420+t.seed)*.15;
        ctx.shadowBlur=activeTower?26:14;ctx.shadowColor='#168dff';
        ctx.fillStyle='#07182b';ctx.strokeStyle='#39aaff';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.roundRect(p.x-7*pulse,p.y-11*pulse,14*pulse,22*pulse,3);ctx.fill();ctx.stroke();
        ctx.shadowBlur=0;ctx.fillStyle='#52c9ff';for(let j=0;j<3;j++){ctx.fillRect(p.x-3,p.y-7+j*6,6,2);}
        ctx.font='9px Inter,sans-serif';ctx.fillStyle='#75caff';ctx.fillText('TOWER',p.x+12,p.y+3);
      });
      raf=requestAnimationFrame(draw);
    };
    draw();return ()=>cancelAnimationFrame(raf);
  },[zoom,pan,origin,active,tick]);
  const families=useMemo(()=>importedFamilies.map(f=>{
    if(!origin)return f;
    // Distances are directional and measured from the selected home family.
    const dx=(f.x-origin.x),dy=(f.y-origin.y),raw=Math.sqrt(dx*dx+dy*dy);
    const days=f.id===origin.id?0:Math.max(0,Math.round(raw*4200));
    return {...f,daysAway:days,hoursAway:Math.max(1,Math.round(raw*24)),distanceLabel:f.id===origin.id?'HOME':days<1?`${Math.max(1,Math.round(raw*24))} HOURS AWAY`:`${fmt(days)} DAYS AWAY`};
  }),[origin]);
  const selectOrigin=(f)=>{
    if(!f){setToast('Family not found in this atlas.');return;}
    setOrigin(f);setActive({type:'family',item:f});setQuery('');setPan({x:0,y:0});setZoom(1.18);
  };
  const showFamily=(f)=>{
    if(!f.discovered){setToast("The family you're viewing wasn't discovered by your family.");return;}
    setActive({type:'family',item:f});
  };
  const clickMap=(e)=>{
    if(drag.current?.moved)return;
    const rect=canvasRef.current.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top,w=rect.width,h=rect.height;
    const point=(f)=>({x:w/2+(f.x-.5)*w*zoom+pan.x,y:h/2+(f.y-.5)*h*zoom+pan.y});
    for(const t of towers){const p=point(t);if(Math.hypot(p.x-x,p.y-y)<22){setActive({type:'tower',item:t});return;}}
    for(const f of [...families].reverse()){const p=point(f);if(Math.hypot(p.x-x,p.y-y)<22){showFamily(f);return;}}
  };
  const current=active?.type==='family'?families.find(f=>f.id===active.item.id):active?.item;
  const currentTower=active?.type==='tower';
  const closeToast=()=>{setToast('');};
  return <div className="app" ref={wrapRef}>
    {!origin && <div className="gate"><div className="gate-grid"/><div className="gate-content">
      <div className="brand-mark"><span className="brand-orb"/> S.TOWER <span className="brand-version">NETWORK ATLAS / 01</span></div>
      <div className="eyebrow"><span/> SECURE ORIGIN IDENTIFICATION</div>
      <h1>Where is your<br/><em>family</em> from?</h1>
      <p className="gate-copy">Enter your family identifier to establish your origin point and reveal the network around it.</p>
      <form className="search-form" onSubmit={e=>{e.preventDefault();const f=importedFamilies.find(x=>x.username.toLowerCase()===query.trim().toLowerCase()||x.id===query.trim().toLowerCase());selectOrigin(f);}}>
        <Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Enter family username..." autoFocus/><button type="submit">ENTER ATLAS <ChevronRight size={16}/></button>
      </form>
      <div className="gate-foot"><span><i/> ATLAS SYSTEM READY</span><span>SESSION ORIGIN IS NOT SAVED</span></div>
    </div></div>}
    {origin && <>
      <header className="topbar"><div className="brand-mark"><span className="brand-orb"/> S.TOWER</div><div className="top-meta"><span className="live-dot"/> NETWORK ONLINE <span className="meta-divider"/> ORIGIN: <b>{origin.username}</b></div><button className="change-origin" onClick={()=>{setOrigin(null);setActive(null);setQuery('');}}>CHANGE ORIGIN</button></header>
      <main className="atlas">
        <canvas ref={canvasRef} onClick={clickMap} onWheel={e=>setZoom(z=>Math.max(.45,Math.min(3,z*(e.deltaY<0?1.12:.89))))}
          onPointerDown={e=>{drag.current={x:e.clientX,y:e.clientY,pan:{...pan},moved:false};e.currentTarget.setPointerCapture(e.pointerId);}}
          onPointerMove={e=>{if(drag.current){const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.current.moved=true;setPan({x:drag.current.pan.x+dx,y:drag.current.pan.y+dy});}}}
          onPointerUp={()=>{drag.current=null;}}/>
        <div className="map-vignette"/>
        <div className="map-heading"><div className="eyebrow"><span/> LIVE ATLAS / REGIONAL VIEW</div><h2>Network <em>topology</em></h2><p>Explore discovered families, distant signals and active infrastructure.</p></div>
        <div className="map-controls"><button onClick={()=>setZoom(z=>Math.min(3,z*1.2))}>+</button><button onClick={()=>setZoom(z=>Math.max(.45,z/1.2))}>−</button><button onClick={()=>{setZoom(1);setPan({x:0,y:0});}}><Crosshair size={15}/></button></div>
        <div className="map-legend"><span><i className="legend-discovered"/> DISCOVERED</span><span><i className="legend-hidden"/> UNCHARTED</span><span><i className="legend-tower"/> SERVER TOWER</span></div>
        <div className="origin-chip"><span className="origin-pulse"/><div><small>YOUR ORIGIN</small><b>{origin.username}</b></div></div>
        {active&&<aside className="profile-panel">
          <button className="panel-close" onClick={()=>setActive(null)}><X size={17}/></button>
          {currentTower?<TowerPanel tower={current} data={towerData[current.id]||{}}/>:<FamilyPanel family={current} origin={origin}/>}
        </aside>}
        {toast&&<div className="toast"><Shield size={16}/>{toast}<button onClick={closeToast}><X size={14}/></button></div>}
        <div className="map-footer"><span>COORDINATES ARE RELATIVE TO YOUR ORIGIN</span><span>{fmt(1150)} SIGNAL POINTS RENDERED <b/> DRAG TO EXPLORE</span></div>
      </main>
    </>}
  </div>;
}

function FamilyPanel({family:f,origin}) {
  if(!f)return null;
  return <><div className="panel-banner" style={{background:`radial-gradient(ellipse at 70% 20%,${f.glowColor}55,transparent 55%),linear-gradient(125deg,#101c2c,#0a101b)`}}><div className="banner-lines"/><span className="banner-code">FAMILY RECORD / {f.id.toUpperCase()}</span><div className="family-emblem" style={{'--family':f.color,'--glow':f.glowColor}}>{f.badgeURI}</div></div>
    <div className="panel-body"><div className="panel-kicker">DISCOVERED FAMILY <span className="verified">● VERIFIED</span></div><h2>{f.username}<span className="badge-uri" style={{background:f.badgeBackgroundURI}}>{f.badgeURI}</span></h2><div className="family-title">{f.title}</div>
      <div className="distance-box"><Clock3 size={16}/><div><small>DISTANCE FROM {origin.username}</small><strong>{f.id===origin.id?'HOME':f.distanceLabel}</strong></div></div>
      <div className="stat-grid"><div><Users/><small>MEMBERS</small><strong>{f.members.toLocaleString()}</strong></div><div><Layers3/><small>ELEVATIONS</small><strong>{f.elevations.toLocaleString()}</strong></div></div>
      <div className="section-label">FAMILY LORE <span>RECORD 0{f.id.length}</span></div><p className="lore">{f.lore}</p>
      <div className="panel-bottom"><span><i/> RECORD ACCESSIBLE</span><span>{f.group}</span></div>
    </div></>;
}
function TowerPanel({tower:t,data}) {
  const status=data.status||'ON ACTIVE';
  return <><div className="tower-banner"><div className="tower-art"><div className="tower-cap"/>{Array.from({length:7},(_,i)=><div className="tower-rack" key={i}><i/><i/><i/></div>)}<div className="tower-aerial"/></div><span className="banner-code">INFRASTRUCTURE / LIVE TELEMETRY</span></div>
    <div className="panel-body"><div className="panel-kicker">SERVER TOWER <span className="verified">● SIGNAL DETECTED</span></div><h2 className="tower-name">{t.label}</h2><div className="family-title">AUTONOMOUS NETWORK RELAY</div>
      <div className="tower-status"><span className={status==='ON ACTIVE'?'status-live':'status-warn'}/>{status}</div>
      <div className="stat-grid"><div><Activity/><small>CORE HEAT</small><strong>{data.heat??48}°C</strong></div><div><Wifi/><small>CONNECTIONS</small><strong>{fmt(data.connections??428)}</strong></div></div>
      <div className="section-label">SIGNAL SPIKE / RECENT ACTIVITY <span>LIVE</span></div><div className="spike-chart">{(data.spikes||Array.from({length:22},(_,i)=>.25+seededRandom(i+t.seed)*.65)).map((v,i)=><i key={i} style={{height:`${v*100}%`}}/>)}</div>
      <div className="tower-log"><span><Cpu size={14}/> TELEMETRY STREAM</span><b>{status==='ON ACTIVE'?'PACKETS ROUTING / NODE STABLE':status+' / SIGNAL REBUILD'}</b><small>LAST CUTOFF: {data.lastCutoff||'NO RECENT CUTOFF'}</small></div>
      <div className="panel-bottom"><span><i/> AUTO-REFRESH ENABLED</span><span>SEED {t.seed}</span></div>
    </div></>;
}
export default App;
