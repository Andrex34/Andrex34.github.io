window.Hud = class {
  constructor() {
    this.hpBar = document.getElementById('hp-bar');
    this.hpText = document.getElementById('hp-text');
    this.waveCount = document.getElementById('wave-count');
    this.killsSpan = document.getElementById('kills');
    this.gameoverModal = document.getElementById('gameover-modal');
    this.finalWave = document.getElementById('final-wave');
    this.finalKills = document.getElementById('final-kills');
    this.playerHp = 100;
    this.playerMaxHp = 100;
    this.gameOverVisible = false;
  }

  setHp(current, max) {
    this.playerHp = current;
    this.playerMaxHp = max;
    const pct = Math.max(0, (current / max) * 100);
    this.hpBar.style.background = `linear-gradient(90deg, #e22, #e66) 0 0 / ${pct}% 100% no-repeat #333`;
    this.hpText.textContent = `${Math.ceil(current)}`;
  }

  setWave(n) { this.waveCount.textContent = n; }
  setKills(n) { this.killsSpan.textContent = n; }

  showGameOver(wave, kills) {
    this.gameOverVisible = true;
    this.finalWave.textContent = wave;
    this.finalKills.textContent = kills;
    this.gameoverModal.classList.remove('hidden');
  }

  hideGameOver() {
    this.gameOverVisible = false;
    this.gameoverModal.classList.add('hidden');
  }
};
