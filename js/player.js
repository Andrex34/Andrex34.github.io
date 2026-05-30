window.Player = class {
  constructor(scene, type) {
    this.scene = scene;
    this.charType = type || 'knight';
    this.immortal = false;
    this.speedMultiplier = 1;
    this.keys = { w: false, a: false, s: false, d: false };
    this.mesh = new THREE.Group();
    this.mesh.position.y = 0;
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);
    this._currentModel = null;
    this._modelsReady = false;
    this.mixer = null;
    this._idleAction = null;
    this._walkAction = null;
    this._currentAnim = 'idle';
    this._wasMoving = false;
    this.applyStats();
    if (!window._charsLoading) this._onModelsReady();
    else this._showFallback();

    const keyMap = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd' };
    document.addEventListener('keydown', (e) => { const k = keyMap[e.code]; if (k) this.keys[k] = true; });
    document.addEventListener('keyup', (e) => { const k = keyMap[e.code]; if (k) this.keys[k] = false; });
  }

  applyStats() {
    let def = CHARACTERS[this.charType];
    if (!def || !def.stats) def = CHARACTERS['knight'];
    const s = (def && def.stats) ? def.stats : { hp:130, maxHp:130, speed:5.5, damage:12, attackRate:0.45, range:10 };
    this.hp = s.hp;
    this.maxHp = s.maxHp;
    this.baseSpeed = s.speed;
    this.baseDamage = s.damage;
    this.baseAttackRate = s.attackRate;
    this.baseRange = s.range;
  }

  get speed() { return this.baseSpeed * this.speedMultiplier; }
  get damage() { return this.baseDamage; }
  get attackRate() { return this.baseAttackRate; }
  get range() { return this.baseRange; }

  _showFallback() {
    this._clearModel();
    const g = new THREE.BoxGeometry(0.55, 0.55, 0.55);
    const m = new THREE.MeshStandardMaterial({ color: 0x44ddff });
    const fallback = new THREE.Mesh(g, m);
    fallback.position.y = 0.275;
    fallback.castShadow = true;
    fallback.userData.isFallback = true;
    this._currentModel = fallback;
    this.mesh.add(fallback);
  }

  _clearModel() {
    if (this.mixer) { this.mixer.stopAllAction(); this.mixer = null; }
    this._idleAction = null;
    this._walkAction = null;
    this._currentAnim = 'idle';
    if (this._currentModel) {
      this.mesh.remove(this._currentModel);
      if (this._currentModel.userData.isFallback) {
        this._currentModel.traverse((c) => {
          if (c.isMesh) { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); }
        });
      }
      this._currentModel = null;
    }
  }

  _onModelsReady() {
    this._modelsReady = true;
    this._attachModel(this.charType);
  }

  _attachModel(type) {
    this._clearModel();
    const def = CHARACTERS[type];
    if (def && def.scene) {
      const model = def.scene;
      this._currentModel = model;
      this.mesh.add(model);
      this._setupAnim();
    } else {
      this._showFallback();
    }
  }

  _setupAnim() {
    const clips = [];
    for (const grp of Object.values(window._animClips)) {
      if (grp) clips.push(...grp);
    }
    const idleClip = clips.find(c => c.name === 'Idle_A');
    const walkClip = clips.find(c => c.name === 'Walking_A');
    if (!idleClip && !walkClip) return;
    this.mixer = new THREE.AnimationMixer(this._currentModel);
    if (idleClip) {
      this._idleAction = this.mixer.clipAction(idleClip);
      this._idleAction.play();
    }
    if (walkClip) {
      this._walkAction = this.mixer.clipAction(walkClip);
      this._walkAction.stop();
    }
    this._currentAnim = 'idle';
  }

  _switchAnim(from, to) {
    if (from) from.fadeOut(0.15);
    if (to) { to.reset().fadeIn(0.15).play(); }
  }

  setCharacter(type) {
    this.charType = type;
    this.applyStats();
    if (this._modelsReady) {
      this._attachModel(type);
    }
  }

  update(dt, arena, camera, cameraMode) {
    const dir = new THREE.Vector3();
    if (this.keys.w || this.keys.s || this.keys.a || this.keys.d) {
      const forward = new THREE.Vector3();
      const right = new THREE.Vector3();
      if (cameraMode === 'thirdperson') {
        camera.getWorldDirection(forward);
        forward.y = 0;
        if (forward.length() < 0.001) forward.z = -1;
        forward.normalize();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
      } else {
        forward.set(0, 0, -1);
        right.set(1, 0, 0);
      }
      if (this.keys.w) dir.add(forward);
      if (this.keys.s) dir.sub(forward);
      if (this.keys.a) dir.sub(right);
      if (this.keys.d) dir.add(right);
    }
    const isMoving = dir.length() > 0;
    if (isMoving) {
      dir.normalize();
      this.mesh.position.x += dir.x * this.speed * dt;
      this.mesh.position.z += dir.z * this.speed * dt;
      this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    }
    const half = arena.size / 2 - 0.5;
    let px = Math.max(-half, Math.min(half, this.mesh.position.x));
    let pz = Math.max(-half, Math.min(half, this.mesh.position.z));

    const pr = 0.25;
    if (arena.isBlocked) {
      for (let iter = 0; iter < 4; iter++) {
        let blocked = false;
        for (const c of arena._colliders) {
          const dx = px - c.x;
          const dz = pz - c.z;
          const minDist = c.radius + pr;
          if (dx * dx + dz * dz < minDist * minDist) {
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > 0.001) {
              const push = minDist - dist;
              px += (dx / dist) * push;
              pz += (dz / dist) * push;
            } else {
              px += 0.01;
            }
            blocked = true;
            break;
          }
        }
        if (!blocked) break;
      }
    }

    this.mesh.position.x = Math.max(-half, Math.min(half, px));
    this.mesh.position.z = Math.max(-half, Math.min(half, pz));

    if (this.mixer) {
      if (isMoving && this._currentAnim !== 'walk' && this._walkAction) {
        this._switchAnim(this._idleAction, this._walkAction);
        this._currentAnim = 'walk';
      } else if (!isMoving && this._currentAnim !== 'idle' && this._idleAction) {
        this._switchAnim(this._walkAction, this._idleAction);
        this._currentAnim = 'idle';
      }
    }
  }

  updateMixer(dt) {
    if (this.mixer) this.mixer.update(dt);
  }

  takeDamage(dmg) {
    if (this.immortal) return;
    this.hp = Math.max(0, this.hp - dmg);
  }

  reset() {
    this.applyStats();
    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.y = 0;
  }
};
