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
const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1b891, roughness: 0.58 });
const hairMat = new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: 0.74 });
const pantsMat = new THREE.MeshStandardMaterial({ color: 0x263a59, roughness: 0.62 });
const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111820, roughness: 0.7 });
const weaponMat = new THREE.MeshStandardMaterial({
  color: 0xffd35a,
  emissive: 0x3d2500,
  metalness: 0.35,
  roughness: 0.32,
});
const enemyWeaponMat = new THREE.MeshStandardMaterial({
  color: 0x8bb7ff,
  metalness: 0.25,
  roughness: 0.36,
});

function makeLimb(length, radius, material) {
  const limb = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 8, 16), material);
  limb.castShadow = true;
  return limb;
}

function createFighter(material, accentMaterial) {
  const group = new THREE.Group();
  const hips = new THREE.Group();
  const torso = makeLimb(0.62, 0.28, material);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 28, 18), skinMat);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.245, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), hairMat);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.3), accentMaterial);
  const weaponMount = new THREE.Group();
  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();

  torso.position.y = 1.02;
  torso.rotation.z = 0.04;
  head.position.y = 1.62;
  hair.position.y = 1.7;
  chest.position.y = 1.18;

  const leftUpperArm = makeLimb(0.38, 0.07, skinMat);
  const leftForearm = makeLimb(0.38, 0.065, skinMat);
  leftUpperArm.position.y = -0.19;
  leftForearm.position.y = -0.56;
  leftArm.position.set(-0.36, 1.28, 0);
  leftArm.rotation.z = 0.45;
  leftArm.add(leftUpperArm, leftForearm);

  const rightUpperArm = makeLimb(0.36, 0.07, skinMat);
  const rightForearm = makeLimb(0.44, 0.065, skinMat);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), skinMat);
  rightUpperArm.position.y = -0.18;
  rightForearm.position.y = -0.53;
  hand.position.y = -0.78;
  rightArm.position.set(0.37, 1.28, 0);
  rightArm.rotation.z = -1.18;
  rightArm.add(rightUpperArm, rightForearm, hand);

  const leftThigh = makeLimb(0.38, 0.09, pantsMat);
  const leftShin = makeLimb(0.42, 0.075, skinMat);
  const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.32), shoeMat);
  leftThigh.position.y = -0.19;
  leftShin.position.y = -0.58;
  leftShoe.position.set(0.04, -0.83, 0.08);
  leftLeg.position.set(-0.17, 0.74, 0);
  leftLeg.add(leftThigh, leftShin, leftShoe);

  const rightThigh = makeLimb(0.38, 0.09, pantsMat);
  const rightShin = makeLimb(0.42, 0.075, skinMat);
  const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.32), shoeMat);
  rightThigh.position.y = -0.19;
  rightShin.position.y = -0.58;
  rightShoe.position.set(0.04, -0.83, 0.08);
  rightLeg.position.set(0.17, 0.74, 0);
  rightLeg.add(rightThigh, rightShin, rightShoe);

  [head, hair, chest, leftShoe, rightShoe].forEach((mesh) => {
    mesh.castShadow = true;
  });

  hips.add(torso, chest, head, hair, leftArm, rightArm, leftLeg, rightLeg);
  weaponMount.position.set(0.42, 0.78, 0);
  group.add(hips);
  group.add(weaponMount);
  group.userData.radius = 0.34;
  group.userData.velocity = new THREE.Vector3();
  group.userData.weaponMount = weaponMount;
  group.userData.parts = { hips, leftArm, rightArm, leftLeg, rightLeg };
  group.userData.weaponReach = 2;
  return group;
}

const player = createFighter(playerMat, playerMat);
const enemy = createFighter(enemyMat, enemyMat);
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

function normalizeGeneratedPaths(paths) {
  const points = paths.flat();
  if (!points.length) return [];
  const bounds = points.reduce(
    (box, point) => ({
      minX: Math.min(box.minX, point.x),
      maxX: Math.max(box.maxX, point.x),
      minY: Math.min(box.minY, point.y),
      maxY: Math.max(box.maxY, point.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  return paths.map((path) =>
    path.map((point) => ({
      x: (point.x - bounds.minX) / width,
      y: 1 - (point.y - bounds.minY) / height,
    })),
  );
}

window.__gameDebug = {
  getState: () => ({
    phase: state.phase,
    round: state.round,
    coins: state.coins,
    inkUsed: state.inkUsed,
    playerPosition: player.position.toArray(),
    enemyPosition: enemy.position.toArray(),
    playerSpeed: player.userData.velocity.length(),
    enemySpeed: enemy.userData.velocity.length(),
  }),
  getFighterParts: () => ({
    player: Object.keys(player.userData.parts),
    enemy: Object.keys(enemy.userData.parts),
  }),
  getWeaponTrace: () => {
    const weapon = playerWeapon;
    return {
      sourceNormalized: weapon?.userData.sourceNormalized ?? [],
      generatedNormalized: normalizeGeneratedPaths(weapon?.userData.generatedPaths ?? []),
      reach: weapon?.userData.reach ?? 0,
      meshCount: weapon?.children.length ?? 0,
    };
  },
};

function resetFighters() {
  player.position.set(-1.8, 0, 0);
  enemy.position.set(1.8, 0, 0);
  player.rotation.set(0, 0, 0);
  enemy.rotation.set(0, Math.PI, 0);
  player.userData.velocity.set(0, 0, 0);
  enemy.userData.velocity.set(0, 0, 0);
  [player, enemy].forEach((fighter) => {
    fighter.position.y = 0;
    fighter.userData.parts.hips.rotation.set(0, 0, 0);
    fighter.userData.parts.leftArm.rotation.set(0, 0.15, 0.45);
    fighter.userData.parts.rightArm.rotation.set(0, -0.1, -1.18);
    fighter.userData.parts.leftLeg.rotation.set(0, 0, 0);
    fighter.userData.parts.rightLeg.rotation.set(0, 0, 0);
  });
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

function normalizeStrokes(strokes) {
  const source = strokes.length ? strokes : [[{ x: 80, y: 120 }, { x: 340, y: 90 }]];
  const bounds = strokeBounds(source);
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  return source.map((stroke) =>
    stroke.map((point) => ({
      x: (point.x - bounds.minX) / width,
      y: (point.y - bounds.minY) / height,
    })),
  );
}

function drawingPointToWeapon(point, bounds, scale) {
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  return new THREE.Vector3(
    (point.x - bounds.minX) * scale + 0.16,
    -(point.y - bounds.minY - height / 2) * scale,
    0,
  );
}

function createTubeBetween(a, b, radius, material) {
  const delta = new THREE.Vector3().subVectors(b, a);
  const length = Math.max(delta.length(), 0.001);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 14), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  mesh.castShadow = true;
  return mesh;
}

function createWeaponFromDrawing(strokes, material) {
  const weapon = new THREE.Group();
  const source = strokes.length ? strokes : [[{ x: 80, y: 120 }, { x: 340, y: 90 }]];
  const bounds = strokeBounds(source);
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  const scale = Math.min(2.9 / width, 1.55 / height, 0.028);
  const radius = Math.max(0.045, Math.min(0.085, scale * 5.2));
  const generatedPaths = [];

  source.forEach((stroke) => {
    const path = [];
    for (let i = 1; i < stroke.length; i += 1) {
      const a = drawingPointToWeapon(stroke[i - 1], bounds, scale);
      const b = drawingPointToWeapon(stroke[i], bounds, scale);
      if (i === 1) path.push({ x: a.x, y: a.y });
      path.push({ x: b.x, y: b.y });
      weapon.add(createTubeBetween(a, b, radius, material));
    }
    stroke.forEach((point) => {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.05, 12, 8),
        material,
      );
      sphere.position.copy(drawingPointToWeapon(point, bounds, scale));
      sphere.castShadow = true;
      weapon.add(sphere);
    });
    if (path.length) generatedPaths.push(path);
  });

  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.52, 16), darkMat);
  grip.rotation.z = Math.PI / 2;
  grip.position.set(0.02, 0, 0);
  grip.castShadow = true;
  weapon.add(grip);

  weapon.userData.sourceNormalized = normalizeStrokes(source);
  weapon.userData.generatedPaths = generatedPaths;
  weapon.userData.bounds = { ...bounds, width, height, scale };
  weapon.userData.reach = Math.min(3.25, 0.46 + width * scale);
  return weapon;
}

function createEnemyWeapon() {
  const weapon = new THREE.Group();
  const handle = createTubeBetween(new THREE.Vector3(0.1, 0, 0), new THREE.Vector3(2.1, 0.16, 0), 0.07, enemyWeaponMat);
  const weight = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.5, 0.42), enemyWeaponMat);
  weight.position.set(2.28, 0.18, 0);
  handle.castShadow = true;
  weight.castShadow = true;
  weapon.add(handle, weight);
  weapon.userData.reach = 2.3 + Math.min(state.round * 0.04, 0.5);
  weapon.userData.generatedPaths = [[{ x: 0.1, y: 0 }, { x: 2.1, y: 0.16 }]];
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
  player.userData.weaponMount.add(playerWeapon);
  enemy.userData.weaponMount.add(enemyWeapon);
  player.userData.weaponReach = playerWeapon.userData.reach;
  enemy.userData.weaponReach = enemyWeapon.userData.reach;
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
  const reach = attacker.userData.weaponReach ?? 2;
  const delta = new THREE.Vector3().subVectors(defender.position, attacker.position);
  const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(attacker.quaternion);
  const forwardDistance = delta.dot(forward);
  const sideDistance = Math.abs(delta.z);
  if (forwardDistance > 0.2 && forwardDistance < reach && sideDistance < 0.98) {
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

function animateFighter(fighter, time, intensity, side) {
  const parts = fighter.userData.parts;
  const run = Math.sin(time * 14 + side);
  const counterRun = Math.sin(time * 14 + side + Math.PI);
  parts.hips.position.y = Math.abs(run) * 0.06 * intensity;
  parts.hips.rotation.z = run * 0.08 * intensity;
  parts.leftLeg.rotation.z = run * 0.42 * intensity;
  parts.rightLeg.rotation.z = counterRun * 0.42 * intensity;
  parts.leftArm.rotation.z = 0.42 + counterRun * 0.36 * intensity;
  parts.rightArm.rotation.z = -1.05 + Math.sin(time * 18 + side) * 0.34 * intensity;
  fighter.userData.weaponMount.rotation.z = Math.sin(time * 18 + side) * 0.2 * intensity;
}

function relaxFighter(fighter) {
  const parts = fighter.userData.parts;
  parts.hips.position.y *= 0.84;
  parts.hips.rotation.z *= 0.84;
  parts.leftLeg.rotation.z *= 0.84;
  parts.rightLeg.rotation.z *= 0.84;
  parts.leftArm.rotation.z += (0.45 - parts.leftArm.rotation.z) * 0.12;
  parts.rightArm.rotation.z += (-1.18 - parts.rightArm.rotation.z) * 0.12;
  fighter.userData.weaponMount.rotation.z *= 0.82;
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);
  const time = clock.elapsedTime;

  rim.material.emissiveIntensity = 0.55 + Math.sin(time * 3) * 0.15;
  arena.rotation.y += dt * 0.08;

  if (state.phase === "attack") {
    state.attackTime += dt;
    const playerBoost = 1 + (state.powerLevel - 1) * 0.18;
    const enemyBoost = 0.92 + state.round * 0.035;
    const toEnemy = new THREE.Vector3().subVectors(enemy.position, player.position).normalize();
    const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();
    player.userData.velocity.addScaledVector(toEnemy, dt * 2.7);
    enemy.userData.velocity.addScaledVector(toPlayer, dt * 2.45);

    player.rotation.y = Math.atan2(-toEnemy.z, toEnemy.x);
    enemy.rotation.y = Math.atan2(-toPlayer.z, toPlayer.x);
    player.rotation.z = Math.sin(time * 12) * 0.06;
    enemy.rotation.z = Math.cos(time * 12) * 0.06;
    animateFighter(player, time, 1, 0);
    animateFighter(enemy, time, 0.95, Math.PI * 0.45);

    pushByWeapon(player, enemy, dt * 22 * playerBoost);
    pushByWeapon(enemy, player, dt * 17.2 * enemyBoost);

    [player, enemy].forEach((fighter) => {
      fighter.position.addScaledVector(fighter.userData.velocity, dt);
      fighter.userData.velocity.multiplyScalar(0.91);
    });

    if (player.position.length() > arenaRadius + 0.3) finishRound("enemy");
    if (enemy.position.length() > arenaRadius + 0.3) finishRound("player");
    if (state.attackTime > 9 && state.phase === "attack") {
      finishRound(player.position.length() < enemy.position.length() ? "player" : "enemy");
    }
  } else {
    relaxFighter(player);
    relaxFighter(enemy);
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
