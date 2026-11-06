import { dots } from "./Dots/index.js";
import { towers } from "./Towers/index.js";

const $ = id => document.getElementById(id);
const svgNS = "http://www.w3.org/2000/svg";
const mapGroup = $("mapTransform");
let scale = 1, tx = 0, ty = 0, activeRecord = null, activeEvent = null;
let dragging = false, dragStart = null;
const discovered = dots.filter(d => d.discovered);
$("statDiscovered").innerHTML = `${discovered.length}<span>/∞</span>`;
$("statRegions").textContent = new Set(dots.map(d=>d.group)).size.toString().padStart(2,"0");

function svg(tag, attrs={}, parent=mapGroup) {
  const el=document.createElementNS(svgNS,tag);
  Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));
  parent.appendChild(el); return el;
}
function seededEdges() {
  const sorted=[...dots].sort((a,b)=>a.x-b.x);
  for(let i=0;i<sorted.length-1;i++){
    if(i%2===0 || Math.random()>.55){
      const a=sorted[i],b=sorted[Math.min(sorted.length-1,i+1+Math.floor(Math.random()*4))];
      svg("line",{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:"edge"});
    }
  }
  for(let i=0;i<45;i++){
    const x=70+Math.random()*1460,y=80+Math.random()*730;
    const c=["#55dfff","#ff75c9","#9b8aff","#ffc45d","#5cf0bd"][i%5];
    svg("circle",{cx:x,cy:y,r:1.6,fill:c,opacity:.8,filter:"url(#glow)"});
  }
  const groups=[...new Set(dots.map(d=>d.group))];
  groups.forEach((g,i)=>{
    const x=100+(i*239)%1300,y=130+(i*151)%620;
    svg("path",{d:`M ${x} ${y+20} L ${x+100} ${y-30}`,class:"cluster-line"});
    svg("text",{x:x+105,y:y-33,class:"cluster-label"}).textContent=g;
  });
}
function openProfile(d) {
  activeRecord=d;
  $("profileName").textContent=d.title || d.name;
  $("profileSubtitle").textContent=d.name;
  $("profileType").textContent=d.discovered?"FAMILY RECORD":"UNCONFIRMED SIGNAL";
  $("profileDistance").textContent=`${d.daysAway.toLocaleString()} DAYS AWAY`;
  $("profileDescription").textContent=d.description;
  $("profileLore").textContent=d.discovered?d.lore:"Classified record. No public lore is available.";
  $("recordBadge").textContent=d.discovered?"DISCOVERED":"UNDISCOVERED";
  $("recordBadge").style.color=d.discovered?"#57f1ca":"#ffcf80";
  $("recordBadge").style.borderColor=d.discovered?"#2b8c86":"#8b6934";
  $("profileBanner").style.backgroundImage=d.bannerUri?`linear-gradient(0deg,#081321aa,transparent),url("${d.bannerUri}")`:"";
  $("profileBanner").style.backgroundColor=d.color+"22";
  $("profileAvatar").style.backgroundImage=d.profileBackgroundUri?`url("${d.profileBackgroundUri}")`:(d.badgeUri?`url("${d.badgeUri}")`:"");
  $("profileAvatar").textContent=(d.profileBackgroundUri||d.badgeUri)?"": "✳";
  $("profileBadgeBg").style.backgroundImage=d.badgeBackgroundUri?`url("${d.badgeBackgroundUri}")`:"";
  $("profileStats").innerHTML=d.discovered?[
    ["MEMBERS",d.members.toLocaleString()],["ELEVATIONS",d.elevations.toLocaleString()],["CONNECTIONS",d.connections.toLocaleString()]
  ].map(([a,b])=>`<div class="profile-stat"><b>${b}</b><small>${a}</small></div>`).join(""):"";
  $("profileDetails").innerHTML=d.discovered?[
    ["SIGNAL DISTANCE",`${d.daysAway.toLocaleString()} days`],["REGION",d.group],["STATUS",d.status],["DOT COLOR",d.color]
  ].map(([a,b])=>`<div class="detail"><small>${a}</small><b>${b}</b></div>`).join(""):`<div class="detail"><small>SIGNAL DISTANCE</small><b>${d.daysAway.toLocaleString()} days away</b></div><div class="detail"><small>REGION</small><b>${d.group}</b></div>`;
  $("privateMessage").classList.toggle("hidden",d.discovered);
  $("profileStats").classList.toggle("hidden",!d.discovered);
  $("profileLore").parentElement.classList.toggle("hidden",!d.discovered);
  $("profileDetails").parentElement.classList.toggle("hidden",!d.discovered);
  $("profileBackdrop").classList.remove("hidden");
}
function drawDots(){
  dots.forEach((d,i)=>{
    const g=svg("g",{class:"dot-node",transform:`translate(${d.x} ${d.y})`,tabindex:"0",role:"button","aria-label":d.discovered?d.title:"Undiscovered signal"});
    svg("circle",{cx:0,cy:0,r:d.discovered?12:7,fill:d.color,class:"dot-halo",filter:"url(#softGlow)"},g);
    svg("circle",{cx:0,cy:0,r:d.discovered?5.2:2.5,fill:d.color,class:"dot-core",filter:"url(#glow)"},g);
    if(d.discovered){
      svg("text",{x:0,y:21,"text-anchor":"middle",class:"dot-label"} ,g).textContent=d.title;
      svg("text",{x:0,y:32,"text-anchor":"middle",class:"dot-distance"},g).textContent=`${d.daysAway.toLocaleString()} DAYS AWAY`;
    }
    g.addEventListener("click",e=>{e.stopPropagation();if(!d.discovered){toast("The family you're viewing wasn't discovered by your family.");return;}focusDot(d,true);});
    g.addEventListener("keydown",e=>{if(e.key==="Enter"&&d.discovered)focusDot(d,true);});
  });
  towers.forEach(t=>{
    const g=svg("g",{class:"tower-node",transform:`translate(${t.x} ${t.y})`});
    svg("rect",{x:-8,y:-10,width:16,height:20,rx:1,style:`stroke:${t.color};filter:url(#glow)`},g);
    svg("text",{x:0,y:5,"text-anchor":"middle"},g).textContent="▤";
    svg("text",{x:0,y:25,"text-anchor":"middle",class:"dot-distance"},g).textContent=t.id.toUpperCase();
    g.addEventListener("click",()=>showTower(t));
  });
}
function applyTransform(){mapGroup.setAttribute("transform",`translate(${tx} ${ty}) scale(${scale})`);$("zoomValue").textContent=Math.round(scale*100)+"%";}
function focusDot(d,open){
  const shell=$("mapShell"),w=shell.clientWidth,h=shell.clientHeight;
  scale=Math.max(scale,1.35);tx=w/2-d.x*scale;ty=h/2-d.y*scale;applyTransform();
  if(open)openProfile(d);
}
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2600);}
function findDot(q){
  const term=q.trim().toLowerCase();if(!term)return;
  const match=dots.find(d=>d.name.toLowerCase()===term||d.title.toLowerCase()===term) || dots.find(d=>d.discovered&&(d.name.toLowerCase().includes(term)||d.title.toLowerCase().includes(term)));
  if(!match){toast("No matching signal found in the archive.");return;}
  $("welcome").classList.add("hidden");
  if(!match.discovered){focusDot(match,false);toast("Signal located. This family has not been discovered.");return;}
  focusDot(match,true);
}
$("welcomeForm").addEventListener("submit",e=>{e.preventDefault();findDot($("welcomeSearch").value);});
$("exploreAll").addEventListener("click",()=>$("welcome").classList.add("hidden"));
$("zoomIn").onclick=()=>{scale=Math.min(2.8,scale*1.18);applyTransform();};
$("zoomOut").onclick=()=>{scale=Math.max(.55,scale/1.18);applyTransform();};
$("resetView").onclick=()=>{scale=1;tx=0;ty=0;applyTransform();};
$("network").addEventListener("pointerdown",e=>{if(e.target.closest(".dot-node,.tower-node"))return;dragging=true;dragStart={x:e.clientX-tx,y:e.clientY-ty};$("network").classList.add("dragging");$("network").setPointerCapture(e.pointerId);});
$("network").addEventListener("pointermove",e=>{if(!dragging)return;tx=e.clientX-dragStart.x;ty=e.clientY-dragStart.y;applyTransform();});
$("network").addEventListener("pointerup",()=>{dragging=false;$("network").classList.remove("dragging");});
$("network").addEventListener("wheel",e=>{e.preventDefault();scale=Math.max(.55,Math.min(2.8,scale*(e.deltaY<0?1.08:.92)));applyTransform();},{passive:false});
$("closeProfile").onclick=$("closeProfile2").onclick=()=>$("profileBackdrop").classList.add("hidden");
$("profileBackdrop").addEventListener("click",e=>{if(e.target===$("profileBackdrop"))$("profileBackdrop").classList.add("hidden");});
$("focusProfile").onclick=()=>{if(activeRecord){$("profileBackdrop").classList.add("hidden");focusDot(activeRecord,false);}};
$("menuToggle").onclick=()=>$("sidebar").classList.toggle("open");
document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
  const towersOn=btn.dataset.view==="towers";$("towerView").classList.toggle("hidden",!towersOn);$("mapShell").classList.toggle("hidden",towersOn);$("heading").classList.toggle("hidden",towersOn);
  $("sidebar").classList.remove("open");
}));
function showTower(t){
  const fake={...t,heat:Math.max(12,Math.min(99,t.heat+Math.round(Math.random()*14-7))),connections:t.connections+Math.round(Math.random()*8-4)};
  $("profileName").textContent=t.name;$("profileSubtitle").textContent=t.id+"#";$("profileType").textContent="SERVER TOWER TELEMETRY";$("profileDistance").textContent="LIVE INFRASTRUCTURE";
  $("profileDescription").textContent="A relay tower monitoring active connections across the family network. Telemetry is simulated and periodically refreshes.";
  $("profileBanner").style.backgroundImage="";$("profileBanner").style.backgroundColor=t.color+"22";$("profileAvatar").style.backgroundImage="";$("profileAvatar").textContent="▤";
  $("profileStats").innerHTML=[["CONNECTIONS",fake.connections],["TOWER HEAT",fake.heat+"%"],["SIGNAL SPIKES",Math.floor(Math.random()*90+10)]].map(([a,b])=>`<div class="profile-stat"><b>${b}</b><small>${a}</small></div>`).join("");
  $("profileStats").classList.remove("hidden");$("profileLore").parentElement.classList.add("hidden");$("profileDetails").parentElement.classList.add("hidden");$("privateMessage").classList.add("hidden");$("recordBadge").textContent="ON ACTIVE";$("recordBadge").style.color="#58efbd";
  $("profileBackdrop").classList.remove("hidden");
}
function renderTowers(){
  $("towerGrid").innerHTML=towers.map((t,i)=>`<div class="tower-card" style="--tower-color:${t.color}"><div class="tower-card-head"><h3>${t.id.toUpperCase()}#</h3><span class="tower-state">● ON ACTIVE</span></div><div class="tower-metrics"><div class="tower-metric"><small>CONNECTIONS</small><b id="tc${i}">${t.connections}</b></div><div class="tower-metric"><small>TOWER HEAT</small><b id="th${i}">${t.heat}%</b></div></div><svg class="sparkline" viewBox="0 0 250 70" preserveAspectRatio="none"><polyline id="sp${i}" points="${Array.from({length:25},(_,j)=>`${j*10},${20+Math.random()*45}`).join(" ")}" fill="none" stroke="${t.color}" stroke-width="2" filter="url(#glow)"/></svg><div class="tower-log" id="tl${i}"><div>telemetry stream initialized</div><div>relay handshake stable</div><div>monitoring active connections</div></div><button class="tower-open" data-tower="${i}">OPEN TOWER PROFILE ↗</button></div>`).join("");
  document.querySelectorAll(".tower-open").forEach(b=>b.onclick=()=>showTower(towers[+b.dataset.tower]));
}
function updateTowers(){
  towers.forEach((t,i)=>{
    const heat=Math.max(5,Math.min(99,t.heat+Math.round(Math.random()*14-7)));
    const connections=Math.max(1,t.connections+Math.round(Math.random()*6-3));
    $("th"+i).textContent=heat+"%";$("tc"+i).textContent=connections;
    $("sp"+i).setAttribute("points",Array.from({length:25},(_,j)=>`${j*10},${12+Math.random()*50}`).join(" "));
    if(Math.random()<.15){$("tl"+i).innerHTML=`<div>tower updatinga...</div><div>rebuilding relay handshake</div><div>telemetry restored · ${new Date().toLocaleTimeString()}</div>`;}
    else $("tl"+i).innerHTML=`<div>spike detected · ${Math.round(Math.random()*80+10)}ms</div><div>active connections: ${connections}</div><div>heat signature: ${heat}% · stable</div>`;
  });
}
let pendingEvent=null;
function triggerAlert(){
  const a=discovered[Math.floor(Math.random()*discovered.length)],b=discovered.filter(d=>d.id!==a.id)[Math.floor(Math.random()*(discovered.length-1))];
  const eventTypes=["A RAID ATTACK","A BOMB ATTACK","A SERVER BREACH","A REGIONAL ASSAULT"];
  const type=eventTypes[Math.floor(Math.random()*eventTypes.length)];
  pendingEvent={a,b,type};
  $("alertTitle").textContent=`${a.title.toUpperCase()} VS ${b.title.toUpperCase()}`;
  $("alertText").textContent=`${type} detected near ${a.group} · ${Math.min(a.daysAway,b.daysAway).toLocaleString()} DAYS AWAY. Reinforcement signals may be approaching.`;
  $("alertToast").classList.remove("hidden");
}
function viewEvent(){
  if(!pendingEvent)return;
  const {a,b,type}=pendingEvent;activeEvent=pendingEvent;
  $("eventName").textContent=type;$("eventDescription").textContent=`${a.title} and ${b.title} are involved in a simulated regional conflict. Blue raid perimeter is active. Nearby signals may converge to reinforce either family.`;
  $("eventStatus").textContent="ACTIVE · SIMULATED";
  $("eventOverlay").classList.remove("hidden");$("alertToast").classList.add("hidden");
}
$("viewAlert").onclick=viewEvent;$("ignoreAlert").onclick=$("dismissAlert").onclick=()=>$("alertToast").classList.add("hidden");
$("closeEvent").onclick=()=>$("eventOverlay").classList.add("hidden");
$("eventJump").onclick=()=>{if(activeEvent){$("eventOverlay").classList.add("hidden");focusDot(activeEvent.a,true);}};
function clock(){ $("clock").textContent=new Date().toLocaleTimeString("en-US",{hour12:false});}
seededEdges();drawDots();applyTransform();renderTowers();clock();setInterval(clock,1000);setInterval(updateTowers,3500);
setTimeout(triggerAlert,18000);setInterval(()=>{if(Math.random()<.55 && $("alertToast").classList.contains("hidden") && $("eventOverlay").classList.contains("hidden"))triggerAlert();},55000);
