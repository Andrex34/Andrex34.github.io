window.Locations = class {
  constructor() {
    this.container = document.getElementById('location-modal');
    this.cards = document.getElementById('location-cards');
  }

  show(onChoose) {
    this.container.classList.remove('hidden');
    this.cards.innerHTML = '';
    const oldBtn = this.container.querySelector('.continue-btn');
    if (oldBtn) oldBtn.remove();
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

  showNonFunctional(onClose) {
    this.container.classList.remove('hidden');
    this.cards.innerHTML = '';
    const oldBtn = this.container.querySelector('.continue-btn');
    if (oldBtn) oldBtn.remove();
    const options = this.generate();
    for (const opt of options) {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.opacity = '0.5';
      card.style.cursor = 'default';
      card.innerHTML = `<h3>${opt.name}</h3><p>${opt.desc}<br><small>(locked)</small></p>`;
      this.cards.appendChild(card);
    }
    const btn = document.createElement('button');
    btn.className = 'menu-btn menu-btn-sm continue-btn';
    btn.textContent = 'Continue';
    btn.addEventListener('click', () => {
      this.container.classList.add('hidden');
      onClose();
    });
    this.container.appendChild(btn);
  }

  generate() {
    return [
      { name: 'Исследовать подземелье', desc: 'Спуститься глубже в тёмные залы', config: { theme: 'dungeon' } },
      { name: 'Пойти в лес', desc: 'Войти в опасную чащу под открытым небом', config: { theme: 'forest' } },
      { name: 'Пойти на кладбище', desc: 'Туда, где покойники не лежат смирно', config: { theme: 'cemetery' } },
    ];
  }
};
