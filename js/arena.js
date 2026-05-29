window.Arena = class {
  constructor(scene) {
    this.scene = scene;
    this.size = 16;
    this.ground = null;
    this.mountains = [];
    this.create();
  }

  create() {
    const geo = new THREE.PlaneGeometry(this.size, this.size);
    const mat = new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.9 });
    this.ground = new THREE.Mesh(geo, mat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    this.buildMountains();

    const ambient = new THREE.AmbientLight(0x406040, 0.5);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffeedd, 1.2);
    dir.position.set(15, 25, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    this.scene.add(dir);
  }

  buildMountains() {
    const count = 16;
    const innerR = this.size / 2;
    const mMat = new THREE.MeshStandardMaterial({ color: 0x5a5a3a, roughness: 0.7, flatShading: true });

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = innerR + Math.random() * 2;
      const h = 1.2 + Math.random() * 1.8;
      const cGeo = new THREE.ConeGeometry(0.8 + Math.random() * 0.6, h, 5 + Math.floor(Math.random() * 3));
      const mesh = new THREE.Mesh(cGeo, mMat);
      mesh.position.set(Math.cos(angle) * r, h / 2, Math.sin(angle) * r);
      mesh.rotation.y = Math.random() * Math.PI;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.mountains.push(mesh);
    }
  }

  switchTo(config) {
    this.size = config.size || 16;
    this.ground.geometry.dispose();
    this.ground.geometry = new THREE.PlaneGeometry(this.size, this.size);
    this.ground.material.color.setHex(config.ground || 0x3a4a3a);

    this.scene.children
      .filter(c => c.isLight && c.type === 'AmbientLight')
      .forEach(c => c.color.setHex(config.ambient || 0x406040));

    const innerR = this.size / 2;
    this.mountains.forEach((m, i) => {
      const angle = (i / this.mountains.length) * Math.PI * 2;
      const r = innerR + Math.random() * 2;
      m.position.set(Math.cos(angle) * r, m.geometry.parameters.height / 2, Math.sin(angle) * r);
      m.material.color.setHex(config.mountain || 0x5a5a3a);
    });
  }

  reset() {
    this.switchTo({ size: 16, ground: 0x3a4a3a, mountain: 0x5a5a3a, ambient: 0x406040 });
  }
};
