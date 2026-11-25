/* ============ db.js — partida local, sin cuentas ni servicios online ============
 * El perfil y el progreso se guardan en localStorage de este dispositivo.
 */
G.DB = (() => {
  const KEY = 'ps.save.offline-player';
  const VERSION = 4;
  const START_COINS = 500;
  let save = null;
  let user = 'Entrenador';
  let guest = false;
  let storageOk = true;
  const listeners = new Set();
  const leaveHooks = new Set();

  function newSave(name = 'Entrenador') {
    return {
      v: VERSION, name, nickChosen: false, created: Date.now(), updated: Date.now(),
      coins: START_COINS, owned: {}, shiny: {}, partner: null, partnerShiny: false,
      starter: null, personality: null, upgrades: {}, pupg: {}, tickets: { t1: 0, t10: 0 },
      pity: {}, legends: {}, arenas: {}, itemsFound: {}, evoMoves: {}, ach: {}, missions: {},
      profile: { favs: [], title: '' },
      stats: { runs: 0, bestTime: 0, bestLevel: 0, totalKills: 0, pulls: 0, coinsEarned: 0,
        shinies: 0, bossesTotal: 0, riftWins: 0, evolutions: 0, missionsDone: 0,
        groupRuns: 0, bestGroupTime: 0 }
    };
  }

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
    catch (_) { storageOk = false; return null; }
  }

  function commit() {
    if (!save) return false;
    save.updated = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(save));
      listeners.forEach(fn => { try { fn('local'); } catch (_) {} });
      return true;
    } catch (_) { storageOk = false; return false; }
  }

  async function ready() {
    let previous = read();
    if (!previous) {
      // Recupera la copia local de una cuenta anterior cuando exista.
      try {
        const session = localStorage.getItem('ps.session');
        if (session) {
          previous = JSON.parse(localStorage.getItem('ps.save.' + session) || 'null')
            || JSON.parse(localStorage.getItem('ps.cloud.' + session) || 'null');
        }
      } catch (_) { storageOk = false; }
    }
    save = Object.assign(newSave(previous && previous.name || user), previous || {});
    save.stats = Object.assign(newSave().stats, save.stats || {});
    save.tickets = Object.assign({ t1: 0, t10: 0 }, save.tickets || {});
    save.nickChosen = !!save.nickChosen;
    user = save.name || 'Entrenador';
    guest = false;
    commit();
    return true;
  }

  function setName(name) {
    if (!save) return;
    save.name = String(name || '').trim();
    save.nickChosen = true;
    user = save.name;
    commit();
  }

  function grant(dex, from = 'wild') {
    if (!save.owned[dex]) save.owned[dex] = { at: Date.now(), from };
  }

  function grantShiny(dex, from = 'wild') {
    grant(dex, from);
    if (save.shiny[dex]) return false;
    save.shiny[dex] = { at: Date.now(), from };
    return true;
  }

  function upgradesOf(dex) {
    if (!save) return {};
    save.pupg = save.pupg || {};
    return save.pupg[dex] || (save.pupg[dex] = {});
  }

  async function deleteAccount() {
    save = newSave('Entrenador'); user = 'Entrenador'; guest = false; commit();
    return { ok: true };
  }

  return {
    ready, commit, setName, grant, grantShiny, upgradesOf, deleteAccount,
    async logout() { for (const fn of leaveHooks) { try { await fn('logout'); } catch (_) {} } },
    playAsGuest() { guest = true; return { ok: true, isNew: false }; },
    owns(dex) { return !!(save && save.owned[dex]); },
    ownsShiny(dex) { return !!(save && save.shiny && save.shiny[dex]); },
    onSync(fn) { listeners.add(fn); }, onLeave(fn) { leaveHooks.add(fn); },
    get fb() { return null; }, get online() { return false; }, get nameAccount() { return false; },
    get mode() { return 'local'; }, get localReason() { return 'offline'; },
    get syncState() { return storageOk ? 'local' : 'error'; }, get user() { return user; },
    get guest() { return guest; }, get save() { return save; }, get loggedIn() { return !!save; },
    get storageOk() { return storageOk; }, START_COINS
  };
})();
