/**
 * dungeon.js — DungeonSystem
 * Renders the dungeon map on Canvas and handles node interactions.
 */

class DungeonSystem {
  constructor() {
    this.dungeonData  = null;
    this.partyDefs    = [];
    this.canvas       = null;
    this.ctx          = null;
    this.visitedNodes = new Set();
    this.currentNode  = 'node_0';
    this.onBattleRequest  = null; // callback(enemyIds)
    this.onDungeonClear   = null; // callback()
    this.onDungeonAbandon = null; // callback()
    this._pendingNode = null;
  }

  /**
   * Initialize dungeon system.
   * @param {Object}   dungeonData
   * @param {Array}    partyDefs     [{sinnerId, identityId}]
   * @param {Function} onBattleRequest  called with (enemyIds, nodeId)
   * @param {Function} onDungeonClear
   */
  init(dungeonData, partyDefs, onBattleRequest, onDungeonClear) {
    this.dungeonData       = dungeonData;
    this.partyDefs         = partyDefs;
    this.onBattleRequest   = onBattleRequest;
    this.onDungeonClear    = onDungeonClear;

    // Restore or reset progress
    const prog = GameState.dungeonProgress;
    this.visitedNodes = new Set(prog.visitedNodes?.length ? prog.visitedNodes : ['node_0']);
    this.currentNode  = prog.currentNode || 'node_0';

    // Update header
    const nameEl = document.getElementById('dungeon-name');
    if (nameEl) nameEl.textContent = dungeonData.name || '던전';

    this._renderPartyStatus();
    this._setupCanvas();
    this._redraw();
    this._hideModals();
  }

  // ─── Canvas Setup ──────────────────────────────────────────────────────────

  _setupCanvas() {
    this.canvas = document.getElementById('dungeon-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    // Scale canvas for the actual container
    const container = this.canvas.parentElement;
    const maxW = Math.min(container.clientWidth  - 20, 800);
    const maxH = Math.min(container.clientHeight - 20, 640);
    this.canvas.style.width  = maxW  + 'px';
    this.canvas.style.height = maxH  + 'px';
    // Keep internal resolution at 800x640
    this.canvas.width  = 800;
    this.canvas.height = 640;

    this.canvas.onclick = (e) => this._onCanvasClick(e);
    this.canvas.onmousemove = (e) => this._onCanvasHover(e);
  }

  _getCanvasPos(e) {
    const rect    = this.canvas.getBoundingClientRect();
    const scaleX  = this.canvas.width  / rect.width;
    const scaleY  = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY
    };
  }

  _onCanvasClick(e) {
    const { x, y } = this._getCanvasPos(e);
    for (const node of this.dungeonData.nodes) {
      if (this._distToNode(x, y, node) < 28) {
        this.handleNodeClick(node.id);
        break;
      }
    }
  }

  _onCanvasHover(e) {
    const { x, y } = this._getCanvasPos(e);
    let hovering = false;
    for (const node of this.dungeonData.nodes) {
      if (this._distToNode(x, y, node) < 28 && this._isAvailable(node.id)) {
        hovering = true;
        break;
      }
    }
    this.canvas.style.cursor = hovering ? 'pointer' : 'default';
  }

  _distToNode(x, y, node) {
    return Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
  }

  // ─── Drawing ───────────────────────────────────────────────────────────────

  _redraw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;

    // Background
    const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
    bg.addColorStop(0, '#050a14');
    bg.addColorStop(1, '#020408');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(50,80,120,0.12)';
    ctx.lineWidth   = 1;
    for (let gx = 0; gx < W; gx += 60) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (let gy = 0; gy < H; gy += 60) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

    // Draw connections
    for (const node of this.dungeonData.nodes) {
      for (const connId of node.connections) {
        const conn = this._getNode(connId);
        if (conn) this._drawConnection(node, conn);
      }
    }

    // Draw nodes
    for (const node of this.dungeonData.nodes) {
      this._drawNode(node);
    }

    // Legend
    this._drawLegend(ctx);
  }

  _drawConnection(from, to) {
    const ctx = this.ctx;
    const visited  = this.visitedNodes.has(from.id) && this.visitedNodes.has(to.id);
    const fromVis  = this.visitedNodes.has(from.id);
    const toAvail  = this._isAvailable(to.id);

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x,   to.y);

    if (visited) {
      ctx.strokeStyle = 'rgba(100,180,255,0.5)';
      ctx.lineWidth   = 2.5;
      ctx.setLineDash([]);
    } else if (fromVis && toAvail) {
      ctx.strokeStyle = 'rgba(200,200,100,0.4)';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([6, 4]);
    } else {
      ctx.strokeStyle = 'rgba(60,60,80,0.3)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 6]);
    }

    ctx.stroke();
    ctx.setLineDash([]);
  }

  _nodeColors() {
    return {
      start:  '#27ae60',
      battle: '#c0392b',
      event:  '#2980b9',
      reward: '#f39c12',
      boss:   '#8e1a1a',
      exit:   '#8e44ad'
    };
  }

  _nodeIcons() {
    return { start: '▶', battle: '⚔', event: '?', reward: '★', boss: '☠', exit: '✓' };
  }

  _drawNode(node) {
    const ctx     = this.ctx;
    const colors  = this._nodeColors();
    const icons   = this._nodeIcons();
    const color   = colors[node.type] || '#555';
    const visited  = this.visitedNodes.has(node.id);
    const current  = node.id === this.currentNode;
    const available = this._isAvailable(node.id);

    const R = 26;

    // Outer glow for current/available
    if (current) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, R + 8, 0, Math.PI * 2);
      const grd = ctx.createRadialGradient(node.x, node.y, R, node.x, node.y, R + 10);
      grd.addColorStop(0, color + '88');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fill();
    } else if (available) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, R + 6, 0, Math.PI * 2);
      const grd = ctx.createRadialGradient(node.x, node.y, R, node.x, node.y, R + 8);
      grd.addColorStop(0, color + '44');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fill();
    }

    // Circle fill
    ctx.beginPath();
    ctx.arc(node.x, node.y, R, 0, Math.PI * 2);
    if (visited) {
      const grad = ctx.createRadialGradient(node.x - R * 0.3, node.y - R * 0.3, 2, node.x, node.y, R);
      grad.addColorStop(0, this._lightenHex(color, 40));
      grad.addColorStop(1, color);
      ctx.fillStyle = grad;
    } else if (available) {
      ctx.fillStyle = color + 'aa';
    } else {
      ctx.fillStyle = '#1a1a2a';
    }
    ctx.fill();

    // Border
    ctx.beginPath();
    ctx.arc(node.x, node.y, R, 0, Math.PI * 2);
    ctx.strokeStyle = current ? '#ffffff' : (visited ? color : (available ? color + '88' : '#333'));
    ctx.lineWidth   = current ? 3 : (visited ? 2 : 1);
    ctx.stroke();

    // Icon
    ctx.font      = '14px serif';
    ctx.fillStyle = visited ? '#fff' : (available ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icons[node.type] || '○', node.x, node.y);

    // Label below
    const labelY = node.y + R + 14;
    ctx.font      = '11px monospace';
    ctx.fillStyle = visited ? '#c8d8f0' : (available ? '#8aabb0' : '#404050');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(node.label, node.x, labelY);
  }

  _drawLegend(ctx) {
    const types  = [
      { type: 'start',  label: '시작' },
      { type: 'battle', label: '전투' },
      { type: 'event',  label: '이벤트' },
      { type: 'reward', label: '보상' },
      { type: 'boss',   label: '보스' },
      { type: 'exit',   label: '출구' }
    ];
    const colors = this._nodeColors();
    const startX = 12, startY = this.canvas.height - 12 - types.length * 16;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(startX - 4, startY - 4, 120, types.length * 16 + 8);

    for (let i = 0; i < types.length; i++) {
      const { type, label } = types[i];
      const y = startY + i * 16;
      ctx.beginPath();
      ctx.arc(startX + 5, y + 5, 4, 0, Math.PI * 2);
      ctx.fillStyle = colors[type];
      ctx.fill();
      ctx.font      = '10px monospace';
      ctx.fillStyle = '#8899aa';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(label, startX + 14, y);
    }
  }

  _lightenHex(hex, amt) {
    if (!hex || hex[0] !== '#') return hex;
    const r = Math.min(255, parseInt(hex.slice(1,3),16) + amt);
    const g = Math.min(255, parseInt(hex.slice(3,5),16) + amt);
    const b = Math.min(255, parseInt(hex.slice(5,7),16) + amt);
    return `rgb(${r},${g},${b})`;
  }

  // ─── Node Logic ────────────────────────────────────────────────────────────

  _isAvailable(nodeId) {
    if (this.visitedNodes.has(nodeId)) return false;
    const nodes = this.dungeonData.nodes;
    for (const vid of this.visitedNodes) {
      const vn = nodes.find(n => n.id === vid);
      if (vn?.connections?.includes(nodeId)) return true;
    }
    return false;
  }

  _getNode(id) {
    return this.dungeonData.nodes.find(n => n.id === id) || null;
  }

  handleNodeClick(nodeId) {
    if (!this._isAvailable(nodeId)) {
      // If clicking current node: show info
      if (this.visitedNodes.has(nodeId)) return;
      UI.showNotification('이 노드에는 아직 이동할 수 없습니다.');
      return;
    }

    const node = this._getNode(nodeId);
    if (!node) return;

    AudioManager.playSFX('navigate');
    this.visitedNodes.add(nodeId);
    this.currentNode = nodeId;

    // Save progress
    GameState.dungeonProgress.visitedNodes = [...this.visitedNodes];
    GameState.dungeonProgress.currentNode  = nodeId;
    GameState.saveToLocalStorage();

    this._redraw();
    this._renderPartyStatus();

    switch (node.type) {
      case 'battle':
      case 'boss':
        this._pendingNode = node;
        if (node.type === 'boss') AudioManager.playSFX('boss');
        setTimeout(() => {
          if (this.onBattleRequest) this.onBattleRequest(node.enemies || [], nodeId);
        }, 400);
        break;

      case 'event':
        this._triggerEvent();
        break;

      case 'reward':
        this._triggerReward();
        break;

      case 'exit':
        this._completeDungeon();
        break;

      case 'start':
      default:
        break;
    }
  }

  // ─── Event ─────────────────────────────────────────────────────────────────

  _triggerEvent() {
    const events = this.dungeonData.events || [];
    if (!events.length) { this._redraw(); return; }
    const eventData = events[Math.floor(Math.random() * events.length)];

    document.getElementById('event-title').textContent       = eventData.title;
    document.getElementById('event-description').textContent = eventData.description;

    const choicesEl = document.getElementById('event-choices');
    choicesEl.innerHTML = '';

    for (const choice of eventData.choices) {
      const btn = document.createElement('button');
      btn.className   = 'event-choice-btn';
      btn.textContent = choice.text;
      btn.addEventListener('click', () => {
        AudioManager.playSFX('select');
        this._applyEventEffect(choice.effect);
        this._hideModals();
        this._redraw();
        this._renderPartyStatus();
      });
      choicesEl.appendChild(btn);
    }

    document.getElementById('dungeon-event-modal').classList.remove('hidden');
  }

  _applyEventEffect(effect) {
    if (!effect) return;
    switch (effect.type) {
      case 'heal': {
        let healed = 0;
        for (const member of this.partyDefs) {
          const identity = GameData.getIdentity(member.sinnerId, member.identityId);
          if (!identity) continue;
          const cur = GameState.currentHP[member.sinnerId] ?? identity.hp;
          const newHP = Math.min(identity.hp, cur + effect.value);
          GameState.currentHP[member.sinnerId] = newHP;
          healed += newHP - cur;
        }
        GameState.saveToLocalStorage();
        UI.showNotification(`파티 HP +${effect.value} 회복!`);
        AudioManager.playSFX('heal');
        break;
      }
      case 'none':
      default:
        UI.showNotification('지나쳤다.');
        break;
    }
  }

  // ─── Reward ────────────────────────────────────────────────────────────────

  _triggerReward() {
    const healAmt = 30;

    const contentEl = document.getElementById('reward-content');
    contentEl.innerHTML = `
      <span class="reward-icon">🎁</span>
      <div class="reward-text">파티 HP +${healAmt} 회복</div>
    `;

    // Apply heal
    for (const member of this.partyDefs) {
      const identity = GameData.getIdentity(member.sinnerId, member.identityId);
      if (!identity) continue;
      const cur  = GameState.currentHP[member.sinnerId] ?? identity.hp;
      GameState.currentHP[member.sinnerId] = Math.min(identity.hp, cur + healAmt);
    }
    GameState.saveToLocalStorage();
    AudioManager.playSFX('heal');

    document.getElementById('dungeon-reward-modal').classList.remove('hidden');

    document.getElementById('btn-reward-close').onclick = () => {
      this._hideModals();
      this._redraw();
      this._renderPartyStatus();
    };
  }

  // ─── Dungeon Clear ─────────────────────────────────────────────────────────

  _completeDungeon() {
    GameState.dungeonProgress.cleared = true;
    GameState.saveToLocalStorage();
    UI.showNotification('던전 클리어!');
    AudioManager.playSFX('victory');
    setTimeout(() => {
      if (this.onDungeonClear) this.onDungeonClear();
    }, 1000);
  }

  // ─── After Battle Returns ──────────────────────────────────────────────────

  /** Called by main.js after a battle victory */
  onBattleVictory() {
    this._redraw();
    this._renderPartyStatus();
    UI.showNotification('전투 승리! 다음 노드를 선택하세요.');
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _hideModals() {
    document.getElementById('dungeon-event-modal')?.classList.add('hidden');
    document.getElementById('dungeon-reward-modal')?.classList.add('hidden');
  }

  _renderPartyStatus() {
    const container = document.getElementById('dungeon-party-status');
    if (!container) return;
    container.innerHTML = '';

    for (const def of this.partyDefs) {
      const sinner   = GameData.getSinner(def.sinnerId);
      const identity = GameData.getIdentity(def.sinnerId, def.identityId);
      if (!sinner || !identity) continue;

      const curHP = GameState.currentHP[def.sinnerId] ?? identity.hp;
      const el = document.createElement('div');
      el.className = 'party-status-member';
      el.innerHTML = `
        <div class="party-status-dot" style="background:${sinner.color}"></div>
        <span>${sinner.name}</span>
        <span class="party-status-hp">${curHP}/${identity.hp}</span>
      `;
      container.appendChild(el);
    }
  }
}
