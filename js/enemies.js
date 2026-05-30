window.Enemies = class {
  constructor(scene) {
    this.scene = scene;
    this.alive = [];
    this.totalSpawned = 0;
    this.damageCooldowns = new Map();
    this.hasBoss = false;
    this._model = null;
    this._idleClip = null;
    this._walkClip = null;
    this._ready = false;
    this._loadModel();
  }

  _base64ToArrayBuffer(b64) {
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }

  _loadModel() {
    const texData = 'data:image/png;base64,' + window.ARENA_TEXTURE;
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => url.includes('colormap.png') ? texData : url);
    const loader = new THREE.GLTFLoader(manager);
    const ab = this._base64ToArrayBuffer(window.ENEMY_ORC.data);
    loader.parse(ab, '', (gltf) => {
      gltf.scene.traverse(c => {
        if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
      });
      this._model = gltf.scene;
      if (gltf.animations) {
        for (const anim of gltf.animations) {
          if (anim.name === 'idle') this._idleClip = anim;
          if (anim.name === 'walk') this._walkClip = anim;
        }
      }
      this._ready = true;
    }, undefined, (err) => {
      console.error('Failed to load orc model', err);
    });
  }

  _spawn(x, z, data) {
    const model = THREE.SkeletonUtils.clone(this._model);
    const scale = data.isBoss ? 2.1 : 1.2;
    model.scale.set(scale, scale, scale);
    model.position.set(x, 0, z);
    this.scene.add(model);

    model.userData.enemyData = { hp: data.hp, isBoss: data.isBoss };

    const mixer = new THREE.AnimationMixer(model);
    let idleAction, walkAction;
    if (this._idleClip) {
      idleAction = mixer.clipAction(this._idleClip);
      idleAction.play();
    }
    if (this._walkClip) {
      walkAction = mixer.clipAction(this._walkClip);
      walkAction.stop();
    }

    return {
      model,
      mesh: model,
      mixer, idleAction, walkAction,
      currentAnim: 'idle',
      speed: data.speed,
      damage: data.damage,
      isBoss: data.isBoss,
      radius: data.isBoss ? 0.5 : 0.3,
    };
  }

  spawnWave(count, arenaSize, isBoss) {
    this.totalSpawned = 0;
    this.hasBoss = isBoss;
    const spawnCount = isBoss ? Math.max(3, count - 2) : count;

    for (let i = 0; i < spawnCount; i++) {
      let x, z;
      do {
        x = (Math.random() - 0.5) * arenaSize * 0.8;
        z = (Math.random() - 0.5) * arenaSize * 0.8;
      } while (Math.abs(x) < 2 && Math.abs(z) < 2);

      const isBossMob = isBoss && i === spawnCount - 1;
      const data = {
        hp: isBossMob ? 5 * (2 + Math.floor(count / 5)) : 1,
        speed: 1.5 + count * 0.08,
        damage: isBossMob ? 15 + count : 5 + count,
        isBoss: isBossMob,
      };
      this.alive.push(this._spawn(x, z, data));
      this.totalSpawned++;
    }
  }

  get bossAlive() {
    return this.alive.some(e => e.isBoss);
  }

  update(dt, playerPos, player, arena) {
    for (let i = this.alive.length - 1; i >= 0; i--) {
      const e = this.alive[i];
      const dir = new THREE.Vector3().copy(playerPos).sub(e.model.position);
      dir.y = 0;
      const dist = dir.length();
      const isMoving = dist > 0.3 && e.model.parent;
      if (isMoving) {
        dir.normalize();
        e.model.position.x += dir.x * e.speed * dt;
        e.model.position.z += dir.z * e.speed * dt;
        e.model.rotation.y = Math.atan2(dir.x, dir.z);

        if (e.currentAnim !== 'walk' && e.walkAction) {
          if (e.idleAction) e.idleAction.fadeOut(0.15);
          e.walkAction.reset().fadeIn(0.15).play();
          e.currentAnim = 'walk';
        }
      } else {
        if (e.currentAnim !== 'idle' && e.idleAction) {
          if (e.walkAction) e.walkAction.fadeOut(0.15);
          e.idleAction.reset().fadeIn(0.15).play();
          e.currentAnim = 'idle';
        }
      }
      e.mixer.update(dt);

      if (arena && arena._colliders) {
        let px = e.model.position.x, pz = e.model.position.z;
        for (let iter = 0; iter < 4; iter++) {
          let blocked = false;
          for (const c of arena._colliders) {
            const dx = px - c.x;
            const dz = pz - c.z;
            const minDist = c.radius + e.radius;
            if (dx * dx + dz * dz < minDist * minDist) {
              const d = Math.sqrt(dx * dx + dz * dz);
              if (d > 0.001) {
                const push = minDist - d;
                px += (dx / d) * push;
                pz += (dz / d) * push;
              } else {
                px += 0.01;
              }
              blocked = true;
              break;
            }
          }
          if (!blocked) break;
        }
        e.model.position.x = px;
        e.model.position.z = pz;
      }

      if (e.model.position.distanceTo(playerPos) < e.radius + 0.35) {
        const last = this.damageCooldowns.get(e) || 0;
        if (Date.now() - last > 500) {
          player.takeDamage(e.damage);
          this.damageCooldowns.set(e, Date.now());
        }
      }
    }
    this._enemyCollision();
    this.removeDead();
  }

  _enemyCollision() {
    for (let i = 0; i < this.alive.length; i++) {
      for (let j = i + 1; j < this.alive.length; j++) {
        const a = this.alive[i];
        const b = this.alive[j];
        const dx = b.model.position.x - a.model.position.x;
        const dz = b.model.position.z - a.model.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = a.radius + b.radius;
        if (dist < minDist && dist > 0.001) {
          const push = (minDist - dist) / 2;
          const nx = dx / dist;
          const nz = dz / dist;
          a.model.position.x -= nx * push;
          a.model.position.z -= nz * push;
          b.model.position.x += nx * push;
          b.model.position.z += nz * push;
        }
      }
    }
  }

  removeDead() {
    for (let i = this.alive.length - 1; i >= 0; i--) {
      const e = this.alive[i];
      const data = e.model.userData.enemyData;
      if (data && data.hp <= 0) {
        this.damageCooldowns.delete(e);
        if (e.model.parent) this.scene.remove(e.model);
        this.alive.splice(i, 1);
      }
    }
  }

  clear() {
    for (const e of this.alive) {
      if (e.model.parent) this.scene.remove(e.model);
      if (e.mixer) e.mixer.stopAllAction();
    }
    this.alive = [];
    this.totalSpawned = 0;
    this.damageCooldowns.clear();
    this.hasBoss = false;
  }
};
