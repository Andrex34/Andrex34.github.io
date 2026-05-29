window.Combat = class {
  constructor(scene, player, enemies) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.projectiles = [];
    this.attackCooldown = 0;
    this.attackRate = 0.4;
    this.baseDamage = 10;
    this.range = 12;
    this.damageMultiplier = 1;
  }

  get damage() { return this.baseDamage * this.damageMultiplier; }

  update(dt, onKill) {
    this.attackCooldown -= dt;

    if (this.attackCooldown <= 0 && this.enemies.alive.length > 0) {
      const closest = this.enemies.alive.reduce((a, b) => {
        const da = a.mesh.position.distanceTo(this.player.mesh.position);
        const db = b.mesh.position.distanceTo(this.player.mesh.position);
        return da < db ? a : b;
      });
      if (closest.mesh.position.distanceTo(this.player.mesh.position) <= this.range) {
        this.fire(closest);
        this.attackCooldown = this.attackRate;
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));

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
    }
  }

  fire(enemy) {
    const geo = new THREE.SphereGeometry(0.12, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0x88ddff });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(this.player.mesh.position);
    mesh.position.y = 0.5;
    this.scene.add(mesh);

    const dir = new THREE.Vector3().copy(enemy.mesh.position).sub(mesh.position).normalize();
    this.projectiles.push({ mesh, velocity: dir.multiplyScalar(12), target: enemy.mesh });
  }

  reset() {
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
    this.attackCooldown = 0;
  }
};
