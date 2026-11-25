/* ============ social.js — perfil local sin red social ni Firebase ============ */
G.Social = (() => {
  function profileData() {
    const save = G.DB.save || {};
    const profile = save.profile || {};
    return { name: G.DB.user || 'Entrenador', title: profile.title || '', favs: profile.favs || [], best: {} };
  }
  return {
    me: null, uid: null, room: null, friends: [], invites: [], MAX_PLAYERS: 1,
    async start() { return 'offline'; }, setPlaying() {}, publishProfile() {},
    on() {}, off() {}, profileData, async getProfile() { return null; }
  };
})();
