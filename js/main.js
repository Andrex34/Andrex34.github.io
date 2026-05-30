const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('game-container').prepend(renderer.domElement);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const cursorTarget = new THREE.Vector3();

let cameraMode = 'topdown';
let camTheta = 0;
let camPhi = Math.PI / 4;
let camRadius = 10;

document.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(groundPlane, cursorTarget);

  if (cameraMode === 'thirdperson') {
    camTheta -= e.movementX * 0.005;
    camPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, camPhi + e.movementY * 0.005));
  }
});

document.addEventListener('wheel', (e) => {
  if (cameraMode === 'thirdperson') {
    camRadius = Math.max(3, Math.min(25, camRadius + e.deltaY * 0.01));
  }
});

let selectedChar = 'knight';

const hud = new Hud();
const arena = new Arena(scene);
const player = new Player(scene, selectedChar);
window.playerRef = player;
const enemies = new Enemies(scene);
const combat = new Combat(scene, player, enemies, cursorTarget);
const upgrades = new Upgrades();
const locations = new Locations();

let wave = 0;
let levelWave = 0;
let level = 1;
let kills = 0;
let pendingChoice = false;
let gameState = 'menu';
let paused = false;

const konamiSeq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','Space','Enter'];
let konamiIdx = 0;

document.addEventListener('keydown', (e) => {
  if (gameState === 'playing' && e.code === 'KeyP' && !hud.gameOverVisible && !document.getElementById('cheat-menu').classList.contains('hidden')) return;
  if (gameState === 'playing' && e.code === 'KeyP' && !hud.gameOverVisible) {
    paused = !paused;
    document.getElementById('pause-overlay').classList.toggle('hidden', !paused);
    updateCursor();
    return;
  }
  if (gameState !== 'playing' || paused) return;
  if (e.code === konamiSeq[konamiIdx]) {
    konamiIdx++;
    if (konamiIdx === konamiSeq.length) {
      konamiIdx = 0;
      document.getElementById('cheat-menu').classList.remove('hidden');
    }
  } else {
    konamiIdx = 0;
  }
});

function updateCursor() {
  if (cameraMode === 'thirdperson' && gameState === 'playing' && !hud.gameOverVisible && !paused) {
    const modalsHidden = ['upgrade-modal', 'location-modal', 'cheat-menu'].every(
      id => document.getElementById(id).classList.contains('hidden')
    );
    document.body.style.cursor = modalsHidden ? 'none' : 'default';
  } else {
    document.body.style.cursor = 'default';
  }
}

function startGame() {
  gameState = 'playing';
  document.getElementById('main-menu').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  hud.setHp(player.hp, player.maxHp);
  hud.setKills(0);
  hud.setWave(0);
  nextWave();
}

function nextWave() {
  enemies.clear();
  wave++;
  levelWave++;
  const isBoss = levelWave === 3;
  const count = 3 + wave * 2;
  enemies.spawnWave(count, arena.size, isBoss);
  hud.setWave(wave);
}

function checkWaveComplete() {
  if (pendingChoice) return;
  if (enemies.alive.length === 0 && enemies.totalSpawned > 0) {
    pendingChoice = true;
    if (enemies.hasBoss) {
      levelWave = 0;
      level++;
      locations.showNonFunctional(() => {
        nextWave();
        pendingChoice = false;
      });
    } else {
      upgrades.show(player, combat, () => {
        nextWave();
        pendingChoice = false;
      });
    }
  }
}

function gameOver() {
  gameState = 'gameover';
  hud.showGameOver(wave, kills);
}

function restart() {
  wave = 0;
  levelWave = 0;
  level = 1;
  kills = 0;
  pendingChoice = false;
  paused = false;
  document.getElementById('pause-overlay').classList.add('hidden');
  document.getElementById('upgrade-modal').classList.add('hidden');
  document.getElementById('location-modal').classList.add('hidden');
  enemies.clear();
  player.reset();
  combat.reset();
  arena.reset();
  hud.hideGameOver();
  hud.setKills(0);
  hud.setWave(0);
  hud.setHp(player.hp, player.maxHp);
  gameState = 'playing';
  nextWave();
}

document.getElementById('aim-toggle').addEventListener('change', (e) => {
  combat.aimMode = e.target.checked ? 'cursor' : 'auto';
  document.getElementById('aim-label').textContent = combat.aimMode === 'auto' ? 'Aim: Auto' : 'Aim: Cursor';
});

document.getElementById('camera-toggle').addEventListener('change', (e) => {
  cameraMode = e.target.checked ? 'thirdperson' : 'topdown';
  updateCursor();
  document.getElementById('camera-label').textContent = cameraMode === 'topdown' ? 'Camera: Top-down' : 'Camera: 3rd Person';
});

document.getElementById('play-btn').addEventListener('click', startGame);

function buildCharSelect() {
  const container = document.getElementById('char-cards');
  container.innerHTML = '';
  if (window._charsLoading) {
    container.innerHTML = '<p style="color:#aaa;grid-column:1/-1;">Loading characters...</p>';
    return;
  }
  for (const [key, def] of Object.entries(CHARACTERS)) {
    const card = document.createElement('div');
    card.className = 'char-card' + (key === selectedChar ? ' selected' : '');
    card.dataset.char = key;
    card.innerHTML = `
      <div class="char-preview"><div class="char-icon" style="background:${new THREE.Color(def.color).getStyle()}"></div></div>
      <h3>${def.name}</h3>
      <p>${def.desc}</p>
      <div class="char-stats">
        <span>HP ${def.stats.hp}</span>
        <span>DMG ${def.stats.damage}</span>
        <span>SPD ${def.stats.speed}</span>
      </div>`;
    card.addEventListener('click', () => {
      document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedChar = key;
      player.setCharacter(key);
    });
    container.appendChild(card);
  }
}

document.getElementById('char-btn').addEventListener('click', () => {
  buildCharSelect();
  document.getElementById('main-menu').classList.add('hidden');
  document.getElementById('char-select').classList.remove('hidden');
});

document.getElementById('char-back-btn').addEventListener('click', () => {
  document.getElementById('char-select').classList.add('hidden');
  document.getElementById('main-menu').classList.remove('hidden');
});

document.getElementById('cheat-immortal').addEventListener('change', (e) => {
  player.immortal = e.target.checked;
});

document.getElementById('cheat-damage').addEventListener('change', (e) => {
  combat.damageMultiplier = e.target.checked ? 500 : 1;
});

document.getElementById('cheat-speed').addEventListener('change', (e) => {
  player.speedMultiplier = e.target.checked ? 3 : 1;
});

document.getElementById('cheat-close-btn').addEventListener('click', () => {
  document.getElementById('cheat-menu').classList.add('hidden');
  updateCursor();
});

document.getElementById('restart-btn').addEventListener('click', restart);

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (gameState === 'playing' && !hud.gameOverVisible && !paused) {
    player.update(dt, arena, camera, cameraMode);
    enemies.update(dt, player.mesh.position, player, arena);
    combat.update(dt, () => { kills++; hud.setKills(kills); });
    hud.setHp(player.hp, player.maxHp);
    if (player.hp <= 0) gameOver();
    checkWaveComplete();
  }

  player.updateMixer(dt);
  updateCursor();

  const p = player.mesh.position;
  if (cameraMode === 'thirdperson') {
    camera.position.x = p.x + camRadius * Math.sin(camTheta) * Math.cos(camPhi);
    camera.position.y = p.y + camRadius * Math.sin(camPhi);
    camera.position.z = p.z + camRadius * Math.cos(camTheta) * Math.cos(camPhi);
    camera.lookAt(p.x, 0.5, p.z);
  } else {
    camera.position.set(p.x, p.y + 8, p.z + 10);
    camera.lookAt(p.x, 0, p.z);
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
