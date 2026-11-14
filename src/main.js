import * as THREE from 'three';

const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9cc7db);
scene.fog = new THREE.Fog(0x9cc7db, 18, 120);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 5, 12);

const clock = new THREE.Clock();

const hud = {
  cash: document.getElementById('cashValue'),
  rank: document.getElementById('rankValue'),
  wanted: document.getElementById('wantedValue'),
  log: document.getElementById('messageLog')
};

const state = {
  money: 1200,
  rank: 'Civilian',
  wanted: 0,
  police: false,
  inVehicle: false,
  vehicle: null,
  insideStation: false,
  patrol: false,
  jobMessage: 'Welcome to Tbilisi. Patrol the city and protect the streets.'
};

const input = {};
const touchActions = new Set();

const world = new THREE.Group();
scene.add(world);

const player = {
  root: new THREE.Group(),
  body: null,
  velocity: new THREE.Vector3(),
  speed: 5,
  runSpeed: 8,
  jumpForce: 7,
  onGround: true,
  yaw: 0
};

function setLog(message) {
  state.jobMessage = message;
  hud.log.textContent = message;
}

function refreshHud() {
  hud.cash.textContent = `$${state.money}`;
  hud.rank.textContent = state.rank;
  hud.wanted.textContent = String(state.wanted);
}

function createCharacter({ uniformColor = 0xefeae1, skin = 0xe5b88a, isPolice = false } = {}) {
  const group = new THREE.Group();

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.42, 1.5, 6, 12),
    new THREE.MeshStandardMaterial({ color: uniformColor, roughness: 0.9 })
  );
  torso.position.y = 1.5;
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 24, 24),
    new THREE.MeshStandardMaterial({ color: skin, roughness: 0.9 })
  );
  head.position.y = 2.7;
  head.castShadow = true;
  group.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.7),
    new THREE.MeshStandardMaterial({ color: 0x1a120d, roughness: 0.8 })
  );
  hair.position.set(0, 2.95, 0.02);
  hair.castShadow = true;
  group.add(hair);

  const armGeom = new THREE.CapsuleGeometry(0.14, 1.1, 4, 10);
  const armLeft = new THREE.Mesh(armGeom, new THREE.MeshStandardMaterial({ color: skin, roughness: 0.9 }));
  armLeft.position.set(-0.55, 1.6, 0);
  armLeft.rotation.z = 0.28;
  armLeft.castShadow = true;
  group.add(armLeft);

  const armRight = armLeft.clone();
  armRight.position.x = 0.55;
  armRight.rotation.z = -0.28;
  group.add(armRight);

  const legGeom = new THREE.CapsuleGeometry(0.17, 1.2, 4, 10);
  const legLeft = new THREE.Mesh(legGeom, new THREE.MeshStandardMaterial({ color: 0x191919, roughness: 0.85 }));
  legLeft.position.set(-0.18, 0.55, 0);
  legLeft.castShadow = true;
  group.add(legLeft);

  const legRight = legLeft.clone();
  legRight.position.x = 0.18;
  group.add(legRight);

  if (isPolice) {
    const badge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.04, 20),
      new THREE.MeshStandardMaterial({ color: 0xe9d86e, metalness: 0.7, roughness: 0.35, emissive: 0x342d00 })
    );
    badge.position.set(0, 1.8, 0.43);
    group.add(badge);

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.48, 0.25, 20),
      new THREE.MeshStandardMaterial({ color: 0x14253d, roughness: 0.5 })
    );
    cap.position.set(0, 3.2, 0);
    group.add(cap);
  }

  return group;
}

function createGround() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x7f9d63, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const roadH = new THREE.Mesh(
    new THREE.BoxGeometry(42, 0.14, 12),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95 })
  );
  roadH.position.set(0, 0.07, 0);
  roadH.receiveShadow = true;
  world.add(roadH);

  const roadV = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.14, 42),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95 })
  );
  roadV.position.set(0, 0.07, 0);
  roadV.receiveShadow = true;
  world.add(roadV);

  const sidewalk = new THREE.Mesh(
    new THREE.BoxGeometry(46, 0.1, 2),
    new THREE.MeshStandardMaterial({ color: 0xb2a388, roughness: 1 })
  );
  sidewalk.position.set(0, 0.08, 7);
  world.add(sidewalk);

  const sidewalk2 = sidewalk.clone();
  sidewalk2.position.z = -7;
  world.add(sidewalk2);

  const sidewalk3 = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.1, 46),
    new THREE.MeshStandardMaterial({ color: 0xb2a388, roughness: 1 })
  );
  sidewalk3.position.set(7, 0.08, 0);
  world.add(sidewalk3);

  const sidewalk4 = sidewalk3.clone();
  sidewalk4.position.x = -7;
  world.add(sidewalk4);
}

function createPalm(x, z) {
  const palm = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.32, 3.8, 12),
    new THREE.MeshStandardMaterial({ color: 0x9e6a33, roughness: 0.9 })
  );
  trunk.position.y = 1.8;
  trunk.castShadow = true;
  palm.add(trunk);

  for (let i = 0; i < 7; i += 1) {
    const leaf = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.75, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x2fa95e, roughness: 0.8 })
    );
    leaf.rotation.z = Math.PI / 2;
    leaf.rotation.y = (i / 7) * Math.PI * 2;
    leaf.position.set(0, 3.7, 0);
    leaf.castShadow = true;
    palm.add(leaf);
  }

  palm.position.set(x, 0, z);
  world.add(palm);
}

function createStreetLight(x, z) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.15, 4.8, 12),
    new THREE.MeshStandardMaterial({ color: 0x3d434b, metalness: 0.8, roughness: 0.4 })
  );
  pole.position.set(x, 2.4, z);
  pole.castShadow = true;
  world.add(pole);

  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 0.12, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x434d53, metalness: 0.8, roughness: 0.45 })
  );
  arm.position.set(x + 0.5, 4.6, z);
  arm.castShadow = true;
  world.add(arm);

  const lamp = new THREE.PointLight(0xffefb0, 1.6, 18, 2);
  lamp.position.set(x + 1.1, 4.5, z);
  world.add(lamp);
}

function createBuilding({ x, z, width, depth, height, color = 0xd8ceb2 }) {
  const building = new THREE.Group();

  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.08 })
  );
  shell.position.y = height / 2;
  shell.castShadow = true;
  shell.receiveShadow = true;
  building.add(shell);

  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 2.4, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x4c392d, roughness: 0.8 })
  );
  doorFrame.position.set(0, 1.2, depth / 2 + 0.12);
  building.add(doorFrame);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 2.2, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x2c2017, roughness: 0.6 })
  );
  door.position.set(0, 1.1, depth / 2 + 0.15);
  door.castShadow = true;
  building.add(door);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 0.5, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xd63d3d, emissive: 0x6d1818, roughness: 0.4 })
  );
  sign.position.set(0, 3.4, depth / 2 + 0.16);
  building.add(sign);

  building.position.set(x, 0, z);
  world.add(building);
  return building;
}

function createPoliceStation() {
  const station = createBuilding({ x: 0, z: 18, width: 11, depth: 13, height: 6, color: 0xc0bcc3 });

  const emblem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 0.08, 32),
    new THREE.MeshStandardMaterial({ color: 0xe1e9f1, metalness: 0.75, roughness: 0.25, emissive: 0x123352 })
  );
  emblem.position.set(0, 3.6, 18 + 6.5 + 0.12);
  scene.add(emblem);

  const interior = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9d2c6, roughness: 0.95 });

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(9.2, 0.2, 10.3),
    new THREE.MeshStandardMaterial({ color: 0x9e9389, roughness: 0.9 })
  );
  floor.position.set(0, 0.1, 18);
  interior.add(floor);

  const north = new THREE.Mesh(new THREE.BoxGeometry(9.2, 3.2, 0.2), wallMat);
  north.position.set(0, 1.6, 13.2);
  interior.add(north);

  const south = new THREE.Mesh(new THREE.BoxGeometry(9.2, 3.2, 0.2), wallMat);
  south.position.set(0, 1.6, 22.8);
  interior.add(south);

  const west = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 9.6), wallMat);
  west.position.set(-4.6, 1.6, 18);
  interior.add(west);

  const east = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 9.6), wallMat);
  east.position.set(4.6, 1.6, 18);
  interior.add(east);

  const reception = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 1, 0.9),
    new THREE.MeshStandardMaterial({ color: 0xc59d6a, roughness: 0.8 })
  );
  reception.position.set(-2.4, 0.5, 17.3);
  interior.add(reception);

  const deskChair = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x5c4d49, roughness: 0.8 })
  );
  deskChair.position.set(-2.4, 0.35, 18.6);
  interior.add(deskChair);

  const evidenceDesk = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.8, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x7d7d7d, roughness: 0.7 })
  );
  evidenceDesk.position.set(2.3, 0.4, 16.8);
  interior.add(evidenceDesk);

  const locker = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 2.2, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x9d9d9d, roughness: 0.7 })
  );
  locker.position.set(-2.9, 1.1, 20.6);
  interior.add(locker);

  const bunk = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.6, 2.5),
    new THREE.MeshStandardMaterial({ color: 0x7d8fc3, roughness: 0.8 })
  );
  bunk.position.set(2.8, 0.3, 20.6);
  interior.add(bunk);

  interior.visible = false;
  scene.add(interior);

  station.userData.interior = interior;
  station.userData.enterPosition = new THREE.Vector3(0, 0.1, 14.8);
  station.userData.exitPosition = new THREE.Vector3(0, 0.1, 24.5);

  return station;
}

function createPoliceVehicle(x, z) {
  const car = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.8, 1.8),
    new THREE.MeshStandardMaterial({ color: 0xcfe4f4, metalness: 0.35, roughness: 0.35 })
  );
  body.position.y = 0.9;
  body.castShadow = true;
  car.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.7, 1.4),
    new THREE.MeshStandardMaterial({ color: 0xf1f6ff, metalness: 0.55, roughness: 0.3 })
  );
  cabin.position.set(0.2, 1.45, 0);
  cabin.castShadow = true;
  car.add(cabin);

  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.18, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x1f1f1f, emissive: 0x111111 })
  );
  bar.position.set(-0.5, 1.85, 0);
  car.add(bar);

  const wheelGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.32, 18);
  const wheels = [
    [-1.1, 0.34, -0.92],
    [1.1, 0.34, -0.92],
    [-1.1, 0.34, 0.92],
    [1.1, 0.34, 0.92]
  ];

  for (const [xv, yv, zv] of wheels) {
    const wheel = new THREE.Mesh(
      wheelGeom,
      new THREE.MeshStandardMaterial({ color: 0x191919, roughness: 0.8 })
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(xv, yv, zv);
    car.add(wheel);
  }

  car.position.set(x, 0.3, z);
  world.add(car);
  return car;
}

const policeStation = createPoliceStation();
const policeCar = createPoliceVehicle(-10, -7);
const suspicious = createCharacter({ uniformColor: 0x7a5543, skin: 0xe0b18a, isPolice: false });
suspicious.position.set(9, 0, 8);
scene.add(suspicious);

const civilian = createCharacter({ uniformColor: 0x62816e, skin: 0xf0c2a5, isPolice: false });
civilian.position.set(-10, 0, 3);
scene.add(civilian);

const officer = createCharacter({ uniformColor: 0x203d6d, skin: 0xe3b48a, isPolice: true });
officer.position.set(0, 0, -8);
scene.add(officer);

player.root = createCharacter({ uniformColor: 0xf3eee8, skin: 0xe5b88a, isPolice: false });
player.root.position.set(0, 0, 10);
scene.add(player.root);

function addWorldProps() {
  for (const x of [-18, 18]) {
    createPalm(x, 18);
    createPalm(x, -18);
  }
  for (const z of [-12, 12]) {
    createPalm(18, z);
    createPalm(-18, z);
  }

  createBuilding({ x: 18, z: 0, width: 9, height: 7, depth: 10, color: 0xefdfc2 });
  createBuilding({ x: -18, z: 0, width: 9, height: 7, depth: 10, color: 0xd5ddeb });
  createBuilding({ x: 0, z: -18, width: 14, height: 8, depth: 12, color: 0xb2a08d });

  for (const light of [[-15, 11], [15, 11], [-15, -11], [15, -11], [-3, 14], [3, 14]]) {
    createStreetLight(light[0], light[1]);
  }
}

addWorldProps();
createGround();
refreshHud();
setLog('Welcome to Tbilisi. Citizens can enter the police station and the patrol unit is ready.');

function setPoliceUniform() {
  const body = player.root.children[0];
  if (body && body.material) {
    body.material.color.setHex(0x203d6d);
  }
  state.police = true;
  state.rank = 'Police Officer';
  state.money += 1400;
  setLog('Police identity accepted. Patrol route active.');
  refreshHud();
}

function enterStation() {
  if (state.insideStation) {
    state.insideStation = false;
    player.root.position.copy(policeStation.userData.exitPosition);
    policeStation.userData.interior.visible = false;
    setLog('Police station door closed. You are back on the street.');
    return;
  }

  state.insideStation = true;
  player.root.position.copy(policeStation.userData.enterPosition);
  policeStation.userData.interior.visible = true;
  setLog('You entered the police station. Operations room and locker access are active.');
}

function interact() {
  const playerPos = player.root.position;
  const stationDoor = Math.abs(playerPos.z - 25.5) < 2.8 && Math.abs(playerPos.x) < 2.5;
  const carReach = playerPos.distanceTo(policeCar.position) < 3.1;
  const suspectReach = playerPos.distanceTo(suspicious.position) < 2.5;

  if (stationDoor) {
    enterStation();
    return;
  }

  if (carReach && !state.inVehicle) {
    state.inVehicle = true;
    state.vehicle = policeCar;
    player.root.visible = false;
    setLog('Police vehicle entered. Drive the patrol route.');
    return;
  }

  if (state.inVehicle && carReach) {
    state.inVehicle = false;
    state.vehicle = null;
    player.root.visible = true;
    player.root.position.set(policeCar.position.x + 2, 0.1, policeCar.position.z + 1.2);
    setLog('Vehicle exited. Back to foot patrol.');
    return;
  }

  if (state.police && suspectReach) {
    state.wanted = Math.min(5, state.wanted + 1);
    state.money += 150;
    setLog('Suspect stopped. Documents checked. Warning issued.');
    refreshHud();
    return;
  }

  if (!state.police && suspectReach) {
    setLog('This citizen is acting suspiciously. Contact a police unit for assistance.');
    return;
  }

  if (Math.abs(playerPos.x - officer.position.x) < 2 && Math.abs(playerPos.z - officer.position.z) < 2) {
    if (!state.police) {
      setPoliceUniform();
    } else {
      state.patrol = !state.patrol;
      setLog(state.patrol ? 'Patrol mode active. Secure the district.' : 'Patrol paused. Awaiting new assignment.');
    }
  }
}

function updateMovement(delta) {
  const moveX = (input.KeyD || input.ArrowRight ? 1 : 0) - (input.KeyA || input.ArrowLeft ? 1 : 0);
  const moveZ = (input.KeyW || input.ArrowUp ? 1 : 0) - (input.KeyS || input.ArrowDown ? 1 : 0);
  const run = input.Shift || touchActions.has('run');

  const move = new THREE.Vector3(moveX, 0, moveZ);
  if (move.lengthSq() > 0) {
    move.normalize();
    const speed = run ? player.runSpeed : player.speed;
    player.velocity.x = move.x * speed;
    player.velocity.z = move.z * speed;
    player.yaw = Math.atan2(move.x, move.z);
    player.root.rotation.y = player.yaw;
  } else {
    player.velocity.x *= 0.8;
    player.velocity.z *= 0.8;
  }

  const nextX = player.root.position.x + player.velocity.x * delta;
  const nextZ = player.root.position.z + player.velocity.z * delta;
  player.root.position.x = THREE.MathUtils.clamp(nextX, -32, 32);
  player.root.position.z = THREE.MathUtils.clamp(nextZ, -32, 32);

  if (input.Space || touchActions.has('jump')) {
    if (player.onGround) {
      player.velocity.y = player.jumpForce;
      player.onGround = false;
    }
  }

  player.velocity.y -= 18 * delta;
  player.root.position.y += player.velocity.y * delta;
  if (player.root.position.y <= 0) {
    player.root.position.y = 0;
    player.velocity.y = 0;
    player.onGround = true;
  }

  if (state.inVehicle && state.vehicle) {
    const vehicle = state.vehicle;
    const turn = (input.KeyD || input.ArrowRight ? 1 : 0) - (input.KeyA || input.ArrowLeft ? 1 : 0);
    const drive = (input.KeyW || input.ArrowUp ? 1 : 0) - (input.KeyS || input.ArrowDown ? 1 : 0);

    vehicle.rotation.y += turn * 1.3 * delta;
    vehicle.position.x += Math.sin(vehicle.rotation.y) * drive * 10 * delta;
    vehicle.position.z += Math.cos(vehicle.rotation.y) * drive * 10 * delta;
    vehicle.position.x = THREE.MathUtils.clamp(vehicle.position.x, -30, 30);
    vehicle.position.z = THREE.MathUtils.clamp(vehicle.position.z, -30, 30);
    player.root.position.copy(vehicle.position).add(new THREE.Vector3(0, 0.8, 1.5));
  }

  if (state.police && state.patrol) {
    const dist = player.root.position.distanceTo(officer.position);
    if (dist < 10) {
      setLog('Patrol active. Check suspicious traffic and citizen reports.');
    }
  }
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.033);

  updateMovement(delta);

  if (!state.inVehicle) {
    const followPos = new THREE.Vector3(player.root.position.x, 3.2, player.root.position.z + 8.5);
    camera.position.lerp(followPos, 0.08);
    camera.lookAt(player.root.position.x, 1.6, player.root.position.z);
  } else {
    const carPos = state.vehicle.position;
    camera.position.lerp(new THREE.Vector3(carPos.x, 5.8, carPos.z + 8.5), 0.08);
    camera.lookAt(carPos.x, 1.3, carPos.z);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener('keydown', (event) => {
  input[event.code] = true;

  if (event.code === 'KeyE') interact();
  if (event.code === 'KeyP' && state.police) {
    state.patrol = !state.patrol;
    setLog(state.patrol ? 'Patrol started. Citizen calls are being routed.' : 'Patrol paused. Awaiting new assignment.');
  }
  if (event.code === 'KeyJ' && !state.police) setPoliceUniform();
});

window.addEventListener('keyup', (event) => {
  input[event.code] = false;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const movementButtons = document.querySelectorAll('.control-btn');
movementButtons.forEach((button) => {
  const code = button.dataset.key;
  const setPressed = (pressed) => {
    input[code] = pressed;
  };

  button.addEventListener('pointerdown', () => setPressed(true));
  button.addEventListener('pointerup', () => setPressed(false));
  button.addEventListener('pointerleave', () => setPressed(false));
  button.addEventListener('pointercancel', () => setPressed(false));
});

const actionButtons = document.querySelectorAll('.action-btn');
actionButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;

    if (action === 'run') {
      touchActions.add('run');
      setTimeout(() => touchActions.delete('run'), 180);
    }

    if (action === 'jump') {
      touchActions.add('jump');
      setTimeout(() => touchActions.delete('jump'), 200);
    }

    if (action === 'interact') interact();
    if (action === 'vehicle') {
      const dist = player.root.position.distanceTo(policeCar.position);
      if (dist < 3.1) interact();
    }
    if (action === 'police') {
      if (!state.police) setPoliceUniform();
      else {
        state.patrol = !state.patrol;
        setLog(state.patrol ? 'Police dispatch: district patrol started.' : 'Police dispatch: patrol paused.');
      }
    }
  });
});

animate();
refreshHud();
