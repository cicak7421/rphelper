// RP Assistence Discord Dashboard (GitHub Pages frontend + bot-hosted validator API)
(function () {
  const DISCORD_API = 'https://discord.com/api/v10';
  const ADMIN_BITS = 0x8n;
  const MANAGE_GUILD_BITS = 0x20n;
  const config = window.RP_ASSISTENCE_SUPABASE || {};
  const apiBase = (window.RP_ASSISTENCE_DASHBOARD_API || '').replace(/\/$/, '');

  let sb = null;
  let session = null;
  let providerToken = null;
  let selectedGuild = null;
  let guildDetails = { channels: [], roles: [] };

  const $ = id => document.getElementById(id);

  function setMsg(text, type) {
    const el = $('dashboardMessage');
    if (!el) return;
    el.textContent = text || '';
    el.classList.remove('error', 'success');
    if (type) el.classList.add(type);
  }

  function option(label, value) {
    const opt = document.createElement('option');
    opt.value = value || '';
    opt.textContent = label;
    return opt;
  }

  function fillSelect(id, items, placeholder) {
    const el = $(id);
    if (!el) return;
    el.replaceChildren(option(placeholder || 'Pilih...', ''));
    items.forEach(item => el.appendChild(option(item.name, item.id)));
  }

  function fillMulti(id, items) {
    const el = $(id);
    if (!el) return;
    el.replaceChildren();
    items.forEach(item => el.appendChild(option(item.name, item.id)));
  }

  function canManageGuild(guild) {
    const perms = BigInt(guild.permissions || '0');
    return Boolean(guild.owner) || (perms & ADMIN_BITS) === ADMIN_BITS || (perms & MANAGE_GUILD_BITS) === MANAGE_GUILD_BITS;
  }

  function getSelectedValues(id) {
    const el = $(id);
    if (!el) return [];
    return Array.from(el.selectedOptions).map(opt => opt.value).filter(Boolean);
  }

  function requireReady() {
    if (!selectedGuild) throw new Error('Pilih server dulu.');
    if (!session) throw new Error('Login Discord dulu.');
  }

  async function initSupabase() {
    if (!window.supabase || !window.supabase.createClient) throw new Error('Supabase belum termuat.');
    sb = window.supabase.createClient(config.url, config.anonKey);
    const { data } = await sb.auth.getSession();
    session = data.session;
    providerToken = session && session.provider_token;
    updateAuthUI();
    if (session) await loadDiscordGuilds();
  }

  function updateAuthUI() {
    const loggedIn = Boolean(session);
    $('loginPanel')?.classList.toggle('dash-hidden', loggedIn);
    $('dashboardPanel')?.classList.toggle('dash-hidden', !loggedIn);
    if (!loggedIn) return;
    const user = session.user || {};
    const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Discord User';
    const avatar = $('dashAvatar');
    if (avatar) avatar.textContent = String(name).slice(0, 2).toUpperCase();
    if ($('dashName')) $('dashName').textContent = name;
    if ($('dashSub')) $('dashSub').textContent = 'Login aktif via Discord + Supabase Auth';
  }

  async function loginDiscord() {
    if (!sb) return;
    await sb.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        scopes: 'identify guilds',
        redirectTo: window.location.origin + window.location.pathname
      }
    });
  }

  async function logout() {
    if (sb) await sb.auth.signOut();
    session = null;
    providerToken = null;
    selectedGuild = null;
    updateAuthUI();
    location.reload();
  }

  async function loadDiscordGuilds() {
    if (!providerToken) {
      setMsg('Provider token Discord tidak tersedia. Login ulang dan pastikan scope identify guilds aktif di Supabase.', 'error');
      return;
    }
    setMsg('Mengambil daftar server Discord...', '');
    const res = await fetch(DISCORD_API + '/users/@me/guilds', { headers: { Authorization: 'Bearer ' + providerToken } });
    if (!res.ok) {
      setMsg('Gagal mengambil daftar server Discord. Coba login ulang.', 'error');
      return;
    }
    const guilds = (await res.json()).filter(canManageGuild);
    renderGuilds(guilds);
    setMsg(guilds.length ? 'Pilih server yang ingin disetting.' : 'Tidak ada server dengan akses owner/admin/manage server.', guilds.length ? 'success' : 'error');
  }

  function renderGuilds(guilds) {
    const list = $('guildList');
    if (!list) return;
    list.replaceChildren();
    guilds.forEach(guild => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'guild-card';
      btn.innerHTML = '<strong></strong><small></small><span class="dash-pill">Owner/Admin</span>';
      btn.querySelector('strong').textContent = guild.name;
      btn.querySelector('small').textContent = 'Guild ID: ' + guild.id;
      btn.addEventListener('click', () => validateGuild(guild, btn));
      list.appendChild(btn);
    });
  }

  async function validateGuild(guild, btn) {
    if (!apiBase) {
      setMsg('Dashboard API belum diisi di supabase-config.js. Isi window.RP_ASSISTENCE_DASHBOARD_API dengan URL hosting bot.', 'error');
      return;
    }
    setMsg('Memvalidasi akses server lewat hosting bot...', '');
    document.querySelectorAll('.guild-card').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');

    const res = await fetch(apiBase + '/api/dashboard/guild-details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + session.access_token
      },
      body: JSON.stringify({ providerToken, guildId: guild.id })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setMsg(data.error || 'Validasi gagal. Pastikan bot ada di server dan API hosting aktif.', 'error');
      return;
    }

    selectedGuild = data.guild || guild;
    guildDetails = data;
    $('settingsPanel')?.classList.remove('dash-hidden');
    if ($('selectedGuildName')) $('selectedGuildName').textContent = selectedGuild.name + ' (' + selectedGuild.id + ')';
    hydrateSettingsOptions();
    await loadExistingSettings();
    setMsg('Server terverifikasi. Setting bisa diedit dari dashboard.', 'success');
  }

  function hydrateSettingsOptions() {
    const textChannels = (guildDetails.channels || []).filter(c => [0, 5, 15].includes(Number(c.type)));
    const categories = (guildDetails.channels || []).filter(c => Number(c.type) === 4);
    const roles = (guildDetails.roles || []).filter(r => r.name !== '@everyone');
    fillSelect('aiChannel', textChannels, 'Pilih channel AI Chat');
    fillSelect('welcomeChannel', textChannels, 'Pilih channel welcome');
    fillSelect('ticketPanelChannel', textChannels, 'Pilih channel panel ticket');
    fillSelect('ticketLogChannel', textChannels, 'Pilih channel log ticket');
    fillSelect('ticketCategory', categories, 'Pilih kategori ticket');
    fillSelect('ticketPingRole', roles, 'Tanpa ping role');
    fillMulti('ticketStaffRoles', roles);
    fillMulti('ticketAdminRoles', roles);
  }

  async function loadExistingSettings() {
    requireReady();
    const guildId = selectedGuild.id;
    const [ai, welcome] = await Promise.all([
      sb.from('ai_chat_config').select('*').eq('guild_id', guildId).maybeSingle(),
      sb.from('welcome_configs').select('*').eq('guild_id', guildId).eq('type', 'welcome').maybeSingle()
    ]);
    if (ai.data?.channel_id && $('aiChannel')) $('aiChannel').value = ai.data.channel_id;
    if (welcome.data) {
      if ($('welcomeChannel')) $('welcomeChannel').value = welcome.data.channel_id || '';
      if ($('welcomeTitle')) $('welcomeTitle').value = welcome.data.title || '';
      if ($('welcomeMessage')) $('welcomeMessage').value = welcome.data.message || '';
      if ($('welcomeBg')) $('welcomeBg').value = welcome.data.bg_url || '';
    }
  }

  async function saveAiChat(event) {
    event.preventDefault();
    try {
      requireReady();
      const channelId = $('aiChannel')?.value;
      if (!channelId) throw new Error('Pilih channel AI Chat dulu.');
      const { error } = await sb.from('ai_chat_config').upsert({ guild_id: selectedGuild.id, channel_id: channelId }, { onConflict: 'guild_id' });
      if (error) throw error;
      setMsg('AI Chat berhasil disimpan.', 'success');
    } catch (error) {
      setMsg(error.message, 'error');
    }
  }

  async function saveWelcome(event) {
    event.preventDefault();
    try {
      requireReady();
      const payload = {
        guild_id: selectedGuild.id,
        type: 'welcome',
        channel_id: $('welcomeChannel')?.value,
        title: $('welcomeTitle')?.value || 'Selamat Datang!',
        message: $('welcomeMessage')?.value || 'Halo {user}, selamat datang di {server}!',
        bg_url: $('welcomeBg')?.value || null,
        options: [],
        watermark: false,
        enabled: true
      };
      if (!payload.channel_id) throw new Error('Pilih channel welcome dulu.');
      const { error } = await sb.from('welcome_configs').upsert(payload, { onConflict: 'guild_id,type' });
      if (error) throw error;
      setMsg('Welcome config berhasil disimpan.', 'success');
    } catch (error) {
      setMsg(error.message, 'error');
    }
  }

  async function saveTicket(event) {
    event.preventDefault();
    try {
      requireReady();
      const categorySelect = $('ticketCategory');
      const categoryName = categorySelect?.selectedOptions[0]?.textContent || 'TICKETS';
      const questions = String($('ticketQuestions')?.value || '').split('\n').map(x => x.trim()).filter(Boolean).slice(0, 5);
      const payload = {
        id: 'cfg_web_' + Date.now(),
        guild_id: selectedGuild.id,
        channel_id: $('ticketPanelChannel')?.value,
        label: $('ticketLabel')?.value || 'Ticket Support',
        category: categoryName,
        emoji: $('ticketEmoji')?.value || '🎫',
        greeting: $('ticketGreeting')?.value || null,
        ping_role: $('ticketPingRole')?.value || null,
        staff_roles: getSelectedValues('ticketStaffRoles'),
        admin_roles: getSelectedValues('ticketAdminRoles'),
        log_channel: $('ticketLogChannel')?.value || null,
        max_open: Number($('ticketMaxOpen')?.value || 3),
        allow_reopen: true,
        questions,
        enabled: true,
        created_by: session.user.id
      };
      if (!payload.channel_id) throw new Error('Pilih channel panel ticket dulu.');
      const { error } = await sb.from('ticket_configs').insert(payload);
      if (error) throw error;
      setMsg('Ticket config berhasil dibuat. Kirim panel dari Discord dengan /ticket panel jika panel belum muncul.', 'success');
      event.target.reset();
      hydrateSettingsOptions();
    } catch (error) {
      setMsg(error.message, 'error');
    }
  }

  function setupTabs() {
    document.querySelectorAll('.dash-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.dash-tab').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.module-panel').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        $(btn.dataset.target)?.classList.add('active');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    $('loginDiscord')?.addEventListener('click', loginDiscord);
    $('logoutDashboard')?.addEventListener('click', logout);
    $('refreshGuilds')?.addEventListener('click', loadDiscordGuilds);
    $('aiForm')?.addEventListener('submit', saveAiChat);
    $('welcomeForm')?.addEventListener('submit', saveWelcome);
    $('ticketForm')?.addEventListener('submit', saveTicket);
    setupTabs();
    try {
      await initSupabase();
    } catch (error) {
      setMsg(error.message, 'error');
    }
  });
})();