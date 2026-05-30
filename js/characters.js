window.CHARACTERS = {};
window._charsLoading = true;
window._animClips = {};

(function() {
  const loader = new THREE.GLTFLoader();
  let pending = 0;

  function base64ToArrayBuffer(b64) {
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }

  function onAllDone() {
    window._charsLoading = false;
    document.getElementById('play-btn').disabled = false;
    document.getElementById('play-btn').textContent = 'Play';
    document.getElementById('char-btn').disabled = false;
    if (window.playerRef) {
      window.playerRef._onModelsReady();
    }
  }

  for (const [key, m] of Object.entries(window.MODELS_DATA)) {
    pending++;
    const ab = base64ToArrayBuffer(m.data);
    loader.parse(ab, '', (gltf) => {
      const s = gltf.scene;
      s.scale.set(0.525, 0.525, 0.525);
      const box = new THREE.Box3().setFromObject(s);
      const cy = box.max.y - box.min.y;
      s.position.y = cy > 0 ? -box.min.y : 0;
      s.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });

      CHARACTERS[key] = {
        name: m.name,
        desc: m.desc,
        color: m.color,
        stats: m.stats,
        scene: s,
      };
      pending--;
      if (pending === 0) onAllDone();
    }, undefined, (err) => {
      console.error('Failed to parse ' + key, err);
      pending--;
      if (pending === 0) onAllDone();
    });
  }

  for (const [grp, ad] of Object.entries(window.ANIM_DATA)) {
    pending++;
    const ab = base64ToArrayBuffer(ad.data);
    loader.parse(ab, '', (gltf) => {
      if (gltf.animations) {
        window._animClips[grp] = gltf.animations;
      }
      pending--;
      if (pending === 0) onAllDone();
    }, undefined, (err) => {
      console.error('Failed to parse anim ' + grp, err);
      pending--;
      if (pending === 0) onAllDone();
    });
  }
})();
