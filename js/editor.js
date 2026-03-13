/**
 * editor.js — EditorSystem
 * In-game data editor with tabs for Characters, Dungeon, Settings, and Asset Management.
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
    this._renderAssets();
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
    if (tabName === 'assets') this._renderAssets();
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

    const addBtn = document.getElementById('btn-add-sinner');
    if (addBtn) {
      addBtn.onclick = () => this._showAddSinnerForm(list);
    }
  }

  _buildSinnerEditorCard(sinner) {
    const card = document.createElement('div');
    card.className = 'editor-sinner-card';
    card.id        = `ed-sinner-${sinner.id}`;

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
        eInfo.style.color    = 'var(--text-secondary)';
        eInfo.style.fontSize = '0.75rem';
        eInfo.textContent    = `적: ${node.enemies.join(', ')}`;
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

  // ─── Asset Management Tab ──────────────────────────────────────────────────

  async _renderAssets() {
    const container = document.getElementById('asset-manager-content');
    if (!container) return;
    container.innerHTML = '<p style="color:var(--text-secondary);font-size:0.85rem">에셋 불러오는 중...</p>';

    // Make sure AssetManager is ready
    if (typeof AssetManager === 'undefined') {
      container.innerHTML = '<p style="color:var(--accent-red-light)">AssetManager를 불러올 수 없습니다.</p>';
      return;
    }

    container.innerHTML = '';

    // ── Character Sprites ──────────────────────────────────────────────────
    container.appendChild(this._sectionHeader('캐릭터 스프라이트'));

    const sinners = GameData.characters?.sinners || [];
    for (const sinner of sinners) {
      container.appendChild(await this._buildSpriteRow(
        `sprite_${sinner.id}`,
        sinner.name,
        'image',
        true // has config
      ));
    }

    if (!sinners.length) {
      const p = document.createElement('p');
      p.style.cssText = 'color:var(--text-secondary);font-size:0.8rem;padding:4px 0';
      p.textContent = '캐릭터가 없습니다.';
      container.appendChild(p);
    }

    // ── Enemy Sprites ──────────────────────────────────────────────────────
    container.appendChild(this._sectionHeader('적 스프라이트'));

    const enemies = GameData.enemies?.enemies || [];
    for (const enemy of enemies) {
      container.appendChild(await this._buildSpriteRow(
        `enemy_sprite_${enemy.id}`,
        enemy.name,
        'image',
        true
      ));
    }

    // ── Battle Background ──────────────────────────────────────────────────
    container.appendChild(this._sectionHeader('배경 이미지'));
    container.appendChild(await this._buildSpriteRow('battle_background', '전투 배경', 'image', false));

    // ── BGM ────────────────────────────────────────────────────────────────
    container.appendChild(this._sectionHeader('음악 (BGM)'));
    for (const [key, label] of [['bgm_menu','메뉴 BGM'],['bgm_battle','전투 BGM'],['bgm_dungeon','던전 BGM']]) {
      container.appendChild(await this._buildAudioRow(key, label));
    }

    // ── SFX ────────────────────────────────────────────────────────────────
    container.appendChild(this._sectionHeader('효과음 (SFX)'));
    const sfxList = [
      ['sfx_hit',       '공격/피격 SFX'],
      ['sfx_coin',      '코인 SFX'],
      ['sfx_coin_heads','코인 앞면 SFX'],
      ['sfx_coin_tails','코인 뒷면 SFX'],
      ['sfx_victory',   '승리 SFX'],
      ['sfx_defeat',    '패배 SFX'],
      ['sfx_heal',      '회복 SFX'],
      ['sfx_navigate',  '이동 SFX'],
      ['sfx_select',    '선택 SFX'],
      ['sfx_boss',      '보스 SFX'],
    ];
    for (const [key, label] of sfxList) {
      container.appendChild(await this._buildAudioRow(key, label));
    }
  }

  _sectionHeader(text) {
    const h = document.createElement('h4');
    h.className = 'asset-section-header';
    h.textContent = `── ${text} ──`;
    return h;
  }

  /** Build a sprite/image asset row with upload/preview/delete buttons */
  async _buildSpriteRow(key, label, _type, hasConfig) {
    const row = document.createElement('div');
    row.className = 'asset-row';
    row.id = `asset-row-${key}`;

    const nameEl = document.createElement('span');
    nameEl.className = 'asset-label';
    nameEl.textContent = label;
    row.appendChild(nameEl);

    // Preview thumbnail
    const thumb = document.createElement('div');
    thumb.className = 'asset-thumb';

    const existingUrl = await AssetManager.load(key);
    if (existingUrl) {
      const img = document.createElement('img');
      img.src = existingUrl;
      img.className = 'asset-thumb-img';
      thumb.appendChild(img);
    } else {
      thumb.textContent = '없음';
    }
    row.appendChild(thumb);

    // Upload button
    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'btn-small btn-primary';
    uploadBtn.textContent = '업로드';
    uploadBtn.onclick = () => this._uploadImage(key, thumb, row, hasConfig);
    row.appendChild(uploadBtn);

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-small btn-danger';
    delBtn.textContent = '삭제';
    delBtn.onclick = async () => {
      await AssetManager.delete(key);
      if (hasConfig) await AssetManager.delete(key + '_config');
      thumb.innerHTML = '없음';
      UI.showNotification(`${label} 삭제됨`);
      await AudioManager.reloadCustomAsset(key);
    };
    row.appendChild(delBtn);

    return row;
  }

  /** Trigger image file dialog and save asset */
  _uploadImage(key, thumbEl, rowEl, hasConfig) {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = 'image/png,image/jpeg,image/gif,image/webp';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const dataUrl = await AssetManager.fileToDataUrl(file);
        await AssetManager.save(key, dataUrl);

        // Update thumbnail
        thumbEl.innerHTML = '';
        const img = document.createElement('img');
        img.src = dataUrl;
        img.className = 'asset-thumb-img';
        thumbEl.appendChild(img);

        UI.showNotification(`이미지 업로드 완료`);

        // If has config support, show config editor
        if (hasConfig) this._showSpriteConfigDialog(key, dataUrl, rowEl);
      } catch (err) {
        UI.showNotification('업로드 실패: ' + err.message);
      }
    };

    input.click();
  }

  /** Show sprite sheet config dialog after image upload */
  _showSpriteConfigDialog(key, dataUrl, afterEl) {
    // Remove existing dialog
    document.getElementById('sprite-config-dialog')?.remove();

    const dialog = document.createElement('div');
    dialog.id        = 'sprite-config-dialog';
    dialog.className = 'sprite-config-dialog';
    dialog.innerHTML = `
      <h4 style="color:var(--accent-gold);margin-bottom:8px">스프라이트 시트 설정 (선택사항)</h4>
      <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:10px">
        단일 이미지라면 기본값(프레임 1개)을 사용하세요.
      </p>
      <div class="form-row">
        <div class="form-group">
          <label>프레임 너비 (px)</label>
          <input type="number" id="sc-fw" value="64" min="1">
        </div>
        <div class="form-group">
          <label>프레임 높이 (px)</label>
          <input type="number" id="sc-fh" value="64" min="1">
        </div>
      </div>
      <p style="font-size:0.78rem;color:var(--text-secondary);margin:8px 0 4px">프레임 범위 (0부터 시작)</p>
      <div class="form-row">
        <div class="form-group"><label>idle 시작</label><input type="number" id="sc-idle-s" value="0" min="0"></div>
        <div class="form-group"><label>idle 끝</label><input type="number" id="sc-idle-e" value="0" min="0"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>move 시작</label><input type="number" id="sc-move-s" value="0" min="0"></div>
        <div class="form-group"><label>move 끝</label><input type="number" id="sc-move-e" value="0" min="0"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>attack 시작</label><input type="number" id="sc-atk-s" value="0" min="0"></div>
        <div class="form-group"><label>attack 끝</label><input type="number" id="sc-atk-e" value="0" min="0"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>hit 시작</label><input type="number" id="sc-hit-s" value="0" min="0"></div>
        <div class="form-group"><label>hit 끝</label><input type="number" id="sc-hit-e" value="0" min="0"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>death 시작</label><input type="number" id="sc-dth-s" value="0" min="0"></div>
        <div class="form-group"><label>death 끝</label><input type="number" id="sc-dth-e" value="0" min="0"></div>
      </div>
      <div class="form-actions">
        <button class="btn-small btn-primary" id="sc-save">저장</button>
        <button class="btn-small" id="sc-skip">건너뛰기 (단일 이미지)</button>
      </div>
    `;

    // Insert after the row
    afterEl.insertAdjacentElement('afterend', dialog);

    const getInt = id => parseInt(document.getElementById(id)?.value) || 0;

    document.getElementById('sc-skip').onclick = () => dialog.remove();
    document.getElementById('sc-save').onclick = async () => {
      const config = {
        frameWidth:  getInt('sc-fw'),
        frameHeight: getInt('sc-fh'),
        animations: {
          idle:   { start: getInt('sc-idle-s'), end: getInt('sc-idle-e') },
          move:   { start: getInt('sc-move-s'), end: getInt('sc-move-e') },
          attack: { start: getInt('sc-atk-s'),  end: getInt('sc-atk-e')  },
          hit:    { start: getInt('sc-hit-s'),  end: getInt('sc-hit-e')  },
          death:  { start: getInt('sc-dth-s'),  end: getInt('sc-dth-e')  }
        }
      };
      await AssetManager.save(key + '_config', JSON.stringify(config));
      dialog.remove();
      UI.showNotification('스프라이트 설정 저장됨');
    };
  }

  /** Build an audio asset row with upload/preview/delete buttons */
  async _buildAudioRow(key, label) {
    const row = document.createElement('div');
    row.className = 'asset-row';
    row.id = `asset-row-${key}`;

    const nameEl = document.createElement('span');
    nameEl.className = 'asset-label';
    nameEl.textContent = label;
    row.appendChild(nameEl);

    // Status indicator
    const statusEl = document.createElement('span');
    statusEl.className = 'asset-status';
    const existingUrl = await AssetManager.load(key);
    statusEl.textContent = existingUrl ? '✓ 업로드됨' : '기본값 사용';
    statusEl.style.color  = existingUrl ? '#27ae60' : 'var(--text-secondary)';
    row.appendChild(statusEl);

    // Preview (play) button
    const previewBtn = document.createElement('button');
    previewBtn.className = 'btn-small';
    previewBtn.textContent = '▶';
    previewBtn.disabled = !existingUrl;
    previewBtn.onclick = () => {
      if (!existingUrl) return;
      const a = new Audio(existingUrl);
      a.volume = 0.5;
      a.play().catch(() => {});
    };
    row.appendChild(previewBtn);

    // Upload button
    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'btn-small btn-primary';
    uploadBtn.textContent = '업로드';
    uploadBtn.onclick = () => this._uploadAudio(key, label, statusEl, previewBtn);
    row.appendChild(uploadBtn);

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-small btn-danger';
    delBtn.textContent = '삭제';
    delBtn.onclick = async () => {
      await AssetManager.delete(key);
      statusEl.textContent = '기본값 사용';
      statusEl.style.color  = 'var(--text-secondary)';
      previewBtn.disabled   = true;
      await AudioManager.reloadCustomAsset(key);
      UI.showNotification(`${label} 삭제됨`);
    };
    row.appendChild(delBtn);

    return row;
  }

  /** Trigger audio file dialog and save asset */
  _uploadAudio(key, label, statusEl, previewBtn) {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = 'audio/mp3,audio/mpeg,audio/ogg,audio/wav,audio/*';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const dataUrl = await AssetManager.fileToDataUrl(file);
        await AssetManager.save(key, dataUrl);
        await AudioManager.reloadCustomAsset(key);

        statusEl.textContent = '✓ 업로드됨';
        statusEl.style.color  = '#27ae60';
        previewBtn.disabled   = false;
        previewBtn.onclick    = () => {
          const a = new Audio(dataUrl);
          a.volume = 0.5;
          a.play().catch(() => {});
        };
        UI.showNotification(`${label} 업로드 완료`);
      } catch (err) {
        UI.showNotification('업로드 실패: ' + err.message);
      }
    };

    input.click();
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
