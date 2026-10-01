import * as THREE from "three";
import "../space3d.css";

type ShipId = "viper" | "nova" | "titan";
type EnemyKind = "fighter" | "swarmer" | "tank" | "elite" | "shielded" | "boss";
type Save = { mission:number; credits:number; xp:number; level:number; hull:number; weapon:number; shield:number; selected:ShipId; unlocked:ShipId[]; secrets:number[] };
const KEY = "interstella-v3-save";
const DEFAULT_SAVE: Save = {mission:1,credits:0,xp:0,level:1,hull:0,weapon:0,shield:0,selected:"viper",unlocked:["viper"],secrets:[]};
const SHIPS: Record<ShipId,{speed:number;hull:number;damage:number;color:number;cooldown:number;label:string;desc:string}> = {
  viper:{speed:24,hull:90,damage:18,color:0x42dcff,cooldown:.16,label:"VIPER // INTERCEPTOR",desc:"Fast, precise and built for aggressive runs."},
  nova:{speed:19,hull:120,damage:25,color:0xb875ff,cooldown:.22,label:"NOVA // STRIKE CRAFT",desc:"Balanced armour and high-output plasma."},
  titan:{speed:13,hull:190,damage:38,color:0xffa640,cooldown:.34,label:"TITAN // HEAVY CLASS",desc:"A heavily armoured ship with devastating shots."}
};
let save = loadSave();
let running=false, paused=false, time=0, score=0, combo=0, comboTimer=0, hp=SHIPS[save.selected].hull+save.hull*10, ability=0, fireHeld=false, shotClock=0, last=performance.now();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x01030a);
scene.fog = new THREE.FogExp2(0x01030a,.006);
const camera = new THREE.PerspectiveCamera(64,innerWidth/innerHeight,.1,1800);
camera.position.set(0,5,20);
camera.lookAt(0,0,-65);
let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({antialias:false,powerPreference:"high-performance",alpha:false});
} catch (error) {
  throw new Error("WebGL could not initialize. Try a current Chrome browser with hardware acceleration enabled. " + String(error));
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.domElement.id="interstella3d";
renderer.domElement.setAttribute("aria-label","Interstella 3D space combat scene");
document.body.appendChild(renderer.domElement);
const world = new THREE.Group(); scene.add(world);
const player = new THREE.Group(); scene.add(player); player.position.set(0,-2,5);
const enemies: THREE.Group[] = [];
const bullets: THREE.Mesh[] = [];
const enemyBullets: THREE.Mesh[] = [];
const asteroids: THREE.Mesh[] = [];
const particles: THREE.Mesh[] = [];
const input = {x:0,y:0};
let menu!: HTMLElement, hud!: HTMLElement, abilityEl!: HTMLElement, toast!: HTMLElement, chosenMission = save.mission;

function loadSave(): Save {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {...DEFAULT_SAVE,...parsed,unlocked:Array.isArray(parsed.unlocked)?parsed.unlocked:["viper"],secrets:Array.isArray(parsed.secrets)?parsed.secrets:[]};
  } catch { return {...DEFAULT_SAVE,unlocked:["viper"],secrets:[]}; }
}
function persist(){ try {localStorage.setItem(KEY,JSON.stringify(save));} catch {} }
function material(color:number,emissive=0){return new THREE.MeshStandardMaterial({color,metalness:.55,roughness:.32,emissive,emissiveIntensity:.7});}
function meshShip(color:number,scale=1){
  const g=new THREE.Group();
  const hullMat=material(color,color), darkMat=material(0x10182b), glassMat=material(0xc7fbff,0x1d9db5), glowMat=new THREE.MeshBasicMaterial({color});
  const body=new THREE.Mesh(new THREE.ConeGeometry(.85*scale,3.9*scale,6),hullMat);
  body.rotation.x=-Math.PI/2; body.position.z=-.15*scale; g.add(body);
  const wingShape=new THREE.Shape();
  wingShape.moveTo(-.35*scale,.45*scale); wingShape.lineTo(-2.7*scale,-.45*scale); wingShape.lineTo(-1.2*scale,-.6*scale); wingShape.lineTo(-.35*scale,-.25*scale);
  wingShape.lineTo(.35*scale,-.25*scale); wingShape.lineTo(1.2*scale,-.6*scale); wingShape.lineTo(2.7*scale,-.45*scale); wingShape.lineTo(.35*scale,.45*scale); wingShape.closePath();
  const wings=new THREE.Mesh(new THREE.ShapeGeometry(wingShape),hullMat); wings.position.z=.55*scale; g.add(wings);
  const cockpit=new THREE.Mesh(new THREE.SphereGeometry(.37*scale,8,6),glassMat); cockpit.scale.set(.8,1.1,1.65); cockpit.position.set(0,.35*scale,-.7*scale); g.add(cockpit);
  for(const side of [-1,1]){
    const pod=new THREE.Mesh(new THREE.BoxGeometry(.32*scale,.28*scale,1.35*scale),darkMat);pod.position.set(side*1.25*scale,-.08*scale,.2*scale);g.add(pod);
    const engine=new THREE.Mesh(new THREE.CylinderGeometry(.17*scale,.22*scale,.28*scale,8),glowMat);engine.rotation.x=Math.PI/2;engine.position.set(side*1.25*scale,-.08*scale,.92*scale);g.add(engine);
    const fin=new THREE.Mesh(new THREE.BoxGeometry(.11*scale,.48*scale,.7*scale),hullMat);fin.position.set(side*1.7*scale,.08*scale,.38*scale);fin.rotation.z=side*.16;g.add(fin);
  }
  const spine=new THREE.Mesh(new THREE.BoxGeometry(.13*scale,.12*scale,1.6*scale),glassMat);spine.position.set(0,.3*scale,.35*scale);g.add(spine);
  const exhaust=new THREE.Mesh(new THREE.ConeGeometry(.24*scale,.95*scale,6),new THREE.MeshBasicMaterial({color:0x39dfff,transparent:true,opacity:.72}));exhaust.rotation.x=Math.PI/2;exhaust.position.z=1.15*scale;g.add(exhaust);
  return g;
}
function clearGroup(arr: THREE.Object3D[]){for(const o of arr)world.remove(o);arr.length=0;}
function addStars(){
  const geo=new THREE.BufferGeometry(), positions=new Float32Array(9000);
  for(let i=0;i<positions.length;i+=3){positions[i]=(Math.random()-.5)*800;positions[i+1]=(Math.random()-.5)*460;positions[i+2]=-Math.random()*1500;}
  geo.setAttribute("position",new THREE.BufferAttribute(positions,3));
  scene.add(new THREE.Points(geo,new THREE.PointsMaterial({color:0xd8f2ff,size:1.2,sizeAttenuation:true})));
  const planet=new THREE.Mesh(new THREE.IcosahedronGeometry(24,2),new THREE.MeshBasicMaterial({color:0x1a2550,wireframe:true,transparent:true,opacity:.24}));
  planet.position.set(34,25,-185);scene.add(planet);
}
function makeAsteroids(){for(let i=0;i<42;i++){const a=new THREE.Mesh(new THREE.IcosahedronGeometry(1.5+Math.random()*4,1),new THREE.MeshBasicMaterial({color:0x655b72,wireframe:true,transparent:true,opacity:.65}));a.position.set((Math.random()-.5)*180,(Math.random()-.5)*80,-40-Math.random()*800);a.userData.v=12+Math.random()*22;world.add(a);asteroids.push(a);}}
function spawnEnemy(kind:EnemyKind,x:number,z=-100){
  const colors:Record<EnemyKind,number>={fighter:0xff596f,swarmer:0xffb43b,tank:0x9b6cff,elite:0x55f2c4,shielded:0x53c9ff,boss:0xff315f};
  const g=meshShip(colors[kind],kind==="boss"?3.1:kind==="tank"?1.6:kind==="elite"?1.2:.82);
  g.position.set(x,(Math.random()-.5)*7,z);g.rotation.y=Math.PI;
  const max=kind==="boss"?1500:kind==="tank"?180:kind==="elite"?100:kind==="shielded"?80:45;
  g.userData={kind,hp:max,max,cool:Math.random()+.4,shield:kind==="shielded"?70:0,phase:1};
  world.add(g);enemies.push(g);return g;
}
function burst(pos:THREE.Vector3,color=0xffc85c,n=12){for(let i=0;i<n;i++){const p=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.12),new THREE.MeshBasicMaterial({color}));p.position.copy(pos);p.userData={life:.45+Math.random()*.65,v:new THREE.Vector3((Math.random()-.5)*18,(Math.random()-.5)*18,(Math.random()-.5)*18)};world.add(p);particles.push(p);}}
function enemyFire(e:THREE.Group){const b=new THREE.Mesh(new THREE.SphereGeometry(e.userData.kind==="boss"?.28:.13,6,6),new THREE.MeshBasicMaterial({color:0xff547c}));b.position.copy(e.position);const v=player.position.clone().sub(e.position).normalize().multiplyScalar(e.userData.kind==="boss"?20:15);b.userData={v,life:7};world.add(b);enemyBullets.push(b);}
function shoot(){
  if(!running||paused)return;
  const s=SHIPS[save.selected];if(time-shotClock<s.cooldown)return;shotClock=time;
  const b=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,1.3),new THREE.MeshBasicMaterial({color:0x7cecff}));
  b.position.copy(player.position);b.position.y+=.25;b.userData={v:-85,damage:s.damage+save.weapon*7,life:4};world.add(b);bullets.push(b);
}
function destroyEnemy(i:number){
  const e=enemies[i];burst(e.position,e.userData.kind==="boss"?0xff3d8d:0xff9e52,e.userData.kind==="boss"?70:18);
  score+=e.userData.kind==="boss"?5000:100;combo++;comboTimer=2.5;save.credits+=e.userData.kind==="boss"?1200:15;save.xp+=e.userData.kind==="boss"?900:35;
  world.remove(e);enemies.splice(i,1);if(save.xp>=save.level*1000){save.level++;save.xp=0;}persist();
}
function damage(n:number){hp-=Math.max(1,n-save.shield*2);burst(player.position,0xff426f,6);if(hp<=0){running=false;showMenu("MISSION FAILED","Your ship was disabled. Upgrade your loadout and try again.","MISSIONS");}}
function complete(){
  running=false;save.credits+=300;save.xp+=250;
  if(chosenMission>=save.mission)save.mission=Math.min(30,chosenMission+1);
  if(save.mission>=11&&!save.unlocked.includes("nova"))save.unlocked.push("nova");
  if(save.mission>=21&&!save.unlocked.includes("titan"))save.unlocked.push("titan");
  persist();burst(player.position,0x59eaff,35);
  showMenu(chosenMission===30?"CAMPAIGN COMPLETE":"MISSION COMPLETE","Score "+score+"  •  +300 CREDITS  •  LEVEL "+save.level,"MISSIONS");
}
function launch(){
  running=true;paused=false;time=0;score=0;combo=0;comboTimer=0;shotClock=-1;hp=SHIPS[save.selected].hull+save.hull*10;ability=0;
  clearGroup(enemies);clearGroup(bullets);clearGroup(enemyBullets);clearGroup(particles);
  for(let i=0;i<8+Math.min(chosenMission,22);i++)spawnEnemy(i%5===0?"elite":i%3===0?"swarmer":"fighter",(Math.random()-.5)*32,-85-i*27);
  if(chosenMission%5===0||chosenMission===30)spawnEnemy(chosenMission===30?"boss":"tank",0,-330);
  menu.classList.add("hidden");toastMessage("MISSION "+String(chosenMission).padStart(2,"0")+" // SYSTEMS ONLINE");
}
function showMenu(title:string,desc:string,tab="HANGAR"){menu.classList.remove("hidden");running=false;paused=false;renderTab(tab);toastMessage(title+" // "+desc);}
function toastMessage(message:string){toast.textContent=message;toast.classList.add("show");window.setTimeout(()=>toast.classList.remove("show"),1800);}
function selectShip(id:ShipId){
  if(!save.unlocked.includes(id)){toastMessage("SHIP LOCKED // COMPLETE MORE MISSIONS");return;}
  save.selected=id;player.clear();player.add(meshShip(SHIPS[id].color));persist();renderTab("HANGAR");
}
function buyUpgrade(which:"weapon"|"hull"|"shield"){
  const cost=250+save[which]*250;if(save.credits<cost){toastMessage("INSUFFICIENT CREDITS // NEED "+cost);return;}
  save.credits-=cost;save[which]++;persist();renderTab("HANGAR");toastMessage("UPGRADE INSTALLED");
}
function renderHangar(){
  const s=SHIPS[save.selected];
  const shipButtons=(["viper","nova","titan"] as ShipId[]).map(id=>'<button data-ship="'+id+'" class="'+(save.selected===id?"selected ":"")+(save.unlocked.includes(id)?"":"locked")+'">'+id.toUpperCase()+(save.unlocked.includes(id)?"":" 🔒")+'</button>').join("");
  return '<div class="menu-main"><div class="hero-copy"><div class="eyebrow">01 / FLIGHT DECK // '+String(save.mission).padStart(2,"0")+' OF 30</div><h1 class="hero-title">OWN THE <span class="gradient">UNKNOWN.</span></h1><p class="intro">Command a next-generation starfighter, explore uncharted sectors, and uncover what happened to the missing fleet. Your mission is only the beginning.</p><div class="stats-row"><div class="stat-pill">PILOT LEVEL <b>'+save.level+'</b></div><div class="stat-pill">CREDITS <b>'+save.credits.toLocaleString()+'</b></div><div class="stat-pill">CAMPAIGN <b>'+Math.round((save.mission-1)/30*100)+'%</b></div></div><div class="core-art"><div class="core-ring"></div><div class="core-ring r2"></div><div class="core-ring r3"></div><div class="core-center"></div></div></div><aside class="side-panel"><div class="panel-head"><h2>ACTIVE STARFIGHTER</h2><span class="mini-label">HANGAR 01</span></div><div class="ship-preview"><div class="ship-symbol">✦</div></div><div class="ship-list">'+shipButtons+'</div><p class="section-sub">'+s.desc+'</p><div class="stat-lines"><span>HULL INTEGRITY</span><b>'+Math.min(100,s.hull+save.hull*10)+'%</b><span>WEAPON OUTPUT</span><b>'+(s.damage+save.weapon*7)+'</b><span>SHIELD SYSTEM</span><b>LV '+save.shield+'</b></div><div class="meter"><i style="width:'+Math.min(100,s.hull/2+save.hull*4)+'%"></i></div><div class="panel-actions"><button data-upgrade="weapon">WEAPON · '+(250+save.weapon*250)+' CR</button><button data-upgrade="hull">HULL · '+(250+save.hull*250)+' CR</button><button data-upgrade="shield">SHIELD · '+(250+save.shield*250)+' CR</button></div><button class="primary wide" data-launch>LAUNCH MISSION <span>→</span></button></aside></div>';
}
function renderGalaxy(){
  const nodes=[{x:12,y:72,n:"SOL",m:1},{x:25,y:54,n:"VEGA",m:4},{x:42,y:67,n:"LYRA",m:8},{x:52,y:35,n:"ORION",m:12},{x:68,y:48,n:"NOVA",m:16},{x:79,y:24,n:"ECLIPSE",m:20},{x:89,y:63,n:"ZERO",m:30}];
  const lines='<svg class="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="12,72 25,54 42,67 52,35 68,48 79,24 89,63" fill="none" stroke="#00f5ff" stroke-width=".35" stroke-dasharray="2 1"/></svg>';
  const markers=nodes.map(n=>'<button class="map-node '+(save.mission>=n.m?"":"locked")+' '+(save.mission>=n.m&&chosenMission===n.m?"current":"")+'" data-galaxy-mission="'+n.m+'" style="left:'+n.x+'%;top:'+n.y+'%" title="'+n.n+'"></button><span class="map-label" style="left:calc('+n.x+'% - 7px);top:calc('+n.y+'% + 17px)">'+n.n+'</span>').join("");
  return '<div class="menu-main"><div class="hero-copy"><div class="eyebrow">02 / DEEP SPACE CARTOGRAPHY</div><h1 class="hero-title">THE GALAXY IS <span class="gradient">NOT EMPTY.</span></h1><p class="intro">Charted routes are only the beginning. Strange signals are appearing beyond the frontier, and some coordinates were removed from the official records.</p><div class="stats-row"><div class="stat-pill">KNOWN SECTORS <b>07</b></div><div class="stat-pill">SIGNAL ANOMALIES <b>06</b></div></div><div class="panel-actions"><button data-tab="MISSIONS">OPEN MISSION FILES</button></div></div><aside class="side-panel"><div class="panel-head"><h2>SECTOR MAP</h2><span class="mini-label">NAV / '+save.mission+'/30</span></div><div class="galaxy-map">'+lines+markers+'</div><p class="section-sub">Select a glowing node to inspect its mission. Locked sectors become available as you progress.</p></aside></div>';
}
function renderMissions(){
  const names=["FIRST LIGHT","DEBRIS FIELD","SIGNAL LOST","DARK CURRENT","THE WARDEN","COLD ORBIT","GHOST FREQUENCY","NOT ON THE MAP","BROKEN BEACON","PHANTOM MOON","REDLINE","SILENT RUN","BLACK BOX","FALSE HORIZON","THE ECHO","THEY AREN'T ATTACKING","LOST ARMADA","DEEP SCAN","DARK MATTER","ECLIPSE RUN","RED GIANT","NO RETURN","THE ARCHIVE","DO NOT FOLLOW THE LIGHT","ZERO SIGNAL","DREADNOUGHT","LAST TRANSMISSION","THE VEIL","HOMEWARD","ZERO HOUR"];
  const cards=names.map((name,i)=>{const n=i+1,locked=n>save.mission;return '<article class="mission-card '+(chosenMission===n?"selected ":"")+(locked?"locked":"")+'"><small>OPERATION '+String(n).padStart(2,"0")+'</small><h3>'+name+'</h3><p>'+(n%5===0?"Heavy contact detected. Boss-class threat expected.":n>=8?"Long-range anomaly detected. Investigate and survive.":"Clear hostiles and secure the route.")+'</p><button data-select-mission="'+n+'" '+(locked?'disabled':'')+'>'+(locked?"CLASSIFIED":chosenMission===n?"SELECTED":"SELECT OPERATION")+'</button></article>';}).join("");
  const secrets=[{n:1,t:"VOID RIFT",at:5},{n:2,t:"PHANTOM MOON",at:10},{n:3,t:"ECLIPSE RUN",at:15},{n:4,t:"LOST ARMADA",at:20},{n:5,t:"RED GIANT",at:25},{n:6,t:"ZERO HOUR",at:30}];
  const secretCards=secrets.map(s=>'<article class="mission-card '+(save.mission<=s.at?"locked":"")+'"><small>UNLISTED SIGNAL // '+String(s.n).padStart(2,"0")+'</small><h3>'+(save.mission>s.at?s.t:"SIGNAL OBSCURED")+'</h3><p>'+(save.mission>s.at?"A hidden route has appeared in the navigation system.":"Clear campaign operation "+s.at+" to reveal this coordinate.")+'</p><small>'+(save.mission>s.at?"SECRET ROUTE AVAILABLE":"ENCRYPTED")+'</small></article>').join("");
  return '<div class="menu-main" style="display:block"><div class="eyebrow">03 / OPERATIONS CONTROL</div><h1 class="section-heading">MISSION <span class="gradient">SELECT</span></h1><p class="section-sub">Campaign progress: '+(save.mission-1)+' / 30 cleared · Selected operation: '+chosenMission+'</p><div class="cards">'+cards+'</div><div class="eyebrow" style="margin-top:30px">CLASSIFIED / UNLISTED SIGNALS</div><div class="cards">'+secretCards+'</div><div class="panel-actions"><button class="primary" data-launch>LAUNCH OPERATION '+String(chosenMission).padStart(2,"0")+' →</button></div></div>';
}
function renderTab(tab:string){
  menu.querySelectorAll<HTMLButtonElement>(".nav-tabs [data-tab]").forEach(el=>el.classList.toggle("active",el.dataset.tab===tab));
  const area=menu.querySelector("#menu-content") as HTMLElement;
  area.innerHTML=tab==="HANGAR"?renderHangar():tab==="GALAXY"?renderGalaxy():renderMissions();
  area.querySelectorAll<HTMLButtonElement>("[data-ship]").forEach(b=>b.onclick=()=>selectShip(b.dataset.ship as ShipId));
  area.querySelectorAll<HTMLButtonElement>("[data-upgrade]").forEach(b=>b.onclick=()=>buyUpgrade(b.dataset.upgrade as "weapon"|"hull"|"shield"));
  area.querySelectorAll<HTMLButtonElement>("[data-launch]").forEach(b=>b.onclick=()=>launch());
  area.querySelectorAll<HTMLButtonElement>("[data-select-mission]").forEach(b=>b.onclick=()=>{const n=Number(b.dataset.selectMission);if(n<=save.mission){chosenMission=n;renderTab("MISSIONS");toastMessage("OPERATION "+String(n).padStart(2,"0")+" SELECTED");}});
  area.querySelectorAll<HTMLButtonElement>("[data-galaxy-mission]").forEach(b=>b.onclick=()=>{const n=Number(b.dataset.galaxyMission);if(n<=save.mission){chosenMission=n;renderTab("GALAXY");toastMessage("NAV LOCKED // OPERATION "+n);}});
}
function buildUI(){
  menu=document.createElement("section");menu.id="menu";
  menu.innerHTML='<div class="menu-shell"><header class="topbar"><div class="logo">INTER<span>STELLA</span></div><div class="status-chip">● SYSTEM ONLINE / PILOT '+save.level+'</div><nav class="nav-tabs"><button data-tab="HANGAR" class="active">HANGAR</button><button data-tab="GALAXY">GALAXY MAP</button><button data-tab="MISSIONS">MISSIONS</button></nav></header><div class="content-area" id="menu-content"></div><footer class="mini-label" style="display:flex;justify-content:space-between;gap:12px;padding:8px 2px 2px"><span>INTERSTELLA // DEEP SPACE INITIATIVE</span><span>FIGHT · EXPLORE · UNCOVER</span></footer></div>';
  document.body.appendChild(menu);
  menu.querySelectorAll<HTMLButtonElement>(".nav-tabs [data-tab]").forEach(b=>b.onclick=()=>renderTab(b.dataset.tab||"HANGAR"));
  hud=document.createElement("div");hud.id="hud3d";document.body.appendChild(hud);
  abilityEl=document.createElement("div");abilityEl.id="ability";document.body.appendChild(abilityEl);
  toast=document.createElement("div");toast.id="toast";document.body.appendChild(toast);
  renderTab("HANGAR");
}
function update(dt:number){
  if(!running||paused)return;
  time+=dt;const s=SHIPS[save.selected];
  player.position.x=THREE.MathUtils.clamp(player.position.x+input.x*s.speed*dt,-28,28);
  player.position.y=THREE.MathUtils.clamp(player.position.y+input.y*s.speed*dt,-11,9);
  player.rotation.z+=(input.x*.22-player.rotation.z)*.15;
  ability=Math.max(0,ability-dt);if(fireHeld)shoot();
  for(const a of asteroids){a.position.z+=a.userData.v*dt;if(a.position.z>30)a.position.z=-750-Math.random()*300;if(a.position.distanceTo(player.position)<2.7)damage(10);}
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i],k=e.userData.kind;e.position.z+=dt*(k==="swarmer"?11:k==="boss"?5:7);
    if(k==="fighter"||k==="elite")e.position.x+=Math.sin(time*2+e.id)*dt*5;
    if(k==="boss"){e.userData.phase=e.userData.hp<1000?2:1;e.position.x=Math.sin(time*.65)*18;if(e.userData.phase===2)e.rotation.z=Math.sin(time*2)*.2;}
    e.userData.cool-=dt;if(e.userData.cool<=0){enemyFire(e);e.userData.cool=k==="boss"?.55:1.3+Math.random()*1.5;}
    if(e.userData.shield>0)e.userData.shield=Math.min(70,e.userData.shield+dt*3);
    if(e.position.z>18){damage(k==="boss"?30:8);world.remove(e);enemies.splice(i,1);}
  }
  for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.position.z+=b.userData.v*dt;b.userData.life-=dt;let hit=false;
    for(let j=enemies.length-1;j>=0;j--){const e=enemies[j];if(b.position.distanceTo(e.position)<(e.userData.kind==="boss"?8:2.2)){let d=b.userData.damage;if(e.userData.shield>0){const a=Math.min(e.userData.shield,d);e.userData.shield-=a;d-=a;}e.userData.hp-=d;burst(b.position,d>30?0xfff06a:0x62eaff,4);hit=true;if(e.userData.hp<=0)destroyEnemy(j);break;}}
    if(hit||b.userData.life<=0){world.remove(b);bullets.splice(i,1);}
  }
  for(let i=enemyBullets.length-1;i>=0;i--){const b=enemyBullets[i];b.position.addScaledVector(b.userData.v,dt);b.userData.life-=dt;if(b.position.distanceTo(player.position)<1.8){damage(12);world.remove(b);enemyBullets.splice(i,1);}else if(b.userData.life<=0){world.remove(b);enemyBullets.splice(i,1);}}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.position.addScaledVector(p.userData.v,dt);p.userData.life-=dt;if(p.userData.life<=0){world.remove(p);particles.splice(i,1);}}
  if(comboTimer>0)comboTimer-=dt;else combo=0;
  if(enemies.length===0)complete();
  hud.textContent="MISSION "+String(chosenMission).padStart(2,"0")+"  •  SCORE "+score+"  •  COMBO x"+combo+"  •  HULL "+Math.max(0,Math.ceil(hp));
  abilityEl.textContent=ability<=0?"E / ABILITY READY":"ABILITY "+Math.ceil(ability)+"s";
}
function loop(now:number){requestAnimationFrame(loop);const dt=Math.min(.033,(now-last)/1000||.016);last=now;update(dt);renderer.render(scene,camera);}
function moveInput(e:PointerEvent){input.x=THREE.MathUtils.clamp((e.clientX-innerWidth/2)/(innerWidth/2),-1,1);input.y=THREE.MathUtils.clamp(-(e.clientY-innerHeight/2)/(innerHeight/2),-1,1);}
renderer.domElement.addEventListener("pointermove",e=>{if(e.buttons)moveInput(e);});
renderer.domElement.addEventListener("pointerdown",e=>{if(running){fireHeld=true;moveInput(e);}});
window.addEventListener("pointerup",()=>{fireHeld=false;input.x=0;input.y=0;});
window.addEventListener("keydown",e=>{if(e.code==="Space"){fireHeld=true;e.preventDefault();}if(e.key.toLowerCase()==="e"&&ability<=0&&running){ability=save.selected==="viper"?1.2:save.selected==="nova"?8:12;burst(player.position,0x8ceeff,25);}if(e.key==="Escape"&&running){paused=!paused;toastMessage(paused?"SYSTEM PAUSED":"SYSTEM RESUMED");}});
window.addEventListener("keyup",e=>{if(e.code==="Space")fireHeld=false;});
window.addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
addStars();makeAsteroids();player.add(meshShip(SHIPS[save.selected].color));buildUI();requestAnimationFrame(loop);
