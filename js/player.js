window.Player = class {
  constructor(scene) {
    this.hp = 100;
    this.maxHp = 100;
    this.speed = 6;
    this.keys = { w: false, a: false, s: false, d: false };

    const geo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const mat = new THREE.MeshStandardMaterial({ color: 0x44ddff });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.y = 0.35;
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    document.addEventListener('keydown', (e) => { if (e.key in this.keys) this.keys[e.key] = true; });
    document.addEventListener('keyup', (e) => { if (e.key in this.keys) this.keys[e.key] = false; });
  }

  update(dt, arenaSize) {
    const dir = new THREE.Vector3();
    if (this.keys.w) dir.z -= 1;
    if (this.keys.s) dir.z += 1;
    if (this.keys.a) dir.x -= 1;
    if (this.keys.d) dir.x += 1;
    if (dir.length() > 0) {
      dir.normalize();
      this.mesh.position.x += dir.x * this.speed * dt;
      this.mesh.position.z += dir.z * this.speed * dt;
      this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    }
    const half = arenaSize / 2 - 0.5;
    this.mesh.position.x = Math.max(-half, Math.min(half, this.mesh.position.x));
    this.mesh.position.z = Math.max(-half, Math.min(half, this.mesh.position.z));
  }

  takeDamage(dmg) {
    this.hp = Math.max(0, this.hp - dmg);
  }

  reset() {
    this.hp = this.maxHp;
    this.mesh.position.set(0, 0.35, 0);
    this.mesh.rotation.y = 0;
  }
};
