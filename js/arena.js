window.Arena = class {
  constructor(scene) {
    this.scene = scene;
    this.size = 16;
    this.objects = [];
    this._models = {};
    this._tex = null;
    this._ready = false;
    this.ground = null;
    this._colliders = [];
    this.theme = 'dungeon';
    this._createTemp();
    this._loadTheme('dungeon');
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

  _loadTheme(theme) {
    this.theme = theme;
    if (theme === 'dungeon') {
      this._loadDungeon();
    } else if (theme === 'cemetery') {
      this._loadCemetery();
    } else if (theme === 'forest') {
      this._loadForest();
    } else {
      this._loadDungeon();
    }
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
      this._tex = new THREE.Texture(img);
      this._tex.flipY = false;
      this._tex.needsUpdate = true;
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

  _loadCemetery() {
    const texData = 'data:image/png;base64,' + window.CEMETERY_TEXTURE;
    const loader = new THREE.GLTFLoader();
    const entries = Object.entries(window.CEMETERY_DATA || {});
    let pending = entries.length;
    let texReady = false;

    const img = new Image();
    img.onload = () => {
      this._tex = new THREE.Texture(img);
      this._tex.flipY = false;
      this._tex.needsUpdate = true;
      texReady = true;
      if (pending === 0) this._build();
    };
    img.src = texData;

    for (const [key, ad] of entries) {
      const ab = this._base64ToArrayBuffer(ad.data);
      loader.parse(ab, '', (gltf) => {
        gltf.scene.scale.set(2, 2, 2);
        gltf.scene.traverse(c => {
          if (c.isMesh && c.material) {
            const mats = Array.isArray(c.material) ? c.material : [c.material];
            for (const m of mats) {
              if (m.map) { m.map.dispose(); m.map = null; }
            }
          }
        });
        this._models[key] = gltf.scene;
        pending--;
        if (pending === 0 && texReady) this._build();
      }, undefined, (err) => {
        console.error('Cemetery model ' + key + ' failed:', err);
        pending--;
        if (pending === 0 && texReady) this._build();
      });
    }
  }

  _loadForest() {
    const loader = new THREE.GLTFLoader();
    const entries = Object.entries(window.FOREST_DATA || {});
    let pending = entries.length;

    for (const [key, ad] of entries) {
      const ab = this._base64ToArrayBuffer(ad.data);
      loader.parse(ab, '', (gltf) => {
        gltf.scene.scale.set(2, 2, 2);
        this._models[key] = gltf.scene;
        if (!this._tex) {
          gltf.scene.traverse(c => {
            if (c.isMesh && c.material && !this._tex) {
              const m = c.material;
              const map = Array.isArray(m) ? m[0].map : m.map;
              if (map) this._tex = map;
            }
          });
        }
        pending--;
        if (pending === 0) this._build();
      }, undefined, (err) => {
        console.error('Forest model ' + key + ' failed:', err);
        pending--;
        if (pending === 0) this._build();
      });
    }
  }

  _assignTex(mesh) {
    if (!this._tex) return;
    const m = mesh.material;
    if (Array.isArray(m)) { m.forEach(mat => { mat.map = this._tex; mat.needsUpdate = true; }); }
    else { m.map = this._tex; m.needsUpdate = true; }
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

    if (this.theme === 'dungeon') {
      this._buildFloor();
      this._buildWalls();
      this._buildDecor();
    } else if (this.theme === 'forest') {
      this._buildForestFloor();
      this._buildForestWalls();
      this._buildForestDecor();
    } else {
      this._buildCemeteryFloor();
      this._buildCemeteryWalls();
      this._buildCemeteryDecor();
    }
    this._setupLights();
    if (this._onReady) { this._onReady(); this._onReady = null; }
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
      positions.push([x + 0.5, 0, -half, 0]);
      positions.push([x + 0.5, 0, half, Math.PI]);
    }
    for (let z = -half; z < half; z++) {
      positions.push([-half, 0, z + 0.5, Math.PI / 2]);
      positions.push([half - 1, 0, z + 0.5, -Math.PI / 2]);
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

  _spawnModel(key, x, y, z, rotY, scale) {
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
    if (scale) mesh.scale.set(scale, scale, scale);
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
    const half = this.size / 2;
    const bannerPositions = [
      { x: -2, z: -half + 1, rot: 0 },
      { x: 3, z: -half + 1, rot: 0 },
      { x: -3, z: half - 1, rot: Math.PI },
      { x: 2, z: half - 1, rot: Math.PI },
      { x: -half + 0.05, z: -2, rot: -Math.PI / 2 },
      { x: -half + 0.05, z: 3, rot: -Math.PI / 2 },
      { x: half - 1.1, z: -2, rot: Math.PI / 2 },
      { x: half - 1.1, z: 2, rot: Math.PI / 2 },
    ];
    for (const bp of bannerPositions) {
      this._spawnModel('banner', bp.x, 0, bp.z, bp.rot);
      this._colliders.push({ x: bp.x, z: bp.z, radius: 0.25 });
    }
    this._spawnModel('stairs', 0, 0, 2, 0);
    this._colliders.push({ x: 0, z: 2, radius: 0.5 });
  }

  _buildCemeteryFloor() {
    const tileScene = this._models.floor_dirt;
    if (!tileScene) return;
    const srcMesh = this._getMesh(tileScene);
    if (!srcMesh) return;
    const geo = srcMesh.geometry;
    const mat = srcMesh.material.clone();
    this._assignTex({ material: mat });
    const tilesPerSide = 2;
    const half = this.size / 2;
    const tileSize = this.size / tilesPerSide;
    const dummy = new THREE.Object3D();
    const im = new THREE.InstancedMesh(geo, mat, tilesPerSide * tilesPerSide);
    let idx = 0;
    for (let x = 0; x < tilesPerSide; x++) {
      for (let z = 0; z < tilesPerSide; z++) {
        dummy.position.set(-half + tileSize / 2 + x * tileSize, 0, -half + tileSize / 2 + z * tileSize);
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

  _buildCemeteryWalls() {
    const fenceScene = this._models.fence;
    const pillarScene = this._models.fence_pillar;
    const gateScene = this._models.fence_gate;
    if (!fenceScene) return;
    const srcMesh = this._getMesh(fenceScene);
    if (!srcMesh) return;
    const half = this.size / 2;
    const segLen = 8;
    const segsPerSide = Math.round(this.size / segLen);
    const dummy = new THREE.Object3D();

    if (fenceScene) {
      const fGeo = srcMesh.geometry;
      const fMat = srcMesh.material.clone();
      this._assignTex({ material: fMat });
      const wallPositions = [];
      for (let s = 0; s < segsPerSide; s++) {
        const offset = -half + segLen / 2 + s * segLen;
        wallPositions.push({ x: offset, z: -half, rot: 0 });
        wallPositions.push({ x: offset, z: half, rot: Math.PI });
        wallPositions.push({ x: -half, z: offset, rot: Math.PI / 2 });
        wallPositions.push({ x: half, z: offset, rot: -Math.PI / 2 });
      }
      const im = new THREE.InstancedMesh(fGeo, fMat, wallPositions.length);
      wallPositions.forEach((p, i) => {
        dummy.position.set(p.x, 0, p.z);
        dummy.rotation.y = p.rot;
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
      im.castShadow = true;
      im.receiveShadow = true;
      this.scene.add(im);
      this.objects.push(im);
      for (const p of wallPositions) {
        this._colliders.push({ x: p.x, z: p.z, radius: 0.6 });
      }
    }

    // gate at front-right (z = half, x = half - segLen/2)
    if (gateScene) {
      const gateMesh = this._getMesh(gateScene);
      if (gateMesh) {
        const gMat = gateMesh.material.clone();
        this._assignTex({ material: gMat });
        const gate = new THREE.Mesh(gateMesh.geometry, gMat);
        gate.position.set(half - segLen / 2, 0, half);
        gate.rotation.y = Math.PI;
        gate.castShadow = true;
        gate.receiveShadow = true;
        this.scene.add(gate);
        this.objects.push(gate);
        this._colliders.push({ x: half - segLen / 2, z: half, radius: 0.5 });
      }
    }

    // pillars at corners
    if (pillarScene) {
      const pMesh = this._getMesh(pillarScene);
      if (pMesh) {
        const pMat = pMesh.material.clone();
        this._assignTex({ material: pMat });
        for (const [px, pz] of [[-half, -half], [half, -half], [-half, half], [half, half]]) {
          const pillar = new THREE.Mesh(pMesh.geometry, pMat);
          pillar.position.set(px, 0, pz);
          pillar.castShadow = true;
          pillar.receiveShadow = true;
          this.scene.add(pillar);
          this.objects.push(pillar);
          this._colliders.push({ x: px, z: pz, radius: 0.4 });
        }
      }
    }
  }

  _buildCemeteryDecor() {
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

    // crypts
    for (let i = 0; i < 3; i++) {
      const p = tryPos();
      this._spawnModel('crypt', p.x, 0, p.z, Math.random() * Math.PI * 2);
      this._colliders.push({ x: p.x, z: p.z, radius: 0.8 });
    }

    // graves
    for (let i = 0; i < 6; i++) {
      const p = tryPos();
      this._spawnModel('grave_A', p.x, 0, p.z, Math.random() * Math.PI * 2);
      this._colliders.push({ x: p.x, z: p.z, radius: 0.3 });
    }

    // dead trees
    for (let i = 0; i < 4; i++) {
      const p = tryPos();
      this._spawnModel('tree_dead_large', p.x, 0, p.z, Math.random() * Math.PI * 2, 1.5);
      this._colliders.push({ x: p.x, z: p.z, radius: 0.5 });
    }
  }

  _buildForestFloor() {
    const baseTex = this._tex;
    if (!baseTex) return;
    const tex = baseTex.clone();
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    const geo = new THREE.PlaneGeometry(this.size, this.size);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.objects.push(ground);
  }

  _buildForestWalls() {
    const half = this.size / 2;
    const treeKeys = ['Tree_1_A_Color1', 'Tree_2_A_Color1', 'Tree_4_A_Color1'];
    const positions = [];
    for (let x = -half + 1.5; x < half; x += 3) {
      positions.push([x, -half, 0]);
      positions.push([x, half, Math.PI]);
    }
    for (let z = -half + 1.5; z < half; z += 3) {
      positions.push([-half, z, Math.PI / 2]);
      positions.push([half, z, -Math.PI / 2]);
    }
    for (const [x, z, rot] of positions) {
      const key = treeKeys[Math.floor(Math.random() * treeKeys.length)];
      this._spawnModel(key, x, 0, z, rot, 1.2);
      this._colliders.push({ x, z, radius: 0.5 });
    }
  }

  _buildForestDecor() {
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

    const bushKeys = ['Bush_1_A_Color1', 'Bush_3_A_Color1', 'Bush_4_A_Color1'];
    for (let i = 0; i < 8; i++) {
      const p = tryPos();
      const key = bushKeys[Math.floor(Math.random() * bushKeys.length)];
      this._spawnModel(key, p.x, 0, p.z, Math.random() * Math.PI * 2, 0.8);
      this._colliders.push({ x: p.x, z: p.z, radius: 0.4 });
    }

    const rockKeys = ['Rock_1_A_Color1', 'Rock_3_A_Color1'];
    for (let i = 0; i < 5; i++) {
      const p = tryPos();
      const key = rockKeys[Math.floor(Math.random() * rockKeys.length)];
      this._spawnModel(key, p.x, 0, p.z, Math.random() * Math.PI * 2, 0.6);
      this._colliders.push({ x: p.x, z: p.z, radius: 0.4 });
    }

    const grassKeys = ['Grass_1_A_Color1', 'Grass_2_A_Color1'];
    for (let i = 0; i < 10; i++) {
      const p = tryPos();
      const key = grassKeys[Math.floor(Math.random() * grassKeys.length)];
      this._spawnModel(key, p.x, 0, p.z, Math.random() * Math.PI * 2, 0.6);
    }
  }

  _setupLights() {
    this.scene.children.filter(c => c.isLight).forEach(c => this.scene.remove(c));
    const isCemetery = this.theme === 'cemetery';
    const isForest = this.theme === 'forest';
    const ambient = new THREE.AmbientLight(isCemetery ? 0x101030 : 0x303050, isCemetery ? 0.3 : 0.4);
    ambient.name = 'ambient';
    this.scene.add(ambient);
    const half = this.size / 2 - 1;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const color = isCemetery ? 0x8866ff : (isForest ? 0x88ff66 : 0xff8844);
      const pl = new THREE.PointLight(color, isCemetery ? 0.8 : (isForest ? 1.2 : 1.5), 10);
      pl.position.set(Math.cos(angle) * half, 3, Math.sin(angle) * half);
      this.scene.add(pl);
      this.objects.push(pl);
      const helper = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 4, 4),
        new THREE.MeshBasicMaterial({ color })
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

  switchTo(config, onReady) {
    for (const o of this.objects) {
      this.scene.remove(o);
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
      if (o.instanceMatrix) o.instanceMatrix = null;
    }
    this.objects = [];
    this._models = {};
    this._tex = null;
    this._ready = false;
    this._colliders = [];
    this._onReady = onReady || null;
    this._createTemp();
    this._loadTheme(config.theme || 'dungeon');
  }

  reset() {
    this.switchTo({ theme: 'dungeon' });
  }
};
