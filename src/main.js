import * as THREE from 'three';

// CRIME CITY GEORGIA — original, self-contained playable Three.js prototype.
const canvas = document.querySelector('#gameCanvas');
if (!canvas) throw new Error('Missing #gameCanvas in index.html');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe89542);
scene.fog = new THREE.Fog(0xe89542, 75, 230);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 400);
const clock = new THREE.Clock();
const world = new THREE.Group(); scene.add(world);
const hemi = new THREE.HemisphereLight(0xffe6c1, 0x383c31, 2.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffc477, 3.2); sun.position.set(-45, 70, 25); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -80; sun.shadow.camera.right = 80; sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80; scene.add(sun);

const ui = { cash: document.querySelector('#cashValue'), rank: document.querySelector('#rankValue'), wanted: document.querySelector('#wantedValue'), log: document.querySelector('#messageLog') };
const state = { money: 1200, police: false, patrol: false, inCar: false, inside: false, mission: 0, detained: false, wanted: 0, cooldown: 0 };
const keys = Object.create(null), held = new Set(), colliders = [];
let camYaw = 0, camPitch = 0.15, drag = null;
const player = { root: new THREE.Group(), velocity: new THREE.Vector3(), grounded: true, moving: false, phase: 0 };
const M = (color, roughness = 0.8, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...opts });
function mesh(parent, geometry, material, pos, cast = true) { const o = new THREE.Mesh(geometry, material); o.position.set(...pos); o.castShadow = cast; o.receiveShadow = true; parent.add(o); return o; }
function box(parent, size, material, pos, cast = true) { return mesh(parent, new THREE.BoxGeometry(...size), material, pos, cast); }
function message(text) { if (ui.log) ui.log.textContent = text; }
function hud() { if (ui.cash) ui.cash.textContent = `${state.money} ₾`; if (ui.rank) ui.rank.textContent = state.police ? 'პატრულ-ინსპექტორი' : 'მოქალაქე'; if (ui.wanted) ui.wanted.textContent = String(state.wanted); }

function labelTexture(text, color = '#163d67') { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0,0,512,128); x.strokeStyle = '#e9d596'; x.lineWidth = 6; x.strokeRect(5,5,502,118); x.fillStyle = 'white'; x.font = 'bold 42px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text,256,64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function sign(text,x,y,z,w=4,color='#183e66') { const s=mesh(world,new THREE.PlaneGeometry(w,1),new THREE.MeshBasicMaterial({map:labelTexture(text,color), side:THREE.DoubleSide}),[x,y,z],false); s.rotation.y=Math.PI; return s; }

// Sunset street, dashed lane markings, sidewalks, and cross street.
mesh(world,new THREE.PlaneGeometry(260,260),M(0x756449),[0,-0.12,0],false).rotation.x=-Math.PI/2;
box(world,[180,.12,18],M(0x292a2b),[0,0,0],false); box(world,[18,.12,180],M(0x292a2b),[0,0,0],false);
const stripe=M(0xe5cc8d,.7); for(let i=-9;i<=9;i++){box(world,[3,.025,.13],stripe,[i*8,.08,0],false);box(world,[.13,.025,3],stripe,[0,.08,i*8],false);}
for(const z of [-10,10])box(world,[180,.15,2.4],M(0xb09d7a),[0,.05,z],false);
for(const x of [-10,10])box(world,[2.4,.15,180],M(0xb09d7a),[x,.05,0],false);

function window(parent,x,y,z,w=1.2,h=1.3){box(parent,[w+.16,h+.16,.12],M(0x413b35),[x,y,z],false);box(parent,[w,h,.08],M(0x8db6bc,.25,{metalness:.2,emissive:0x101a1b}),[x,y,z+.08],false);box(parent,[.045,h,.1],M(0xd0b997),[x,y,z+.13],false);box(parent,[w,.045,.1],M(0xd0b997),[x,y,z+.13],false);}
function apartment(x,z,floors,color){const g=new THREE.Group();g.position.set(x,0,z);world.add(g);const w=13,d=10,h=floors*3.1;box(g,[w,h,d],M(color),[0,h/2,0]);box(g,[w+.4,.35,d+.4],M(0x4c453c),[0,h+.16,0]);for(let f=0;f<floors;f++)for(let c=-1;c<=1;c++){const xx=c*3.6,yy=1.9+f*3.1;window(g,xx,yy,d/2+.03,1.35,1.4);box(g,[2.2,.12,1],M(0x74624c),[xx,yy-.85,d/2+.48],false);for(let r=-2;r<=2;r++)box(g,[.045,.65,.045],M(0x353330,.4,{metalness:.5}),[xx+r*.38,yy-.48,d/2+.9],false);box(g,[2,.05,.05],M(0x353330),[xx,yy-.12,d/2+.9],false);}box(g,[1.3,2.2,.18],M(0x443020),[0,1.1,d/2+.08]);colliders.push({x,z,w,d});}
apartment(-23,-21,4,0xc0ad94);apartment(24,-22,5,0xc6b49b);apartment(-24,20,3,0xb7b9b1);apartment(24,20,4,0xbca88e);

function tree(x,z,palm=true){const g=new THREE.Group();world.add(g);const trunk=mesh(g,new THREE.CylinderGeometry(.22,.38,4,12),M(0x76513a),[0,2,0]);if(palm){for(let i=0;i<8;i++){const leaf=mesh(g,new THREE.ConeGeometry(.28,3.8,6),M(0x287446),[0,4,0]);leaf.rotation.z=Math.PI/2;leaf.rotation.y=i*Math.PI/4;}}else{mesh(g,new THREE.SphereGeometry(1.7,14,12),M(0x456b3d),[0,4.2,0]).scale.y=1.3;}g.position.set(x,0,z);}
for(let i=-4;i<=4;i++){tree(i*8,23,i%2===0);tree(i*8,-23,i%2!==0);}
for(const [x,z] of [[-13,12],[13,12],[-13,-12],[13,-12],[-38,0],[38,0]]){const p=mesh(world,new THREE.CylinderGeometry(.09,.13,5.4,10),M(0x444746,.4,{metalness:.55}),[x,2.7,z]);box(world,[1.2,.08,.08],M(0x444746),[x+.45,5.2,z]);const lamp=new THREE.PointLight(0xffd99a,.65,12);lamp.position.set(x+.8,5,z);world.add(lamp);}

// Station is visibly open-fronted so the walkable interior is always in the same world.
const station=new THREE.Group();world.add(station);const wall=M(0xc9c5b8), floor=M(0x77766e), wood=M(0x76513a);
box(station,[16,.25,18],floor,[0,.12,30],false);box(station,[16,5,.4],wall,[0,2.6,21],false);box(station,[16,5,.4],wall,[0,2.6,39],false);box(station,[.4,5,18],wall,[-8,2.6,30],false);box(station,[.4,5,18],wall,[8,2.6,30],false);box(station,[16,.25,18],M(0xa89e8d),[0,5.15,30],false);
sign('POLICIA • პოლიცია',0,4.15,20.72,6,'#123b63');
box(station,[5,1,1.4],wood,[-3.4,.75,27]);box(station,[5.2,.12,1.5],M(0x382a20),[-3.4,1.32,27]);box(station,[2,.9,.08],M(0x272d31),[3,.8,24.5]);
// Interview room divider and barred holding cell.
box(station,[.16,3.1,5],wall,[1.1,1.6,35.8],false);box(station,[.16,3.1,5],wall,[5.4,1.6,35.8],false);box(station,[4.4,.15,.16],wall,[3.25,3.1,33.3],false);for(let i=0;i<8;i++)box(station,[.07,2.7,.07],M(0x30363a,.4,{metalness:.6}),[1.6+i*.48,1.45,33.25],false);
box(station,[2.4,.65,1.3],M(0x6a8292),[-4.7,.48,35]);box(station,[2.5,.65,1.2],M(0x9a9b91),[3.2,.48,36.8]);const stationLight=new THREE.PointLight(0xffdfa9,1.1,18);stationLight.position.set(0,4.2,30);station.add(stationLight);

function shop(x,z,text,col){const g=new THREE.Group();g.position.set(x,0,z);world.add(g);box(g,[12,4,8],M(col),[0,2,0]);box(g,[12.2,.3,8.2],M(0x51483c),[0,4.15,0]);for(const xx of [-4,0,4])window(g,xx,2.3,4.05,2.4,1.5);box(g,[1.2,2,.2],M(0x4e382a),[0,1,4.1]);sign(text,x,3.65,z+4.18,5,'#824322');colliders.push({x,z,w:12,d:8});}
shop(24,0,'მარკეტი',0xd3c2a7);shop(-24,0,'თბილისი • კაფე',0xb7a58d);

function character(police=false,skin=0xd6a27d,clothes=0xd6d0c4){const g=new THREE.Group(), torso=mesh(g,new THREE.CapsuleGeometry(.37,.84,8,16),M(clothes),[0,1.45,0]);const head=mesh(g,new THREE.SphereGeometry(.31,24,20),M(skin),[0,2.4,0]);head.scale.set(.9,1.1,.92);mesh(g,new THREE.SphereGeometry(.33,18,14),M(0x241a15),[0,2.6,-.035]).scale.set(1,.55,.95);for(const ex of [-.1,.1])mesh(g,new THREE.SphereGeometry(.027,8,8),M(0x211c18),[ex,2.45,.275],false);const arms=[],legs=[];for(const side of [-1,1]){const a=mesh(g,new THREE.CapsuleGeometry(.105,.62,5,12),M(police?0x173e6b:skin),[side*.46,1.48,0]);a.rotation.z=-side*.1;arms.push(a);const l=mesh(g,new THREE.CapsuleGeometry(.13,.68,5,12),M(police?0x202c3b:0x303841),[side*.16,.58,0]);legs.push(l);}if(police){mesh(g,new THREE.CylinderGeometry(.1,.1,.03,16),M(0xe1c45d,.4,{metalness:.5}),[.13,1.73,.34],false);mesh(g,new THREE.BoxGeometry(.78,.68,.43),new THREE.MeshStandardMaterial({color:0x17416a,transparent:true,opacity:.45}),[0,1.48,0],false);mesh(g,new THREE.CylinderGeometry(.31,.34,.16,18),M(0x102e4c),[0,2.79,0]);mesh(g,new THREE.BoxGeometry(.45,.04,.22),M(0x102e4c),[0,2.76,.15]);}g.userData={arms,legs,phase:Math.random()*6};return g;}
const officer=character(true);officer.position.set(-3,0,25);world.add(officer);player.root=character();player.root.position.set(0,0,10);world.add(player.root);
const suspect=character(false,0xc58a68,0x765149);suspect.position.set(32,0,-12);world.add(suspect);
const civilians=[];for(let i=0;i<10;i++){const n=character(false,[0xd4a17c,0xe0b68f,0xb98062][i%3],[0x536d78,0x875b49,0x68734d,0xb2a58d][i%4]);n.position.set((i%5)*7-15,0,Math.floor(i/5)*9-5);n.userData.home=n.position.clone();n.userData.target=n.position.clone();n.userData.wait=Math.random()*3;world.add(n);civilians.push(n);}

function createPatrolCar(){const g=new THREE.Group(), white=M(0xe6e7e2,.34,{metalness:.2}), blue=M(0x174575,.38,{metalness:.2});box(g,[4.1,.82,2],white,[0,.92,0]);box(g,[2.1,.76,1.7],M(0x9bb8c2,.24,{metalness:.25}),[-.1,1.68,0]);for(const side of [-1,1])box(g,[1.55,.46,.03],blue,[.15,1.08,side*1.015]);const bar=new THREE.Group();box(bar,[1.2,.12,.32],M(0x22252a),[0,0,0]);const red=mesh(bar,new THREE.BoxGeometry(.38,.16,.3),new THREE.MeshBasicMaterial({color:0xff3434}),[.34,.08,0]);const blueLamp=mesh(bar,new THREE.BoxGeometry(.38,.16,.3),new THREE.MeshBasicMaterial({color:0x329dff}),[-.34,.08,0]);bar.position.set(-.1,2.12,0);g.add(bar);g.userData.bar=bar;g.userData.lamps=[red,blueLamp];g.userData.wheels=[];for(const x of [-1.35,1.35])for(const z of [-1,1]){const w=mesh(g,new THREE.CylinderGeometry(.42,.42,.28,20),M(0x17191b),[x,.44,z]);w.rotation.x=Math.PI/2;g.userData.wheels.push(w);}g.position.set(-12,0,2);world.add(g);return g;}
const car=createPatrolCar();
const marker=new THREE.Group();const ring=mesh(marker,new THREE.TorusGeometry(1.2,.1,10,36),new THREE.MeshBasicMaterial({color:0xffd44f}),[0,.2,0],false);ring.rotation.x=Math.PI/2;mesh(marker,new THREE.CylinderGeometry(.08,.35,3,12,1,true),new THREE.MeshBasicMaterial({color:0xffd44f,transparent:true,opacity:.15,side:THREE.DoubleSide}),[0,1.7,0],false);marker.position.set(32,0,-12);world.add(marker);

function near(a,b,d){return a.distanceTo(b)<d;}
function joinPolice(){if(state.police){state.patrol=!state.patrol;message(state.patrol?'რადიო: გამოძახება — აღმოსავლეთ უბანში საეჭვო პირი.':'პატრული შეჩერებულია.');}else{state.police=true;state.money+=300;message('პატრულის სამსახური დაიწყო. ფორმა და ეკიპაჟი მზადაა.');}hud();}
function interact(){if(state.cooldown>0)return;state.cooldown=.25;if(state.inCar){state.inCar=false;player.root.visible=true;player.root.position.set(car.position.x+2.7,0,car.position.z);message('მანქანიდან გადმოხვედი.');return;}if(state.inside){state.inside=false;player.root.position.set(0,0,19);message('განყოფილებიდან გამოხვედი.');return;}
 if(!state.police&&near(player.root.position,officer.position,3)){joinPolice();return;}
 if(state.police&&near(player.root.position,car.position,4.5)){state.inCar=true;player.root.visible=false;message('ეკიპაჟში ჩაჯექი. WASD მართვა · E გადმოსვლა.');return;}
 if(state.police&&state.patrol&&!state.detained&&near(player.root.position,suspect.position,3.5)){state.detained=true;state.mission=2;suspect.position.set(34,0,-12);marker.position.set(0,0,25);message('ეჭვმიტანილი დაკავებულია. დააბრუნე განყოფილებაში.');return;}
 if(state.police&&state.detained&&near(player.root.position,new THREE.Vector3(0,0,25),7)){state.detained=false;state.patrol=false;state.money+=650;state.mission=0;suspect.position.set(32,0,-12);marker.position.set(32,0,-12);message('დავალება შესრულებულია · ჯილდო +650 ₾.');hud();return;}
 if(near(player.root.position,new THREE.Vector3(0,0,19),3)){state.inside=true;player.root.position.set(0,0,22.5);message('პოლიციის განყოფილებაში ხარ. E — გასვლა.');return;}
 message('მიუახლოვდი პოლიციელს, მანქანას ან განყოფილების შესასვლელს.');}
function animateRig(g,dt,walking){const d=g.userData;if(!d.legs)return;d.phase+=dt*(walking?10:1.6);const s=walking?Math.sin(d.phase)*.48:Math.sin(d.phase)*.018;d.legs[0].rotation.x=s;d.legs[1].rotation.x=-s;d.arms[0].rotation.x=-s*.55;d.arms[1].rotation.x=s*.55;}
function collision(x,z){if(state.inside)return{x,z};for(const c of colliders){if(Math.abs(x-c.x)<c.w/2+.5&&Math.abs(z-c.z)<c.d/2+.5){const dx=Math.abs(x-c.x)-c.w/2,dz=Math.abs(z-c.z)-c.d/2;if(dx>dz)x=c.x+Math.sign(x-c.x)*(c.w/2+.52);else z=c.z+Math.sign(z-c.z)*(c.d/2+.52);}}return{x,z};}
function updateNpcs(dt){for(const n of civilians){n.userData.wait-=dt;if(n.userData.wait<=0){const a=Math.random()*Math.PI*2,d=2+Math.random()*7;n.userData.target.set(n.userData.home.x+Math.cos(a)*d,0,n.userData.home.z+Math.sin(a)*d);n.userData.wait=4+Math.random()*4;}const v=n.userData.target.clone().sub(n.position);if(v.length()>.3){v.normalize();n.position.addScaledVector(v,dt*.8);n.rotation.y=Math.atan2(v.x,v.z);animateRig(n,dt,true);}else animateRig(n,dt,false);}animateRig(officer,dt,false);animateRig(suspect,dt,false);}
function update(dt){state.cooldown=Math.max(0,state.cooldown-dt);const mx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),mz=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0);if(state.inCar){car.rotation.y+=mx*1.5*dt;const speed=mz*13;car.position.x+=Math.sin(car.rotation.y)*speed*dt;car.position.z+=Math.cos(car.rotation.y)*speed*dt;for(const w of car.userData.wheels)w.rotation.z+=mz*dt*8;}else{const move=new THREE.Vector3(mx,0,mz);player.moving=move.lengthSq()>0;if(player.moving){move.normalize();const speed=(keys.ShiftLeft||keys.ShiftRight||held.has('run'))?8:5;const dx=move.x*Math.cos(camYaw)+move.z*Math.sin(camYaw),dz=-move.x*Math.sin(camYaw)+move.z*Math.cos(camYaw);player.velocity.x=dx*speed;player.velocity.z=dz*speed;player.root.rotation.y=Math.atan2(dx,dz);}else{player.velocity.x*=Math.pow(.001,dt);player.velocity.z*=Math.pow(.001,dt);}let p=collision(player.root.position.x+player.velocity.x*dt,player.root.position.z+player.velocity.z*dt);player.root.position.x=THREE.MathUtils.clamp(p.x,-75,75);player.root.position.z=THREE.MathUtils.clamp(p.z,-75,75);if((keys.Space||held.has('jump'))&&player.grounded){player.velocity.y=6.2;player.grounded=false;}player.velocity.y-=17*dt;player.root.position.y+=player.velocity.y*dt;if(player.root.position.y<=0){player.root.position.y=0;player.velocity.y=0;player.grounded=true;}animateRig(player.root,dt,player.moving);}
 updateNpcs(dt);car.userData.bar.visible=state.patrol;const pulse=Math.sin(clock.elapsedTime*10)*.5+.5;car.userData.lamps[0].material.color.setHex(pulse>.5?0xff3434:0x661111);car.userData.lamps[1].material.color.setHex(pulse>.5?0x111166:0x329dff);marker.visible=state.police&&state.patrol;marker.position.y=Math.sin(clock.elapsedTime*2)*.12;
 const target=state.inCar?car.position:player.root.position,dist=state.inside?9:10;const offset=new THREE.Vector3(Math.sin(camYaw)*dist,4.3+camPitch*5,Math.cos(camYaw)*dist);camera.position.lerp(target.clone().add(offset),1-Math.exp(-5*dt));camera.lookAt(target.x,target.y+1.4,target.z);}
function frame(){requestAnimationFrame(frame);update(Math.min(clock.getDelta(),.04));renderer.render(scene,camera);} 

window.addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyE'&&!e.repeat)interact();if(e.code==='KeyP'&&!e.repeat&&state.police)joinPolice();});window.addEventListener('keyup',e=>keys[e.code]=false);window.addEventListener('blur',()=>Object.keys(keys).forEach(k=>keys[k]=false));
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.button===2){drag={x:e.clientX,y:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId);}});canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;camYaw-=(e.clientX-drag.x)*.006;camPitch=THREE.MathUtils.clamp(camPitch-(e.clientY-drag.y)*.003,-.1,.75);drag.x=e.clientX;drag.y=e.clientY;});canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));});
for(const b of document.querySelectorAll('.control-btn')){const k=b.dataset.key;const down=e=>{e.preventDefault();keys[k]=true;b.setPointerCapture?.(e.pointerId);};const up=()=>keys[k]=false;b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);}
for(const b of document.querySelectorAll('.action-btn'))b.addEventListener('click',()=>{const a=b.dataset.action;if(a==='interact')interact();if(a==='run'){held.add('run');setTimeout(()=>held.delete('run'),500);}if(a==='jump'){held.add('jump');setTimeout(()=>held.delete('jump'),180);}if(a==='vehicle'){if(state.inCar||near(player.root.position,car.position,4.5))interact();else message('მიუახლოვდი საპატრულო მანქანას.');}if(a==='police'){if(!state.police){player.root.position.set(-3,0,25);joinPolice();}else joinPolice();}});
message('თბილისი · მიუახლოვდი პოლიციელს და დააჭირე E-ს სამსახურის დასაწყებად.');hud();frame();
