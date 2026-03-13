/**
 * data.js — Game data management and state
 * All JSON data is embedded here so the game works from file:// protocol.
 */

// ─── Embedded Data ────────────────────────────────────────────────────────────

const EMBEDDED_CHARACTERS = {
  sinners: [
    {
      id: 'sinner_a', name: '아리아', color: '#e74c3c',
      identities: [
        {
          id: 'identity_a1', name: '검객', hp: 100, spd: 5, def: 10,
          skills: [
            { id: 'skill_a1_1', name: '검격',  type: '참격', coins: 2, basePower: 3,  coinPower: 5,  coinChance: 0.6,  description: '날카로운 검으로 베어낸다' },
            { id: 'skill_a1_2', name: '연참',  type: '참격', coins: 3, basePower: 2,  coinPower: 4,  coinChance: 0.55, description: '빠르게 세 번 베어낸다' },
            { id: 'skill_a1_3', name: '필살검', type: '참격', coins: 1, basePower: 8,  coinPower: 12, coinChance: 0.65, description: '전력을 다한 일격' }
          ]
        },
        {
          id: 'identity_a2', name: '마술사', hp: 70, spd: 6, def: 5,
          skills: [
            { id: 'skill_a2_1', name: '마법탄',   type: '관통', coins: 2, basePower: 4,  coinPower: 6,  coinChance: 0.6,  description: '마력으로 만든 탄환을 쏜다' },
            { id: 'skill_a2_2', name: '폭발 마법', type: '타격', coins: 3, basePower: 3,  coinPower: 5,  coinChance: 0.55, description: '적을 폭발로 공격한다' },
            { id: 'skill_a2_3', name: '마력 집중', type: '관통', coins: 1, basePower: 10, coinPower: 15, coinChance: 0.5,  description: '모든 마력을 한 점에 집중시킨다' }
          ]
        }
      ]
    },
    {
      id: 'sinner_b', name: '베르나', color: '#3498db',
      identities: [
        {
          id: 'identity_b1', name: '방패병', hp: 140, spd: 3, def: 25,
          skills: [
            { id: 'skill_b1_1', name: '방패 강타', type: '타격', coins: 2, basePower: 4, coinPower: 4, coinChance: 0.65, description: '방패로 적을 강하게 가격한다' },
            { id: 'skill_b1_2', name: '철벽 수비', type: '타격', coins: 1, basePower: 2, coinPower: 3, coinChance: 0.7,  description: '방어 태세를 취하며 반격한다' },
            { id: 'skill_b1_3', name: '돌격',     type: '타격', coins: 2, basePower: 6, coinPower: 7, coinChance: 0.6,  description: '방패를 앞세워 돌진한다' }
          ]
        },
        {
          id: 'identity_b2', name: '궁수', hp: 90, spd: 8, def: 8,
          skills: [
            { id: 'skill_b2_1', name: '속사',     type: '관통', coins: 3, basePower: 2, coinPower: 4,  coinChance: 0.65, description: '빠르게 여러 발을 쏜다' },
            { id: 'skill_b2_2', name: '조준 사격', type: '관통', coins: 1, basePower: 7, coinPower: 10, coinChance: 0.6,  description: '약점을 노리고 정밀하게 쏜다' },
            { id: 'skill_b2_3', name: '폭발 화살', type: '관통', coins: 2, basePower: 5, coinPower: 8,  coinChance: 0.55, description: '폭발하는 화살을 쏜다' }
          ]
        }
      ]
    },
    {
      id: 'sinner_c', name: '카이로', color: '#2ecc71',
      identities: [
        {
          id: 'identity_c1', name: '격투가', hp: 110, spd: 7, def: 12,
          skills: [
            { id: 'skill_c1_1', name: '연속 주먹', type: '타격', coins: 3, basePower: 2, coinPower: 3,  coinChance: 0.7,  description: '빠른 주먹을 여러 번 날린다' },
            { id: 'skill_c1_2', name: '강권',     type: '타격', coins: 2, basePower: 5, coinPower: 6,  coinChance: 0.6,  description: '강력한 주먹으로 가격한다' },
            { id: 'skill_c1_3', name: '파천황',   type: '타격', coins: 1, basePower: 9, coinPower: 13, coinChance: 0.55, description: '모든 힘을 담은 궁극의 일격' }
          ]
        },
        {
          id: 'identity_c2', name: '치유사', hp: 120, spd: 4, def: 15,
          skills: [
            { id: 'skill_c2_1', name: '치유의 손',  type: '타격', coins: 1, basePower: 2, coinPower: 3, coinChance: 0.7,  description: '아군을 치유하며 약하게 공격한다', healSelf: 15 },
            { id: 'skill_c2_2', name: '재생의 빛',  type: '타격', coins: 2, basePower: 3, coinPower: 4, coinChance: 0.65, description: '빛으로 아군을 치유하고 적을 공격한다', healSelf: 20 },
            { id: 'skill_c2_3', name: '신성한 강타', type: '타격', coins: 2, basePower: 6, coinPower: 8, coinChance: 0.6,  description: '신성한 힘으로 강하게 가격한다' }
          ]
        }
      ]
    }
  ]
};

const EMBEDDED_ENEMIES = {
  enemies: [
    {
      id: 'phantom', name: '환영', color: '#9b59b6', hp: 60, spd: 4, def: 5,
      skills: [
        { id: 'e_ph_1', name: '그림자 할퀴기', type: '참격', coins: 2, basePower: 2, coinPower: 3, coinChance: 0.55, description: '그림자로 만든 발톱으로 긁어댄다' },
        { id: 'e_ph_2', name: '공허의 손길',   type: '타격', coins: 1, basePower: 4, coinPower: 5, coinChance: 0.6,  description: '차가운 공허로 상대를 강타한다' }
      ]
    },
    {
      id: 'abnormality', name: '이상체', color: '#e67e22', hp: 100, spd: 5, def: 10,
      skills: [
        { id: 'e_ab_1', name: '돌연변이 강타', type: '타격', coins: 2, basePower: 4, coinPower: 5,  coinChance: 0.6,  description: '기형적인 팔로 힘껏 내리친다' },
        { id: 'e_ab_2', name: '독액 분사',    type: '관통', coins: 2, basePower: 3, coinPower: 4,  coinChance: 0.6,  description: '독이 든 액체를 내뿜는다' },
        { id: 'e_ab_3', name: '광란의 일격',  type: '타격', coins: 1, basePower: 8, coinPower: 10, coinChance: 0.5,  description: '미쳐버린 힘으로 전력을 다해 친다' }
      ]
    },
    {
      id: 'mirror_guardian', name: '거울의 수호자', color: '#c0392b', hp: 200, spd: 6, def: 20,
      skills: [
        { id: 'e_mg_1', name: '거울 파편',   type: '관통', coins: 3, basePower: 4,  coinPower: 5,  coinChance: 0.6,  description: '거울 조각을 여러 방향으로 쏜다' },
        { id: 'e_mg_2', name: '반사의 검',   type: '참격', coins: 2, basePower: 7,  coinPower: 8,  coinChance: 0.65, description: '거울의 힘을 담은 검으로 베어낸다' },
        { id: 'e_mg_3', name: '균열의 해방', type: '타격', coins: 1, basePower: 15, coinPower: 20, coinChance: 0.55, description: '균열된 거울의 힘을 폭발시킨다' }
      ]
    }
  ]
};

const EMBEDDED_DUNGEON = {
  id: 'dungeon_1',
  name: '균열된 거울',
  nodes: [
    { id: 'node_0', type: 'start',  x: 400, y: 570, label: '시작',   connections: ['node_1', 'node_2'] },
    { id: 'node_1', type: 'battle', x: 210, y: 430, label: '⚔ 전투', enemies: ['phantom'],               connections: ['node_3'] },
    { id: 'node_2', type: 'event',  x: 590, y: 430, label: '? 이벤트',                                   connections: ['node_4'] },
    { id: 'node_3', type: 'reward', x: 210, y: 290, label: '★ 보상',                                     connections: ['node_5'] },
    { id: 'node_4', type: 'battle', x: 590, y: 290, label: '⚔ 전투', enemies: ['abnormality'],           connections: ['node_5'] },
    { id: 'node_5', type: 'battle', x: 400, y: 190, label: '⚔ 전투', enemies: ['phantom', 'phantom'],    connections: ['node_6'] },
    { id: 'node_6', type: 'boss',   x: 400, y: 95,  label: '☠ 보스', enemies: ['mirror_guardian'],       connections: ['node_7'] },
    { id: 'node_7', type: 'exit',   x: 400, y: 20,  label: '✓ 출구',                                    connections: [] }
  ],
  events: [
    {
      id: 'event_1',
      title: '균열된 거울 조각',
      description: '바닥에 빛나는 거울 조각이 놓여 있다. 신비로운 빛이 흘러나오고 있다.',
      choices: [
        { text: '조각을 집어든다 (HP +20 회복)', effect: { type: 'heal', value: 20 } },
        { text: '그냥 지나친다',                 effect: { type: 'none' } }
      ]
    }
  ]
};

const EMBEDDED_CONFIG = {
  game: { title: '림버스 패러디', version: '1.0.0', battleBackground: '', dungeonBackground: '', bgmUrl: '' }
};

// ─── GameData ──────────────────────────────────────────────────────────────────

const GameData = {
  characters: null,
  enemies:    null,
  dungeon:    null,
  config:     null,

  /** Load all data. Uses embedded data for file:// compatibility. */
  async loadAllData() {
    // Try fetch first, fall back to embedded
    this.characters = await this._fetchOrEmbedded('data/characters.json', EMBEDDED_CHARACTERS);
    this.enemies    = await this._fetchOrEmbedded('data/enemies.json',    EMBEDDED_ENEMIES);
    this.dungeon    = await this._fetchOrEmbedded('data/dungeon.json',    EMBEDDED_DUNGEON);
    this.config     = await this._fetchOrEmbedded('data/config.json',     EMBEDDED_CONFIG);
    return true;
  },

  async _fetchOrEmbedded(url, embedded) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('not ok');
      return await resp.json();
    } catch {
      return JSON.parse(JSON.stringify(embedded)); // deep copy
    }
  },

  /** Retrieve a sinner by id */
  getSinner(id) {
    return (this.characters?.sinners || []).find(s => s.id === id) || null;
  },

  /** Retrieve an enemy definition by id */
  getEnemyDef(id) {
    return (this.enemies?.enemies || []).find(e => e.id === id) || null;
  },

  /** Retrieve an identity by sinnerId + identityId */
  getIdentity(sinnerId, identityId) {
    const sinner = this.getSinner(sinnerId);
    return sinner?.identities.find(i => i.id === identityId) || null;
  },

  /** Export all data as JSON string */
  exportData() {
    return JSON.stringify({
      characters: this.characters,
      enemies:    this.enemies,
      dungeon:    this.dungeon,
      config:     this.config
    }, null, 2);
  },

  /** Import data from JSON string */
  importData(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.characters) this.characters = data.characters;
      if (data.enemies)    this.enemies    = data.enemies;
      if (data.dungeon)    this.dungeon    = data.dungeon;
      if (data.config)     this.config     = data.config;
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }
};

// ─── GameState ─────────────────────────────────────────────────────────────────

const GameState = {
  /** Array of { sinnerId, identityId } */
  currentParty: [],

  /** Map of sinnerId → currentHP (persists across dungeon battles) */
  currentHP: {},

  /** Dungeon progress */
  dungeonProgress: {
    visitedNodes: [],
    currentNode:  'node_0',
    cleared:      false
  },

  /** Stats for result screen */
  battleStats: {
    victories:  0,
    defeats:    0,
    damageDealt: 0
  },

  /** Reset for a fresh run */
  reset() {
    this.currentParty = [];
    this.currentHP    = {};
    this.dungeonProgress = { visitedNodes: ['node_0'], currentNode: 'node_0', cleared: false };
    this.battleStats  = { victories: 0, defeats: 0, damageDealt: 0 };
  },

  /** Initialize HP from party selection */
  initPartyHP() {
    for (const member of this.currentParty) {
      if (this.currentHP[member.sinnerId] === undefined) {
        const identity = GameData.getIdentity(member.sinnerId, member.identityId);
        if (identity) this.currentHP[member.sinnerId] = identity.hp;
      }
    }
  },

  /** Persist state to localStorage */
  saveToLocalStorage() {
    try {
      localStorage.setItem('limbusParodyState', JSON.stringify({
        currentParty:     this.currentParty,
        currentHP:        this.currentHP,
        dungeonProgress:  this.dungeonProgress,
        battleStats:      this.battleStats
      }));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  },

  /** Load state from localStorage */
  loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem('limbusParodyState');
      if (!raw) return false;
      const saved = JSON.parse(raw);
      this.currentParty    = saved.currentParty    || [];
      this.currentHP       = saved.currentHP       || {};
      this.dungeonProgress = saved.dungeonProgress || { visitedNodes: ['node_0'], currentNode: 'node_0', cleared: false };
      this.battleStats     = saved.battleStats     || { victories: 0, defeats: 0, damageDealt: 0 };
      return true;
    } catch (e) {
      console.warn('Failed to load state:', e);
      return false;
    }
  },

  hasSave() {
    return !!localStorage.getItem('limbusParodyState');
  },

  clearSave() {
    localStorage.removeItem('limbusParodyState');
  }
};
