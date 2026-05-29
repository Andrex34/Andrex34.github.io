const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('game-container').prepend(renderer.domElement);

const hud = new Hud();
const arena = new Arena(scene);
const player = new Player(scene);
const enemies = new Enemies(scene);
const combat = new Combat(scene, player, enemies);
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
      upgrades.show(() => {
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

document.getElementById('play-btn').addEventListener('click', startGame);

document.getElementById('char-btn').addEventListener('click', () => {
  document.getElementById('main-menu').classList.add('hidden');
  document.getElementById('char-select').classList.remove('hidden');
});

document.getElementById('char-back-btn').addEventListener('click', () => {
  document.getElementById('char-select').classList.add('hidden');
  document.getElementById('main-menu').classList.remove('hidden');
});

document.querySelectorAll('.char-card').forEach((card) => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    player.buildMesh(card.dataset.char);
  });
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
});

document.getElementById('restart-btn').addEventListener('click', restart);

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (gameState === 'playing' && !hud.gameOverVisible && !paused) {
    player.update(dt, arena.size);
    enemies.update(dt, player.mesh.position, player);
    combat.update(dt, () => { kills++; hud.setKills(kills); });
    hud.setHp(player.hp, player.maxHp);
    if (player.hp <= 0) gameOver();
    checkWaveComplete();
  }

  const camDist = 10;
  const camHeight = 8;
  const p = player.mesh.position;
  camera.position.set(p.x, p.y + camHeight, p.z + camDist);
  camera.lookAt(p.x, 0, p.z);

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
