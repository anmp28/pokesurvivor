/* Apodo local del jugador. */
G.NickUI = (() => {
  const $ = G.UI.$;
  let next = null;
  function init() {
    $('nick-form').onsubmit = e => {
      e.preventDefault();
      const name = $('nick-in').value.trim();
      if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) {
        $('nick-err').textContent = 'Usa entre 3 y 16 letras, números o _.';
        G.Audio.sfx('error'); return;
      }
      G.DB.setName(name);
      G.Audio.sfx('confirm');
      G.UI.toast('Apodo guardado: ' + name);
      const done = next; next = null;
      if (done) done(); else G.MenuUI.open();
    };
  }
  function open(after) {
    next = after || null;
    G.UI.show('scr-nick');
    $('nick-err').textContent = '';
    $('nick-in').value = G.DB.save && G.DB.save.nickChosen ? G.DB.user : '';
    setTimeout(() => $('nick-in').focus(), 50);
  }
  return { init, open };
})();
