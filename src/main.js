import { dots, towers } from "./data.js";

const $ = (s, p=document) => p.querySelector(s);
const viewport = $("#mapViewport"), layer = $("#nodesLayer"), svg = $("#connections");
let scale=1, pan={x:0,y:0}, dragging=false, dragStart=null, activeFamily=dots[0], currentMode="map";
const colors=["#ff638f","#f6bb54","#75e3c2","#a68cff","#53baff","#f28cff","#d5ef69","#ff8a54"];
const seeded = (n)=>{let x=Math.sin(n*9283.17)*43758.5453;return x-Math.floor(x)};
const allNodes=[];

dots.forEach((d,i)=>allNodes.push({...d,x:12+seeded(i+4)*76,y:16+seeded(i+23)*68,type:"family"}));
for(let i=0;i<130;i++){
  const cluster=i%7, angle=seeded(i+77)*Math.PI*2, radius=80+seeded(i+17)*250;
  const centers=[{x:22,y:28},{x:47,y:22},{x:72,y:30},{x:28,y:68},{x:55,y:72},{x:82,y:68},{x:49,y:48}];
  const c=centers[cluster];
  allNodes.push({id:"unknown-"+i,name:["Uncatalogued signal","Unknown lineage","Unverified family","Dormant node"][i%4],x:Math.max(2,Math.min(98,c.x+Math.cos(angle)*radius/13)),y:Math.max(4,Math.min(96,c.y+Math.sin(angle)*radius/13)),color:colors[i%colors.length],daysAway:Math.round(250+seeded(i+100)*9000),group:["Mid-dark","Outer Reach","Far Meridian","Unmapped"][cluster%4],discovered:false,type:"family"});
}
const towerPositions=[{x:18,y:78},{x:39,y:13},{x:61,y:82},{x:80,y:22},{x:91,y:56}];
towers.forEach((t,i)=>allNodes.push({...t,...towerPositions[i],type:"tower"}));

function render(){
  layer.innerHTML=""; svg.innerHTML="";
  const w=viewport.clientWidth,h=viewport.clientHeight;
  svg.setAttribute("viewBox",`0 0 ${w} ${h}`);
  const toPx=n=>({x:n.x/100*w,y:n.y/100*h});
  // Connection paths connect nearby discovered points and selected family.
  const familyNodes=allNodes.filter(n=>n.type==="family");
  familyNodes.forEach((n,i)=>{
    const p=toPx(n), nearest=familyNodes.filter((m,j)=>j!==i).map(m=>({m,dist:Math.hypot(toPx(m).x-p.x,toPx(m).y-p.y)})).sort((a,b)=>a.dist-b.dist).slice(0,i<10?2:1);
    nearest.forEach(({m})=>{const q=toPx(m), line=document.createElementNS("http://www.w3.org/2000/svg","line");line.setAttribute("x1",p.x);line.setAttribute("y1",p.y);line.setAttribute("x2",q.x);line.setAttribute("y2",q.y);line.setAttribute("class","connection-line");svg.append(line);});
  });
  allNodes.forEach((n,i)=>{
    const p=toPx(n), el=document.createElement("button");el.className=`map-node ${n.type==="tower"?"tower-node":n.discovered?"known-node":"unknown-node"}`;el.style.left=p.x+"px";el.style.top=p.y+"px";el.style.setProperty("--node-color",n.color||"#8fa4bb");
    if(n.type==="tower"){el.innerHTML=`<span class="tower-glyph"><i></i><i></i><i></i></span><span class="node-label">${n.tag}</span>`;}
    else {el.innerHTML=`<span class="node-core"></span><span class="node-label">${n.name} ${n.discovered?`<img class="node-badge" src="${n.badge.uri}" alt="">`:""}</span>${n.discovered?`<span class="node-sub">${n.title} · ${n.daysAway.toLocaleString()} DAYS AWAY</span>`:""}`;}
    el.addEventListener("click",e=>{e.stopPropagation();if(n.type==="tower")openTower(n);else if(n.discovered)openFamily(n);else openUnknown(n);});
    layer.append(el);
  });
  $("#signalCount").textContent=`${allNodes.length} SIGNALS DETECTED`;
  $("#mapLoading").classList.add("hidden");
  applyTransform();
}
function applyTransform(){layer.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${scale})`;svg.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${scale})`;$("#zoomLabel").textContent=Math.round(scale*100)+"%";}
function focusNode(n){const p={x:n.x/100*viewport.clientWidth,y:n.y/100*viewport.clientHeight};scale=Math.max(scale,1.18);pan={x:viewport.clientWidth/2-p.x*scale,y:viewport.clientHeight/2-p.y*scale};applyTransform();}
function openUnknown(n){$("#profileCard").innerHTML=`<button class="close-modal" data-close="profileModal">×</button><div class="unknown-profile"><div class="unknown-symbol">?</div><div class="eyebrow">UNVERIFIED SIGNAL // ${n.group}</div><h2>FAMILY NOT<br><b>DISCOVERED</b></h2><p>The family you're viewing wasn't discovered by your family.</p><div class="distance-panel"><small>DISTANCE FROM ${activeFamily.name.toUpperCase()}</small><strong>${distance(n).toLocaleString()} <em>DAYS AWAY</em></strong></div><div class="privacy-note">PROFILE DATA REDACTED · MEMBERS, ELEVATIONS AND LORE ARE PRIVATE</div></div>`;showModal("profileModal");}
function distance(n){return Math.abs((n.daysAway||0)-(activeFamily.daysAway||0));}
function openFamily(n){
  activeFamily=n;focusNode(n);
  $("#profileCard").innerHTML=`<button class="close-modal" data-close="profileModal">×</button><div class="profile-banner" style="--banner:${n.color}"><div class="banner-grid"></div><span class="banner-stamp">FAMILY ARCHIVE / PUBLIC RECORD</span><div class="banner-orbit"></div></div><div class="profile-main"><div class="profile-badge" style="--badge:${n.color}">${n.badge?.label||"FAM"}</div><div class="eyebrow">DISCOVERED FAMILY // ${n.group}</div><h2>${n.title||n.name} <span class="verified">✦</span></h2><div class="profile-username">${n.name} <span class="badge-uri">${n.badge?.label||"BADGE"} · ${n.badge?.uri||"none"}</span></div><div class="profile-stats"><div><small>FAMILY MEMBERS</small><strong>${n.members.toLocaleString()}</strong></div><div><small>ELEVATIONS</small><strong>${n.elevations.toLocaleString()}</strong></div><div><small>DAYS AWAY</small><strong>${distance(n).toLocaleString()}</strong></div></div><div class="lore-heading">⌁ FAMILY LORE <span>PUBLIC ARCHIVE</span></div><p class="lore-text">${n.lore}</p><div class="profile-bottom"><span>◈ DISCOVERED RECORD</span><span>LAST SYNC: JUST NOW</span></div></div>`;
  showModal("profileModal");
}
function openTower(t){
  focusNode(t);let heat=t.baseHeat, connections=t.baseConnections, status=t.initialStatus;
  $("#profileCard").innerHTML=`<button class="close-modal" data-close="profileModal">×</button><div class="tower-banner" style="--tower:${t.color}"><div class="tower-visual"><div class="tower-top"></div>${Array.from({length:7},()=>'<i class="tower-level"></i>').join("")}<div class="tower-base"></div></div><div class="tower-banner-info"><div class="eyebrow">INFRASTRUCTURE // LIVE TELEMETRY</div><h2>SERVER TOWER</h2><b>${t.tag}</b></div></div><div class="profile-main tower-main"><div class="tower-live"><span class="live-indicator"></span><b id="towerStatus">${status}</b><small>SIMULATED LIVE FEED</small></div><div class="profile-stats"><div><small>CONNECTIONS</small><strong id="towerConnections">${connections}</strong></div><div><small>CORE HEAT</small><strong id="towerHeat">${heat}°</strong></div><div><small>SPIKE EVENTS</small><strong>${t.spikeCount}</strong></div></div><div class="heat-wrap"><div class="heat-label"><span>THERMAL OUTPUT</span><b id="heatLabel">${heat}%</b></div><div class="heat-track"><i id="heatBar" style="width:${heat}%"></i></div></div><div class="telemetry-title">SIGNAL ACTIVITY <span>LAST 60 SECONDS</span></div><div class="spike-chart" id="spikeChart">${Array.from({length:38},(_,i)=>`<i style="height:${12+Math.random()*78}%"></i>`).join("")}</div><div class="tower-log" id="towerLog"><span>19:03:21</span> Relay handshake stable<br><span>19:03:18</span> ${connections} active connections detected<br><span>19:03:12</span> Thermal scan completed</div><div class="profile-bottom"><span>◈ TELEMETRY STREAM</span><span>UPDATES AUTOMATICALLY</span></div></div>`;
  showModal("profileModal");
  if(window.towerTimer)clearInterval(window.towerTimer);
  window.towerTimer=setInterval(()=>{
    if(!$("#towerHeat")){clearInterval(window.towerTimer);return;}
    if(Math.random()<.055){$("#towerStatus").textContent="TOWER UPDATING";$("#towerLog").innerHTML=`<span>NOW</span> Tower updating — relay recalibration<br>`+$("#towerLog").innerHTML;}
    else if(Math.random()<.10){$("#towerStatus").textContent="ON ACTIVE";$("#towerLog").innerHTML=`<span>NOW</span> Activity spike detected<br>`+$("#towerLog").innerHTML;}
    else $("#towerStatus").textContent="ACTIVE";
    heat=Math.max(8,Math.min(98,heat+Math.round(Math.random()*12-6)));connections=Math.max(2,connections+Math.round(Math.random()*8-4));
    $("#towerHeat").textContent=heat+"°";$("#heatLabel").textContent=heat+"%";$("#heatBar").style.width=heat+"%";$("#towerConnections").textContent=connections;
    const chart=$("#spikeChart");chart.insertAdjacentHTML("beforeend",`<i style="height:${12+Math.random()*85}%"></i>`);if(chart.children.length>38)chart.firstElementChild.remove();
  },1800);
}
function showModal(id){$("#"+id).classList.add("show");}
function closeModal(id){$("#"+id)?.classList.remove("show");if(window.towerTimer)clearInterval(window.towerTimer);}
document.addEventListener("click",e=>{const c=e.target.closest("[data-close]");if(c)closeModal(c.dataset.close);if(e.target.classList.contains("modal-backdrop")&&e.target.id!=="welcomeModal")closeModal(e.target.id);});
$("#welcomeForm").addEventListener("submit",e=>{e.preventDefault();const val=$("#familyInput").value.trim().toLowerCase();const found=dots.find(d=>d.name.toLowerCase()===val||d.title.toLowerCase()===val||d.id.toLowerCase()===val);if(!found){$("#familyInput").setCustomValidity("No discovered family with that username. Try a known signal.");$("#familyInput").reportValidity();return;}$("#welcomeModal").classList.remove("show");activeFamily=found;openFamily(found);});
document.querySelectorAll("[data-name]").forEach(b=>b.addEventListener("click",()=>{$("#familyInput").value=b.dataset.name;}));
$("#searchBtn").onclick=()=>showModal("welcomeModal");$("#legendBtn").onclick=()=>showModal("legendModal");
$("#zoomIn").onclick=()=>{scale=Math.min(2.5,scale+.15);applyTransform();};$("#zoomOut").onclick=()=>{scale=Math.max(.55,scale-.15);applyTransform();};$("#resetView").onclick=()=>{scale=1;pan={x:0,y:0};applyTransform();};
viewport.addEventListener("pointerdown",e=>{if(e.target.closest(".map-node"))return;dragging=true;dragStart={x:e.clientX-pan.x,y:e.clientY-pan.y};viewport.setPointerCapture(e.pointerId);});
viewport.addEventListener("pointermove",e=>{if(!dragging)return;pan={x:e.clientX-dragStart.x,y:e.clientY-dragStart.y};applyTransform();});
viewport.addEventListener("pointerup",()=>dragging=false);viewport.addEventListener("wheel",e=>{e.preventDefault();scale=Math.max(.55,Math.min(2.5,scale+(e.deltaY<0?.08:-.08)));applyTransform();},{passive:false});
$("#mapMode").onclick=()=>{currentMode="map";$("#mapMode").classList.add("active");$("#towerMode").classList.remove("active");};
$("#towerMode").onclick=()=>{currentMode="towers";$("#towerMode").classList.add("active");$("#mapMode").classList.remove("active");const first=allNodes.find(n=>n.type==="tower");openTower(first);};
$("#regionList").innerHTML=[...new Set(dots.map(d=>d.group))].map(g=>`<div class="region-row"><i></i>${g}<span>${dots.filter(d=>d.group===g).length.toString().padStart(2,"0")}</span></div>`).join("");
setInterval(()=>$("#clock").textContent=new Date().toLocaleTimeString("en-US",{hour12:false}),1000);
window.addEventListener("resize",render);
render();
