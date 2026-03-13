/**
 * editor.js — EditorSystem
 * In-game data editor with tabs for Characters, Dungeon, and Settings.
 */

class EditorSystem {
  constructor() {
    this.activeTab = 'characters';
  }

  init() {
    this._setupTabs();
    this._renderCharacters();
    this._renderDungeon();
    this._renderSettings();
    this._setupImportExport();
  }

  // ─── Tabs ──────────────────────────────────────────────────────────────────

  _setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        AudioManager.playSFX('navigate');
        this._switchTab(btn.dataset.tab);
      });
    });
  }

  _switchTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    document.querySelectorAll('.tab-content').forEach(c => {
      c.classList.toggle('active', c.id === `editor-tab-${tabName}`);
    });
  }

  // ─── Characters Tab ────────────────────────────────────────────────────────

  _renderCharacters() {
    const list = document.getElementById('character-editor-list');
    if (!list) return;
    list.innerHTML = '';

    const sinners = GameData.characters?.sinners || [];
    for (const sinner of sinners) {
      list.appendChild(this._buildSinnerEditorCard(sinner));
    }

    // Add sinner button
    const addBtn = document.getElementById('btn-add-sinner');
    if (addBtn) {
      addBtn.onclick = () => this._showAddSinnerForm(list);
    }
  }

  _buildSinnerEditorCard(sinner) {
    const card = document.createElement('div');
    card.className = 'editor-sinner-card';
    card.id        = `ed-sinner-${sinner.id}`;

    // Header
    const header = document.createElement('div');
    header.className = 'editor-sinner-card-header';
    header.innerHTML = `
      <div class="editor-sinner-dot" style="background:${sinner.color}"></div>
      <span class="editor-sinner-name">${sinner.name}</span>
      <span style="font-size:0.75rem;color:var(--text-secondary)">${sinner.identities?.length || 0}개 인격</span>
    `;

    const delBtn = document.createElement('button');
    delBtn.className   = 'btn-danger';
    delBtn.textContent = '삭제';
    delBtn.onclick = () => {
      if (!confirm(`${sinner.name}을(를) 삭제하시겠습니까?`)) return;
      GameData.characters.sinners = GameData.characters.sinners.filter(s => s.id !== sinner.id);
      this._renderCharacters();
      UI.showNotification(`${sinner.name} 삭제됨`);
    };
    header.appendChild(delBtn);
    card.appendChild(header);

    // Body — identities
    const body = document.createElement('div');
    body.className = 'editor-sinner-body';

    for (const identity of sinner.identities || []) {
      const iCard = document.createElement('div');
      iCard.className = 'editor-identity-card';

      const iHeader = document.createElement('div');
      iHeader.className = 'editor-identity-header';
      iHeader.innerHTML = `
        <span class="editor-identity-name">${identity.name}</span>
        <span style="font-size:0.72rem;color:var(--text-secondary)">HP ${identity.hp} / 속도 ${identity.spd} / 방어 ${identity.def}</span>
      `;
      iCard.appendChild(iHeader);

      // Skills
      for (const sk of identity.skills || []) {
        const row = document.createElement('div');
        row.className = 'editor-skill-row';
        row.innerHTML = `
          <span class="skill-name-tag">${sk.name}</span>
          <span class="type-${sk.type}">${sk.type}</span>
          <span>코인 ${sk.coins}</span>
          <span>기본 ${sk.basePower}</span>
          <span>코인당 ${sk.coinPower}</span>
          <span>확률 ${Math.round(sk.coinChance * 100)}%</span>
        `;
        iCard.appendChild(row);
      }

      body.appendChild(iCard);
    }
    card.appendChild(body);

    return card;
  }

  _showAddSinnerForm(list) {
    // Remove existing form if any
    document.getElementById('add-sinner-form')?.remove();

    const form = document.createElement('div');
    form.className = 'editor-inline-form';
    form.id        = 'add-sinner-form';
    form.innerHTML = `
      <h4 style="color:var(--accent-gold);margin-bottom:8px">새 죄인 추가</h4>
      <div class="form-row">
        <div class="form-group">
          <label>이름</label>
          <input type="text" id="new-sinner-name" placeholder="예: 새죄인">
        </div>
        <div class="form-group">
          <label>색상 (hex)</label>
          <input type="color" id="new-sinner-color" value="#9b59b6">
        </div>
      </div>
      <div class="form-actions">
        <button class="btn-small btn-primary" id="btn-confirm-add-sinner">추가</button>
        <button class="btn-small" id="btn-cancel-add-sinner">취소</button>
      </div>
    `;

    list.prepend(form);

    document.getElementById('btn-cancel-add-sinner').onclick = () => form.remove();
    document.getElementById('btn-confirm-add-sinner').onclick = () => {
      const name  = document.getElementById('new-sinner-name').value.trim();
      const color = document.getElementById('new-sinner-color').value;
      if (!name) { UI.showNotification('이름을 입력하세요'); return; }

      const newSinner = {
        id:         `sinner_${Date.now()}`,
        name,
        color,
        identities: [
          {
            id:     `identity_${Date.now()}`,
            name:   '기본',
            hp:     100,
            spd:    5,
            def:    10,
            skills: [
              { id: `skill_${Date.now()}`, name: '기본 공격', type: '타격', coins: 1, basePower: 5, coinPower: 5, coinChance: 0.6, description: '기본 공격' }
            ]
          }
        ]
      };

      GameData.characters.sinners.push(newSinner);
      form.remove();
      this._renderCharacters();
      UI.showNotification(`${name} 추가됨`);
    };
  }

  // ─── Dungeon Tab ───────────────────────────────────────────────────────────

  _renderDungeon() {
    const list = document.getElementById('dungeon-editor-list');
    if (!list) return;
    list.innerHTML = '';

    const nodes = GameData.dungeon?.nodes || [];
    for (const node of nodes) {
      const row = document.createElement('div');
      row.className = 'editor-node-row';

      const typeBadge = document.createElement('span');
      typeBadge.className = `editor-node-type-badge type-${node.type}`;
      typeBadge.textContent = node.type.toUpperCase();

      const info = document.createElement('span');
      info.style.flex = '1';
      info.innerHTML  = `<strong>${node.label}</strong> <span style="color:var(--text-secondary);font-size:0.75rem">(${node.id}) x:${node.x} y:${node.y}</span>`;

      if (node.enemies?.length) {
        const eInfo = document.createElement('span');
        eInfo.style.color     = 'var(--text-secondary)';
        eInfo.style.fontSize  = '0.75rem';
        eInfo.textContent     = `적: ${node.enemies.join(', ')}`;
        info.appendChild(document.createTextNode(' '));
        info.appendChild(eInfo);
      }

      const connInfo = document.createElement('span');
      connInfo.style.color    = 'var(--text-secondary)';
      connInfo.style.fontSize = '0.72rem';
      connInfo.textContent    = `→ ${node.connections?.join(', ') || '-'}`;

      row.appendChild(typeBadge);
      row.appendChild(info);
      row.appendChild(connInfo);
      list.appendChild(row);
    }

    document.getElementById('btn-add-node').onclick = () => {
      this._showAddNodeForm(list);
    };
  }

  _showAddNodeForm(list) {
    document.getElementById('add-node-form')?.remove();

    const form = document.createElement('div');
    form.className = 'editor-inline-form';
    form.id        = 'add-node-form';
    form.innerHTML = `
      <h4 style="color:var(--accent-gold);margin-bottom:8px">새 노드 추가</h4>
      <div class="form-row">
        <div class="form-group">
          <label>타입</label>
          <select id="new-node-type">
            <option value="battle">battle</option>
            <option value="event">event</option>
            <option value="reward">reward</option>
            <option value="boss">boss</option>
          </select>
        </div>
        <div class="form-group">
          <label>레이블</label>
          <input type="text" id="new-node-label" placeholder="예: ⚔ 전투">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>X 좌표</label><input type="number" id="new-node-x" value="400"></div>
        <div class="form-group"><label>Y 좌표</label><input type="number" id="new-node-y" value="300"></div>
      </div>
      <div class="form-actions">
        <button class="btn-small btn-primary" id="btn-confirm-add-node">추가</button>
        <button class="btn-small" id="btn-cancel-add-node">취소</button>
      </div>
    `;

    list.prepend(form);

    document.getElementById('btn-cancel-add-node').onclick = () => form.remove();
    document.getElementById('btn-confirm-add-node').onclick = () => {
      const type  = document.getElementById('new-node-type').value;
      const label = document.getElementById('new-node-label').value.trim() || type;
      const x     = parseInt(document.getElementById('new-node-x').value) || 400;
      const y     = parseInt(document.getElementById('new-node-y').value) || 300;
      const newId = `node_${Date.now()}`;

      const newNode = { id: newId, type, x, y, label, connections: [] };
      if (type === 'battle' || type === 'boss') newNode.enemies = [];

      GameData.dungeon.nodes.push(newNode);
      form.remove();
      this._renderDungeon();
      UI.showNotification(`노드 "${label}" 추가됨`);
    };
  }

  // ─── Settings Tab ──────────────────────────────────────────────────────────

  _renderSettings() {
    const cfg = GameData.config?.game || {};
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };
    setVal('setting-battle-bg',  cfg.battleBackground);
    setVal('setting-dungeon-bg', cfg.dungeonBackground);
    setVal('setting-bgm-url',    cfg.bgmUrl);

    const saveBtn = document.getElementById('btn-save-settings');
    if (saveBtn) {
      saveBtn.onclick = () => {
        if (!GameData.config.game) GameData.config.game = {};
        GameData.config.game.battleBackground  = document.getElementById('setting-battle-bg').value.trim();
        GameData.config.game.dungeonBackground = document.getElementById('setting-dungeon-bg').value.trim();
        GameData.config.game.bgmUrl            = document.getElementById('setting-bgm-url').value.trim();
        UI.showNotification('설정 저장됨');
        AudioManager.playSFX('select');
      };
    }
  }

  // ─── Import / Export ───────────────────────────────────────────────────────

  _setupImportExport() {
    const exportBtn = document.getElementById('btn-export-data');
    const importBtn = document.getElementById('btn-import-data');
    const fileInput = document.getElementById('import-file-input');

    if (exportBtn) {
      exportBtn.onclick = () => {
        const json = GameData.exportData();
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'limbus_parody_data.json';
        a.click();
        URL.revokeObjectURL(url);
        UI.showNotification('데이터 내보내기 완료');
      };
    }

    if (importBtn && fileInput) {
      importBtn.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const ok = GameData.importData(ev.target.result);
          if (ok) {
            this._renderCharacters();
            this._renderDungeon();
            this._renderSettings();
            UI.showNotification('데이터 불러오기 완료');
          } else {
            UI.showNotification('데이터 불러오기 실패 — 형식 오류');
          }
        };
        reader.readAsText(file);
        fileInput.value = '';
      };
    }
  }
}
