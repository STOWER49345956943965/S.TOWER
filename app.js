import * as D from './Dots/index.js';
import towers from './Towers/towers.js';
const dots=D.default; 
const canvas=document.querySelector('#map'),ctx=canvas.getContext('2d');
const $=s=>document.querySelector(s);
let W=innerWidth,H=innerHeight,scale=.78,cam={x:0,y:0},drag=null,hover=null,incident=null,incidentTimer=null,toastTimer=null;
let activeTower=null,activeShip=null,animationClock=0,beam=null;
const shipImages={discovered:new Image(),unknown:new Image()};
shipImages.discovered.src='assets/discovered-raider.png';shipImages.unknown.src='assets/unknown-ship.png';
const ships=[
 {id:'raider-01',name:'WHITE RAIDER // 01',title:'Discovered long-range military vessel',x:920,y:360,color:'#ff5369',status:'DISCOVERED',image:shipImages.discovered,discovered:true,lore:'A long white military vessel carrying red signal beacons, armored compartments and an active raiding profile. Its transponder has been identified.'},
 {id:'unknown-02',name:'THE PALE UNKNOWN',title:'Unidentified luminous vessel',x:-980,y:520,color:'#d9f4ff',status:'UNDISCOVERED',image:shipImages.unknown,discovered:false,lore:'An unknown white vessel surrounded by intense luminous structures. Its origin, crew and capabilities remain unverified.'}
];
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
   const clustered=hash(h+8)>.58,colorIndex=Math.floor(hash(seed+j)*8),packX=cx*chunk+hash(seed+colorIndex*101+17)*chunk,packY=cy*chunk+hash(seed+colorIndex*101+29)*chunk;out.push({x,y,packX,packY,r:clustered?1.4+hash(h+9)*2.2:1+hash(h+9)*1.2,c:dotColor(seed+j),name:'Undiscovered',group:groups[Math.abs(Math.floor(hash(seed+1)*groups.length))]});
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
 for(const d of field){let phase=animationClock*.00055+(d.x+d.y)*.001;let pack=hash(Math.floor(d.x/260)+Math.floor(d.y/260)*31),gather=1-Math.exp(-animationClock*.000018);let driftX=Math.sin(phase+pack*8)*4+Math.cos(phase*.63+pack*17)*2;let driftY=Math.cos(phase*.9+pack*11)*4+Math.sin(phase*.7+pack*23)*2;let p=screen(d.x+(d.packX-d.x)*gather+driftX,d.y+(d.packY-d.y)*gather+driftY);if(p.x<-8||p.x>W+8||p.y<-8||p.y>H+8)continue;ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.7,d.r*scale),0,Math.PI*2);ctx.fillStyle=d.c;ctx.shadowBlur=scale>0.45?8:3;ctx.shadowColor=d.c;ctx.fill();ctx.shadowBlur=0;}
 // active congregation: same-color signals drift into loose packs
 for(const d of dots){let p=screen(d.x,d.y),r=Math.max(4,7*scale);ctx.beginPath();ctx.arc(p.x,p.y,r+7*scale,0,Math.PI*2);ctx.fillStyle=d.color+'22';ctx.fill();ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=d.color;ctx.shadowBlur=24;ctx.shadowColor=d.color;ctx.fill();ctx.shadowBlur=0;
 ctx.font=`700 ${Math.max(9,11*scale)}px monospace`;ctx.textAlign='center';ctx.fillStyle='#e7faff';ctx.fillText(d.name,p.x,p.y-13*scale);if(d.title&&scale>.48){ctx.font=`${Math.max(7,8*scale)}px monospace`;ctx.fillStyle=d.color;ctx.fillText(d.title,p.x,p.y+22*scale)}}
 // tower nodes
 for(const t of towersData){let p=screen(t.x,t.y),r=Math.max(7,10*scale);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.PI/4);ctx.fillStyle='#ffac68';ctx.shadowColor='#ff8a4b';ctx.shadowBlur=20;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();ctx.shadowBlur=0;ctx.font=`${Math.max(8,9*scale)}px monospace`;ctx.textAlign='center';ctx.fillStyle='#ffc38a';ctx.fillText('TOWER',p.x,p.y-17*scale)}
 // ship contacts: vertical top-down silhouettes, slowly drifting and pulsing
 for(const ship of ships){let sx=ship.x+Math.sin(animationClock*.00022+(ship.discovered?1:3))*13,sy=ship.y+Math.cos(animationClock*.00019+(ship.discovered?2:4))*10,p=screen(sx,sy);let w=Math.max(24,43*scale),h=w*(ship.discovered?3:2);ctx.save();ctx.globalAlpha=.95;if(ship.image.complete&&ship.image.naturalWidth){ctx.shadowBlur=24;ctx.shadowColor=ship.color;ctx.drawImage(ship.image,p.x-w/2,p.y-h/2,w,h);}else{ctx.fillStyle=ship.color;ctx.shadowBlur=18;ctx.shadowColor=ship.color;ctx.fillRect(p.x-w/2,p.y-h/2,w,h)}ctx.restore();ctx.font=`700 ${Math.max(8,10*scale)}px monospace`;ctx.textAlign='center';ctx.fillStyle=ship.discovered?'#ff9aa7':'#e7f8ff';ctx.fillText(ship.discovered?'DISCOVERED VESSEL':'UNKNOWN CONTACT',p.x,p.y-h/2-10);}
 // beam exchange during an incident
 if(beam&&incident){let a=screen(beam.from.x,beam.from.y),b=screen(beam.to.x,beam.to.y),pulse=.65+.35*Math.sin(animationClock*.018);ctx.save();ctx.globalAlpha=pulse;ctx.lineCap='round';ctx.shadowBlur=28;ctx.shadowColor='#ff4e75';ctx.strokeStyle='#ff315f';ctx.lineWidth=Math.max(2,4*scale);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.shadowBlur=10;ctx.strokeStyle='#fff4f7';ctx.lineWidth=Math.max(1,1.5*scale);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();}
 // incident radius
 if(incident){for(const d of incident.pair){let p=screen(d.x,d.y);ctx.beginPath();ctx.arc(p.x,p.y,100*scale,0,Math.PI*2);ctx.strokeStyle='#48a8ff';ctx.lineWidth=2;ctx.shadowBlur=25;ctx.shadowColor='#168dff';ctx.stroke();ctx.shadowBlur=0;ctx.beginPath();ctx.arc(p.x,p.y,75*scale,0,Math.PI*2);ctx.strokeStyle='#75caff66';ctx.setLineDash([4,8]);ctx.stroke();ctx.setLineDash([])}}
 $('#coords').textContent=`X ${Math.round(cam.x).toString().padStart(4,'0')} · Y ${Math.round(cam.y).toString().padStart(4,'0')}`;$('#zoom-label').textContent=scale.toFixed(2)+'×';
}
function moveTo(x,y,targetScale=1.2){const start={...cam},ss=scale,st=performance.now(),dur=1100;function step(now){let t=Math.min(1,(now-st)/dur),e=1-Math.pow(1-t,4);cam.x=start.x+(x-start.x)*e;cam.y=start.y+(y-start.y)*e;scale=ss+(targetScale-ss)*e;draw();if(t<1)requestAnimationFrame(step);else if(targetScale>0.8){} }requestAnimationFrame(step)}
function notify(s){let t=$('#toast');t.textContent=s;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2500)}
function openProfile(d){$('#profile').classList.remove('ship-mode');activeShip=null;$('#tower').classList.add('hidden');$('#profile').classList.remove('hidden');$('#profile-name').textContent=d.name;$('#profile-title').textContent=d.title||'Uncharted node';$('#profile-type').textContent=d.discovered?'DISCOVERED FAMILY':'UNDISCOVERED FAMILY';
 $('#profile-lore').textContent=d.discovered&&d.showLore?d.lore:'This family’s lore is private.';$('#profile-banner').style.backgroundImage=d.bannerUri?`url("${d.bannerUri}")`:`linear-gradient(120deg,${d.color},#121b44,#9d57c8)`;
 $('#profile-badge').src=d.badgeUri||'';$('#profile-badge').style.visibility=d.badgeUri?'visible':'hidden';
 $('#profile-avatar').src=d.profileUri||d.badgeUri||'';$('#profile-avatar').style.visibility=(d.profileUri||d.badgeUri)?'visible':'hidden';
 if(d.backgroundUri)$('#profile').style.backgroundImage=`linear-gradient(#0a0d22df,#0a0d22f2),url("${d.backgroundUri}")`;else $('#profile').style.backgroundImage='';
 const stat=(v,l)=>`<div class="stat"><b>${v}</b><small>${l}</small></div>`;
 if(d.discovered){$('#profile-stats').innerHTML=stat(d.showMembers?d.members.toLocaleString():'PRIVATE','MEMBERS')+stat(d.showEliminations?d.eliminations:'PRIVATE','ELIMINATIONS')+stat(d.elevations,'ELEVATIONS');$('#private-note').textContent='PUBLIC ARCHIVE // Family information is available.'}
 else{$('#profile-stats').innerHTML=stat('PRIVATE','MEMBERS')+stat('PRIVATE','ELIMINATIONS')+stat('PRIVATE','ELEVATIONS');$('#private-note').textContent='The family you’re viewing wasn’t discovered by your family. Members, eliminations, elevations and lore are private. Distance is public.'}
 $('#profile-meta').textContent=`${d.daysAway.toLocaleString()} DAYS AWAY  ·  ${d.group||'UNMAPPED SECTOR'}  ·  NODE ${d.id.toUpperCase()}`;
}
function openShip(ship){activeShip=ship;$('#profile').classList.add('ship-mode');activeTower=null;$('#tower').classList.add('hidden');$('#profile').classList.remove('hidden');$('#profile').style.backgroundImage='';$('#profile-banner').style.backgroundImage=`linear-gradient(120deg,#07101f66,#0a0d22dd),url('${ship.discovered?'assets/discovered-raider.png':'assets/unknown-ship.png'}')`;$('#profile-banner').style.backgroundSize='cover';$('#profile-banner').style.backgroundPosition='center 42%';$('#profile-avatar').src=ship.discovered?'assets/discovered-raider.png':'assets/unknown-ship.png';$('#profile-avatar').style.visibility='visible';$('#profile-badge').style.visibility='hidden';$('#profile-name').textContent=ship.name;$('#profile-title').textContent=ship.title;$('#profile-type').textContent=ship.discovered?'VESSEL IDENTIFIED // TRANSPONDER VERIFIED':'UNKNOWN CONTACT // CLASSIFICATION PENDING';$('#profile-lore').textContent=ship.lore;const stat=(v,l)=>`<div class="stat"><b>${v}</b><small>${l}</small></div>`;$('#profile-stats').innerHTML=stat(ship.discovered?'CONFIRMED':'UNKNOWN','IDENTITY')+stat(ship.discovered?'ACTIVE':'UNVERIFIED','SIGNAL')+stat('ARMED','COMBAT');$('#profile-meta').textContent=`VESSEL ID ${ship.id.toUpperCase()} · SECTOR ${ship.x}, ${ship.y} · ${ship.status}`;$('#private-note').textContent=ship.discovered?'DISCOVERY ARCHIVE // Vessel is mapped. Combat response and signal activity are enabled.':'UNRESOLVED CONTACT // Vessel remains undiscovered. Its profile will update if its signal is identified.';}
function openTower(t){activeShip=null;$('#profile').classList.remove('ship-mode');$('#profile').classList.add('hidden');$('#tower').classList.remove('hidden');activeTower=t;$('#tower-id').textContent=t.serverId;updateTower()}
function updateTower(){if(!activeTower)return;let heat=activeTower.baseHeat+Math.round(Math.random()*22-11),connections=activeTower.baseConnections+Math.round(Math.random()*70-35);heat=Math.max(5,Math.min(99,heat));$('#heat-value').textContent=heat+'%';$('#heat-bar').style.width=heat+'%';$('#tower-stats').innerHTML=`<div class="stat"><b>${Math.max(0,connections).toLocaleString()}</b><small>CONNECTIONS</small></div><div class="stat"><b>${Math.round(heat*1.3)}ms</b><small>LATENCY</small></div><div class="stat"><b>${Math.round(100-heat/5)}%</b><small>UPTIME</small></div>`;let reset=Math.random()<.1;$('#tower-status').textContent=reset?'TOWER UPDATINGA':(Math.random()<.2?'ON ACTIVE':'ACTIVE / STREAMING');$('#tower-log').textContent=reset?'Reinitializing relay stack... restoring encrypted channels...':`[${new Date().toLocaleTimeString()}] ${connections} active routes · packets flowing · ${heat}% thermal load`;let pts=[];for(let i=0;i<=50;i++){let x=i*10,y=80-Math.random()*Math.random()*75;pts.push(`${i?'L':'M'}${x},${y}`)}$('#spike-chart').innerHTML=`<path d="${pts.join(' ')}" fill="none" stroke="#ff9b65" stroke-width="2"/><path d="${pts.join(' ')} L500,100 L0,100 Z" fill="#ff875522"/>`}
setInterval(()=>{if(activeTower&&!$('#tower').classList.contains('hidden'))updateTower()},2200);
function locate(raw,fromWelcome=false){
 const q=String(raw||'').trim().toLowerCase().replace(/^@/,'');
 if(!q){if(fromWelcome)$('#origin-error').textContent='Enter a family name first.';else notify('Enter a family name first.');return}
 const normalize=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const nq=normalize(q);
 // Accept the displayed family name, its per-file ID, title, or a partial username.
 let matches=dots.filter(d=>[d.name,d.id,d.title].some(v=>normalize(v)===nq));
 if(!matches.length)matches=dots.filter(d=>[d.name,d.id,d.title].some(v=>normalize(v).includes(nq)));
 const d=matches[0];
 if(!d){
   const msg='Family not found. Try: '+dots.map(x=>x.name).join(', ');
   if(fromWelcome)$('#origin-error').textContent=msg;else notify('Family not found. Try a known family name.');
   return;
 }
 // Dismiss the entry screen immediately, then animate the map to the selected node.
 $('#welcome').classList.add('off');
 $('#origin-error').textContent='';
 $('#profile').classList.add('hidden');$('#tower').classList.add('hidden');
 $('#map-search').value='';
 moveTo(d.x,d.y,1.55);
 window.setTimeout(()=>{openProfile(d);draw();},1200);
}
$('#enter-map').onclick=()=>locate($('#origin-input').value,true);$('#origin-input').addEventListener('keydown',e=>{if(e.key==='Enter')locate(e.target.value,true)});
$('#search-btn').onclick=()=>locate($('#map-search').value);$('#map-search').addEventListener('keydown',e=>{if(e.key==='Enter')locate(e.target.value)});
$('#zoom-in').onclick=()=>{scale=Math.min(5,scale*1.25);draw()};$('#zoom-out').onclick=()=>{scale=Math.max(.12,scale/1.25);draw()};$('#recenter').onclick=()=>moveTo(0,0,.78);
canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y,moved:false};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging')});
canvas.addEventListener('pointermove',e=>{if(drag){let dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;cam.x=drag.cx-dx/scale;cam.y=drag.cy-dy/scale;draw()}});
canvas.addEventListener('pointerup',e=>{canvas.classList.remove('dragging');if(!drag)return;if(!drag.moved){let p=world(e.clientX,e.clientY),nearest=null,dist=Infinity;for(let d of dots){let dd=Math.hypot(d.x-p.x,d.y-p.y);if(dd<dist){dist=dd;nearest=d}}for(let sh of ships){let dd=Math.hypot(sh.x-p.x,sh.y-p.y);if(dd<dist){dist=dd;nearest=sh}}for(let t of towersData){let dd=Math.hypot(t.x-p.x,t.y-p.y);if(dd<dist){dist=dd;nearest=t}}
 if(dist<Math.max(32,25/scale)){if(nearest.serverId)openTower(nearest);else if(nearest.id&&nearest.id.includes('-'))openShip(nearest);else openProfile(nearest)}
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
function startIncident(){if(incident)return;let pair=[ships[Math.floor(Math.random()*ships.length)],dots[1+Math.floor(Math.random()*(dots.length-1))]];if(Math.random()<.28)pair[1]=ships[pair[0]===ships[0]?1:0];incident={pair};beam={from:pair[0],to:pair[1]};$('#alert-copy').textContent=`${pair[0].name} and ${pair[1].name} have entered a hostile encounter. Signal distance: ${Math.round(Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y)).toLocaleString()} map units. Vessel weapons are responding. View the live engagement?` ;$('#alert').classList.remove('hidden');try{audio.currentTime=0;audio.play().catch(()=>{})}catch{}}
$('#alert-yes').onclick=()=>{if(!incident)return;$('#alert').classList.add('hidden');$('#warbar').classList.remove('hidden');$('#war-caption').textContent=`${incident.pair[0].name} × ${incident.pair[1].name} · RAID IN PROGRESS`;let x=(incident.pair[0].x+incident.pair[1].x)/2,y=(incident.pair[0].y+incident.pair[1].y)/2;moveTo(x,y,.72);draw()};
function endIncident(){$('#alert').classList.add('hidden');$('#warbar').classList.add('hidden');incident=null;beam=null;draw();notify('Incident view closed.')}
$('#alert-no').onclick=endIncident;$('#exit-war').onclick=endIncident;$('#alert-now').onclick=startIncident;
setInterval(()=>{if(!incident&&Math.random()<.22)startIncident()},26000);
addEventListener('keydown',e=>{if(e.key==='Escape'){endIncident();$('#profile').classList.add('hidden');$('#tower').classList.add('hidden');$('#help-panel').classList.add('hidden')}});
resize();draw();
function animate(ts){animationClock=ts;draw();requestAnimationFrame(animate)}requestAnimationFrame(animate);
