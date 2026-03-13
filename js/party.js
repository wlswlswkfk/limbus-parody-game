/**
 * party.js — PartySystem
 * Manages party composition before entering the dungeon.
 */

class PartySystem {
  constructor() {
    this.sinners      = [];
    this.partySlots   = []; // [{sinnerId, identityId}]
    this.maxPartySize = 3;
    // Currently selected identity per sinner
    this.selectedIdentities = {}; // sinnerId -> identityId
  }

  /**
   * Initialize with available sinners.
   * @param {Object} charactersData - GameData.characters
   */
  init(charactersData) {
    this.sinners    = charactersData.sinners || [];
    this.partySlots = [];
    this.selectedIdentities = {};

    // Default: select first identity for each sinner
    for (const s of this.sinners) {
      if (s.identities?.length) {
        this.selectedIdentities[s.id] = s.identities[0].id;
      }
    }

    this._renderPartyScreen();
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  _renderPartyScreen() {
    this._renderSinnerList();
    this._renderPartySlots();
    this._updateConfirmButton();
  }

  _renderSinnerList() {
    const container = document.getElementById('sinner-list');
    if (!container) return;
    container.innerHTML = '';

    for (const sinner of this.sinners) {
      const card = this._buildSinnerCard(sinner);
      container.appendChild(card);
    }
  }

  _buildSinnerCard(sinner) {
    const card = document.createElement('div');
    card.className = 'sinner-card';
    card.id        = `sinner-card-${sinner.id}`;

    // ── Header
    const header = document.createElement('div');
    header.className = 'sinner-card-header';

    // Portrait
    const portrait = document.createElement('div');
    portrait.className   = 'sinner-portrait';
    portrait.style.background = `radial-gradient(circle at 38% 35%, ${this._lighten(sinner.color, 30)}, ${sinner.color})`;
    portrait.textContent = sinner.name[0];
    header.appendChild(portrait);

    // Info
    const info = document.createElement('div');
    info.className = 'sinner-info';
    const nameEl = document.createElement('div');
    nameEl.className   = 'sinner-name';
    nameEl.textContent = sinner.name;
    const identityEl = document.createElement('div');
    identityEl.className = 'sinner-current-identity';
    identityEl.id        = `sinner-identity-label-${sinner.id}`;
    const selId = this.selectedIdentities[sinner.id];
    const selIden = sinner.identities?.find(i => i.id === selId);
    identityEl.textContent = selIden ? `현재: ${selIden.name}` : '';
    info.appendChild(nameEl);
    info.appendChild(identityEl);
    header.appendChild(info);

    // Add/Remove button
    const addBtn = document.createElement('button');
    addBtn.className = 'sinner-add-btn';
    addBtn.id        = `sinner-add-btn-${sinner.id}`;
    const inParty = this.partySlots.some(s => s.sinnerId === sinner.id);
    addBtn.textContent = inParty ? '파티 제거' : '파티 추가';
    if (inParty) addBtn.classList.add('in-party');
    addBtn.addEventListener('click', () => {
      AudioManager.playSFX('select');
      if (this.partySlots.some(s => s.sinnerId === sinner.id)) {
        this.removeFromParty(sinner.id);
      } else {
        this.addToParty(sinner.id);
      }
    });
    header.appendChild(addBtn);
    card.appendChild(header);

    // ── Identity Selector
    if (sinner.identities?.length > 1) {
      const idSelector = document.createElement('div');
      idSelector.className = 'identity-selector';

      const title = document.createElement('div');
      title.className   = 'identity-selector-title';
      title.textContent = '인격 선택';
      idSelector.appendChild(title);

      const options = document.createElement('div');
      options.className = 'identity-options';

      for (const identity of sinner.identities) {
        const opt = document.createElement('div');
        opt.className = 'identity-option';
        if (identity.id === this.selectedIdentities[sinner.id]) opt.classList.add('active');

        opt.innerHTML = `
          <div class="identity-option-name">${identity.name}</div>
          <div class="identity-option-stats">
            <span>HP ${identity.hp}</span>
            <span>속도 ${identity.spd}</span>
            <span>방어 ${identity.def}</span>
          </div>
        `;

        opt.addEventListener('click', () => {
          AudioManager.playSFX('navigate');
          this.selectIdentity(sinner.id, identity.id);
        });

        options.appendChild(opt);
      }

      idSelector.appendChild(options);
      card.appendChild(idSelector);
    }

    // ── Skills Preview
    const selIdentity = sinner.identities?.find(i => i.id === this.selectedIdentities[sinner.id]);
    if (selIdentity?.skills?.length) {
      const preview = document.createElement('div');
      preview.className = 'identity-skills-preview';
      preview.id        = `skills-preview-${sinner.id}`;

      const ptitle = document.createElement('div');
      ptitle.className   = 'skills-preview-title';
      ptitle.textContent = '스킬';
      preview.appendChild(ptitle);

      const list = document.createElement('div');
      list.className = 'skills-preview-list';

      for (const sk of selIdentity.skills) {
        const badge = document.createElement('div');
        badge.className = 'skill-preview-badge';
        badge.title     = sk.description;
        badge.innerHTML = `<strong>${sk.name}</strong> ${sk.type} (코인${sk.coins})`;
        list.appendChild(badge);
      }

      preview.appendChild(list);
      card.appendChild(preview);
    }

    return card;
  }

  _renderPartySlots() {
    const container = document.getElementById('party-slots');
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i < this.maxPartySize; i++) {
      const slot = this._buildSlot(i);
      container.appendChild(slot);
    }
  }

  _buildSlot(index) {
    const slot = document.createElement('div');
    slot.className = 'party-slot';
    slot.id        = `party-slot-${index}`;

    const member = this.partySlots[index];
    if (!member) {
      slot.classList.add('slot-empty');
      slot.textContent = `슬롯 ${index + 1} (비어있음)`;
      return slot;
    }

    slot.classList.add('filled');
    const sinner   = GameData.getSinner(member.sinnerId);
    const identity = GameData.getIdentity(member.sinnerId, member.identityId);
    if (!sinner || !identity) return slot;

    const dot = document.createElement('div');
    dot.className         = 'slot-color-dot';
    dot.style.background  = sinner.color;
    dot.style.boxShadow   = `0 0 5px ${sinner.color}88`;
    slot.appendChild(dot);

    const info = document.createElement('div');
    info.className = 'slot-info';
    info.innerHTML = `
      <div class="slot-sinner-name">${sinner.name}</div>
      <div class="slot-identity-name">${identity.name} — HP ${GameState.currentHP[sinner.id] ?? identity.hp}/${identity.hp}</div>
    `;
    slot.appendChild(info);

    const removeBtn = document.createElement('button');
    removeBtn.className   = 'slot-remove-btn';
    removeBtn.textContent = '✕';
    removeBtn.title       = '파티에서 제거';
    removeBtn.addEventListener('click', () => {
      AudioManager.playSFX('navigate');
      this.removeFromParty(member.sinnerId);
    });
    slot.appendChild(removeBtn);

    return slot;
  }

  // ─── Party Management ──────────────────────────────────────────────────────

  selectIdentity(sinnerId, identityId) {
    this.selectedIdentities[sinnerId] = identityId;

    // If this sinner is in the party, update the slot
    const idx = this.partySlots.findIndex(s => s.sinnerId === sinnerId);
    if (idx !== -1) {
      this.partySlots[idx].identityId = identityId;
    }

    // Re-render this sinner's card
    const sinner = this.sinners.find(s => s.id === sinnerId);
    if (sinner) {
      const oldCard = document.getElementById(`sinner-card-${sinnerId}`);
      if (oldCard) {
        const newCard = this._buildSinnerCard(sinner);
        oldCard.replaceWith(newCard);
      }
    }
    this._renderPartySlots();
    this._updateConfirmButton();
  }

  addToParty(sinnerId) {
    if (this.partySlots.some(s => s.sinnerId === sinnerId)) {
      UI.showNotification('이미 파티에 있는 캐릭터입니다.');
      return;
    }
    if (this.partySlots.length >= this.maxPartySize) {
      UI.showNotification(`파티는 최대 ${this.maxPartySize}명까지 가능합니다.`);
      return;
    }

    const identityId = this.selectedIdentities[sinnerId];
    this.partySlots.push({ sinnerId, identityId });

    this._refreshSinnerCardButton(sinnerId);
    this._renderPartySlots();
    this._updateConfirmButton();
    UI.showNotification(`${GameData.getSinner(sinnerId)?.name} 파티에 추가됨`);
  }

  removeFromParty(sinnerId) {
    this.partySlots = this.partySlots.filter(s => s.sinnerId !== sinnerId);
    this._refreshSinnerCardButton(sinnerId);
    this._renderPartySlots();
    this._updateConfirmButton();
  }

  _refreshSinnerCardButton(sinnerId) {
    const btn = document.getElementById(`sinner-add-btn-${sinnerId}`);
    if (!btn) return;
    const inParty = this.partySlots.some(s => s.sinnerId === sinnerId);
    btn.textContent = inParty ? '파티 제거' : '파티 추가';
    btn.classList.toggle('in-party', inParty);
  }

  _updateConfirmButton() {
    const btn = document.getElementById('btn-confirm-party');
    if (btn) btn.disabled = this.partySlots.length === 0;
  }

  /** Validate and return party, or null if invalid */
  confirmParty() {
    if (this.partySlots.length === 0) {
      UI.showNotification('최소 한 명의 파티원을 선택하세요.');
      return null;
    }
    return [...this.partySlots];
  }

  _lighten(hex, amount) {
    let r = parseInt(hex.slice(1, 3), 16) + amount;
    let g = parseInt(hex.slice(3, 5), 16) + amount;
    let b = parseInt(hex.slice(5, 7), 16) + amount;
    r = Math.min(255, r); g = Math.min(255, g); b = Math.min(255, b);
    return `rgb(${r},${g},${b})`;
  }
}
