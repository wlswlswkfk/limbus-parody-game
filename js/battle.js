/**
 * battle.js — BattleSystem
 * Manages the full turn-based battle sequence including coin flip animations.
 * Integrates with BattleRenderer (battle-renderer.js) for Canvas 2D visuals.
 */

class BattleSystem {
  constructor() {
    this.party    = [];   // { id, name, color, maxHP, currentHP, spd, def, skills, isPlayer }
    this.enemies  = [];
    this.onComplete = null;
    this.phase    = 'idle'; // 'selection' | 'resolution' | 'ended'
    this.selectedSkills = {};
    this.turnNumber = 1;
    this.damageDealt = 0;

    /** @type {BattleRenderer|null} */
    this._renderer = null;
  }

  /**
   * Initialize and render a battle.
   * @param {Array}    partyDefs  - [{sinnerId, identityId}]
   * @param {Array}    enemyIds   - ['phantom', 'phantom', ...]
   * @param {Function} onComplete - called with ('victory'|'defeat', stats)
   */
  init(partyDefs, enemyIds, onComplete) {
    this.onComplete     = onComplete;
    this.selectedSkills = {};
    this.phase          = 'selection';
    this.turnNumber     = 1;
    this.damageDealt    = 0;

    // Build party
    this.party = partyDefs.map(def => {
      const sinner   = GameData.getSinner(def.sinnerId);
      const identity = GameData.getIdentity(def.sinnerId, def.identityId);
      if (!sinner || !identity) return null;
      const savedHP = GameState.currentHP[def.sinnerId];
      return {
        id:        def.sinnerId,
        name:      `${sinner.name} (${identity.name})`,
        shortName: sinner.name,
        color:     sinner.color,
        maxHP:     identity.hp,
        currentHP: (savedHP !== undefined) ? savedHP : identity.hp,
        spd:       identity.spd,
        def:       identity.def,
        skills:    identity.skills,
        isPlayer:  true
      };
    }).filter(Boolean);

    // Build enemies (allow duplicates by giving each a unique instanceId)
    this.enemies = enemyIds.map((eid, idx) => {
      const def = GameData.getEnemyDef(eid);
      if (!def) return null;
      return {
        id:        `${def.id}_${idx}`,
        defId:     def.id,
        name:      def.name + (enemyIds.filter(e => e === eid).length > 1 ? ` ${idx + 1}` : ''),
        color:     def.color,
        maxHP:     def.hp,
        currentHP: def.hp,
        spd:       def.spd,
        def:       def.def,
        skills:    def.skills,
        isPlayer:  false
      };
    }).filter(Boolean);

    // Set up / reset Canvas renderer
    if (typeof BattleRenderer !== 'undefined') {
      if (!this._renderer) {
        this._renderer = new BattleRenderer('battle-canvas');
      } else {
        this._renderer.stop();
      }
    }

    this._clearLog();
    this._render();
    this._addLog('전투 시작!', 'system');
    this._addLog(`파티: ${this.party.map(p => p.shortName).join(', ')}`, 'system');
    this._addLog(`적: ${this.enemies.map(e => e.name).join(', ')}`, 'system');
    this._renderSkillSelection();
    this._updateStartButton();
  }

  // ─── Rendering ─────────────────────────────────────────────────────────────

  _render() {
    if (this._renderer) {
      // Canvas renderer takes over visuals.
      this._renderer.setup(this.party, this.enemies);
      // Clear HTML character cards (no longer primary display).
      const partyEl   = document.getElementById('battle-party');
      const enemiesEl = document.getElementById('battle-enemies');
      if (partyEl)   partyEl.innerHTML   = '';
      if (enemiesEl) enemiesEl.innerHTML = '';
      return;
    }
    // Fallback HTML rendering
    this._renderSide('battle-party',   this.party);
    this._renderSide('battle-enemies', this.enemies);
  }

  _renderSide(containerId, units) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    for (const unit of units) {
      const card = document.createElement('div');
      card.className  = 'battle-character';
      card.id         = `battle-unit-${unit.id}`;
      card.dataset.unitId = unit.id;

      const sprite = UI.createCharacterSprite(unit.color, unit.name);
      card.appendChild(sprite);
      unit.spriteEl = sprite;

      const nameEl = document.createElement('div');
      nameEl.className   = 'char-name';
      nameEl.textContent = unit.name;
      card.appendChild(nameEl);

      const hpText = document.createElement('div');
      hpText.className   = 'char-hp-text';
      hpText.textContent = `${unit.currentHP} / ${unit.maxHP}`;
      card.appendChild(hpText);
      unit.hpTextEl = hpText;

      const barContainer = document.createElement('div');
      barContainer.className = 'hp-bar-container';
      barContainer.style.width = '100%';
      const bar = document.createElement('div');
      bar.className = 'hp-bar';
      UI.updateHPBar(bar, unit.currentHP, unit.maxHP);
      barContainer.appendChild(bar);
      card.appendChild(barContainer);
      unit.hpBarEl = bar;

      if (unit.currentHP <= 0) card.classList.add('dead');
      container.appendChild(card);
    }
  }

  _renderSkillSelection() {
    const container = document.getElementById('skill-selection');
    if (!container) return;
    container.innerHTML = '';

    const aliveParty = this.party.filter(p => p.currentHP > 0);
    for (const member of aliveParty) {
      const block = document.createElement('div');
      block.className = 'skill-selector-block';

      const label = document.createElement('div');
      label.className   = 'skill-selector-label';
      label.textContent = member.shortName;
      block.appendChild(label);

      const cardsRow = document.createElement('div');
      cardsRow.className = 'skill-cards';
      cardsRow.id        = `skills-${member.id}`;

      for (const skill of member.skills) {
        const card = document.createElement('div');
        card.className      = 'skill-card';
        card.dataset.skillId = skill.id;
        card.dataset.unitId  = member.id;
        card.title          = skill.description;

        if (this.phase !== 'selection') card.classList.add('disabled-card');

        card.innerHTML = `
          <div class="skill-card-name">${skill.name}</div>
          <div class="skill-card-type type-${skill.type}">${skill.type}</div>
          <div class="skill-card-coins">코인 ${skill.coins}개</div>
          <div class="skill-card-power">기본 ${skill.basePower} + 코인당 ${skill.coinPower}</div>
        `;

        if (this.selectedSkills[member.id]?.id === skill.id) {
          card.classList.add('selected');
        }

        card.addEventListener('click', () => {
          if (this.phase !== 'selection') return;
          AudioManager.playSFX('select');
          this.selectedSkills[member.id] = skill;
          cardsRow.querySelectorAll('.skill-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this._updateStartButton();
        });

        cardsRow.appendChild(card);
      }

      block.appendChild(cardsRow);
      container.appendChild(block);
    }
  }

  _updateStartButton() {
    const btn = document.getElementById('btn-battle-start');
    if (!btn) return;
    const aliveParty = this.party.filter(p => p.currentHP > 0);
    const allSelected = aliveParty.every(p => this.selectedSkills[p.id]);
    btn.disabled = !allSelected || this.phase !== 'selection';
  }

  // ─── Battle Log ────────────────────────────────────────────────────────────

  _clearLog() {
    const log = document.getElementById('battle-log');
    if (log) log.innerHTML = '';
  }

  _addLog(text, type = '') {
    const log = document.getElementById('battle-log');
    if (!log) return;
    const entry = document.createElement('div');
    entry.className   = `log-entry${type ? ' log-' + type : ''}`;
    entry.textContent = text;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  }

  _setTurnIndicator(text) {
    const el = document.getElementById('battle-turn-indicator');
    if (el) el.textContent = text;
  }

  // ─── Core Mechanics ────────────────────────────────────────────────────────

  rollCoin(chance) {
    return Math.random() < chance;
  }

  calculateDamage(skill, coinsLanded) {
    return skill.basePower + (coinsLanded * skill.coinPower);
  }

  /**
   * Run a full turn: resolve all actions in speed order.
   * Called when player clicks "전투 시작".
   */
  async runTurn() {
    if (this.phase !== 'selection') return;
    this.phase = 'resolution';

    const btn = document.getElementById('btn-battle-start');
    if (btn) btn.disabled = true;

    document.querySelectorAll('.skill-card').forEach(c => c.classList.add('disabled-card'));

    this._addLog(`── 제 ${this.turnNumber} 턴 ──`, 'system');
    this._setTurnIndicator(`제 ${this.turnNumber} 턴 진행 중...`);
    document.getElementById('battle-turn-indicator')?.classList.add('active-turn');

    // Auto-assign skills for enemies
    const enemySkills = {};
    for (const enemy of this.enemies.filter(e => e.currentHP > 0)) {
      enemySkills[enemy.id] = enemy.skills[Math.floor(Math.random() * enemy.skills.length)];
    }

    // Sort turn order by speed (desc)
    const allUnits = [
      ...this.party.filter(p => p.currentHP > 0),
      ...this.enemies.filter(e => e.currentHP > 0)
    ].sort((a, b) => b.spd - a.spd);

    for (const unit of allUnits) {
      if (unit.currentHP <= 0) continue;

      const skill = unit.isPlayer ? this.selectedSkills[unit.id] : enemySkills[unit.id];
      if (!skill) continue;

      await this._executeAction(unit, skill);

      const result = this.checkWinCondition();
      if (result) {
        await this._endBattle(result);
        return;
      }

      await UI.delay(200);
    }

    // Turn over — reset for next selection
    this.turnNumber++;
    this.selectedSkills = {};
    this.phase = 'selection';
    document.getElementById('battle-turn-indicator')?.classList.remove('active-turn');
    this._setTurnIndicator('스킬 선택');
    this._renderSkillSelection();
    this._updateStartButton();
  }

  async _executeAction(unit, skill) {
    this._addLog(`${unit.name}의 [${skill.name}] (${skill.type})`, unit.isPlayer ? 'player' : 'enemy');

    // Pick target
    let target;
    if (unit.isPlayer) {
      target = this.enemies.find(e => e.currentHP > 0);
    } else {
      target = this.party.find(p => p.currentHP > 0);
    }
    if (!target) return;

    // ── Walk toward target ──────────────────────────────────────────────────
    if (this._renderer) {
      await this._renderer.walkTo(unit, target);
    } else {
      document.getElementById(`battle-unit-${unit.id}`)?.classList.add('active-attacker');
      document.getElementById(`battle-unit-${target.id}`)?.classList.add('active-target');
    }

    // ── Show coin flips ─────────────────────────────────────────────────────
    const coinOverlay = document.getElementById('battle-coins-overlay');
    if (coinOverlay) coinOverlay.classList.remove('hidden');

    const headsCount = await this._showCoinFlips(unit, skill);
    const rawDamage  = this.calculateDamage(skill, headsCount);
    const actualDmg  = Math.max(1, rawDamage - target.def);

    this._addLog(
      `  코인 결과: ${headsCount}/${skill.coins} 성공 → ${rawDamage} - ${target.def} 방어 = ${actualDmg} 피해`,
      unit.isPlayer ? 'player' : 'enemy'
    );

    if (coinOverlay) coinOverlay.classList.add('hidden');

    // ── Attack animation ────────────────────────────────────────────────────
    if (this._renderer) {
      await this._renderer.playAttack(unit, target);
      this._renderer.showHit(target, skill.type);
      this._renderer.showDamage(target, actualDmg, unit.isPlayer ? 'enemy' : 'player');
      await UI.delay(250);
    }

    // ── Apply damage ────────────────────────────────────────────────────────
    this.applyDamage(target, actualDmg, unit.isPlayer ? 'enemy' : 'player');
    if (unit.isPlayer) this.damageDealt += actualDmg;

    // ── Heal self ───────────────────────────────────────────────────────────
    if (skill.healSelf && unit.isPlayer) {
      const healAmt = Math.min(skill.healSelf, unit.maxHP - unit.currentHP);
      if (healAmt > 0) {
        unit.currentHP += healAmt;
        this._updateHPDisplay(unit);
        if (this._renderer) {
          this._renderer.showDamage(unit, healAmt, 'heal');
        } else {
          const el = unit.spriteEl || document.getElementById(`battle-unit-${unit.id}`);
          UI.showDamagePopup(el, healAmt, 'heal');
        }
        this._addLog(`  ${unit.shortName || unit.name} HP +${healAmt} 회복`, 'heal');
        AudioManager.playSFX('heal');
        if (unit.isPlayer) GameState.currentHP[unit.id] = unit.currentHP;
      }
    }

    AudioManager.playSFX('hit');
    await UI.delay(320);

    // ── Walk back ───────────────────────────────────────────────────────────
    if (this._renderer) {
      await this._renderer.walkBack(unit);
    } else {
      document.getElementById(`battle-unit-${unit.id}`)?.classList.remove('active-attacker');
      document.getElementById(`battle-unit-${target.id}`)?.classList.remove('active-target');
    }
  }

  async _showCoinFlips(unit, skill) {
    const coinDisplay = document.getElementById('coin-display');
    if (!coinDisplay) return 0;
    coinDisplay.innerHTML = '';

    const label = document.createElement('div');
    label.className   = 'coin-display-label';
    label.textContent = `${unit.name} — ${skill.name}`;
    coinDisplay.appendChild(label);

    const coinEls = [];
    for (let i = 0; i < skill.coins; i++) {
      const c = UI.createCoinEl();
      coinDisplay.appendChild(c);
      coinEls.push(c);
    }

    let headsCount = 0;
    for (let i = 0; i < skill.coins; i++) {
      const isHeads = this.rollCoin(skill.coinChance);
      if (isHeads) headsCount++;
      AudioManager.playSFX('coin');
      await UI.animateCoinFlip(coinEls[i], isHeads);
      AudioManager.playSFX(isHeads ? 'coin_heads' : 'coin_tails');
      await UI.delay(150);
    }

    return headsCount;
  }

  applyDamage(target, amount, popupType) {
    target.currentHP = Math.max(0, target.currentHP - amount);
    if (target.isPlayer) GameState.currentHP[target.id] = target.currentHP;

    this._updateHPDisplay(target);

    // HTML popup only when renderer is not active
    if (!this._renderer) {
      const targetEl = document.getElementById(`battle-unit-${target.id}`);
      if (targetEl) {
        UI.showDamagePopup(targetEl, amount, popupType || (target.isPlayer ? 'player' : 'enemy'));
        if (target.currentHP <= 0) targetEl.classList.add('dead');
      }
    }

    if (target.currentHP <= 0) {
      this._addLog(`  ${target.name} 쓰러짐!`, 'system');
    }
  }

  _updateHPDisplay(unit) {
    if (this._renderer) {
      this._renderer.refreshUnit(unit);
      return;
    }
    if (unit.hpBarEl)  UI.updateHPBar(unit.hpBarEl, unit.currentHP, unit.maxHP);
    if (unit.hpTextEl) unit.hpTextEl.textContent = `${Math.max(0, unit.currentHP)} / ${unit.maxHP}`;
  }

  checkWinCondition() {
    if (this.enemies.every(e => e.currentHP <= 0)) return 'victory';
    if (this.party.every(p => p.currentHP <= 0))   return 'defeat';
    return null;
  }

  async _endBattle(result) {
    this.phase = 'ended';
    document.getElementById('battle-turn-indicator')?.classList.remove('active-turn');

    for (const member of this.party) {
      GameState.currentHP[member.id] = member.currentHP;
    }
    GameState.saveToLocalStorage();

    await UI.delay(600);

    if (result === 'victory') {
      this._addLog('▶ 전투 승리!', 'system');
      AudioManager.playSFX('victory');
      GameState.battleStats.victories++;
    } else {
      this._addLog('▶ 전투 패배...', 'system');
      AudioManager.playSFX('defeat');
      GameState.battleStats.defeats++;
    }

    await UI.delay(900);

    if (this.onComplete) this.onComplete(result, { damageDealt: this.damageDealt });
  }

  /** Called by the "전투 시작" button */
  startBattle() {
    if (this.phase === 'selection') {
      this.runTurn();
    }
  }
}
