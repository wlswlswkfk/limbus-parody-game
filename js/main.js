/**
 * main.js — App initialization and screen coordination
 */

// Global system instances
let partySystem   = null;
let battleSystem  = null;
let dungeonSystem = null;
let editorSystem  = null;

// Context for which dungeon node triggered the current battle
let _battleContext = null;

// ─── Initialization ─────────────────────────────────────────────────────────

async function initApp() {
  try {
    await GameData.loadAllData();
  } catch (e) {
    console.error('Failed to load data:', e);
    UI.showNotification('데이터 로드 실패. 기본값 사용.');
  }

  partySystem   = new PartySystem();
  battleSystem  = new BattleSystem();
  dungeonSystem = new DungeonSystem();
  editorSystem  = new EditorSystem();

  _setupMenuListeners();
  _setupPartyListeners();
  _setupBattleListeners();
  _setupResultListeners();
  _setupEditorListeners();

  // Update continue button state
  _refreshContinueButton();

  UI.showScreen('screen-menu');

  // Optionally start gentle BGM
  try { AudioManager.playBGM(GameData.config?.game?.bgmUrl || ''); } catch {}
}

// ─── Menu Listeners ─────────────────────────────────────────────────────────

function _setupMenuListeners() {
  document.getElementById('btn-start').addEventListener('click', () => {
    AudioManager.playSFX('navigate');
    GameState.reset();
    _goToParty();
  });

  document.getElementById('btn-continue').addEventListener('click', () => {
    if (!GameState.hasSave()) {
      UI.showNotification('저장된 게임이 없습니다.');
      return;
    }
    AudioManager.playSFX('navigate');
    if (GameState.loadFromLocalStorage()) {
      // Resume dungeon
      _goToDungeon();
    } else {
      UI.showNotification('저장 데이터를 불러올 수 없습니다.');
    }
  });

  document.getElementById('btn-editor').addEventListener('click', () => {
    AudioManager.playSFX('navigate');
    editorSystem.init();
    UI.showScreen('screen-editor');
  });
}

function _refreshContinueButton() {
  const btn = document.getElementById('btn-continue');
  if (btn) btn.disabled = !GameState.hasSave();
}

// ─── Party Listeners ─────────────────────────────────────────────────────────

function _setupPartyListeners() {
  document.getElementById('btn-party-back').addEventListener('click', () => {
    AudioManager.playSFX('navigate');
    UI.showScreen('screen-menu');
  });

  document.getElementById('btn-confirm-party').addEventListener('click', () => {
    const party = partySystem.confirmParty();
    if (!party) return;

    AudioManager.playSFX('navigate');
    GameState.currentParty = party;
    GameState.dungeonProgress = { visitedNodes: ['node_0'], currentNode: 'node_0', cleared: false };
    GameState.initPartyHP();
    GameState.saveToLocalStorage();
    _goToDungeon();
  });
}

function _goToParty() {
  partySystem.init(GameData.characters);
  UI.showScreen('screen-party');
}

// ─── Dungeon Listeners ────────────────────────────────────────────────────────

function _goToDungeon() {
  // If somehow no party is set, go back to party screen
  if (!GameState.currentParty || GameState.currentParty.length === 0) {
    _goToParty();
    return;
  }

  dungeonSystem.init(
    GameData.dungeon,
    GameState.currentParty,
    _onBattleRequest,
    _onDungeonClear
  );

  UI.showScreen('screen-dungeon');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-dungeon-back')?.addEventListener('click', () => {
    if (!confirm('던전을 포기하시겠습니까?')) return;
    AudioManager.playSFX('navigate');
    GameState.clearSave();
    _refreshContinueButton();
    UI.showScreen('screen-menu');
  });
});

// ─── Battle Orchestration ─────────────────────────────────────────────────────

function _onBattleRequest(enemyIds, nodeId) {
  _battleContext = { enemyIds, nodeId };
  _startBattle(GameState.currentParty, enemyIds);
}

function _startBattle(partyDefs, enemyIds) {
  UI.showScreen('screen-battle');

  battleSystem.init(partyDefs, enemyIds, (result, stats) => {
    if (result === 'victory') {
      _onBattleVictory(stats);
    } else {
      _onBattleDefeat(stats);
    }
  });
}

function _onBattleVictory(stats) {
  // Update GameState HP from battle
  for (const member of battleSystem.party) {
    GameState.currentHP[member.id] = member.currentHP;
  }
  GameState.saveToLocalStorage();

  // Check if this was the boss / all enemies cleared → might auto-complete dungeon
  const node = GameData.dungeon?.nodes?.find(n => n.id === _battleContext?.nodeId);
  if (node?.type === 'boss') {
    // Boss defeated — check if exit is accessible
    UI.showNotification('보스 처치! 출구로 향하세요.');
  } else {
    UI.showNotification('전투 승리!');
  }

  // Return to dungeon
  UI.showScreen('screen-dungeon');
  dungeonSystem.onBattleVictory();
  _battleContext = null;
}

function _onBattleDefeat(stats) {
  // Wipe HP
  GameState.clearSave();
  _refreshContinueButton();

  _showResult('defeat', stats);
  _battleContext = null;
}

function _setupBattleListeners() {
  document.getElementById('btn-battle-start')?.addEventListener('click', () => {
    if (battleSystem && battleSystem.phase === 'selection') {
      battleSystem.startBattle();
    }
  });
}

// ─── Result Screen ─────────────────────────────────────────────────────────

function _onDungeonClear() {
  _showResult('victory', { dungeonClear: true });
}

function _showResult(type, data = {}) {
  const titleEl = document.getElementById('result-title');
  const statsEl = document.getElementById('result-stats');
  const contBtn  = document.getElementById('btn-result-continue');

  if (type === 'victory') {
    titleEl.textContent = data.dungeonClear ? '던전 클리어!' : '전투 승리!';
    titleEl.className   = 'result-title victory';
    if (data.dungeonClear) {
      statsEl.innerHTML = `
        <div>던전 <strong style="color:var(--accent-gold)">${GameData.dungeon?.name || ''}</strong> 클리어!</div>
        <div>승리 횟수: ${GameState.battleStats.victories}</div>
        <div>처치된 전투: ${GameState.battleStats.victories}</div>
      `;
      contBtn.textContent = '메인 메뉴로';
      contBtn.onclick = () => {
        AudioManager.playSFX('navigate');
        GameState.clearSave();
        _refreshContinueButton();
        UI.showScreen('screen-menu');
      };
    } else {
      statsEl.innerHTML = `<div>전투에서 승리했습니다.</div>`;
      contBtn.textContent = '계속';
      contBtn.onclick = () => {
        AudioManager.playSFX('navigate');
        UI.showScreen('screen-dungeon');
      };
    }
  } else {
    titleEl.textContent = '패배...';
    titleEl.className   = 'result-title defeat';
    statsEl.innerHTML = `
      <div>모든 파티원이 쓰러졌습니다.</div>
      <div>생존한 전투: ${GameState.battleStats.victories}</div>
    `;
    contBtn.textContent = '처음부터';
    contBtn.onclick = () => {
      AudioManager.playSFX('navigate');
      GameState.reset();
      _goToParty();
    };
  }

  UI.showScreen('screen-result');
}

function _setupResultListeners() {
  document.getElementById('btn-result-menu')?.addEventListener('click', () => {
    AudioManager.playSFX('navigate');
    GameState.clearSave();
    _refreshContinueButton();
    UI.showScreen('screen-menu');
  });
}

// ─── Editor Listeners ─────────────────────────────────────────────────────────

function _setupEditorListeners() {
  document.getElementById('btn-editor-back')?.addEventListener('click', () => {
    AudioManager.playSFX('navigate');
    UI.showScreen('screen-menu');
  });
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
