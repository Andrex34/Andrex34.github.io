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
let kills = 0;
let pendingChoice = false;

function spawnWave() {
  wave++;
  const count = 3 + wave * 2;
  enemies.spawnWave(count, arena.size);
  hud.setWave(wave);
}

function checkWaveComplete() {
  if (pendingChoice) return;
  if (enemies.alive.length === 0 && enemies.totalSpawned > 0) {
    pendingChoice = true;
    upgrades.show(() => {
      locations.show((nextArena) => {
        arena.switchTo(nextArena);
        spawnWave();
        pendingChoice = false;
      });
    });
  }
}

function gameOver() {
  hud.showGameOver(wave, kills);
}

function restart() {
  wave = 0;
  kills = 0;
  pendingChoice = false;
  enemies.clear();
  player.reset();
  combat.reset();
  arena.reset();
  hud.hideGameOver();
  hud.setKills(0);
  hud.setWave(0);
  hud.setHp(player.hp, player.maxHp);
  spawnWave();
}

document.getElementById('restart-btn').addEventListener('click', restart);

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (!hud.gameOverVisible) {
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

spawnWave();
animate();
