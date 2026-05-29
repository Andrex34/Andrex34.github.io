window.Enemies = class {
  constructor(scene) {
    this.scene = scene;
    this.alive = [];
    this.totalSpawned = 0;
    this.damageCooldowns = new Map();
    this.hasBoss = false;
  }

  spawnWave(count, arenaSize, isBoss) {
    this.totalSpawned = 0;
    this.hasBoss = isBoss;
    const spawnCount = isBoss ? Math.max(3, count - 2) : count;

    for (let i = 0; i < spawnCount; i++) {
      const r = isBoss && i === spawnCount - 1 ? 0.7 : 0.4;
      const color = isBoss && i === spawnCount - 1 ? 0xaa44ff : 0xff4444;
      const geo = new THREE.SphereGeometry(r, 10, 10);
      const mat = new THREE.MeshStandardMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      let x, z;
      do {
        x = (Math.random() - 0.5) * arenaSize * 0.8;
        z = (Math.random() - 0.5) * arenaSize * 0.8;
      } while (Math.abs(x) < 2 && Math.abs(z) < 2);
      mesh.position.set(x, r, z);
      const isBossMob = isBoss && i === spawnCount - 1;
      const data = {
        hp: isBossMob ? 5 * (2 + Math.floor(count / 5)) : 1,
        speed: 1.5 + count * 0.08,
        damage: isBossMob ? 15 + count : 5 + count,
        isBoss: isBossMob,
      };
      mesh.userData = { enemyData: data };
      this.scene.add(mesh);
      this.alive.push({ mesh, ...data });
      this.totalSpawned++;
    }
  }

  get bossAlive() {
    return this.alive.some(e => e.isBoss);
  }

  update(dt, playerPos, player) {
    for (let i = this.alive.length - 1; i >= 0; i--) {
      const e = this.alive[i];
      const dir = new THREE.Vector3().copy(playerPos).sub(e.mesh.position);
      dir.y = 0;
      if (dir.length() > 0.3) {
        dir.normalize();
        e.mesh.position.x += dir.x * e.speed * dt;
        e.mesh.position.z += dir.z * e.speed * dt;
      }
      const r = e.isBoss ? 0.7 : 0.4;
      e.mesh.position.y = r;
      if (e.mesh.position.distanceTo(playerPos) < r + 0.35) {
        const last = this.damageCooldowns.get(e) || 0;
        if (Date.now() - last > 500) {
          player.takeDamage(e.damage);
          this.damageCooldowns.set(e, Date.now());
        }
      }
    }
    this.removeDead();
  }

  removeDead() {
    for (let i = this.alive.length - 1; i >= 0; i--) {
      if (this.alive[i].hp <= 0) {
        this.damageCooldowns.delete(this.alive[i]);
        this.scene.remove(this.alive[i].mesh);
        this.alive.splice(i, 1);
      }
    }
  }

  clear() {
    for (const e of this.alive) this.scene.remove(e.mesh);
    this.alive = [];
    this.totalSpawned = 0;
    this.damageCooldowns.clear();
    this.hasBoss = false;
  }
};
