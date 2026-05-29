window.Player = class {
  constructor(scene, type) {
    this.scene = scene;
    this.hp = 100;
    this.maxHp = 100;
    this.baseSpeed = 6;
    this.speedMultiplier = 1;
    this.keys = { w: false, a: false, s: false, d: false };
    this.immortal = false;
    this.mesh = null;
    this.buildMesh(type || 'cube');
    scene.add(this.mesh);

    const keyMap = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd' };
    document.addEventListener('keydown', (e) => { const k = keyMap[e.code]; if (k) this.keys[k] = true; });
    document.addEventListener('keyup', (e) => { const k = keyMap[e.code]; if (k) this.keys[k] = false; });
  }

  get speed() { return this.baseSpeed * this.speedMultiplier; }

  buildMesh(type) {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) this.mesh.material.dispose();
    }
    let geo, yPos;
    if (type === 'sphere') {
      geo = new THREE.SphereGeometry(0.4, 16, 16);
      yPos = 0.4;
    } else {
      geo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
      yPos = 0.35;
    }
    const mat = new THREE.MeshStandardMaterial({ color: type === 'sphere' ? 0xff8844 : 0x44ddff });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.y = yPos;
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);
    this.meshType = type;
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
    if (this.immortal) return;
    this.hp = Math.max(0, this.hp - dmg);
  }

  reset() {
    this.hp = this.maxHp;
    this.mesh.position.set(0, this.meshType === 'sphere' ? 0.4 : 0.35, 0);
    this.mesh.rotation.y = 0;
  }
};
