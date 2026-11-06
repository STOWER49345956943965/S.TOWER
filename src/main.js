import { dots, towers } from "./data.js";

const $ = (s, p=document) => p.querySelector(s);
const viewport = $("#mapViewport"), layer = $("#nodesLayer"), svg = $("#connections");
let scale=1, pan={x:0,y:0}, dragging=false, dragStart=null, activeFamily=dots.find(d=>d.discovered)||dots[0], currentMode="map", alertTimer=null, activeRaid=null;
const colors=["#ff638f","#f6bb54","#75e3c2","#a68cff","#53baff","#f28cff","#d5ef69","#ff8a54","#54e8ff","#ff5cce","#9dff72"];
const seeded=(n)=>{let x=Math.sin(n*9283.17)*43758.5453;return x-Math.floor(x)};
const rand=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;
const allNodes=[];
const clusterDefs=[
  {name:"MID-DARK",x:22,y:26,color:"#64dfff"},{name:"MID-OSCOR",x:48,y:21,color:"#b78aff"},
  {name:"FAR MERIDIAN",x:76,y:29,color:"#ffb45e"},{name:"OUTER REACH",x:28,y:69,color:"#72f0c8"},
  {name:"GLASS REACH",x:55,y:72,color:"#64dfff"},{name:"REDWOOD BELT",x:82,y:67,color:"#a6e77a"},
  {name:"THE DEEP INDEX",x:49,y:48,color:"#f18cff"},{name:"DUSK CORRIDOR",x:91,y:43,color:"#ff718c"}
];

dots.forEach((d,i)=>{
  const c=clusterDefs[i%clusterDefs.length];
  allNodes.push({...d,x:c.x+(seeded(i+4)-.5)*18,y:c.y+(seeded(i+23)-.5)*18,type:"family",drift:i%2?1:-1});
});
// Procedural signals: a large, repeatable atlas of clustered unknown families.
for(let i=0;i<420;i++){
  const ci=i%clusterDefs.length,c=clusterDefs[ci],angle=seeded(i+77)*Math.PI*2;
  const radius=4+Math.pow(seeded(i+17),1.7)*22;
  const days=Math.round(260+seeded(i+100)*11000);
  allNodes.push({id:`unknown-${i+1}`,name:"Undiscovered",title:"Undiscovered",x:Math.max(1,Math.min(99,c.x+Math.cos(angle)*radius)),y:Math.max(4,Math.min(96,c.y+Math.sin(angle)*radius)),color:colors[Math.floor(seeded(i+45)*colors.length)],daysAway:days,group:c.name,discovered:false,type:"family",clusterIndex:ci});
}
const towerPositions=[{x:18,y:78},{x:39,y:13},{x:61,y:82},{x:80,y:22},{x:91,y:56}];
towers.forEach((t,i)=>allNodes.push({...t,...towerPositions[i],type:"tower"}));

function safe(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function px(n){return {x:n.x/100*viewport.clientWidth,y:n.y/100*viewport.clientHeight};}
function render(){
  layer.innerHTML="";svg.innerHTML="";
  const w=viewport.clientWidth,h=viewport.clientHeight;svg.setAttribute("viewBox",`0 0 ${w} ${h}`);
  const families=allNodes.filter(n=>n.type==="family");
  // Light, sparse network threads to avoid turning the map into a solid web.
  families.forEach((n,i)=>{
    if(i%2 && !n.discovered)return;
    const p=px(n), near=families.filter((m,j)=>j!==i&&m.group===n.group).map(m=>({m,d:Math.hypot(px(m).x-p.x,px(m).y-p.y)})).sort((a,b)=>a.d-b.d).slice(0,n.discovered?2:1);
    near.forEach(({m})=>{const q=px(m),line=document.createElementNS("http://www.w3.org/2000/svg","line");line.setAttribute("x1",p.x);line.setAttribute("y1",p.y);line.setAttribute("x2",q.x);line.setAttribute("y2",q.y);line.setAttribute("class","connection-line");line.style.setProperty("--line-color",n.color||"#4abfe7");svg.append(line);});
  });
  clusterDefs.forEach((c,i)=>{
    const label=document.createElement("div");label.className="cluster-label";label.style.left=(c.x+"%");label.style.top=(Math.max(5,c.y-14)+"%");label.style.setProperty("--cluster-color",c.color);label.innerHTML=`<span></span>${c.name}<small>${Math.round(2100+i*1030).toLocaleString()} DAYS AWAY</small>`;layer.append(label);
  });
  allNodes.forEach((n,i)=>{
    const p=px(n),el=document.createElement("button");
    el.className=`map-node ${n.type==="tower"?"tower-node":n.discovered?"known-node":"unknown-node"}`;
    el.style.left=p.x+"px";el.style.top=p.y+"px";el.style.setProperty("--node-color",n.color||"#8fa4bb");el.style.setProperty("--float-delay",`${-(i%17)*.31}s`);el.style.setProperty("--float-x",`${(i%5-2)*2}px`);el.style.setProperty("--float-y",`${(i%7-3)*2}px`);
    if(n.type==="tower")el.innerHTML=`<span class="tower-glyph"><i></i><i></i><i></i></span><span class="node-label">${safe(n.tag)}</span>`;
    else {
      const badge=n.discovered&&n.badge?.uri?`<img class="node-badge" src="${safe(n.badge.uri)}" alt="" onerror="this.hidden=true">`:"";
      el.innerHTML=`<span class="node-core"></span>${n.discovered?`<span class="node-label">${safe(n.name)} ${badge}</span><span class="node-sub">${safe(n.title)} · ${Number(n.daysAway||0).toLocaleString()} DAYS AWAY</span>`:`<span class="node-label unknown-label">UNDISCOVERED</span><span class="node-sub">${Number(n.daysAway).toLocaleString()} DAYS AWAY</span>`}`;
    }
    el.addEventListener("click",e=>{e.stopPropagation();if(n.type==="tower")openTower(n);else if(n.discovered)openFamily(n);else openUnknown(n);});layer.append(el);
  });
  $("#signalCount").textContent=`${allNodes.length.toLocaleString()} SIGNALS DETECTED`;
  $("#mapLoading").classList.add("hidden");applyTransform();
}
function applyTransform(){layer.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${scale})`;svg.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${scale})`;$("#zoomLabel").textContent=Math.round(scale*100)+"%";}
function focusNode(n){const p=px(n);scale=Math.max(scale,1.45);pan={x:viewport.clientWidth/2-p.x*scale,y:viewport.clientHeight/2-p.y*scale};applyTransform();}
function distance(n){return Math.abs((n.daysAway||0)-(activeFamily.daysAway||0));}
function showModal(id){$("#"+id).classList.add("show");}
function closeModal(id){$("#"+id)?.classList.remove("show");if(window.towerTimer)clearInterval(window.towerTimer);}
function profileBackground(uri,fallback){return uri?`background-image:linear-gradient(90deg,#06101acc,#06101a44),url("${safe(uri)}")`:fallback;}
function openUnknown(n){focusNode(n);$("#profileCard").innerHTML=`<button class="close-modal" data-close="profileModal">×</button><div class="unknown-profile"><div class="unknown-symbol">?</div><div class="eyebrow">UNVERIFIED SIGNAL // ${safe(n.group)}</div><h2>FAMILY NOT<br><b>DISCOVERED</b></h2><p>The family you're viewing wasn't discovered by your family.</p><div class="distance-panel"><small>DISTANCE FROM ${safe(activeFamily.name.toUpperCase())}</small><strong>${distance(n).toLocaleString()} <em>DAYS AWAY</em></strong></div><div class="privacy-note">PROFILE DATA REDACTED · MEMBERS, ELEVATIONS AND LORE ARE PRIVATE</div></div>`;showModal("profileModal");}
function openFamily(n){activeFamily=n;focusNode(n);const badge=n.badge||{};const banner=profileBackground(n.bannerUri,`background:radial-gradient(ellipse at 50% 120%,${n.color}66,transparent 65%),linear-gradient(110deg,#0c1c2b,#122e43 50%,#091522)`);
  const badgeBg=n.badgeBackgroundUri?`background-image:url("${safe(n.badgeBackgroundUri)}")`:"";
  $("#profileCard").innerHTML=`<button class="close-modal" data-close="profileModal">×</button><div class="profile-banner custom-banner" style="--banner:${safe(n.color)};${banner}"><div class="banner-grid"></div><span class="banner-stamp">FAMILY ARCHIVE / PUBLIC RECORD</span><div class="banner-orbit"></div></div><div class="profile-main"><div class="profile-avatar" style="--badge:${safe(n.color)}">${n.profileImageUri?`<img src="${safe(n.profileImageUri)}" alt="${safe(n.title||n.name)} profile image">`:`<span>${safe((n.title||n.name).slice(0,2).toUpperCase())}</span>`}</div><div class="eyebrow">DISCOVERED FAMILY // ${safe(n.group)}</div><h2>${safe(n.title||n.name)} ${badge.uri?`<img class="heading-badge" src="${safe(badge.uri)}" alt="${safe(badge.label||"Badge")}">`:""} <span class="verified">✦</span></h2><div class="profile-username">${safe(n.name)} <span class="badge-uri">${safe(badge.label||"BADGE")} · ${safe(badge.uri||"none")}</span></div><div class="profile-stats"><div><small>FAMILY MEMBERS</small><strong>${Number(n.members||0).toLocaleString()}</strong></div><div><small>ELEVATIONS</small><strong>${Number(n.elevations||0).toLocaleString()}</strong></div><div><small>DAYS AWAY</small><strong>${distance(n).toLocaleString()}</strong></div></div><div class="lore-heading">⌁ FAMILY LORE <span>PUBLIC ARCHIVE</span></div><p class="lore-text">${safe(n.lore||"No public lore has been recorded.")}</p><div class="profile-bottom"><span>◈ DISCOVERED RECORD</span><span>LAST SYNC: JUST NOW</span></div></div>`;showModal("profileModal");}
function openTower(t){focusNode(t);let heat=t.baseHeat,connections=t.baseConnections,status=t.initialStatus;
  $("#profileCard").innerHTML=`<button class="close-modal" data-close="profileModal">×</button><div class="tower-banner" style="--tower:${t.color}"><div class="tower-visual"><div class="tower-top"></div>${Array.from({length:7},()=>'<i class="tower-level"></i>').join("")}<div class="tower-base"></div></div><div class="tower-banner-info"><div class="eyebrow">INFRASTRUCTURE // LIVE TELEMETRY</div><h2>SERVER TOWER</h2><b>${safe(t.tag)}</b></div></div><div class="profile-main tower-main"><div class="tower-live"><span class="live-indicator"></span><b id="towerStatus">${safe(status)}</b><small>SIMULATED LIVE FEED</small></div><div class="profile-stats"><div><small>CONNECTIONS</small><strong id="towerConnections">${connections}</strong></div><div><small>CORE HEAT</small><strong id="towerHeat">${heat}°</strong></div><div><small>SPIKE EVENTS</small><strong>${t.spikeCount}</strong></div></div><div class="heat-wrap"><div class="heat-label"><span>THERMAL OUTPUT</span><b id="heatLabel">${heat}%</b></div><div class="heat-track"><i id="heatBar" style="width:${heat}%"></i></div></div><div class="telemetry-title">SIGNAL ACTIVITY <span>LAST 60 SECONDS</span></div><div class="spike-chart" id="spikeChart">${Array.from({length:38},()=>`<i style="height:${12+Math.random()*78}%"></i>`).join("")}</div><div class="tower-log" id="towerLog"><span>NOW</span> Relay handshake stable<br><span>NOW</span> ${connections} active connections detected<br><span>NOW</span> Thermal scan completed</div><div class="profile-bottom"><span>◈ TELEMETRY STREAM</span><span>UPDATES AUTOMATICALLY</span></div></div>`;
  showModal("profileModal");if(window.towerTimer)clearInterval(window.towerTimer);
  window.towerTimer=setInterval(()=>{if(!$("#towerHeat")){clearInterval(window.towerTimer);return;}const log=$("#towerLog");if(Math.random()<.055){$("#towerStatus").textContent="TOWER UPDATING";log.innerHTML=`<span>NOW</span> Tower updating — relay recalibration<br>`+log.innerHTML;}else if(Math.random()<.1){$("#towerStatus").textContent="ON ACTIVE";log.innerHTML=`<span>NOW</span> Activity spike detected<br>`+log.innerHTML;}else $("#towerStatus").textContent="ACTIVE";heat=Math.max(8,Math.min(98,heat+rand(-6,6)));connections=Math.max(2,connections+rand(-4,4));$("#towerHeat").textContent=heat+"°";$("#heatLabel").textContent=heat+"%";$("#heatBar").style.width=heat+"%";$("#towerConnections").textContent=connections;const chart=$("#spikeChart");chart.insertAdjacentHTML("beforeend",`<i style="height:${12+Math.random()*85}%"></i>`);if(chart.children.length>38)chart.firstElementChild.remove();},1800);
}
function playAlert(){const audio=$("#congregationAudio");if(!audio)return;audio.currentTime=0;audio.volume=.82;audio.play().catch(()=>{});}
function triggerCongregation(){if(activeRaid||dots.length<2)return;const a=dots[rand(0,dots.length-1)],b=dots.filter(d=>d.id!==a.id)[rand(0,dots.length-2)];const away=Math.abs((a.daysAway||0)-(b.daysAway||0));activeRaid={a,b};
  $("#alertText").textContent=`${a.title||a.name} and ${b.title||b.name} are fighting down at ${away.toLocaleString()} days away.`;$("#alertModal").classList.add("show");playAlert();
}
function beginRaid(){if(!activeRaid)return;const {a,b}=activeRaid;$("#alertModal").classList.remove("show");closeModal("profileModal");
  const raid=$("#raidOverlay");raid.classList.add("active");raid.innerHTML=`<div class="raid-ring raid-one"></div><div class="raid-ring raid-two"></div><div class="raid-crosshair">⌖</div><div class="raid-caption"><b>CONGREGATION IN PROGRESS</b><span>${safe(a.title||a.name)} <i>VS</i> ${safe(b.title||b.name)}</span><small>RAID ZONE LOCKED · REINFORCEMENTS INBOUND</small><button id="leaveRaid">EXIT EVENT</button></div>`;
  focusNode(a);scale=Math.max(scale,1.65);applyTransform();
  const reinforcements=dots.filter(d=>d.id!==a.id&&d.id!==b.id).slice(0,3);reinforcements.forEach((d,i)=>{const el=document.createElement("div");el.className="reinforcement-tag";el.textContent=`↗ ${d.name} REINFORCING`;el.style.left=`${25+i*24}%`;el.style.top=`${20+i*9}%`;raid.append(el);});
  $("#leaveRaid").addEventListener("click",()=>{raid.classList.remove("active");raid.innerHTML="";activeRaid=null;});
}
$("#welcomeForm").addEventListener("submit",e=>{e.preventDefault();const audio=$("#congregationAudio");if(audio){audio.muted=true;audio.play().then(()=>{audio.pause();audio.currentTime=0;audio.muted=false;}).catch(()=>{audio.muted=false;});}const val=$("#familyInput").value.trim().toLowerCase();const found=dots.find(d=>d.discovered&&(d.name.toLowerCase()===val||d.title.toLowerCase()===val||d.id.toLowerCase()===val));if(!found){$("#familyInput").setCustomValidity("No discovered family with that username. Try a known signal.");$("#familyInput").reportValidity();return;}$("#familyInput").setCustomValidity("");$("#welcomeModal").classList.remove("show");openFamily(found);});
document.querySelectorAll("[data-name]").forEach(b=>b.addEventListener("click",()=>{$("#familyInput").value=b.dataset.name;}));
$("#searchBtn").onclick=()=>showModal("welcomeModal");$("#legendBtn").onclick=()=>showModal("legendModal");
$("#zoomIn").onclick=()=>{scale=Math.min(3.5,scale+.15);applyTransform();};$("#zoomOut").onclick=()=>{scale=Math.max(.45,scale-.15);applyTransform();};$("#resetView").onclick=()=>{scale=1;pan={x:0,y:0};applyTransform();};
viewport.addEventListener("pointerdown",e=>{if(e.target.closest(".map-node"))return;dragging=true;dragStart={x:e.clientX-pan.x,y:e.clientY-pan.y};viewport.setPointerCapture(e.pointerId);});
viewport.addEventListener("pointermove",e=>{if(!dragging)return;pan={x:e.clientX-dragStart.x,y:e.clientY-dragStart.y};applyTransform();});viewport.addEventListener("pointerup",()=>dragging=false);viewport.addEventListener("pointercancel",()=>dragging=false);viewport.addEventListener("wheel",e=>{e.preventDefault();scale=Math.max(.45,Math.min(3.5,scale+(e.deltaY<0?.09:-.09)));applyTransform();},{passive:false});
$("#mapMode").onclick=()=>{currentMode="map";$("#mapMode").classList.add("active");$("#towerMode").classList.remove("active");};
$("#towerMode").onclick=()=>{currentMode="towers";$("#towerMode").classList.add("active");$("#mapMode").classList.remove("active");const first=allNodes.find(n=>n.type==="tower");openTower(first);};
$("#regionList").innerHTML=[...new Set(dots.map(d=>d.group))].map(g=>`<div class="region-row"><i></i>${safe(g)}<span>${dots.filter(d=>d.group===g).length.toString().padStart(2,"0")}</span></div>`).join("");
$("#alertYes").addEventListener("click",beginRaid);$("#alertNo").addEventListener("click",()=>{$("#alertModal").classList.remove("show");activeRaid=null;});
document.addEventListener("click",e=>{const c=e.target.closest("[data-close]");if(c)closeModal(c.dataset.close);if(e.target.classList.contains("modal-backdrop")&&e.target.id!=="welcomeModal")closeModal(e.target.id);});
setInterval(()=>$("#clock").textContent=new Date().toLocaleTimeString("en-US",{hour12:false}),1000);
// First alert is delayed so visitors can orient themselves; later alerts are irregular.
alertTimer=setTimeout(function scheduleAlert(){triggerCongregation();alertTimer=setTimeout(scheduleAlert,rand(55000,105000));},28000);
window.addEventListener("resize",render);render();
