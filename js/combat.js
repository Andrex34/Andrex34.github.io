window.Combat = class {
  constructor(scene, player, enemies, cursorTarget) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.cursorTarget = cursorTarget;
    this.aimMode = 'auto';
    this.projectiles = [];
    this.attackCooldown = 0;
    this.damageMultiplier = 1;
  }

  get damage() { return this.player.damage * this.damageMultiplier; }

  update(dt, onKill) {
    this.attackCooldown -= dt;

    if (this.attackCooldown <= 0 && this.enemies.alive.length > 0) {
      const range = this.player.range;
      const rate = this.player.attackRate;
      if (this.aimMode === 'auto') {
        const closest = this.enemies.alive.reduce((a, b) => {
          const da = a.model.position.distanceTo(this.player.mesh.position);
          const db = b.model.position.distanceTo(this.player.mesh.position);
          return da < db ? a : b;
        });
        if (closest.model.position.distanceTo(this.player.mesh.position) <= range) {
          this.fire(closest.model);
          this.attackCooldown = rate;
        }
      } else {
        const dist = this.cursorTarget.distanceTo(this.player.mesh.position);
        if (dist > 0.5) {
          this.fire(null);
          this.attackCooldown = rate;
        }
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
      p.traveled += p.velocity.length() * dt;

      if (p.traveled >= this.player.range) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.target) {
        if (!p.target.parent) {
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
          continue;
        }
        const hitRadius = p.target.userData.enemyData && p.target.userData.enemyData.isBoss ? 1.2 : 0.8;
        if (p.mesh.position.distanceTo(p.target.position) < hitRadius) {
          const data = p.target.userData.enemyData;
          if (data) data.hp -= this.damage;
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
          if (data && data.hp <= 0) onKill();
        }
      } else {
        let hit = false;
        for (const e of this.enemies.alive) {
          const hitRadius = e.isBoss ? 1.2 : 0.8;
          if (p.mesh.position.distanceTo(e.model.position) < hitRadius) {
            const data = e.model.userData.enemyData;
            if (data) data.hp -= this.damage;
            hit = true;
            if (data && data.hp <= 0) onKill();
            break;
          }
        }
        if (hit) {
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  fire(targetMesh) {
    const geo = new THREE.SphereGeometry(0.12, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0x88ddff });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(this.player.mesh.position);
    mesh.position.y = 0.5;
    this.scene.add(mesh);

    let dir;
    if (targetMesh) {
      dir = new THREE.Vector3().copy(targetMesh.position).sub(mesh.position).normalize();
    } else {
      dir = new THREE.Vector3().copy(this.cursorTarget).sub(mesh.position);
      dir.y = 0;
      dir.normalize();
    }
    this.projectiles.push({ mesh, velocity: dir.multiplyScalar(12), target: targetMesh || null, traveled: 0 });
  }

  reset() {
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
    this.attackCooldown = 0;
  }
};
