import * as D from './Dots/index.js';
import towers from './Towers/towers.js';
const dots=D.default; 
const canvas=document.querySelector('#map'),ctx=canvas.getContext('2d');
const $=s=>document.querySelector(s);
let W=innerWidth,H=innerHeight,scale=.78,cam={x:0,y:0},drag=null,hover=null,incident=null,incidentTimer=null,toastTimer=null;
let activeTower=null;
const shipSprites=new Map();
for(const d of dots.filter(x=>x.ship&&x.shipImage)){const im=new Image();im.src=d.shipImage;shipSprites.set(d.id,im)}
const fieldMotionStart=performance.now();
function nodePosition(d,now=performance.now()){
 const phase=(hash(d.id.length*73+d.x*0.13+d.y*0.07)*Math.PI*2);
 const speed=d.ship?0.00034:0.00019;
 const radius=d.ship?72:34;
 return {x:d.x+Math.cos(now*speed+phase)*radius,y:d.y+Math.sin(now*speed*.83+phase)*radius*.72};
}
const discovered=dots.filter(d=>d.discovered);
const names=dots.map(d=>d.name.toLowerCase());
const audio=new Audio('assets/Alert_sound.mp3');audio.volume=.65;
function resize(){W=innerWidth;H=innerHeight;canvas.width=Math.floor(W*devicePixelRatio);canvas.height=Math.floor(H*devicePixelRatio);ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);draw()}
addEventListener('resize',resize);
function screen(x,y){return {x:W/2+(x-cam.x)*scale,y:H/2+(y-cam.y)*scale}}
function world(x,y){return {x:(x-W/2)/scale+cam.x,y:(y-H/2)/scale+cam.y}}
function hash(n){let x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
const groups=[{name:'MID-DARK',x:2700,y:2200,color:'#7d8cff',days:9290},{name:'MID-OSCOR',x:-3200,y:1900,color:'#bd78ff',days:12480},{name:'THE OUTER VEIL',x:5200,y:-3500,color:'#62d9d5',days:18900},{name:'ASHEN EXPANSE',x:-5700,y:-4200,color:'#ff9875',days:24000},{name:'FAR-SIGNAL',x:8200,y:5500,color:'#f1d17a',days:38100}];
const towersData=towers.map((t,i)=>({...t,x:[-350,780,-1250,1700,80][i],y:[-700,-950,850,1250,1500][i]}));
function dotColor(i){let colors=['#53e8ff','#ff7d9c','#b18aff','#ffe17b','#68f0b5','#ff9e62','#7d9aff','#f38be7'];return colors[Math.floor(hash(i)*colors.length)]}
function seededDots(wx,wy){ // deterministic, viewport-only procedural nodes; 90M virtual field
 const chunk=620, minX=Math.floor(wx/chunk)-2,maxX=Math.floor((wx+W/scale)/chunk)+2,minY=Math.floor(wy/chunk)-2,maxY=Math.floor((wy+H/scale)/chunk)+2;
 const out=[];
 for(let cy=minY;cy<=maxY;cy++)for(let cx=minX;cx<=maxX;cx++){
  const seed=(cx+9001)*92821+(cy+9001)*68917;
  const n=34+Math.floor(hash(seed)*34);
  for(let j=0;j<n;j++){let h=seed*101+j*7.13,x=cx*chunk+hash(h)*chunk,y=cy*chunk+hash(h+4)*chunk;
   if(Math.abs(x)>12000||Math.abs(y)>12000)continue;
   const clustered=hash(h+8)>.58;out.push({x,y,r:clustered?1.4+hash(h+9)*2.2:1+hash(h+9)*1.2,c:dotColor(seed+j),name:'Undiscovered',group:groups[Math.abs(Math.floor(hash(seed+1)*groups.length))]});
  }
 }
 return out;
}
function draw(){if(!ctx)return;ctx.clearRect(0,0,W,H);
 // distant stars
 for(let i=0;i<180;i++){let x=(hash(i+11)*W),y=(hash(i+901)*H);ctx.fillStyle=`rgba(170,205,255,${.12+hash(i+50)*.35})`;ctx.fillRect(x,y,1,1)}
 const view=world(0,0),field=seededDots(view.x,view.y);
 // group haze + labels
 for(const g of groups){let p=screen(g.x,g.y),r=Math.max(50,220*scale);let grad=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);grad.addColorStop(0,g.color+'18');grad.addColorStop(1,g.color+'00');ctx.fillStyle=grad;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
 if(scale>.22){ctx.strokeStyle=g.color+'66';ctx.setLineDash([5,8]);ctx.beginPath();ctx.moveTo(p.x,p.y+15);ctx.lineTo(p.x,p.y+Math.max(30,80*scale));ctx.stroke();ctx.setLineDash([]);ctx.font=`700 ${Math.max(9,11*scale)}px monospace`;ctx.fillStyle=g.color;ctx.fillText(`${g.name}  ·  ${g.days.toLocaleString()} DAYS AWAY`,p.x-80,p.y+Math.max(45,100*scale));}}
 // virtual dots
 for(const d of field){const drift=performance.now()*.00016+(d.x+d.y)*.0007;let p=screen(d.x+Math.cos(drift)*5,d.y+Math.sin(drift*1.13)*5);if(p.x<-8||p.x>W+8||p.y<-8||p.y>H+8)continue;ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.7,d.r*scale),0,Math.PI*2);ctx.fillStyle=d.c;ctx.shadowBlur=scale>0.45?8:3;ctx.shadowColor=d.c;ctx.fill();ctx.shadowBlur=0;}
 // known family nodes: smooth drift, with tiny same-color escort dots that travel as a pack
 const now=performance.now();
 for(const d of dots){
  const pos=nodePosition(d,now),p=screen(pos.x,pos.y),r=Math.max(4,7*scale);
  // satellites gather around their node, then slowly orbit toward nearby unlike-color signals
  const packPhase=now*.00022+(hash(d.x+d.y)*6.28);
  let other=null,otherDist=Infinity;
  for(const candidate of dots){if(candidate===d||candidate.color===d.color)continue;const dd=Math.hypot(candidate.x-d.x,candidate.y-d.y);if(dd<otherDist){otherDist=dd;other=candidate}}
  // Every few seconds the same-color escort pack leans toward a nearby unlike-color signal,
  // stays clustered there briefly, then loosens and resumes orbiting its own node.
  const cuddle=Math.max(0,Math.sin(now*.00019+hash(d.y+d.x)*6.28));
  let packShift={x:0,y:0};
  if(other&&cuddle>.25){const dx=other.x-d.x,dy=other.y-d.y,len=Math.max(1,Math.hypot(dx,dy));const pull=Math.min(78,len*.18)*cuddle;packShift={x:dx/len*pull*scale,y:dy/len*pull*scale};}
  for(let k=0;k<3;k++){const a=packPhase+k*2.094;const orbit=(d.ship?29:18)*Math.max(.55,scale);const sx=p.x+packShift.x+Math.cos(a)*orbit,sy=p.y+packShift.y+Math.sin(a)*orbit*.68;ctx.beginPath();ctx.arc(sx,sy,Math.max(1.4,2.2*scale),0,Math.PI*2);ctx.fillStyle=d.color;ctx.globalAlpha=.72;ctx.shadowBlur=8;ctx.shadowColor=d.color;ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1;}
  if(d.ship&&shipSprites.has(d.id)){const im=shipSprites.get(d.id);if(im.complete&&im.naturalWidth){const h=(d.id==='redship'?142:126)*Math.max(.58,Math.min(1.35,scale));const w=h*im.naturalWidth/im.naturalHeight;ctx.save();ctx.globalAlpha=d.discovered?1:.82;ctx.shadowColor=d.color;ctx.shadowBlur=25;ctx.drawImage(im,p.x-w/2,p.y-h/2,w,h);ctx.restore();}}
  else {ctx.beginPath();ctx.arc(p.x,p.y,r+7*scale,0,Math.PI*2);ctx.fillStyle=d.color+'22';ctx.fill();ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=d.color;ctx.shadowBlur=24;ctx.shadowColor=d.color;ctx.fill();ctx.shadowBlur=0;}
  ctx.font=`700 ${Math.max(9,11*scale)}px monospace`;ctx.textAlign='center';ctx.fillStyle='#e7faff';ctx.fillText(d.ship?(d.discovered?'VESSEL // RED SIGNAL':'VESSEL // UNKNOWN'):d.name,p.x,p.y-(d.ship?((d.id==='redship'?82:72)*Math.max(.55,scale)):13*scale));if(d.title&&scale>.48&&!d.ship){ctx.font=`${Math.max(7,8*scale)}px monospace`;ctx.fillStyle=d.color;ctx.fillText(d.title,p.x,p.y+22*scale)}
 }
 // tower nodes
 for(const t of towersData){let p=screen(t.x,t.y),r=Math.max(7,10*scale);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.PI/4);ctx.fillStyle='#ffac68';ctx.shadowColor='#ff8a4b';ctx.shadowBlur=20;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();ctx.shadowBlur=0;ctx.font=`${Math.max(8,9*scale)}px monospace`;ctx.textAlign='center';ctx.fillStyle='#ffc38a';ctx.fillText('TOWER',p.x,p.y-17*scale)}
 // incident rings, pulsing shooting beams and impact bursts
 if(incident){const a=nodePosition(incident.pair[0],now),b=nodePosition(incident.pair[1],now),pa=screen(a.x,a.y),pb=screen(b.x,b.y);for(const p of [pa,pb]){ctx.beginPath();ctx.arc(p.x,p.y,100*scale,0,Math.PI*2);ctx.strokeStyle='#48a8ff';ctx.lineWidth=2;ctx.shadowBlur=25;ctx.shadowColor='#168dff';ctx.stroke();ctx.shadowBlur=0;ctx.beginPath();ctx.arc(p.x,p.y,75*scale,0,Math.PI*2);ctx.strokeStyle='#75caff66';ctx.setLineDash([4,8]);ctx.stroke();ctx.setLineDash([])}
  const pulse=(Math.sin(now*.012)+1)/2;ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.strokeStyle='#ff314f';ctx.lineWidth=2+5*pulse;ctx.shadowColor='#ff274d';ctx.shadowBlur=20+25*pulse;ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();ctx.strokeStyle='#d9f7ff';ctx.lineWidth=1.5+3*(1-pulse);ctx.shadowColor='#a9edff';ctx.shadowBlur=18;ctx.beginPath();ctx.moveTo(pb.x,pb.y);ctx.lineTo(pa.x,pa.y);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(pb.x,pb.y,5+8*pulse,0,Math.PI*2);ctx.fill();ctx.restore();}}
 $('#coords').textContent=`X ${Math.round(cam.x).toString().padStart(4,'0')} · Y ${Math.round(cam.y).toString().padStart(4,'0')}`;$('#zoom-label').textContent=scale.toFixed(2)+'×';
}
function moveTo(x,y,targetScale=1.2){const start={...cam},ss=scale,st=performance.now(),dur=1100;function step(now){let t=Math.min(1,(now-st)/dur),e=1-Math.pow(1-t,4);cam.x=start.x+(x-start.x)*e;cam.y=start.y+(y-start.y)*e;scale=ss+(targetScale-ss)*e;draw();if(t<1)requestAnimationFrame(step);else if(targetScale>0.8){} }requestAnimationFrame(step)}
function notify(s){let t=$('#toast');t.textContent=s;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2500)}
function openProfile(d){$('#tower').classList.add('hidden');$('#profile').classList.remove('hidden');$('#profile').classList.toggle('ship-profile',!!d.ship);$('#profile-name').textContent=d.name;$('#profile-title').textContent=d.title||'Uncharted node';$('#profile-type').textContent=d.ship?(d.discovered?'DISCOVERED VESSEL // COMBAT CAPABLE':'UNDISCOVERED VESSEL // SIGNAL LOCKED'):(d.discovered?'DISCOVERED FAMILY':'UNDISCOVERED FAMILY');
 $('#profile-lore').textContent=d.discovered&&d.showLore?d.lore:(d.ship?'Vessel identity and telemetry are sealed until discovery.':'This family’s lore is private.');$('#profile-banner').style.backgroundImage=d.bannerUri?`url("${d.bannerUri}")`:`linear-gradient(120deg,${d.color},#121b44,#9d57c8)`;
 $('#profile-badge').src=d.badgeUri||'';$('#profile-badge').style.visibility=d.badgeUri?'visible':'hidden';
 $('#profile-avatar').src=d.profileUri||d.badgeUri||'';$('#profile-avatar').style.visibility=(d.profileUri||d.badgeUri)?'visible':'hidden';
 if(d.backgroundUri)$('#profile').style.backgroundImage=`linear-gradient(#0a0d22df,#0a0d22f2),url("${d.backgroundUri}")`;else $('#profile').style.backgroundImage='';
 const stat=(v,l)=>`<div class="stat"><b>${v}</b><small>${l}</small></div>`;
 if(d.discovered){$('#profile-stats').innerHTML=stat(d.showMembers?d.members.toLocaleString():'PRIVATE','MEMBERS')+stat(d.showEliminations?d.eliminations:'PRIVATE','ELIMINATIONS')+stat(d.elevations,'ELEVATIONS');$('#private-note').textContent=d.ship?'VESSEL ARCHIVE // Red signal authenticated. Combat response enabled during Congregation Alerts.':'PUBLIC ARCHIVE // Family information is available.'}
 else{$('#profile-stats').innerHTML=stat('PRIVATE','MEMBERS')+stat('PRIVATE','ELIMINATIONS')+stat('PRIVATE','ELEVATIONS');$('#private-note').textContent=d.ship?'UNKNOWN VESSEL // Signal signature detected. Vessel identity, records and combat telemetry remain locked.':'The family you’re viewing wasn’t discovered by your family. Members, eliminations, elevations and lore are private. Distance is public.'}
 $('#profile-meta').textContent=`${d.daysAway.toLocaleString()} DAYS AWAY  ·  ${d.group||'UNMAPPED SECTOR'}  ·  ${d.ship?'VESSEL':'NODE'} ${d.id.toUpperCase()}`;
}
function openTower(t){$('#profile').classList.add('hidden');$('#tower').classList.remove('hidden');activeTower=t;$('#tower-id').textContent=t.serverId;updateTower()}
function updateTower(){if(!activeTower)return;let heat=activeTower.baseHeat+Math.round(Math.random()*22-11),connections=activeTower.baseConnections+Math.round(Math.random()*70-35);heat=Math.max(5,Math.min(99,heat));$('#heat-value').textContent=heat+'%';$('#heat-bar').style.width=heat+'%';$('#tower-stats').innerHTML=`<div class="stat"><b>${Math.max(0,connections).toLocaleString()}</b><small>CONNECTIONS</small></div><div class="stat"><b>${Math.round(heat*1.3)}ms</b><small>LATENCY</small></div><div class="stat"><b>${Math.round(100-heat/5)}%</b><small>UPTIME</small></div>`;let reset=Math.random()<.1;$('#tower-status').textContent=reset?'TOWER UPDATINGA':(Math.random()<.2?'ON ACTIVE':'ACTIVE / STREAMING');$('#tower-log').textContent=reset?'Reinitializing relay stack... restoring encrypted channels...':`[${new Date().toLocaleTimeString()}] ${connections} active routes · packets flowing · ${heat}% thermal load`;let pts=[];for(let i=0;i<=50;i++){let x=i*10,y=80-Math.random()*Math.random()*75;pts.push(`${i?'L':'M'}${x},${y}`)}$('#spike-chart').innerHTML=`<path d="${pts.join(' ')}" fill="none" stroke="#ff9b65" stroke-width="2"/><path d="${pts.join(' ')} L500,100 L0,100 Z" fill="#ff875522"/>`}
setInterval(()=>{if(activeTower&&!$('#tower').classList.contains('hidden'))updateTower()},2200);
function searchNormalize(value){
 // Normalize punctuation, spaces, accents and common Unicode presentation forms.
 return String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/^@/,'').replace(/[^a-z0-9]/g,'');
}
function locate(raw,fromWelcome=false){
 const rawQuery=String(raw??'').trim();
 const query=searchNormalize(rawQuery);
 const error=$('#origin-error');
 if(!query){if(fromWelcome&&error)error.textContent='Enter a family name first.';else notify('Enter a family name first.');return false;}
 const fields=d=>[d.name,d.id,d.title,d.username,d.handle,...(Array.isArray(d.aliases)?d.aliases:[])].filter(Boolean);
 // Exact name / ID / title first, then safe partial matching. IDs remain searchable even
 // when a display name uses decorative Unicode lettering.
 let matches=dots.filter(d=>fields(d).some(v=>searchNormalize(v)===query));
 if(!matches.length)matches=dots.filter(d=>fields(d).some(v=>{
   const value=searchNormalize(v);return value.length>=2&&(value.includes(query)||query.includes(value));
 }));
 // Match individual words too (e.g. "Drama" for "DRAMA FAMILY").
 if(!matches.length){
   const words=query.match(/[a-z0-9]{2,}/g)||[];
   matches=dots.filter(d=>words.some(w=>fields(d).some(v=>searchNormalize(v).includes(w))));
 }
 const d=matches[0];
 if(!d){
   const msg='No matching signal. Try a family name or ID: '+dots.slice(0,8).map(x=>x.id).join(', ');
   if(fromWelcome&&error)error.textContent=msg;else notify('No matching signal. Try a family name or ID.');
   return false;
 }
 // Dismiss the entry screen synchronously so a successful search never leaves the user
 // trapped at the welcome menu while the camera animation is running.
 $('#welcome').classList.add('off');
 if(error)error.textContent='';
 $('#profile').classList.add('hidden');$('#tower').classList.add('hidden');
 const input=$('#map-search');if(input)input.value='';
 const x=Number.isFinite(Number(d.x))?Number(d.x):0;
 const y=Number.isFinite(Number(d.y))?Number(d.y):0;
 moveTo(x,y,1.55);
 window.setTimeout(()=>{openProfile(d);draw();},1150);
 return true;
}
const enterButton=$('#enter-map');
if(enterButton)enterButton.addEventListener('click',e=>{e.preventDefault();locate($('#origin-input')?.value,true);});
const originInput=$('#origin-input');
if(originInput)originInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();locate(e.currentTarget.value,true);}});
const searchButton=$('#search-btn');
if(searchButton)searchButton.addEventListener('click',e=>{e.preventDefault();locate($('#map-search')?.value,false);});
const mapSearch=$('#map-search');
if(mapSearch)mapSearch.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();locate(e.currentTarget.value,false);}});
$('#zoom-in').onclick=()=>{scale=Math.min(5,scale*1.25);draw()};$('#zoom-out').onclick=()=>{scale=Math.max(.12,scale/1.25);draw()};$('#recenter').onclick=()=>moveTo(0,0,.78);
canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y,moved:false};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging')});
canvas.addEventListener('pointermove',e=>{if(drag){let dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;cam.x=drag.cx-dx/scale;cam.y=drag.cy-dy/scale;draw()}});
canvas.addEventListener('pointerup',e=>{canvas.classList.remove('dragging');if(!drag)return;if(!drag.moved){let p=world(e.clientX,e.clientY),nearest=null,dist=Infinity;for(let d of dots){let q=nodePosition(d);let dd=Math.hypot(q.x-p.x,q.y-p.y);if(dd<dist){dist=dd;nearest=d}}for(let t of towersData){let dd=Math.hypot(t.x-p.x,t.y-p.y);if(dd<dist){dist=dd;nearest=t}}
 if(dist<Math.max(32,25/scale)){if(nearest.serverId)openTower(nearest);else openProfile(nearest)}
 else {
   // A procedural node is still a real map target, but its identity and records remain undiscovered.
   let candidates=seededDots(p.x-120,p.y-120),pick=null,pickDist=Infinity;
   for(const d of candidates){let dd=Math.hypot(d.x-p.x,d.y-p.y);if(dd<pickDist){pickDist=dd;pick=d}}
   if(pick&&pickDist<Math.max(55,35/scale)){
     const g=pick.group;openProfile({id:'unmapped-node',name:'Undiscovered',title:'Uncharted family signal',lore:'',color:pick.c,x:pick.x,y:pick.y,discovered:false,daysAway:g.days,members:0,eliminations:0,elevations:0,group:g.name,badgeUri:'',bannerUri:'',profileUri:'',backgroundUri:'',showMembers:false,showEliminations:false,showLore:false});
   } else {$('#profile').classList.add('hidden');$('#tower').classList.add('hidden')}
 }}drag=null});
canvas.addEventListener('wheel',e=>{e.preventDefault();let before=world(e.clientX,e.clientY);scale=Math.max(.12,Math.min(5,scale*Math.exp(-e.deltaY*.001)));let after=world(e.clientX,e.clientY);cam.x+=before.x-after.x;cam.y+=before.y-after.y;draw()},{passive:false});
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).classList.add('hidden'));
$('#help').onclick=()=>$('#help-panel').classList.toggle('hidden');
function startIncident(){if(incident)return;let combatants=dots.filter(d=>d.discovered);let pair=[combatants[Math.floor(Math.random()*combatants.length)],combatants[Math.floor(Math.random()*combatants.length)]];if(pair[0]===pair[1])pair[1]=combatants[(combatants.indexOf(pair[0])+1)%combatants.length];incident={pair};$('#alert-copy').textContent=`${pair[0].name} and ${pair[1].name} are fighting down at ${Math.abs(pair[0].daysAway-pair[1].daysAway).toLocaleString()} DAYS away. Both signals are returning fire. Would you like to view the live encounter?` ;$('#alert').classList.remove('hidden');try{audio.currentTime=0;audio.play().catch(()=>{})}catch{}}
$('#alert-yes').onclick=()=>{if(!incident)return;$('#alert').classList.add('hidden');$('#warbar').classList.remove('hidden');$('#war-caption').textContent=`${incident.pair[0].name} × ${incident.pair[1].name} · RAID IN PROGRESS`;let a=nodePosition(incident.pair[0]),b=nodePosition(incident.pair[1]),x=(a.x+b.x)/2,y=(a.y+b.y)/2;moveTo(x,y,.72);draw()};
function endIncident(){$('#alert').classList.add('hidden');$('#warbar').classList.add('hidden');incident=null;draw();notify('Incident view closed.')}
$('#alert-no').onclick=endIncident;$('#exit-war').onclick=endIncident;$('#alert-now').onclick=startIncident;
setInterval(()=>{if(!incident&&Math.random()<.22)startIncident()},26000);
addEventListener('keydown',e=>{if(e.key==='Escape'){endIncident();$('#profile').classList.add('hidden');$('#tower').classList.add('hidden');$('#help-panel').classList.add('hidden')}});
function animate(){draw();requestAnimationFrame(animate)}
resize();requestAnimationFrame(animate);
