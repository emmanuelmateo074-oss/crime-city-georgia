// Mobile-control polish and a lightweight estimated minimap for the browser build.
// Movement is inferred from held controls because the Three.js game state is module-local.
const canvas = document.querySelector('#gameCanvas');
const map = document.querySelector('.map-card');
const marker = document.querySelector('.map-player');
const mapLabel = document.querySelector('.map-label');
const keys = new Set();
const touchKeys = new Map();

if (map && marker) {
  map.setAttribute('aria-label', 'თბილისის უბნის მიახლოებითი რუკა');
  if (mapLabel) mapLabel.textContent = 'თბილისი · მიახლოებითი';
  marker.setAttribute('aria-label', 'მოთამაშის სავარაუდო მდებარეობა');
  marker.style.left = '50%';
  marker.style.top = '50%';
  marker.style.transform = 'translate(-50%, -50%)';
}

// Stop mobile browsers from selecting text or scrolling when the virtual controls are used.
for (const control of document.querySelectorAll('.control-btn, .action-btn')) {
  control.style.touchAction = 'none';
  control.style.userSelect = 'none';
  control.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') {
      event.preventDefault();
      try { control.setPointerCapture(event.pointerId); } catch (_) { /* capture can be unavailable in older browsers */ }
    }
    control.classList.add('is-pressed');
  });
  const release = () => control.classList.remove('is-pressed');
  control.addEventListener('pointerup', release);
  control.addEventListener('pointercancel', release);
  control.addEventListener('lostpointercapture', release);
}

// Keep the existing game's run action active for as long as the mobile button is held.
const runButton = document.querySelector('.action-btn[data-action="run"]');
let runPulse = 0;
function beginRun(event) {
  if (!runButton || event.pointerType !== 'touch') return;
  window.clearInterval(runPulse);
  runButton.click();
  runPulse = window.setInterval(() => runButton.click(), 120);
}
function endRun() {
  window.clearInterval(runPulse);
  runPulse = 0;
}
if (runButton) {
  runButton.addEventListener('pointerdown', beginRun);
  runButton.addEventListener('pointerup', endRun);
  runButton.addEventListener('pointercancel', endRun);
  runButton.addEventListener('lostpointercapture', endRun);
  window.addEventListener('blur', endRun);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) endRun();
  });
}

// Draw an approximate moving map marker from the same directional controls. This is
// deliberately labelled approximate; collision and camera rotation are not exposed by the game module.
let mapX = 0;
let mapZ = 10;
let previousTime = performance.now();
const mapExtent = 90;
const speed = 5;
const directionForCode = (code) => {
  if (code === 'KeyW' || code === 'ArrowUp') return [0, -1];
  if (code === 'KeyS' || code === 'ArrowDown') return [0, 1];
  if (code === 'KeyA' || code === 'ArrowLeft') return [-1, 0];
  if (code === 'KeyD' || code === 'ArrowRight') return [1, 0];
  return [0, 0];
};

window.addEventListener('keydown', (event) => {
  if (!event.repeat) keys.add(event.code);
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());

for (const button of document.querySelectorAll('.control-btn[data-key]')) {
  const code = button.dataset.key;
  button.addEventListener('pointerdown', (event) => {
    touchKeys.set(event.pointerId, code);
  });
  const releaseDirection = (event) => touchKeys.delete(event.pointerId);
  button.addEventListener('pointerup', releaseDirection);
  button.addEventListener('pointercancel', releaseDirection);
  button.addEventListener('lostpointercapture', releaseDirection);
}

function renderEstimatedMap(now) {
  const delta = Math.min((now - previousTime) / 1000, 0.05);
  previousTime = now;
  let dx = 0;
  let dz = 0;
  const active = new Set([...keys, ...touchKeys.values()]);
  for (const code of active) {
    const [x, z] = directionForCode(code);
    dx += x;
    dz += z;
  }
  const length = Math.hypot(dx, dz);
  if (length > 0) {
    mapX += (dx / length) * speed * delta;
    mapZ += (dz / length) * speed * delta;
    mapX = Math.max(-mapExtent, Math.min(mapExtent, mapX));
    mapZ = Math.max(-mapExtent, Math.min(mapExtent, mapZ));
  }

  if (marker && map) {
    const left = 50 + (mapX / mapExtent) * 38;
    const top = 50 + (mapZ / mapExtent) * 38;
    marker.style.left = `${left}%`;
    marker.style.top = `${top}%`;
    marker.style.transform = 'translate(-50%, -50%)';
  }
  requestAnimationFrame(renderEstimatedMap);
}
requestAnimationFrame(renderEstimatedMap);

// Dragging the right half of the playfield remains available for camera control.
if (canvas) {
  canvas.style.touchAction = 'none';
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}
