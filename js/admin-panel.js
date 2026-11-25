/* Panel admin local de la adaptación Ancor Montalvo. */
(() => {
  const PASSWORD = 'Ancor289';
  let gPressedAt = 0;
  let unlocked = false;
  const $ = (s, root = document) => root.querySelector(s);
  const num = (id, fallback = 0) => {
    const n = Number($(id).value);
    return Number.isFinite(n) ? n : fallback;
  };
  const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };

  function install() {
    const credits = $('#credits-line');
    if (credits) credits.innerHTML = 'Adaptación hecha por <b>Ancor Montalvo</b> · Proyecto de fan sin ánimo de lucro · Sprites: SpriteCollab (CC BY-NC 4.0) · Pokémon © Nintendo/Creatures/GAME FREAK · <a href="#" class="legal-link" data-legal>Aviso legal</a>';

    document.body.insertAdjacentHTML('beforeend', `
      <div id="admin-gate" class="admin-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="admin-title">
        <div class="admin-card admin-login">
          <button class="admin-close" data-admin-close aria-label="Cerrar">×</button>
          <div class="admin-orb">✦</div><p class="admin-eyebrow">POKÉ SURVIVOR · CONTROL CENTRAL</p>
          <h2 id="admin-title">Acceso de administrador</h2><p class="admin-muted">Introduce la clave para abrir el panel.</p>
          <form id="admin-form"><label for="admin-pass">Contraseña</label><input id="admin-pass" type="password" autocomplete="current-password" placeholder="••••••••" required><p id="admin-error" class="admin-error"></p><button class="admin-action" type="submit">Desbloquear panel <span>→</span></button></form>
          <div class="admin-foot">Atajo: <kbd>Ctrl</kbd> + <kbd>G</kbd> + <kbd>G</kbd></div>
        </div>
      </div>
      <div id="admin-panel" class="admin-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="admin-panel-title">
        <div class="admin-card admin-dashboard">
          <button class="admin-close" data-admin-close aria-label="Cerrar">×</button>
          <div class="admin-head"><div><p class="admin-eyebrow">CONTROL CENTRAL · ANCOR MONTALVO</p><h2 id="admin-panel-title">Panel admin <span class="admin-live">● ACTIVO</span></h2><p class="admin-muted">Pokédex, progreso y herramientas de la run actual.</p></div><div class="admin-orb">✦</div></div>
          <div class="admin-stats"><div><small>JUGADOR</small><b id="admin-player">—</b></div><div><small>GUARDADO</small><b>Este dispositivo</b></div><div><small>MONEDAS</small><b id="admin-coins">—</b></div></div>

          <section class="admin-tools"><h3>Pokémon</h3><p class="admin-muted">Escribe el número de la Pokédex para añadirlo a tu colección.</p>
            <form id="admin-pokemon-form" class="admin-form-grid">
              <label>N.º Pokédex<input id="admin-pokemon-id" type="number" min="1" step="1" placeholder="Ej.: 25" required></label>
              <label class="admin-check"><input id="admin-pokemon-shiny" type="checkbox"> Añadir shiny</label>
              <label class="admin-check"><input id="admin-set-partner" type="checkbox"> Poner como compañero</label>
              <button class="admin-action" type="submit">Añadir Pokémon <span>＋</span></button>
            </form>
            <button class="admin-secondary" id="admin-all-pokemon" type="button">Desbloquear todos los Pokémon normales</button>
            <p id="admin-pokemon-msg" class="admin-message" aria-live="polite"></p>
          </section>

          <section class="admin-tools"><h3>Progreso guardado</h3><p class="admin-muted">Establece tus monedas, tickets y récords permanentes.</p>
            <form id="admin-save-form" class="admin-form-grid admin-form-four">
              <label>Monedas<input id="admin-save-coins" type="number" min="0" step="1"></label>
              <label>Tickets ×1<input id="admin-save-t1" type="number" min="0" step="1"></label>
              <label>Tickets ×10<input id="admin-save-t10" type="number" min="0" step="1"></label>
              <label>Runs completadas<input id="admin-save-runs" type="number" min="0" step="1"></label>
              <label>Mejor tiempo (s)<input id="admin-save-besttime" type="number" min="0" step="1"></label>
              <label>Mejor nivel<input id="admin-save-bestlevel" type="number" min="0" step="1"></label>
              <label>Pokémon derrotados<input id="admin-save-kills" type="number" min="0" step="1"></label>
              <button class="admin-action" type="submit">Guardar progreso <span>✓</span></button>
            </form>
            <p id="admin-save-msg" class="admin-message" aria-live="polite"></p>
          </section>

          <section class="admin-tools"><div class="admin-section-head"><div><h3>Run activa</h3><p class="admin-muted">Cambia los valores de la partida en curso.</p></div><button id="admin-immortal" class="admin-toggle" type="button" aria-pressed="false">♡ Inmortal: no</button></div>
            <form id="admin-run-form" class="admin-form-grid admin-form-four">
              <label>Tiempo (s)<input id="admin-run-time" type="number" min="0" step="1"></label>
              <label>Nivel<input id="admin-run-level" type="number" min="1" step="1"></label>
              <label>Bajas<input id="admin-run-kills" type="number" min="0" step="1"></label>
              <label>Monedas de la run<input id="admin-run-coins" type="number" min="0" step="1"></label>
              <label>Tickets ×1<input id="admin-run-t1" type="number" min="0" step="1"></label>
              <label>Tickets ×10<input id="admin-run-t10" type="number" min="0" step="1"></label>
              <label>Vida máxima<input id="admin-run-maxhp" type="number" min="1" step="1"></label>
              <label>Vida actual<input id="admin-run-hp" type="number" min="1" step="1"></label>
              <button class="admin-action" id="admin-run-apply" type="submit">Aplicar a la run <span>↗</span></button>
            </form>
            <p id="admin-run-msg" class="admin-message" aria-live="polite"></p>
          </section>

          <div class="admin-bottom"><span>Los cambios se guardan en el perfil local.</span><button class="admin-action admin-action-small" id="admin-lock">Bloquear panel</button></div>
        </div>
      </div>`);

    document.addEventListener('keydown', onKey);
    document.querySelectorAll('[data-admin-close]').forEach(b => b.addEventListener('click', close));
    $('#admin-gate').addEventListener('click', e => { if (e.target.id === 'admin-gate') close(); });
    $('#admin-panel').addEventListener('click', e => { if (e.target.id === 'admin-panel') close(); });
    $('#admin-form').addEventListener('submit', e => {
      e.preventDefault();
      if ($('#admin-pass').value === PASSWORD) { unlocked = true; $('#admin-error').textContent = ''; showPanel(); }
      else { $('#admin-error').textContent = 'Contraseña incorrecta. Inténtalo de nuevo.'; $('#admin-pass').select(); }
    });
    $('#admin-lock').addEventListener('click', () => { unlocked = false; close(); });
    $('#admin-pokemon-form').addEventListener('submit', addPokemon);
    $('#admin-all-pokemon').addEventListener('click', addAllPokemon);
    $('#admin-save-form').addEventListener('submit', saveProgress);
    $('#admin-run-form').addEventListener('submit', editRun);
    $('#admin-immortal').addEventListener('click', toggleImmortal);
  }

  function addPokemon(e) {
    e.preventDefault();
    const dex = Math.floor(num('#admin-pokemon-id', -1));
    const mon = window.G && G.DEX_BY && G.DEX_BY[dex];
    if (!mon) { setText('#admin-pokemon-msg', 'No existe ese número en la Pokédex.'); return; }
    const save = G.DB.save, shiny = $('#admin-pokemon-shiny').checked;
    G.DB.grant(dex, 'admin');
    if (shiny) G.DB.grantShiny(dex, 'admin');
    if ($('#admin-set-partner').checked) { save.partner = dex; save.partnerShiny = shiny; }
    G.DB.commit(true);
    setText('#admin-pokemon-msg', `${mon.name} (#${dex}) añadido${shiny ? ' en versión shiny' : ''}${$('#admin-set-partner').checked ? ' y elegido como compañero' : ''}.`);
    $('#admin-pokemon-id').value = '';
    refresh();
  }

  function addAllPokemon() {
    const save = G.DB.save;
    if (!save || !window.G.DEX) return;
    for (const mon of G.DEX) G.DB.grant(mon.dex, 'admin');
    G.DB.commit(true);
    setText('#admin-pokemon-msg', `Colección completada: ${G.DEX.length} Pokémon normales.`);
    refresh();
  }

  function saveProgress(e) {
    e.preventDefault();
    const save = G.DB.save;
    save.coins = Math.max(0, Math.floor(num('#admin-save-coins')));
    save.tickets = save.tickets || { t1: 0, t10: 0 };
    save.tickets.t1 = Math.max(0, Math.floor(num('#admin-save-t1')));
    save.tickets.t10 = Math.max(0, Math.floor(num('#admin-save-t10')));
    save.stats.runs = Math.max(0, Math.floor(num('#admin-save-runs')));
    save.stats.bestTime = Math.max(0, Math.floor(num('#admin-save-besttime')));
    save.stats.bestLevel = Math.max(0, Math.floor(num('#admin-save-bestlevel')));
    save.stats.totalKills = Math.max(0, Math.floor(num('#admin-save-kills')));
    G.DB.commit(true); G.UI && G.UI.refreshCoins();
    setText('#admin-save-msg', 'Progreso actualizado.');
    refresh();
  }

  function editRun(e) {
    e.preventDefault();
    if (!G.Game || !G.Game.adminEditRun) { setText('#admin-run-msg', 'No hay una run activa.'); return; }
    const values = {
      time: num('#admin-run-time'), level: num('#admin-run-level'), kills: num('#admin-run-kills'),
      coins: num('#admin-run-coins'), t1: num('#admin-run-t1'), t10: num('#admin-run-t10'),
      maxHp: num('#admin-run-maxhp'), hp: num('#admin-run-hp')
    };
    if (!G.Game.adminEditRun(values)) { setText('#admin-run-msg', 'Empieza una run para poder editarla.'); return; }
    setText('#admin-run-msg', 'Run actualizada.');
    refreshRun();
  }

  function toggleImmortal() {
    window.PS_ADMIN_IMMORTAL = !window.PS_ADMIN_IMMORTAL;
    const b = $('#admin-immortal'), enabled = window.PS_ADMIN_IMMORTAL;
    b.classList.toggle('on', enabled);
    b.setAttribute('aria-pressed', String(enabled));
    b.textContent = enabled ? '♥ Inmortal: sí' : '♡ Inmortal: no';
    const pl = G.Game && G.Game.player;
    if (enabled && pl && !pl.dead) { pl.hp = pl.maxHp; pl.invuln = 999999; }
  }

  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (!e.ctrlKey || e.altKey || e.metaKey || e.key.toLowerCase() !== 'g') { if (e.key !== 'Control') gPressedAt = 0; return; }
    const now = Date.now(); e.preventDefault();
    if (now - gPressedAt < 900) { gPressedAt = 0; unlocked ? showPanel() : showGate(); }
    else gPressedAt = now;
  }

  function showGate() { $('#admin-pass').value = ''; $('#admin-error').textContent = ''; $('#admin-gate').classList.remove('hidden'); setTimeout(() => $('#admin-pass').focus(), 30); }
  function showPanel() { refresh(); refreshRun(); $('#admin-panel').classList.remove('hidden'); }
  function refresh() {
    const db = window.G && G.DB, save = db && db.save;
    setText('#admin-player', db && db.user || 'Sin perfil');
    setText('#admin-coins', save ? Number(save.coins || 0).toLocaleString('es-ES') : '—');
    if (!save) return;
    $('#admin-save-coins').value = save.coins || 0;
    $('#admin-save-t1').value = save.tickets && save.tickets.t1 || 0;
    $('#admin-save-t10').value = save.tickets && save.tickets.t10 || 0;
    $('#admin-save-runs').value = save.stats.runs || 0;
    $('#admin-save-besttime').value = save.stats.bestTime || 0;
    $('#admin-save-bestlevel').value = save.stats.bestLevel || 0;
    $('#admin-save-kills').value = save.stats.totalKills || 0;
  }
  function refreshRun() {
    const pl = G.Game && G.Game.player;
    const active = !!pl && !['ui', 'over'].includes(G.Game.state);
    $('#admin-run-apply').disabled = !active;
    if (!active) return;
    $('#admin-run-time').value = Math.floor(G.Game.st.time || 0);
    $('#admin-run-level').value = pl.level;
    $('#admin-run-kills').value = pl.kills;
    $('#admin-run-coins').value = pl.coins;
    $('#admin-run-t1').value = pl.t1;
    $('#admin-run-t10').value = pl.t10;
    $('#admin-run-maxhp').value = pl.maxHp;
    $('#admin-run-hp').value = Math.ceil(pl.hp);
  }
  function close() { $('#admin-gate').classList.add('hidden'); $('#admin-panel').classList.add('hidden'); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true }); else install();
})();
