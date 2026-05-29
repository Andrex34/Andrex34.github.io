window.Enemies = class {
  constructor(scene) {
    this.scene = scene;
    this.alive = [];
    this.totalSpawned = 0;
    this.damageCooldowns = new Map();
  }

  spawnWave(count, arenaSize) {
    this.totalSpawned = 0;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.4, 8, 8);
      const mat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      let x, z;
      do {
        x = (Math.random() - 0.5) * arenaSize * 0.8;
        z = (Math.random() - 0.5) * arenaSize * 0.8;
      } while (Math.abs(x) < 2 && Math.abs(z) < 2);
      mesh.position.set(x, 0.4, z);
      const data = { hp: 2 + Math.floor(count / 5), speed: 1.5 + count * 0.08, damage: 5 + count };
      mesh.userData = { enemyData: data };
      this.scene.add(mesh);
      this.alive.push({ mesh, ...data });
      this.totalSpawned++;
    }
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
      e.mesh.position.y = 0.4;
      if (e.mesh.position.distanceTo(playerPos) < 0.8) {
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
  }
};
