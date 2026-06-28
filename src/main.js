import * as THREE from "three";
import "./styles.css";

const sceneCanvas = document.querySelector("#scene");
const drawCanvas = document.querySelector("#drawCanvas");
const drawCtx = drawCanvas.getContext("2d");

const roundEl = document.querySelector("#round");
const coinsEl = document.querySelector("#coins");
const powerEl = document.querySelector("#power");
const phaseEl = document.querySelector("#phase");
const inkFillEl = document.querySelector("#inkFill");
const clearBtn = document.querySelector("#clearBtn");
const attackBtn = document.querySelector("#attackBtn");
const powerBtn = document.querySelector("#powerBtn");
const inkBtn = document.querySelector("#inkBtn");

const renderer = new THREE.WebGLRenderer({
  canvas: sceneCanvas,
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101820);
scene.fog = new THREE.Fog(0x101820, 12, 24);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
camera.position.set(0, 7.4, 9.2);
camera.lookAt(0, 0.3, 0);

const hemi = new THREE.HemisphereLight(0xbfe9ff, 0x1b2630, 1.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 2.6);
sun.position.set(-4.5, 8, 5);
sun.castShadow = true;
sun.shadow.camera.left = -8;
sun.shadow.camera.right = 8;
sun.shadow.camera.top = 8;
sun.shadow.camera.bottom = -8;
scene.add(sun);

const arenaRadius = 4.1;
const arena = new THREE.Mesh(
  new THREE.CylinderGeometry(arenaRadius, arenaRadius, 0.34, 96),
  new THREE.MeshStandardMaterial({ color: 0xe7edf0, roughness: 0.68 }),
);
arena.receiveShadow = true;
arena.position.y = -0.18;
scene.add(arena);

const rim = new THREE.Mesh(
  new THREE.TorusGeometry(arenaRadius, 0.08, 12, 96),
  new THREE.MeshStandardMaterial({ color: 0x42e3a8, emissive: 0x0b5f40, roughness: 0.35 }),
);
rim.rotation.x = Math.PI / 2;
rim.position.y = 0.02;
scene.add(rim);

const grid = new THREE.GridHelper(18, 18, 0x294150, 0x1b2b36);
grid.position.y = -0.36;
scene.add(grid);

const playerMat = new THREE.MeshStandardMaterial({ color: 0x30c98b, roughness: 0.5 });
const enemyMat = new THREE.MeshStandardMaterial({ color: 0xff5d61, roughness: 0.5 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x17212a, roughness: 0.72 });
const weaponMat = new THREE.MeshStandardMaterial({
  color: 0xffd35a,
  metalness: 0.35,
  roughness: 0.32,
});
const enemyWeaponMat = new THREE.MeshStandardMaterial({
  color: 0x8bb7ff,
  metalness: 0.25,
  roughness: 0.36,
});

function createFighter(material) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.56, 0.34, 24), darkMat);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.52, 28, 18), material);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.16, 24), darkMat);
  base.castShadow = true;
  body.castShadow = true;
  cap.castShadow = true;
  base.position.y = 0.18;
  body.position.y = 0.62;
  cap.position.y = 1.12;
  group.add(base, body, cap);
  group.userData.radius = 0.54;
  group.userData.velocity = new THREE.Vector3();
  return group;
}

const player = createFighter(playerMat);
const enemy = createFighter(enemyMat);
scene.add(player, enemy);

let playerWeapon = null;
let enemyWeapon = null;

const state = {
  phase: "draw",
  round: 1,
  coins: 0,
  powerLevel: 1,
  inkLevel: 1,
  maxInk: 850,
  inkUsed: 0,
  attackTime: 0,
  resultTime: 0,
  winner: null,
  drawing: false,
  strokes: [],
  currentStroke: [],
};

function resetFighters() {
  player.position.set(-1.8, 0, 0);
  enemy.position.set(1.8, 0, 0);
  player.rotation.set(0, 0, 0);
  enemy.rotation.set(0, Math.PI, 0);
  player.userData.velocity.set(0, 0, 0);
  enemy.userData.velocity.set(0, 0, 0);
  state.winner = null;
}

function clearWeapon(mesh) {
  if (!mesh) return;
  mesh.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
  });
  mesh.removeFromParent();
}

function clearDrawing() {
  state.strokes = [];
  state.currentStroke = [];
  state.inkUsed = 0;
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  drawGuide();
  updateUi();
}

function drawGuide() {
  drawCtx.save();
  drawCtx.fillStyle = "rgba(238, 243, 247, 0.62)";
  drawCtx.font = "700 18px system-ui, sans-serif";
  drawCtx.textAlign = "center";
  drawCtx.fillText("Draw your weapon here", drawCanvas.width / 2, drawCanvas.height / 2);
  drawCtx.restore();
}

function pointerPos(event) {
  const rect = drawCanvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * drawCanvas.width,
    y: ((event.clientY - rect.top) / rect.height) * drawCanvas.height,
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function startDraw(event) {
  if (state.phase !== "draw") return;
  drawCanvas.setPointerCapture(event.pointerId);
  state.drawing = true;
  state.currentStroke = [pointerPos(event)];
  if (state.strokes.length === 0 && state.inkUsed === 0) {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  }
}

function moveDraw(event) {
  if (!state.drawing || state.phase !== "draw") return;
  const next = pointerPos(event);
  const last = state.currentStroke[state.currentStroke.length - 1];
  const segment = distance(last, next);
  const limit = state.maxInk + (state.inkLevel - 1) * 170;
  if (state.inkUsed + segment > limit) {
    state.drawing = false;
    return;
  }
  state.inkUsed += segment;
  state.currentStroke.push(next);
  drawCtx.save();
  drawCtx.lineCap = "round";
  drawCtx.lineJoin = "round";
  drawCtx.strokeStyle = "#ffe266";
  drawCtx.lineWidth = 12;
  drawCtx.shadowColor = "rgba(255, 226, 102, 0.5)";
  drawCtx.shadowBlur = 12;
  drawCtx.beginPath();
  drawCtx.moveTo(last.x, last.y);
  drawCtx.lineTo(next.x, next.y);
  drawCtx.stroke();
  drawCtx.restore();
  updateUi();
}

function endDraw() {
  if (!state.drawing) return;
  state.drawing = false;
  if (state.currentStroke.length > 1) {
    state.strokes.push(state.currentStroke);
  }
  state.currentStroke = [];
  updateUi();
}

drawCanvas.addEventListener("pointerdown", startDraw);
drawCanvas.addEventListener("pointermove", moveDraw);
drawCanvas.addEventListener("pointerup", endDraw);
drawCanvas.addEventListener("pointercancel", endDraw);

function strokeBounds(strokes) {
  const points = strokes.flat();
  if (!points.length) {
    return { minX: 0, maxX: drawCanvas.width, minY: 0, maxY: drawCanvas.height };
  }
  return points.reduce(
    (bounds, p) => ({
      minX: Math.min(bounds.minX, p.x),
      maxX: Math.max(bounds.maxX, p.x),
      minY: Math.min(bounds.minY, p.y),
      maxY: Math.max(bounds.maxY, p.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
}

function createWeaponFromDrawing(strokes, material) {
  const weapon = new THREE.Group();
  const source = strokes.length ? strokes : [[{ x: 80, y: 120 }, { x: 340, y: 90 }]];
  const bounds = strokeBounds(source);
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  const scale = 2.65 / Math.max(width, height, 120);

  source.forEach((stroke) => {
    for (let i = 1; i < stroke.length; i += 1) {
      const a = stroke[i - 1];
      const b = stroke[i];
      const ax = (a.x - bounds.minX - width / 2) * scale + 1.25;
      const bx = (b.x - bounds.minX - width / 2) * scale + 1.25;
      const ay = -(a.y - bounds.minY - height / 2) * scale + 0.82;
      const by = -(b.y - bounds.minY - height / 2) * scale + 0.82;
      const midX = (ax + bx) / 2;
      const midY = (ay + by) / 2;
      const length = Math.max(Math.hypot(bx - ax, by - ay), 0.08);
      const rod = new THREE.Mesh(new THREE.BoxGeometry(length, 0.12, 0.2), material);
      rod.position.set(midX, midY, 0);
      rod.rotation.z = Math.atan2(by - ay, bx - ax);
      rod.castShadow = true;
      weapon.add(rod);
    }
  });

  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.38, 24), material);
  tip.rotation.z = -Math.PI / 2;
  tip.position.set(2.65, 0.82, 0);
  tip.castShadow = true;
  weapon.add(tip);

  weapon.userData.reach = Math.min(2.95, 1.25 + Math.sqrt(state.inkUsed || 240) / 25);
  return weapon;
}

function createEnemyWeapon() {
  const weapon = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 0.2), enemyWeaponMat);
  const weight = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.5, 0.42), enemyWeaponMat);
  handle.position.set(1.1, 0.82, 0);
  weight.position.set(2.1, 0.82, 0);
  handle.castShadow = true;
  weight.castShadow = true;
  weapon.add(handle, weight);
  weapon.userData.reach = 2.3 + Math.min(state.round * 0.04, 0.5);
  return weapon;
}

function beginAttack() {
  if (state.phase !== "draw") return;
  state.phase = "attack";
  state.attackTime = 0;
  clearWeapon(playerWeapon);
  clearWeapon(enemyWeapon);
  playerWeapon = createWeaponFromDrawing(state.strokes, weaponMat);
  enemyWeapon = createEnemyWeapon();
  player.add(playerWeapon);
  enemy.add(enemyWeapon);
  attackBtn.disabled = true;
  clearBtn.disabled = true;
  updateUi();
}

function finishRound(winner) {
  state.phase = "result";
  state.resultTime = 0;
  state.winner = winner;
  if (winner === "player") {
    state.coins += 25 + state.round * 5;
    state.round += 1;
  } else {
    state.coins += 8;
  }
  updateUi();
}

function nextRound() {
  state.phase = "draw";
  clearWeapon(playerWeapon);
  clearWeapon(enemyWeapon);
  playerWeapon = null;
  enemyWeapon = null;
  resetFighters();
  clearDrawing();
  attackBtn.disabled = false;
  clearBtn.disabled = false;
  updateUi();
}

function pushByWeapon(attacker, defender, strength) {
  const reach = attacker.children.find((child) => child.userData.reach)?.userData.reach ?? 2;
  const delta = new THREE.Vector3().subVectors(defender.position, attacker.position);
  const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(attacker.quaternion);
  const forwardDistance = delta.dot(forward);
  const sideDistance = Math.abs(delta.z);
  if (forwardDistance > 0.35 && forwardDistance < reach && sideDistance < 0.92) {
    defender.userData.velocity.addScaledVector(forward, strength);
  }
}

function upgrade(kind) {
  const cost = kind === "power" ? state.powerLevel * 45 : state.inkLevel * 40;
  if (state.coins < cost || state.phase !== "draw") return;
  state.coins -= cost;
  if (kind === "power") state.powerLevel += 1;
  if (kind === "ink") state.inkLevel += 1;
  updateUi();
}

function updateUi() {
  const inkLimit = state.maxInk + (state.inkLevel - 1) * 170;
  roundEl.textContent = String(state.round);
  coinsEl.textContent = String(state.coins);
  powerEl.textContent = `${(1 + (state.powerLevel - 1) * 0.18).toFixed(1)}x`;
  inkFillEl.style.transform = `scaleX(${Math.max(0, 1 - state.inkUsed / inkLimit)})`;
  powerBtn.textContent = `Power +${state.powerLevel * 45}`;
  inkBtn.textContent = `Ink +${state.inkLevel * 40}`;
  powerBtn.disabled = state.phase !== "draw" || state.coins < state.powerLevel * 45;
  inkBtn.disabled = state.phase !== "draw" || state.coins < state.inkLevel * 40;

  if (state.phase === "draw") {
    phaseEl.textContent = state.inkUsed > 10 ? "Weapon ready. Attack when you like." : "Draw a weapon, then attack.";
  } else if (state.phase === "attack") {
    phaseEl.textContent = "Clash in progress.";
  } else if (state.winner === "player") {
    phaseEl.textContent = "Knockout. New round starting.";
  } else {
    phaseEl.textContent = "You were pushed out. Redraw and try again.";
  }
}

clearBtn.addEventListener("click", clearDrawing);
attackBtn.addEventListener("click", beginAttack);
powerBtn.addEventListener("click", () => upgrade("power"));
inkBtn.addEventListener("click", () => upgrade("ink"));

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.position.set(0, height < 620 ? 8.2 : 7.4, height < 620 ? 10.2 : 9.2);
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", resize);
resize();
resetFighters();
drawGuide();
updateUi();

const clock = new THREE.Clock();

function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);
  const time = clock.elapsedTime;

  rim.material.emissiveIntensity = 0.55 + Math.sin(time * 3) * 0.15;
  arena.rotation.y += dt * 0.08;

  if (state.phase === "attack") {
    state.attackTime += dt;
    const playerBoost = 1 + (state.powerLevel - 1) * 0.18;
    const enemyBoost = 0.9 + state.round * 0.035;
    const toEnemy = new THREE.Vector3().subVectors(enemy.position, player.position).normalize();
    const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();
    player.userData.velocity.addScaledVector(toEnemy, dt * 0.82);
    enemy.userData.velocity.addScaledVector(toPlayer, dt * 0.76);

    player.rotation.y = Math.atan2(-toEnemy.z, toEnemy.x);
    enemy.rotation.y = Math.atan2(-toPlayer.z, toPlayer.x);
    player.rotation.z = Math.sin(time * 8) * 0.08;
    enemy.rotation.z = Math.cos(time * 8) * 0.08;

    pushByWeapon(player, enemy, dt * 9.4 * playerBoost);
    pushByWeapon(enemy, player, dt * 7.5 * enemyBoost);

    [player, enemy].forEach((fighter) => {
      fighter.position.addScaledVector(fighter.userData.velocity, dt);
      fighter.userData.velocity.multiplyScalar(0.95);
    });

    if (player.position.length() > arenaRadius + 0.3) finishRound("enemy");
    if (enemy.position.length() > arenaRadius + 0.3) finishRound("player");
    if (state.attackTime > 9 && state.phase === "attack") {
      finishRound(player.position.length() < enemy.position.length() ? "player" : "enemy");
    }
  }

  if (state.phase === "result") {
    state.resultTime += dt;
    const fallen = state.winner === "player" ? enemy : player;
    fallen.rotation.x = Math.min(Math.PI / 2, fallen.rotation.x + dt * 4);
    fallen.position.y = Math.max(-1.4, fallen.position.y - dt * 2.2);
    if (state.resultTime > 2.2) nextRound();
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
