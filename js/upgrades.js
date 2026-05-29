window.Upgrades = class {
  constructor() {
    this.container = document.getElementById('upgrade-modal');
    this.cards = document.getElementById('upgrade-cards');
  }

  show(onChoose) {
    this.container.classList.remove('hidden');
    this.cards.innerHTML = '';
    const options = this.generate();
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

  generate() {
    const pool = [
      { name: 'Damage +', desc: '+5 attack damage', effect: () => {} },
      { name: 'Attack Rate', desc: 'Faster attacks', effect: () => {} },
      { name: 'Heal', desc: 'Restore 30 HP', effect: () => {} },
      { name: 'Shield', desc: '+20 max HP', effect: () => {} },
      { name: 'Range', desc: 'Wider attack range', effect: () => {} },
    ];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }
};
