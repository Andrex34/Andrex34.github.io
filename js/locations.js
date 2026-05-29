window.Locations = class {
  constructor() {
    this.container = document.getElementById('location-modal');
    this.cards = document.getElementById('location-cards');
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
        onChoose(opt.config);
      });
      this.cards.appendChild(card);
    }
  }

  generate() {
    return [
      {
        name: 'Crimson Pit',
        desc: 'Tight arena, dark ground',
        config: { size: 12, ground: 0x3a1a1a, mountain: 0x662222, ambient: 0x402020 },
      },
      {
        name: 'Azure Fields',
        desc: 'Wide open, blue tones',
        config: { size: 20, ground: 0x1a2a4a, mountain: 0x4466aa, ambient: 0x203060 },
      },
      {
        name: 'Obsidian Hall',
        desc: 'Balanced, dark stone',
        config: { size: 16, ground: 0x222222, mountain: 0x555555, ambient: 0x303030 },
      },
    ];
  }
};
