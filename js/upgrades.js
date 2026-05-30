window.Upgrades = class {
  constructor() {
    this.container = document.getElementById('upgrade-modal');
    this.cards = document.getElementById('upgrade-cards');
  }

  show(player, combat, onChoose) {
    this.container.classList.remove('hidden');
    this.cards.innerHTML = '';
    const options = this.generate(player, combat);
    for (const opt of options) {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<h3>${opt.name}</h3><p>${opt.desc}</p>`;
      card.addEventListener('click', () => {
        this.container.classList.add('hidden');
        if (opt.effect) opt.effect();
        onChoose();
      });
      this.cards.appendChild(card);
    }
  }

  generate(player, combat) {
    const pool = [
      { name: 'Damage +', desc: '+5 attack damage', effect: () => { player.baseDamage += 5; } },
      { name: 'Attack Rate', desc: 'Faster attacks', effect: () => { player.baseAttackRate = Math.max(0.1, player.baseAttackRate - 0.08); } },
      { name: 'Heal', desc: 'Restore 30 HP', effect: () => { player.hp = Math.min(player.maxHp, player.hp + 30); } },
      { name: 'Shield', desc: '+20 max HP, heal 20', effect: () => { player.maxHp += 20; player.hp += 20; } },
      { name: 'Range', desc: '+2 attack range', effect: () => { player.baseRange += 2; } },
    ];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }
};
