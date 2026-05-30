window.Arena = class {
  constructor(scene) {
    this.scene = scene;
    this.size = 16;
    this.objects = [];
    this._models = {};
    this._dungeonTex = null;
    this._ready = false;
    this.ground = null;
    this._colliders = [];
    this._createTemp();
    this._loadDungeon();
  }

  _createTemp() {
    const geo = new THREE.PlaneGeometry(this.size, this.size);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
    this.ground = new THREE.Mesh(geo, mat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    const ambient = new THREE.AmbientLight(0x202040, 0.3);
    ambient.name = 'ambient';
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xff8844, 0.8);
    dir.position.set(8, 16, 5);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.name = 'sun';
    this.scene.add(dir);
  }

  _base64ToArrayBuffer(b64) {
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }

  _loadDungeon() {
    const texData = 'data:image/png;base64,' + window.ARENA_TEXTURE;
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => url.includes('colormap.png') ? texData : url);
    const loader = new THREE.GLTFLoader(manager);
    let pending = Object.keys(window.ARENA_DATA).length;
    let texReady = false;

    const img = new Image();
    img.onload = () => {
      this._dungeonTex = new THREE.Texture(img);
      this._dungeonTex.flipY = false;
      this._dungeonTex.needsUpdate = true;
      texReady = true;
      if (pending === 0) this._build();
    };
    img.src = texData;

    for (const [key, ad] of Object.entries(window.ARENA_DATA)) {
      const ab = this._base64ToArrayBuffer(ad.data);
      loader.parse(ab, '', (gltf) => {
        gltf.scene.scale.set(2, 2, 2);
        this._models[key] = gltf.scene;
        pending--;
        if (pending === 0 && texReady) this._build();
      });
    }
  }

  _assignTex(mesh) {
    if (!this._dungeonTex) return;
    const m = mesh.material;
    if (Array.isArray(m)) { m.forEach(mat => { mat.map = this._dungeonTex; mat.needsUpdate = true; }); }
    else { m.map = this._dungeonTex; m.needsUpdate = true; }
  }

  _getMesh(scene) {
    let result = null;
    scene.traverse(c => { if (c.isMesh && !result) result = c; });
    return result;
  }

  _build() {
    this._ready = true;
    this.scene.remove(this.ground);
    this.ground.geometry.dispose();
    this.ground.material.dispose();
    this.ground = null;
    this._colliders = [];

    this._buildFloor();
    this._buildWalls();
    this._buildDecor();
    this._setupLights();
  }

  _buildFloor() {
    const tileScene = this._models.floor;
    if (!tileScene) return;
    const srcMesh = this._getMesh(tileScene);
    if (!srcMesh) return;

    const geo = srcMesh.geometry;
    const mat = srcMesh.material.clone();
    this._assignTex({ material: mat });

    const tileCount = this.size;
    const dummy = new THREE.Object3D();
    const im = new THREE.InstancedMesh(geo, mat, tileCount * tileCount);
    let idx = 0;
    const half = this.size / 2;
    for (let x = 0; x < tileCount; x++) {
      for (let z = 0; z < tileCount; z++) {
        dummy.position.set(x - half + 0.5, 0, z - half + 0.5);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        im.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    }
    im.instanceMatrix.needsUpdate = true;
    im.receiveShadow = true;
    this.scene.add(im);
    this.objects.push(im);
  }

  _buildWalls() {
    const wallScene = this._models.wall;
    if (!wallScene) return;
    const srcMesh = this._getMesh(wallScene);
    if (!srcMesh) return;

    const geo = srcMesh.geometry;
    const mat = srcMesh.material.clone();
    this._assignTex({ material: mat });
    const half = this.size / 2;

    const positions = [];
    for (let x = -half; x < half; x++) {
      positions.push([x + 0.5, 0, -half, 0]);           // back wall → +Z
      positions.push([x + 0.5, 0, half, Math.PI]);      // front wall → -Z
    }
    for (let z = -half; z < half; z++) {
      positions.push([-half, 0, z + 0.5, Math.PI / 2]); // left wall → +X
      positions.push([half - 1, 0, z + 0.5, -Math.PI / 2]); // right wall → -X
    }

    const dummy = new THREE.Object3D();
    const im = new THREE.InstancedMesh(geo, mat, positions.length);
    positions.forEach((p, i) => {
      dummy.position.set(p[0], 0, p[2]);
      dummy.rotation.y = p[3];
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = true;
    im.receiveShadow = true;
    this.scene.add(im);
    this.objects.push(im);

    for (const p of positions) {
      this._colliders.push({ x: p[0], z: p[2], radius: 0.7 });
    }
  }

  _spawnModel(key, x, y, z, rotY) {
    const scene = this._models[key];
    if (!scene) return;
    const srcMesh = this._getMesh(scene);
    if (!srcMesh) return;
    const mat = srcMesh.material.clone();
    this._assignTex({ material: mat });
    if (key === 'barrel') {
      mat.map = mat.map.clone();
      mat.map.repeat.set(1 / 1.3, 1 / 1.3);
      mat.map.needsUpdate = true;
    }
    const mesh = new THREE.Mesh(srcMesh.geometry, mat);
    mesh.position.set(x, y, z);
    if (rotY) mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.objects.push(mesh);
    return mesh;
  }

  _buildDecor() {
    const margin = this.size / 2 - 2;
    const used = [];

    const randRange = () => (Math.random() - 0.5) * margin * 2;
    const tryPos = () => {
      for (let a = 0; a < 30; a++) {
        const x = randRange();
        const z = randRange();
        if (!used.some(u => Math.hypot(u[0] - x, u[1] - z) < 2.5)) {
          used.push([x, z]);
          return { x, z };
        }
      }
      return { x: randRange(), z: randRange() };
    };

    // scatter: barrel, column, stones
    const scatter = [
      { model: 'barrel', count: 6, radius: 0.35 },
      { model: 'column', count: 10, radius: 0.4 },
      { model: 'stones', count: 4, radius: 0.4 },
    ];
    for (const d of scatter) {
      for (let i = 0; i < d.count; i++) {
        const p = tryPos();
        this._spawnModel(d.model, p.x, 0, p.z, Math.random() * Math.PI * 2);
        this._colliders.push({ x: p.x, z: p.z, radius: d.radius });
      }
    }

    // wall decor: 2 banners per wall
    const half = this.size / 2;
    const bannerPositions = [
      // back wall (faces +Z)
      { x: -2, z: -half + 1, rot: 0 },
      { x: 3, z: -half + 1, rot: 0 },
      // front wall (faces -Z)
      { x: -3, z: half - 1, rot: Math.PI },
      { x: 2, z: half - 1, rot: Math.PI },
      // left wall (faces +X)
      { x: -half + 0.05, z: -2, rot: -Math.PI / 2 },
      { x: -half + 0.05, z: 3, rot: -Math.PI / 2 },
      // right wall (faces -X)
      { x: half - 1.1, z: -2, rot: Math.PI / 2 },
      { x: half - 1.1, z: 2, rot: Math.PI / 2 },
    ];
    for (const bp of bannerPositions) {
      this._spawnModel('banner', bp.x, 0, bp.z, bp.rot);
      this._colliders.push({ x: bp.x, z: bp.z, radius: 0.25 });
    }


    // stairs: on top of floor
    this._spawnModel('stairs', 0, 0, 2, 0);
    this._colliders.push({ x: 0, z: 2, radius: 0.5 });
  }

  _setupLights() {
    this.scene.children.filter(c => c.isLight).forEach(c => this.scene.remove(c));
    const ambient = new THREE.AmbientLight(0x303050, 0.4);
    ambient.name = 'ambient';
    this.scene.add(ambient);
    const half = this.size / 2 - 1;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const pl = new THREE.PointLight(0xff8844, 1.5, 10);
      pl.position.set(Math.cos(angle) * half, 3, Math.sin(angle) * half);
      this.scene.add(pl);
      this.objects.push(pl);
      const helper = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xff8844 })
      );
      helper.position.copy(pl.position);
      this.scene.add(helper);
      this.objects.push(helper);
    }
  }

  isBlocked(x, z, radius) {
    for (const c of this._colliders) {
      const dx = x - c.x;
      const dz = z - c.z;
      if (dx * dx + dz * dz < (c.radius + radius) * (c.radius + radius)) return true;
    }
    return false;
  }

  switchTo(config) {
    // no-op for now; dungeon is the only theme
  }

  reset() {
    for (const o of this.objects) {
      this.scene.remove(o);
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
      if (o.instanceMatrix) o.instanceMatrix = null;
    }
    this.objects = [];
    this._models = {};
    this._dungeonTex = null;
    this._ready = false;
    this._createTemp();
    this._loadDungeon();
  }
};
