/**
 * asset-manager.js — IndexedDB-based asset storage with localStorage fallback.
 * Works on both http:// and file:// protocols.
 *
 * Asset keys used across the game:
 *   sprite_<sinnerId>              — player character sprite (data URL)
 *   sprite_<sinnerId>_config       — JSON config for sprite sheet (JSON string)
 *   enemy_sprite_<enemyId>         — enemy sprite (data URL)
 *   enemy_sprite_<enemyId>_config  — JSON config for enemy sprite sheet
 *   battle_background              — battle background image (data URL)
 *   bgm_menu / bgm_battle / bgm_dungeon — BGM audio (data URL)
 *   sfx_hit / sfx_coin / sfx_coin_heads / sfx_coin_tails
 *   sfx_victory / sfx_defeat / sfx_heal / sfx_navigate / sfx_select / sfx_boss
 */

const AssetManager = {
  _db: null,
  _DB_NAME: 'limbus_assets',
  _DB_VER: 1,
  _STORE: 'assets',

  /**
   * Open IndexedDB. Falls back to localStorage silently.
   * Must be called before any save/load operations.
   */
  init() {
    return new Promise(resolve => {
      if (!window.indexedDB) { resolve(); return; }

      try {
        const req = indexedDB.open(this._DB_NAME, this._DB_VER);

        req.onupgradeneeded = e => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this._STORE)) {
            db.createObjectStore(this._STORE, { keyPath: 'key' });
          }
        };

        req.onsuccess = e => {
          this._db = e.target.result;
          resolve();
        };

        req.onerror = () => resolve(); // use localStorage
      } catch (e) {
        resolve();
      }
    });
  },

  /** Save a data URL (or any string) under the given key. */
  async save(key, value) {
    if (this._db) {
      return new Promise(resolve => {
        try {
          const tx  = this._db.transaction(this._STORE, 'readwrite');
          const req = tx.objectStore(this._STORE).put({ key, value });
          tx.oncomplete = () => resolve(true);
          tx.onerror    = () => { this._lsSave(key, value); resolve(true); };
        } catch (e) {
          this._lsSave(key, value);
          resolve(true);
        }
      });
    }
    this._lsSave(key, value);
    return true;
  },

  /** Load a value by key, or null if not found. */
  async load(key) {
    if (this._db) {
      return new Promise(resolve => {
        try {
          const tx  = this._db.transaction(this._STORE, 'readonly');
          const req = tx.objectStore(this._STORE).get(key);
          req.onsuccess = e => resolve(e.target.result ? e.target.result.value : this._lsLoad(key));
          req.onerror   = ()  => resolve(this._lsLoad(key));
        } catch (e) {
          resolve(this._lsLoad(key));
        }
      });
    }
    return this._lsLoad(key);
  },

  /** Delete an asset by key. */
  async delete(key) {
    localStorage.removeItem('limbus_asset_' + key);
    if (!this._db) return;
    return new Promise(resolve => {
      try {
        const tx = this._db.transaction(this._STORE, 'readwrite');
        tx.objectStore(this._STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror    = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  },

  /** Return all stored keys. */
  async listKeys() {
    const lsKeys = [];
    const prefix = 'limbus_asset_';
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) lsKeys.push(k.slice(prefix.length));
    }

    if (!this._db) return lsKeys;

    return new Promise(resolve => {
      try {
        const tx  = this._db.transaction(this._STORE, 'readonly');
        const req = tx.objectStore(this._STORE).getAllKeys();
        req.onsuccess = e => {
          const dbKeys = e.target.result || [];
          const merged = [...new Set([...dbKeys, ...lsKeys])];
          resolve(merged);
        };
        req.onerror = () => resolve(lsKeys);
      } catch (e) {
        resolve(lsKeys);
      }
    });
  },

  /** Convert a File to a data URL. */
  fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // ─── localStorage helpers ─────────────────────────────────────────────────

  _lsSave(key, value) {
    try {
      localStorage.setItem('limbus_asset_' + key, value);
    } catch (e) {
      console.warn(
        `[AssetManager] localStorage quota exceeded for key: ${key}. ` +
        'Consider deleting unused assets or using a smaller file size.'
      );
    }
  },

  _lsLoad(key) {
    return localStorage.getItem('limbus_asset_' + key) || null;
  }
};
