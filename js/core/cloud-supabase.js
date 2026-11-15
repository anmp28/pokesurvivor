/* js/core/cloud-supabase.js */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const cfg = G.SUPABASE_CONFIG;

  if (!cfg || !cfg.url || !cfg.key || !window.supabase) {
    console.warn('[Supabase] Falta SDK o configuración en supabase-config.js');
    return;
  }

  const sb = window.supabase.createClient(cfg.url, cfg.key, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  // Captura segura de tu save local (funciona con G.DB o localStorage)
  function snapshotLocalSave() {
    if (G.DB && G.DB.data) return G.DB.data;
    const dump = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !k.startsWith('sb-') && !k.startsWith('ps_plus_') && !k.startsWith('ps_cf_')) {
        dump[k] = localStorage.getItem(k);
      }
    }
    return { __lsDump: dump };
  }

  function applyLocalSave(saveObj) {
    if (!saveObj) return;
    if (saveObj.__lsDump) {
      Object.entries(saveObj.__lsDump).forEach(([k, v]) => localStorage.setItem(k, v));
    } else if (G.DB) {
      G.DB.data = saveObj;
      if (typeof G.DB.commit === 'function') G.DB.commit();
    }
  }

  const Cloud = {
    client: sb,
    user: null,
    profile: null,
    currentRev: 0,

    async init() {
      const { data } = await sb.auth.getSession();
      this.user = data.session?.user || null;
      if (this.user) await this.fetchProfile();
      sb.auth.onAuthStateChange(async (_ev, session) => {
        this.user = session?.user || null;
        this.profile = null;
        if (this.user) await this.fetchProfile();
        this.refreshModalState();
      });
      this.buildQuickWidget();
    },

    async fetchProfile() {
      if (!this.user) return null;
      const { data } = await sb.from('profiles').select('*').eq('id', this.user.id).maybeSingle();
      this.profile = data;
      return data;
    },

    async register(email, password, nick) {
      const cleanNick = (nick || '').trim();
      if (cleanNick.length < 3 || cleanNick.length > 20) throw new Error('Apodo entre 3 y 20 caracteres');
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + window.location.pathname }
      });
      if (error) throw error;
      if (data.user) {
        const { error: pErr } = await sb.from('profiles').insert({
          id: data.user.id,
          nick: cleanNick,
          nick_lower: cleanNick.toLowerCase()
        });
        if (pErr) throw new Error('Ese apodo ya está en uso o falta confirmar sesión');
        await this.fetchProfile();
      }
      return data;
    },

    async login(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await this.fetchProfile();
      return data;
    },

    async logout() {
      await sb.auth.signOut();
      this.user = null;
      this.profile = null;
    },

    // Guardado en la nube
    async loadSave() {
      if (!this.user) throw new Error('Inicia sesión primero');
      const { data, error } = await sb.from('saves').select('data, rev, updated_at').eq('user_id', this.user.id).maybeSingle();
      if (error) throw error;
      this.currentRev = data ? data.rev : 0;
      return data;
    },

    async pushSave(saveData) {
      if (!this.user) throw new Error('Inicia sesión primero');
      const payload = saveData || snapshotLocalSave();
      const nextRev = (this.currentRev || 0) + 1;
      const { error } = await sb.from('saves').upsert({
        user_id: this.user.id,
        data: payload,
        rev: nextRev,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      this.currentRev = nextRev;
      return nextRev;
    },

    // Ranking
    async getRanking({ mode = 'solo', dex = 0, limit = 30 } = {}) {
      let q = sb.from('rankings')
        .select('nick, mode, dex, shiny, seconds, kills, created_at')
        .eq('mode', mode)
        .order('seconds', { ascending: false })
        .order('kills', { ascending: false })
        .limit(limit);
      if (dex > 0) q = q.eq('dex', dex);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },

    async submitScore({ mode = 'solo', dex = 1, shiny = false, seconds, kills = 0 }) {
      if (!this.user) throw new Error('Inicia sesión para subir puntuación');
      const nick = this.profile?.nick || 'Jugador';
      const { error } = await sb.from('rankings').insert({
        user_id: this.user.id,
        nick,
        mode: mode === 'coop' ? 'coop' : 'solo',
        dex: Number(dex) || 1,
        shiny: Boolean(shiny),
        seconds: Math.floor(seconds),
        kills: Math.floor(kills)
      });
      if (error) throw error;
    },

    // Amigos
    async getFriends() {
      if (!this.user) return [];
      const { data, error } = await sb.from('friends').select('friend_id').eq('user_id', this.user.id);
      if (error || !data?.length) return [];
      const ids = data.map(r => r.friend_id);
      const { data: profs } = await sb.from('profiles').select('id, nick').in('id', ids);
      return profs || [];
    },

    async addFriend(nick) {
      if (!this.user) throw new Error('Inicia sesión primero');
      const { data: target } = await sb.from('profiles')
        .select('id, nick')
        .eq('nick_lower', (nick || '').trim().toLowerCase())
        .maybeSingle();
      if (!target || target.id === this.user.id) throw new Error('Jugador no encontrado');
      const { error } = await sb.from('friends').upsert({ user_id: this.user.id, friend_id: target.id });
      if (error) throw error;
      return target;
    },

    // Salas Co-op con Supabase Realtime (Broadcast + Presence para señalización WebRTC)
    connectRoom(roomCode, onEvent) {
      const uid = this.user?.id || ('guest-' + Math.random().toString(36).slice(2, 8));
      const nick = this.profile?.nick || 'Invitado';
      const channel = sb.channel('pokesurvivor-room-' + roomCode, {
        config: { broadcast: { self: false }, presence: { key: uid } }
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const peers = Object.values(state).flat();
          onEvent({ type: 'peers', peers });
        })
        .on('broadcast', { event: 'signal' }, ({ payload }) => {
          if (!payload.to || payload.to === uid) onEvent(payload);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ uid, nick, joinedAt: Date.now() });
          }
        });

      return {
        uid,
        send: (payload) => channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { ...payload, from: uid, fromNick: nick }
        }),
        close: () => sb.removeChannel(channel)
      };
    },

    // Widget flotante para usar Supabase ya mismo
    buildQuickWidget() {
      const btn = document.createElement('button');
      btn.id = 'ps-cloud-btn';
      btn.textContent = '☁ Nube';
      Object.assign(btn.style, {
        position: 'fixed', top: '12px', right: '14px', zIndex: '9550',
        background: '#16243d', color: '#7be495', border: '2px solid #7be495',
        borderRadius: '6px', padding: '5px 10px', fontFamily: 'Pixelify Sans, monospace', cursor: 'pointer'
      });
      document.body.appendChild(btn);

      const modal = document.createElement('div');
      modal.id = 'ps-cloud-modal';
      Object.assign(modal.style, {
        display: 'none', position: 'fixed', top: '50px', right: '14px', zIndex: '9600',
        width: '295px', background: 'rgba(13, 18, 32, 0.97)', border: '2px solid #7be495',
        borderRadius: '8px', padding: '12px', color: '#fff', fontFamily: 'Pixelify Sans, monospace', fontSize: '13px',
        boxShadow: '0 8px 28px rgba(0,0,0,0.7)'
      });
      modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;color:#7be495;margin-bottom:8px">
          <b>Cuenta & Nube (Supabase)</b>
          <span id="ps-cloud-close" style="cursor:pointer">✕</span>
        </div>
        <div id="ps-cloud-auth-box"></div>
        <div id="ps-cloud-msg" style="margin-top:6px;font-size:12px;color:#ffd875"></div>
        <div id="ps-cloud-rank" style="margin-top:8px;max-height:140px;overflow:auto;font-size:11px;border-top:1px solid #2b3b5c;padding-top:6px"></div>
      `;
      document.body.appendChild(modal);

      btn.onclick = () => {
        modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
        if (modal.style.display === 'block') this.refreshModalState();
      };
      modal.querySelector('#ps-cloud-close').onclick = () => { modal.style.display = 'none'; };
      this.refreshModalState();
    },

    async refreshModalState() {
      const box = document.getElementById('ps-cloud-auth-box');
      const msg = document.getElementById('ps-cloud-msg');
      const rankBox = document.getElementById('ps-cloud-rank');
      if (!box) return;

      const inputStyle = 'width:100%;box-sizing:border-box;margin:3px 0;padding:5px;background:#1d2842;color:#fff;border:1px solid #4d6b99;border-radius:4px;font-family:inherit;';
      const btnStyle = 'width:100%;margin-top:5px;padding:6px;background:#234639;color:#eafff2;border:1px solid #7be495;border-radius:4px;font-family:inherit;cursor:pointer;';

      if (!this.user) {
        box.innerHTML = `
          <input id="ps-sb-email" type="email" placeholder="Email" style="${inputStyle}">
          <input id="ps-sb-pass" type="password" placeholder="Contraseña (mín 6)" style="${inputStyle}">
          <input id="ps-sb-nick" type="text" placeholder="Apodo (solo al registrarse)" style="${inputStyle}">
          <button id="ps-sb-login" style="${btnStyle}">Entrar</button>
          <button id="ps-sb-reg" style="${btnStyle};background:#1d2f52;border-color:#59c1ff">Crear cuenta</button>
        `;
        box.querySelector('#ps-sb-login').onclick = async () => {
          try {
            msg.textContent = 'Entrando...';
            await this.login(box.querySelector('#ps-sb-email').value, box.querySelector('#ps-sb-pass').value);
            msg.textContent = 'Sesión iniciada';
            this.refreshModalState();
          } catch (e) { msg.textContent = e.message; }
        };
        box.querySelector('#ps-sb-reg').onclick = async () => {
          try {
            msg.textContent = 'Creando cuenta...';
            await this.register(
              box.querySelector('#ps-sb-email').value,
              box.querySelector('#ps-sb-pass').value,
              box.querySelector('#ps-sb-nick').value
            );
            msg.textContent = '¡Cuenta creada!';
            this.refreshModalState();
          } catch (e) { msg.textContent = e.message; }
        };
      } else {
        box.innerHTML = `
          <div>Conectado como: <b style="color:#f7c948">${this.profile?.nick || this.user.email}</b></div>
          <button id="ps-sb-push" style="${btnStyle}">⬆ Subir guardado local a la nube</button>
          <button id="ps-sb-pull" style="${btnStyle};background:#1d2f52;border-color:#59c1ff">⬇ Restaurar desde la nube</button>
          <button id="ps-sb-out" style="${btnStyle};background:#442029;border-color:#ff6b8b">Cerrar sesión</button>
        `;
        box.querySelector('#ps-sb-push').onclick = async () => {
          try {
            const rev = await this.pushSave();
            msg.textContent = `Guardado subido (rev ${rev})`;
          } catch (e) { msg.textContent = e.message; }
        };
        box.querySelector('#ps-sb-pull').onclick = async () => {
          try {
            const row = await this.loadSave();
            if (!row) { msg.textContent = 'No hay guardado en la nube aún'; return; }
            applyLocalSave(row.data);
            msg.textContent = `Restaurado (rev ${row.rev}). Recargando...`;
            setTimeout(() => location.reload(), 900);
          } catch (e) { msg.textContent = e.message; }
        };
        box.querySelector('#ps-sb-out').onclick = async () => {
          await this.logout();
          msg.textContent = 'Sesión cerrada';
          this.refreshModalState();
        };
      }

      if (rankBox) {
        try {
          const rows = await this.getRanking({ mode: 'solo', limit: 10 });
          rankBox.innerHTML = '<b>TOP 10 SOLO</b><br>' + (rows.length
            ? rows.map((r, i) => `${i + 1}. ${r.nick} — ${Math.floor(r.seconds / 60)}m${r.seconds % 60}s (${r.kills} kills)`).join('<br>')
            : 'Sin puntuaciones todavía');
        } catch {
          rankBox.innerHTML = '';
        }
      }
    }
  };

  window.addEventListener('DOMContentLoaded', () => Cloud.init());
  G.Cloud = Cloud;
})();
