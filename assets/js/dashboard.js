// RP Assistence Discord Dashboard
(function () {
  const DISCORD_API = "https://discord.com/api/v10";
  const ADMIN = 0x8n;
  const MANAGE = 0x20n;

  const config = window.RP_ASSISTENCE_SUPABASE || {};
  const apiBase = (window.RP_ASSISTENCE_DASHBOARD_API || "https://rphelper.vercel.app").replace(/\/$/, "");

  let sb = null;
  let session = null;
  let providerToken = null;
  let selectedGuild = null;
  let guildDetails = { channels: [], roles: [] };

  const $ = (id) => document.getElementById(id);

  function toast() {
    let el = document.getElementById("dashboardToast");

    if (!el) {
      el = document.createElement("div");
      el.id = "dashboardToast";
      el.style.cssText = "position:fixed;left:16px;right:16px;top:86px;z-index:9999;display:none;padding:14px 16px;border-radius:16px;background:#0f172a;color:#f8fafc;border:1px solid rgba(148,163,184,.35);box-shadow:0 22px 60px rgba(0,0,0,.42);font-weight:800;font-size:14px;line-height:1.45";
      document.body.appendChild(el);
    }

    return el;
  }

  function setMsg(text, type) {
    const el = $("dashboardMessage");

    if (el) {
      el.textContent = text || "";
      el.classList.remove("error", "success");
      if (type) el.classList.add(type);
    }

    const t = toast();

    if (!text) {
      t.style.display = "none";
      return;
    }

    t.textContent = text;
    t.style.display = "block";
    t.style.borderColor = type === "error" ? "rgba(248,113,113,.5)" : type === "success" ? "rgba(74,222,128,.45)" : "rgba(129,140,248,.45)";
    t.style.background = type === "error" ? "#3b1117" : type === "success" ? "#10291c" : "#0f172a";

    clearTimeout(window.__rpDashToast);

    if (type === "success") {
      window.__rpDashToast = setTimeout(() => {
        t.style.display = "none";
      }, 4500);
    }
  }

  function option(label, value) {
    const opt = document.createElement("option");
    opt.value = value || "";
    opt.textContent = label;
    return opt;
  }

  function fillSelect(id, items, placeholder) {
    const el = $(id);
    if (!el) return;

    el.replaceChildren(option(placeholder || "Pilih...", ""));
    items.forEach((item) => el.appendChild(option("# " + item.name, item.id)));
  }

  function fillMulti(id, items) {
    const el = $(id);
    if (!el) return;

    el.replaceChildren();
    items.forEach((item) => el.appendChild(option(item.name, item.id)));
  }

  function canManageGuild(guild) {
    const perms = BigInt(guild.permissions || "0");
    return Boolean(guild.owner) || (perms & ADMIN) === ADMIN || (perms & MANAGE) === MANAGE;
  }

  function getSelectedValues(id) {
    const el = $(id);
    return el ? Array.from(el.selectedOptions).map((o) => o.value).filter(Boolean) : [];
  }

  function requireReady() {
    if (!selectedGuild) throw new Error("Pilih server dulu.");
    if (!session) throw new Error("Login Discord dulu.");
  }

  async function initSupabase() {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("Supabase belum termuat.");
    }

    sb = window.supabase.createClient(config.url, config.anonKey);

    const { data } = await sb.auth.getSession();
    session = data.session;
    providerToken = session && session.provider_token;

    updateAuthUI();

    if (session) await loadDiscordGuilds();
  }

  function updateAuthUI() {
    const logged = Boolean(session);

    $("loginPanel")?.classList.toggle("dash-hidden", logged);
    $("dashboardPanel")?.classList.toggle("dash-hidden", !logged);

    if (!logged) return;

    const user = session.user || {};
    const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Discord User";

    if ($("dashAvatar")) $("dashAvatar").textContent = String(name).slice(0, 2).toUpperCase();
    if ($("dashName")) $("dashName").textContent = name;
    if ($("dashSub")) $("dashSub").textContent = "Login aktif via Discord + Supabase Auth";
  }

  async function loginDiscord() {
    if (!sb) return;

    await sb.auth.signInWithOAuth({
      provider: "discord",
      options: {
        scopes: "identify guilds",
        redirectTo: window.location.origin + window.location.pathname
      }
    });
  }

  async function logout() {
    if (sb) await sb.auth.signOut();
    location.reload();
  }

  async function loadDiscordGuilds() {
    try {
      if (!providerToken) {
        setMsg("Provider token Discord tidak tersedia. Login ulang Discord.", "error");
        return;
      }

      setMsg("Mengambil daftar server Discord...", "");

      const res = await fetch(DISCORD_API + "/users/@me/guilds", {
        headers: { Authorization: "Bearer " + providerToken }
      });

      if (!res.ok) {
        throw new Error("Gagal mengambil daftar server Discord. Coba login ulang.");
      }

      const guilds = (await res.json()).filter(canManageGuild);

      renderGuilds(guilds);

      setMsg(
        guilds.length ? "Pilih server yang ingin disetting." : "Tidak ada server dengan akses owner/admin/manage server.",
        guilds.length ? "success" : "error"
      );
    } catch (err) {
      setMsg(err.message || "Gagal mengambil server Discord.", "error");
    }
  }

  function renderGuilds(guilds) {
    const list = $("guildList");
    if (!list) return;

    list.replaceChildren();

    if (!guilds.length) {
      const empty = document.createElement("div");
      empty.className = "dash-empty";
      empty.textContent = "Tidak ada server yang bisa dikelola oleh akun Discord ini.";
      list.appendChild(empty);
      return;
    }

    guilds.forEach((guild) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "guild-card";
      btn.innerHTML = '<strong></strong><small></small><span class="dash-pill">Owner/Admin</span>';
      btn.querySelector("strong").textContent = guild.name;
      btn.querySelector("small").textContent = "Guild ID: " + guild.id;
      btn.addEventListener("click", () => validateGuild(guild, btn));
      list.appendChild(btn);
    });
  }

  async function validateGuild(guild, btn) {
    if (!apiBase) {
      setMsg("Dashboard API belum diisi di supabase-config.js.", "error");
      return;
    }

    document.querySelectorAll(".guild-card").forEach((el) => el.classList.remove("active", "loading"));
    btn.classList.add("active", "loading");

    setMsg("Memvalidasi server " + guild.name + " lewat Vercel API...", "");

    try {
      const res = await fetch(apiBase + "/api/dashboard/guild-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.access_token
        },
        body: JSON.stringify({
          providerToken,
          guildId: guild.id
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Validasi gagal. Pastikan bot ada di server dan API Vercel aktif.");
      }

      selectedGuild = data.guild || guild;
      guildDetails = data;

      $("settingsPanel")?.classList.remove("dash-hidden");

      if ($("selectedGuildName")) {
        $("selectedGuildName").textContent = selectedGuild.name + " (" + selectedGuild.id + ")";
      }

      hydrateSettingsOptions();
      await loadExistingSettings();

      setMsg("Server terverifikasi. Channel dan role sudah dimuat.", "success");
      $("settingsPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setMsg(err && err.message ? err.message : "Validasi gagal. Pastikan API Vercel aktif dan env sudah benar.", "error");
    } finally {
      btn.classList.remove("loading");
    }
  }

  function hydrateSettingsOptions() {
    const text = (guildDetails.channels || []).filter((c) => [0, 5, 15].includes(Number(c.type)));
    const cats = (guildDetails.channels || []).filter((c) => Number(c.type) === 4);
    const roles = (guildDetails.roles || []).filter((r) => r.name !== "@everyone");

    fillSelect("aiChannel", text, "Pilih channel AI Chat");
    fillSelect("welcomeChannel", text, "Pilih channel welcome");
    fillSelect("ticketPanelChannel", text, "Pilih channel panel ticket");
    fillSelect("ticketLogChannel", text, "Pilih channel log ticket");
    fillSelect("ticketCategory", cats, "Pilih kategori ticket");
    fillSelect("ticketPingRole", roles, "Tanpa ping role");
    fillMulti("ticketStaffRoles", roles);
    fillMulti("ticketAdminRoles", roles);
  }

  async function loadExistingSettings() {
    requireReady();

    const id = selectedGuild.id;

    const [ai, welcome] = await Promise.all([
      sb.from("ai_chat_config").select("*").eq("guild_id", id).maybeSingle(),
      sb.from("welcome_configs").select("*").eq("guild_id", id).eq("type", "welcome").maybeSingle()
    ]);

    if (ai.data?.channel_id && $("aiChannel")) $("aiChannel").value = ai.data.channel_id;

    if (welcome.data) {
      if ($("welcomeChannel")) $("welcomeChannel").value = welcome.data.channel_id || "";
      if ($("welcomeTitle")) $("welcomeTitle").value = welcome.data.title || "";
      if ($("welcomeMessage")) $("welcomeMessage").value = welcome.data.message || "";
      if ($("welcomeBg")) $("welcomeBg").value = welcome.data.bg_url || "";
    }
  }

  async function saveAiChat(e) {
    e.preventDefault();

    try {
      requireReady();

      const channel_id = $("aiChannel")?.value;
      if (!channel_id) throw new Error("Pilih channel AI Chat dulu.");

      const { error } = await sb.from("ai_chat_config").upsert(
        { guild_id: selectedGuild.id, channel_id },
        { onConflict: "guild_id" }
      );

      if (error) throw error;

      setMsg("AI Chat berhasil disimpan.", "success");
    } catch (err) {
      setMsg(err.message, "error");
    }
  }

  async function saveWelcome(e) {
    e.preventDefault();

    try {
      requireReady();

      const payload = {
        guild_id: selectedGuild.id,
        type: "welcome",
        channel_id: $("welcomeChannel")?.value,
        title: $("welcomeTitle")?.value || "Selamat Datang!",
        message: $("welcomeMessage")?.value || "Halo {user}, selamat datang di {server}!",
        bg_url: $("welcomeBg")?.value || null,
        options: [],
        watermark: false,
        enabled: true
      };

      if (!payload.channel_id) throw new Error("Pilih channel welcome dulu.");

      const { error } = await sb.from("welcome_configs").upsert(payload, {
        onConflict: "guild_id,type"
      });

      if (error) throw error;

      setMsg("Welcome config berhasil disimpan.", "success");
    } catch (err) {
      setMsg(err.message, "error");
    }
  }

  async function saveTicket(e) {
    e.preventDefault();

    try {
      requireReady();

      const cat = $("ticketCategory");
      const questions = String($("ticketQuestions")?.value || "")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 5);

      const payload = {
        id: "cfg_web_" + Date.now(),
        guild_id: selectedGuild.id,
        channel_id: $("ticketPanelChannel")?.value,
        label: $("ticketLabel")?.value || "Ticket Support",
        category: cat?.selectedOptions[0]?.textContent || "TICKETS",
        emoji: $("ticketEmoji")?.value || "🎫",
        greeting: $("ticketGreeting")?.value || null,
        ping_role: $("ticketPingRole")?.value || null,
        staff_roles: getSelectedValues("ticketStaffRoles"),
        admin_roles: getSelectedValues("ticketAdminRoles"),
        log_channel: $("ticketLogChannel")?.value || null,
        max_open: Number($("ticketMaxOpen")?.value || 3),
        allow_reopen: true,
        questions,
        enabled: true,
        created_by: session.user.id
      };

      if (!payload.channel_id) throw new Error("Pilih channel panel ticket dulu.");

      const { error } = await sb.from("ticket_configs").insert(payload);
      if (error) throw error;

      setMsg("Ticket config berhasil dibuat. Kirim panel dari Discord dengan /ticket panel jika panel belum muncul.", "success");

      e.target.reset();
      hydrateSettingsOptions();
    } catch (err) {
      setMsg(err.message, "error");
    }
  }

  function setupTabs() {
    document.querySelectorAll(".dash-tab").forEach((btn) =>
      btn.addEventListener("click", () => {
        document.querySelectorAll(".dash-tab").forEach((x) => x.classList.remove("active"));
        document.querySelectorAll(".module-panel").forEach((x) => x.classList.remove("active"));

        btn.classList.add("active");
        $(btn.dataset.target)?.classList.add("active");
      })
    );
  }

  document.addEventListener("DOMContentLoaded", async () => {
    $("loginDiscord")?.addEventListener("click", loginDiscord);
    $("logoutDashboard")?.addEventListener("click", logout);
    $("refreshGuilds")?.addEventListener("click", loadDiscordGuilds);
    $("aiForm")?.addEventListener("submit", saveAiChat);
    $("welcomeForm")?.addEventListener("submit", saveWelcome);
    $("ticketForm")?.addEventListener("submit", saveTicket);

    setupTabs();

    try {
      await initSupabase();
    } catch (err) {
      setMsg(err.message, "error");
    }
  });
})();
