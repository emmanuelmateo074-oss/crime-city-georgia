import * as THREE from 'three';

const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9dc9e5);
scene.fog = new THREE.Fog(0x9dc9e5, 22, 130);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 5, 14);

const clock = new THREE.Clock();

const hud = {
  cash: document.getElementById('cashValue'),
  rank: document.getElementById('rankValue'),
  wanted: document.getElementById('wantedValue'),
  log: document.getElementById('messageLog')
};

const world = new THREE.Group();
scene.add(world);

const keys = {};
const touchActions = new Set();

const state = {
  playerIsPolice: false,
  insideStation: false,
  inVehicle: false,
  currentVehicle: null,
  money: 1200,
  rank: 'Civilian',
  wanted: 0,
  interactionCooldown: 0,
  policeSalary: 1400,
  patrolActive: false,
  lastMessage: 'Welcome to Tbilisi. Patrol the city and protect the streets.'
};

const markerMaterial = new THREE.MeshStandardMaterial({
  color: 0x2dc4ff,
  emissive: 0x155779,
  metalness: 0.25,
  roughness: 0.55
});

function setLog(message) {
  state.lastMessage = message;
  hud.log.textContent = message;
}

function refreshHud() {
  hud.cash.textContent = `$${state.money}`;
  hud.rank.textContent = state.rank;
  hud.wanted.textContent = String(state.wanted);
}

refreshHud();

function createGround() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x7ca052, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(40, 0.12, 12),
    new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.95 })
  );
  road.position.set(0, 0.06, 0);
  road.receiveShadow = true;
  world.add(road);

  const crossRoad = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.12, 40),
    new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.95 })
  );
  crossRoad.position.set(0, 0.06, 0);
  crossRoad.receiveShadow = true;
  world.add(crossRoad);

  const sidewalkA = new THREE.Mesh(
    new THREE.BoxGeometry(46, 0.08, 2),
    new THREE.MeshStandardMaterial({ color: 0xac9d87, roughness: 1 })
  );
  sidewalkA.position.set(0, 0.08, 7);
  world.add(sidewalkA);

  const sidewalkB = new THREE.Mesh(
    new THREE.BoxGeometry(46, 0.08, 2),
    new THREE.MeshStandardMaterial({ color: 0xac9d87, roughness: 1 })
  );
  sidewalkB.position.set(0, 0.08, -7);
  world.add(sidewalkB);

  const sidewalkC = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.08, 46),
    new THREE.MeshStandardMaterial({ color: 0xac9d87, roughness: 1 })
  );
  sidewalkC.position.set(7, 0.08, 0);
  world.add(sidewalkC);

  const sidewalkD = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.08, 46),
    new THREE.MeshStandardMaterial({ color: 0xac9d87, roughness: 1 })
  );
  sidewalkD.position.set(-7, 0.08, 0);
  world.add(sidewalkD);
}

function createPalm(x, z) {
  const palm = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.36, 3.8, 10),
    new THREE.MeshStandardMaterial({ color: 0x9a6532, roughness: 0.9 })
  );
  trunk.castShadow = true;
  trunk.position.y = 1.9;
  palm.add(trunk);

  for (let i = 0; i < 7; i += 1) {
    const leaf = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.7, 2.1),
      new THREE.MeshStandardMaterial({ color: 0x32a852, roughness: 0.8 })
    );
    leaf.rotation.z = Math.PI / 2;
    leaf.rotation.y = (i / 7) * Math.PI * 2;
    leaf.position.set(0, 3.9, 0);
    leaf.castShadow = true;
    palm.add(leaf);
  }

  palm.position.set(x, 0, z);
  world.add(palm);
}

function createStreetLight(x, z) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.15, 4.6, 10),
    new THREE.MeshStandardMaterial({ color: 0x3f4550, metalness: 0.8, roughness: 0.45 })
  );
  pole.position.set(x, 2.3, z);
  pole.castShadow = true;
  world.add(pole);

  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.12, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x4b5761, metalness: 0.85, roughness: 0.35 })
  );
  arm.position.set(x + 0.7, 4.5, z);
  arm.castShadow = true;
  world.add(arm);

  const lamp = new THREE.PointLight(0xfff2bf, 1.7, 16, 2);
  lamp.position.set(x + 1.2, 4.4, z);
  world.add(lamp);
}

function createBuilding({ x, z, width, depth, height, color = 0xe5d7b7 }) {
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
    new THREE.BoxGeometry(1.4, 2.3, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x4d3728, roughness: 0.8 })
  );
  doorFrame.position.set(0, 1.15, depth / 2 + 0.1);
  building.add(doorFrame);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 2.1, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x2d2018, roughness: 0.6 })
  );
  door.position.set(0, 1.05, depth / 2 + 0.15);
  door.castShadow = true;
  building.userData.door = door;
  building.add(door);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.5, 0.15),
    new THREE.MeshStandardMaterial({ color: 0xd73535, emissive: 0x6a1a1a, roughness: 0.4 })
  );
  sign.position.set(0, 3.2, depth / 2 + 0.15);
  building.add(sign);

  building.position.set(x, 0, z);
  world.add(building);
  return building;
}

function createPoliceStation() {
  const station = createBuilding({
    x: 0,
    z: 18,
    width: 11,
    depth: 13,
    height: 6,
    color: 0xb7b3ba
  });

  const emblem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 0.08, 32),
    new THREE.MeshStandardMaterial({
      color: 0xdfe6ec,
      metalness: 0.7,
      roughness: 0.25,
      emissive: 0x1d2d40
    })
  );
  emblem.position.set(0, 3.4, 18 + 6.5 + 0.12);
  scene.add(emblem);

  const rune = new THREE.Mesh(
    new THREE.TorusGeometry(0.38, 0.08, 12, 32),
    new THREE.MeshStandardMaterial({ color: 0x143d75 })
  );
  rune.rotation.x = Math.PI / 2;
  rune.position.copy(emblem.position);
  scene.add(rune);

  const interior = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd4d0c8, roughness: 0.95 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.2, 10.5), new THREE.MeshStandardMaterial({ color: 0x9d9384, roughness: 0.9 }));
  floor.position.set(0, 0.1, 18);
  interior.add(floor);

  const wallNorth = new THREE.Mesh(new THREE.BoxGeometry(9.2, 3.2, 0.2), wallMat);
  wallNorth.position.set(0, 1.6, 13.1);
  interior.add(wallNorth);

  const wallSouth = new THREE.Mesh(new THREE.BoxGeometry(9.2, 3.2, 0.2), wallMat);
  wallSouth.position.set(0, 1.6, 22.9);
  interior.add(wallSouth);

  const wallWest = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 9.8), wallMat);
  wallWest.position.set(-4.6, 1.6, 18);
  interior.add(wallWest);

  const wallEast = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 9.8), wallMat);
  wallEast.position.set(4.6, 1.6, 18);
  interior.add(wallEast);

  const frontDoorOpening = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.4, 0.16), new THREE.MeshStandardMaterial({ color: 0x6e6d6a }));
  frontDoorOpening.position.set(0, 1.2, 13.2);
  interior.add(frontDoorOpening);

  const hallway = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 2.3), new THREE.MeshStandardMaterial({ color: 0x7d786e }));
  hallway.position.set(0, 0.15, 15.5);
  interior.add(hallway);

  const receptionDesk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 0.9), new THREE.MeshStandardMaterial({ color: 0xb99973 }));
  receptionDesk.position.set(-2.5, 0.5, 17);
  interior.add(receptionDesk);

  const deskChair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: 0x5a4d45 }));
  deskChair.position.set(-2.5, 0.35, 18.5);
  interior.add(deskChair);

  const evidenceDesk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: 0x7b7b7b }));
  evidenceDesk.position.set(2.2, 0.4, 16.7);
  interior.add(evidenceDesk);

  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.5), new THREE.MeshStandardMaterial({ color: 0x7f8dc5 }));
  bed.position.set(2.6, 0.3, 20.5);
  interior.add(bed);

  const locker = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 0.7), new THREE.MeshStandardMaterial({ color: 0x9e9b99 }));
  locker.position.set(-2.7, 1.15, 20.8);
  interior.add(locker);

  interior.visible = false;
  scene.add(interior);

  station.userData.interior = interior;
  station.userData.enterPosition = new THREE.Vector3(0, 1.4, 14.6);
  station.userData.exitPosition = new THREE.Vector3(0, 1.4, 25.5);
  return station;
}

function createPoliceVehicle(x, z) {
  const car = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.8, 1.8),
    new THREE.MeshStandardMaterial({ color: 0xc8d6e5, metalness: 0.4, roughness: 0.35 })
  );
  body.position.y = 0.9;
  body.castShadow = true;
  car.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.7, 1.5),
    new THREE.MeshStandardMaterial({ color: 0xeff4ff, metalness: 0.55, roughness: 0.3 })
  );
  cabin.position.set(0.2, 1.45, 0);
  cabin.castShadow = true;
  car.add(cabin);

  const lightBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.2, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, emissive: 0x111111 })
  );
  lightBar.position.set(-0.5, 1.85, 0);
  car.add(lightBar);

  const frontLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.35, 18), new THREE.MeshStandardMaterial({ color: 0x181818 }));
  frontLeft.rotation.z = Math.PI / 2;
  frontLeft.position.set(-1.1, 0.35, -0.95);
  car.add(frontLeft);

  const frontRight = frontLeft.clone();
  frontRight.position.z = 0.95;
  car.add(frontRight);

  const rearLeft = frontLeft.clone();
  rearLeft.position.x = 1.1;
  rearLeft.position.z = -0.95;
  car.add(rearLeft);

  const rearRight = frontLeft.clone();
  rearRight.position.x = 1.1;
  rearRight.position.z = 0.95;
  car.add(rearRight);

  const siren = new THREE.PointLight(0x57d5ff, 1.2, 14, 2);
  siren.position.set(-0.5, 1.9, 0);
  car.add(siren);

  car.position.set(x, 0.2, z);
  car.rotation.y = Math.PI;
  world.add(car);
  return car;
}

function createPlayerAppearance({ uniformColor = 0xdddddd, skinTone = 0xf0c6a0, isPolice = false }) {
  const group = new THREE.Group();

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.42, 1.4, 6, 12),
    new THREE.MeshStandardMaterial({ color: uniformColor, roughness: 0.9 })
  );
  torso.position.y = 1.5;
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 24, 24),
    new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.9 })
  );
  head.position.y = 2.7;
  head.castShadow = true;
  group.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 18, 18, 0, Math.PI * 2, 0, Math.PI / 1.7),
    new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.8 })
  );
  hair.position.set(0, 2.95, 0.02);
  hair.castShadow = true;
  group.add(hair);

  const armLeft = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.14, 1.1, 4, 10),
    new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.9 })
  );
  armLeft.position.set(-0.52, 1.6, 0);
  armLeft.rotation.z = 0.3;
  armLeft.castShadow = true;
  group.add(armLeft);

  const armRight = armLeft.clone();
  armRight.position.x = 0.52;
  armRight.rotation.z = -0.3;
  group.add(armRight);

  const legLeft = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.17, 1.2, 4, 10),
    new THREE.MeshStandardMaterial({ color: 0x1d1d1d, roughness: 0.8 })
  );
  legLeft.position.set(-0.18, 0.6, 0);
  legLeft.castShadow = true;
  group.add(legLeft);

  const legRight = legLeft.clone();
  legRight.position.x = 0.18;
  group.add(legRight);

  if (isPolice) {
    const badge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.03, 20),
      new THREE.MeshStandardMaterial({ color: 0xe3d86b, metalness: 0.6, roughness: 0.35, emissive: 0x3d3a00 })
    );
    badge.position.set(0, 1.9, 0.42);
    group.add(badge);

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.48, 0.28, 20),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })
    );
    cap.position.set(0, 3.2, 0);
    group.add(cap);
  }

  return group;
}

function createPedestrian(x, z, name, color = 0x9c7d62) {
  const group = createPlayerAppearance({ uniformColor: color, skinTone: 0xf0c6a0, isPolice: false });
  group.position.set(x, 0, z);
  group.userData.name = name;
  group.userData.type = 'pedestrian';
  scene.add(group);
  return group;
}

function createPoliceOfficer(x, z, name) {
  const group = createPlayerAppearance({ uniformColor: 0x233d6c, skinTone: 0xe3b088, isPolice: true });
  group.position.set(x, 0, z);
  group.userData.name = name;
  group.userData.type = 'police';
  scene.add(group);
  return group;
}

const player = {
  group: createPlayerAppearance({ uniformColor: 0xf2ece3, skinTone: 0xe4b68a, isPolice: false }),
  velocity: new THREE.Vector3(),
  speed: 5.5,
  walkingSpeed: 4.5,
  runningSpeed: 7.2,
  jumpForce: 7.2,
  radius: 0.52,
  onGround: true,
  faceYaw: 0
};

player.group.position.set(0, 0, 10);
scene.add(player.group);

const policeStation = createPoliceStation();
const policeCar = createPoliceVehicle(-10, -7);
const suspect = createPedestrian(9, 8, 'Suspicious Citizen', 0x7a5b49);
const civilianA = createPedestrian(-9, 3, 'Citizen', 0x6f8d7a);
const officer = createPoliceOfficer(0, 0, 'Tbilisi Patrol');
officer.position.set(0, 0, -8);

autoRemove = new Set();

for (const x of [-18, 18]) {
  createPalm(x, 18);
  createPalm(x, -18);
}

for (const z of [-12, 12]) {
  createPalm(18, z);
  createPalm(-18, z);
}

for (const light of [
  [-15, 11],
  [15, 11],
  [-15, -11],
  [15, -11],
  [-3, 14],
  [3, 14]
]) {
  createStreetLight(light[0], light[1]);
}

createBuilding({ x: 18, z: 0, width: 9, height: 7, depth: 10, color: 0xddd0bd });
createBuilding({ x: -18, z: 0, width: 9, height: 7, depth: 10, color: 0xc9d2d8 });
createBuilding({ x: 0, z: -18, width: 14, height: 8, depth: 12, color: 0xae9c7f });

createGround();

function setPoliceUniform() {
  const torso = player.group.children[0];
  torso.material.color.setHex(0x233d6c);
  player.group.userData.isPolice = true;
  state.playerIsPolice = true;
  state.rank = 'Police Officer';
  state.money += state.policeSalary;
  setLog('Police identity accepted. Patrol route active.');
  refreshHud();
}

function enterExitStation() {
  if (state.insideStation) {
    state.insideStation = false;
    player.group.position.copy(policeStation.userData.exitPosition);
    policeStation.userData.interior.visible = false;
    setLog('Police station door closed. You are back on the street.');
    return;
  }

  state.insideStation = true;
  policeStation.userData.interior.visible = true;
  player.group.position.copy(policeStation.userData.enterPosition);
  setLog('You entered the police station. Surveillance and operations room updated.');
}

function performInteract() {
  if (state.interactionCooldown > 0) return;
  state.interactionCooldown = 0.5;

  const dToStation = player.group.position.distanceTo(new THREE.Vector3(0, 0, 25.5));
  const dToDoor = Math.abs(player.group.position.z - 25.5) < 2.8 && Math.abs(player.group.position.x) < 2.5;
  const dToCar = player.group.position.distanceTo(policeCar.position) < 3.2;
  const dToSuspect = player.group.position.distanceTo(suspect.position) < 2.4;

  if (dToDoor) {
    enterExitStation();
    return;
  }

  if (dToCar && !state.inVehicle) {
    state.inVehicle = true;
    state.currentVehicle = policeCar;
    player.group.visible = false;
    player.group.position.copy(policeCar.position);
    setLog('Police vehicle entered. Drive to the assigned patrol route.');
    return;
  }

  if (state.inVehicle && dToCar) {
    state.inVehicle = false;
    state.currentVehicle = null;
    player.group.visible = true;
    player.group.position.set(policeCar.position.x + 2, 0, policeCar.position.z + 1.2);
    setLog('Vehicle exited. Back to foot patrol.');
    return;
  }

  if (state.playerIsPolice && dToSuspect) {
    state.wanted = Math.min(5, state.wanted + 1);
    state.money += 150;
    setLog('Suspect stopped. Documents checked. Warning issued.');
    refreshHud();
    return;
  }

  if (!state.playerIsPolice && dToSuspect) {
    setLog('This citizen is behaving suspiciously. Contact local police for assistance.');
    return;
  }

  if (Math.abs(player.group.position.x - officer.position.x) < 2 && Math.abs(player.group.position.z - officer.position.z) < 2) {
    if (!state.playerIsPolice) {
      setPoliceUniform();
    } else {
      state.patrolActive = !state.patrolActive;
      setLog(state.patrolActive ? 'Patrol mode active. Keep the district safe.' : 'Patrol paused. Awaiting new assignment.');
    }
  }
}

function updatePlayerMovement(delta) {
  const moveX = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  const moveZ = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);

  const run = keys.Shift || touchActions.has('run');
  const move = new THREE.Vector3(moveX, 0, moveZ);

  if (move.lengthSq() > 0) {
    move.normalize();
    const speed = run ? player.runningSpeed : player.walkingSpeed;
    player.velocity.x = move.x * speed;
    player.velocity.z = move.z * speed;
    player.faceYaw = Math.atan2(move.x, move.z);
    player.group.rotation.y = player.faceYaw;
  } else {
    player.velocity.x *= 0.8;
    player.velocity.z *= 0.8;
  }

  const nextX = player.group.position.x + player.velocity.x * delta;
  const nextZ = player.group.position.z + player.velocity.z * delta;

  const bounds = 32;
  player.group.position.x = THREE.MathUtils.clamp(nextX, -bounds, bounds);
  player.group.position.z = THREE.MathUtils.clamp(nextZ, -bounds, bounds);

  if (keys.Space || touchActions.has('jump')) {
    if (player.onGround) {
      player.velocity.y = player.jumpForce;
      player.onGround = false;
    }
  }

  player.velocity.y -= 18 * delta;
  player.group.position.y += player.velocity.y * delta;

  if (player.group.position.y <= 0) {
    player.group.position.y = 0;
    player.velocity.y = 0;
    player.onGround = true;
  }

  if (state.inVehicle && state.currentVehicle) {
    const car = state.currentVehicle;
    const vehicleMoveX = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    const vehicleMoveZ = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const carSpeed = 10;
    car.rotation.y += (vehicleMoveX * 1.2) * delta;
    car.position.x += Math.sin(car.rotation.y) * vehicleMoveZ * carSpeed * delta;
    car.position.z += Math.cos(car.rotation.y) * vehicleMoveZ * carSpeed * delta;
    car.position.x = THREE.MathUtils.clamp(car.position.x, -30, 30);
    car.position.z = THREE.MathUtils.clamp(car.position.z, -30, 30);
    player.group.position.copy(car.position).add(new THREE.Vector3(0, 0.9, 1.5));
  }

  if (state.playerIsPolice && state.patrolActive) {
    if (Math.abs(player.group.position.x - officer.position.x) < 8 && Math.abs(player.group.position.z - officer.position.z) < 8) {
      setLog('Patrol is active. Keep the district safe and check suspicious traffic.');
    }
  }
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.033);
  state.interactionCooldown = Math.max(0, state.interactionCooldown - delta);

  if (!state.inVehicle) {
    updatePlayerMovement(delta);
  }

  if (state.inVehicle && state.currentVehicle) {
    const car = state.currentVehicle;
    car.children.forEach((child) => {
      if (child.geometry && child.geometry.type === 'CylinderGeometry') {
        child.rotation.x += delta * 3;
      }
    });
  }

  const targetX = player.group.position.x + Math.sin(player.faceYaw) * 6;
  const targetY = 5;
  const targetZ = player.group.position.z + Math.cos(player.faceYaw) * 6;
  const cameraTarget = new THREE.Vector3(targetX, targetY, targetZ);
  const desired = new THREE.Vector3(player.group.position.x, 2.7, player.group.position.z + 7.2);

  if (!state.inVehicle) {
    camera.position.lerp(desired, 0.08);
    camera.lookAt(cameraTarget);
  } else {
    const carPos = state.currentVehicle.position;
    camera.position.lerp(new THREE.Vector3(carPos.x, 5.8, carPos.z + 9), 0.08);
    camera.lookAt(carPos.x, 1.5, carPos.z);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

window.addEventListener('keydown', (event) => {
  keys[event.code] = true;

  if (event.code === 'KeyE') {
    performInteract();
  }

  if (event.code === 'KeyF') {
    if (state.inVehicle) {
      performInteract();
    }
  }

  if (event.code === 'KeyP') {
    if (state.playerIsPolice) {
      state.patrolActive = !state.patrolActive;
      setLog(state.patrolActive ? 'Patrol started. Citizen calls routed to your unit.' : 'Patrol stopped. Awaiting new dispatch.');
    }
  }

  if (event.code === 'KeyJ') {
    if (!state.playerIsPolice) {
      setPoliceUniform();
    }
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    if (action === 'interact') {
      performInteract();
    }
    if (action === 'vehicle') {
      if (state.inVehicle) {
        performInteract();
      } else {
        const carDistance = player.group.position.distanceTo(policeCar.position);
        if (carDistance < 3.2) {
          performInteract();
        }
      }
    }
    if (action === 'police') {
      if (!state.playerIsPolice) {
        setPoliceUniform();
      } else {
        state.patrolActive = !state.patrolActive;
        setLog(state.patrolActive ? 'Police dispatch: district patrol started.' : 'Police dispatch: patrol paused.');
      }
    }
  });
});

const directionButtons = document.querySelectorAll('.control-btn');
directionButtons.forEach((button) => {
  const code = button.dataset.key;
  const activate = (active) => {
    if (active) {
      keys[code] = true;
    } else {
      keys[code] = false;
    }
  };

  button.addEventListener('pointerdown', () => activate(true));
  button.addEventListener('pointerup', () => activate(false));
  button.addEventListener('pointerleave', () => activate(false));
  button.addEventListener('pointercancel', () => activate(false));
});

setLog('Welcome to Tbilisi. Citizens can enter the police station and the patrol unit is ready.');
refreshHud();
