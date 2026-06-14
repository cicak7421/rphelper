// RP Assistence static multi-page interactions
(function () {
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function revealAll() {
    document.querySelectorAll('.ao').forEach((el, i) => {
      el.style.transitionDelay = ((i % 8) * 45) + 'ms';
      el.classList.add('vis');
    });
  }

  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('vis');
      });
    }, { threshold: 0.08 });

    document.querySelectorAll('.ao').forEach((el, i) => {
      el.style.transitionDelay = ((i % 8) * 45) + 'ms';
      io.observe(el);
    });
  } else {
    revealAll();
  }

  window.toggleMenu = function toggleMenu() {
    const menu = document.getElementById('mobileMenu');
    const btn = document.querySelector('.nmobile-btn');
    if (!menu) return;
    const isOpen = menu.classList.toggle('open');
    if (btn) btn.setAttribute('aria-expanded', String(isOpen));
  };

  window.closeMenu = function closeMenu() {
    const menu = document.getElementById('mobileMenu');
    const btn = document.querySelector('.nmobile-btn');
    if (menu) menu.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  };

  document.addEventListener('click', event => {
    if (!event.target.closest('nav') && !event.target.closest('.mobile-menu')) window.closeMenu();
  });

  let activeCommandTier = 'all';
  let activeCommandSearch = '';

  function ensureEmptyState() {
    let empty = document.getElementById('cmdEmpty');
    if (!empty) {
      empty = document.createElement('div');
      empty.id = 'cmdEmpty';
      empty.className = 'empty-state';
      empty.textContent = 'Command tidak ditemukan. Coba kata kunci lain atau reset filter tier.';
      const grid = document.querySelector('.cgrid');
      if (grid) grid.insertAdjacentElement('afterend', empty);
    }
    return empty;
  }

  function applyCommandFilters() {
    const items = document.querySelectorAll('.ci');
    if (!items.length) return;

    let visible = 0;
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      const tierMatch = activeCommandTier === 'all' || item.dataset.tier === activeCommandTier;
      const searchMatch = !activeCommandSearch || text.includes(activeCommandSearch);
      const show = tierMatch && searchMatch;
      item.classList.toggle('hidden', !show);
      if (show) visible++;
    });

    ensureEmptyState().classList.toggle('show', visible === 0);
  }

  window.filterCmds = function filterCmds(tier, btn) {
    activeCommandTier = tier;
    document.querySelectorAll('.cmd-tab').forEach(tab => {
      tab.classList.remove('active-all', 'active-f', 'active-p', 'active-e');
    });
    const map = { all: 'active-all', free: 'active-f', pro: 'active-p', ent: 'active-e' };
    if (btn) btn.classList.add(map[tier] || 'active-all');
    applyCommandFilters();
  };

  window.searchCmds = function searchCmds(value) {
    activeCommandSearch = String(value || '').trim().toLowerCase();
    applyCommandFilters();
  };

  applyCommandFilters();
})();

// RP Assistence testimonials interactions — Supabase only, no dummy data
(function () {
  const form = document.getElementById('testimonialForm');
  const list = document.getElementById('testimonialList');
  if (!form || !list) return;

  const config = window.RP_ASSISTENCE_SUPABASE || {};
  const tableName = config.table || 'testimonials';
  const comment = document.getElementById('customerComment');
  const counter = document.getElementById('commentCounter');
  const message = document.getElementById('testimonialMessage');
  let activeReviewFilter = 'all';
  let reviewsCache = [];

  function setMessage(text, type) {
    if (!message) return;
    message.textContent = text || '';
    message.classList.toggle('error', type === 'error');
  }

  function starText(rating) {
    const value = Math.max(1, Math.min(5, Number(rating) || 5));
    return '★★★★★'.slice(0, value) + '☆☆☆☆☆'.slice(0, 5 - value);
  }

  function initials(name) {
    return String(name || 'C')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(word => word[0] || '')
      .join('')
      .toUpperCase() || 'C';
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function normalizeReview(item) {
    return {
      id: item.id,
      name: item.customer_name || item.name || 'Customer',
      rating: Number(item.rating || 5),
      comment: item.comment || '',
      date: item.created_at || item.date || ''
    };
  }

  function renderSummary(reviews) {
    const avgEl = document.getElementById('avgRating');
    const starsEl = document.getElementById('avgStars');
    const countEl = document.getElementById('reviewCount');
    const barsEl = document.getElementById('ratingBars');
    const total = reviews.length;
    const average = total ? reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / total : 0;

    if (avgEl) avgEl.textContent = total ? average.toFixed(1) : '0.0';
    if (starsEl) starsEl.textContent = total ? starText(Math.round(average)) : '☆☆☆☆☆';
    if (countEl) countEl.textContent = total;

    if (barsEl) {
      barsEl.replaceChildren();
      [5, 4, 3, 2, 1].forEach(star => {
        const count = reviews.filter(item => Number(item.rating) === star).length;
        const percent = total ? Math.round((count / total) * 100) : 0;
        const row = document.createElement('div');
        const label = document.createElement('span');
        const track = document.createElement('div');
        const fill = document.createElement('span');
        const value = document.createElement('span');

        row.className = 'rating-bar-row';
        track.className = 'rating-bar-track';
        fill.className = 'rating-bar-fill';
        fill.style.width = percent + '%';
        label.textContent = star + '★';
        value.textContent = count;

        track.appendChild(fill);
        row.append(label, track, value);
        barsEl.appendChild(row);
      });
    }
  }

  function setEmptyState(title, subtitle) {
    const empty = document.createElement('div');
    const strong = document.createElement('strong');
    const span = document.createElement('span');

    empty.className = 'testimonial-empty';
    strong.textContent = title;
    span.textContent = subtitle;
    empty.append(strong, span);
    list.replaceChildren(empty);
  }

  function renderReviews() {
    renderSummary(reviewsCache);
    const filtered = activeReviewFilter === 'all'
      ? reviewsCache
      : reviewsCache.filter(item => String(item.rating) === activeReviewFilter);

    if (!reviewsCache.length) {
      setEmptyState('Belum ada testimoni.', 'Testimoni akan tampil di sini setelah customer mengirim ulasan asli.');
      return;
    }

    if (!filtered.length) {
      setEmptyState('Belum ada testimoni untuk filter ini.', 'Coba pilih filter lain.');
      return;
    }

    const cards = filtered.map(item => {
      const card = document.createElement('article');
      const head = document.createElement('div');
      const avatar = document.createElement('div');
      const meta = document.createElement('div');
      const name = document.createElement('div');
      const date = document.createElement('div');
      const stars = document.createElement('div');
      const text = document.createElement('p');
      const quote = document.createElement('div');

      card.className = 'testimonial-card';
      head.className = 'testimonial-card-head';
      avatar.className = 'customer-avatar';
      meta.className = 'customer-meta';
      name.className = 'customer-name';
      date.className = 'customer-date';
      stars.className = 'customer-stars';
      text.className = 'testimonial-comment';
      quote.className = 'testimonial-quote';

      avatar.textContent = initials(item.name);
      name.textContent = item.name;
      date.textContent = formatDate(item.date);
      stars.textContent = starText(item.rating);
      stars.setAttribute('aria-label', Number(item.rating) + ' dari 5 bintang');
      text.textContent = item.comment;
      quote.textContent = '”';

      meta.append(name, date);
      head.append(avatar, meta, stars);
      card.append(head, text, quote);
      return card;
    });

    list.replaceChildren(...cards);
  }

  function getSupabaseClient() {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error('Library Supabase belum termuat.');
    }
    if (!config.url || !config.anonKey) {
      throw new Error('Konfigurasi Supabase belum diisi.');
    }
    return window.supabase.createClient(config.url, config.anonKey);
  }

  async function loadReviews() {
    setEmptyState('Memuat testimoni...', 'Mengambil data asli dari Supabase.');

    try {
      const client = getSupabaseClient();
      const query = client
        .from(tableName)
        .select('id, customer_name, rating, comment, created_at, is_approved')
        .order('created_at', { ascending: false });

      const { data, error } = await query.eq('is_approved', true);

      if (error && /is_approved|column|schema/i.test(error.message || '')) {
        const fallback = await client
          .from(tableName)
          .select('id, customer_name, rating, comment, created_at')
          .order('created_at', { ascending: false });

        if (fallback.error) throw fallback.error;
        reviewsCache = Array.isArray(fallback.data) ? fallback.data.map(normalizeReview) : [];
      } else if (error) {
        throw error;
      } else {
        reviewsCache = Array.isArray(data) ? data.map(normalizeReview) : [];
      }

      renderReviews();
    } catch (error) {
      console.error(error);
      reviewsCache = [];
      renderSummary(reviewsCache);
      setEmptyState('Testimoni belum bisa dimuat.', 'Periksa konfigurasi Supabase, RLS policy, dan koneksi hosting.');
      setMessage('Gagal memuat testimoni dari Supabase.', 'error');
    }
  }

  if (comment && counter) {
    const updateCounter = () => { counter.textContent = String(comment.value.length); };
    comment.addEventListener('input', updateCounter);
    updateCounter();
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const nameInput = document.getElementById('customerName');
    const ratingInput = document.getElementById('customerRating');
    const commentInput = document.getElementById('customerComment');

    const customer_name = nameInput ? nameInput.value.trim() : '';
    const rating = ratingInput ? Number(ratingInput.value || 5) : 5;
    const reviewComment = commentInput ? commentInput.value.trim() : '';

    if (!customer_name || !reviewComment) {
      setMessage('Nama dan komentar wajib diisi.', 'error');
      return;
    }

    if (reviewComment.length > 280) {
      setMessage('Komentar maksimal 280 karakter.', 'error');
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Mengirim...';
    }

    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from(tableName)
        .insert([{ customer_name, rating, comment: reviewComment }]);

      if (error) throw error;

      form.reset();
      if (counter) counter.textContent = '0';
      setMessage('Terima kasih! Testimoni berhasil dikirim.', 'success');

      activeReviewFilter = 'all';
      document.querySelectorAll('.review-filter').forEach(button => button.classList.remove('active-all', 'active-rating'));
      const allButton = document.querySelector('.review-filter[data-review-filter="all"]');
      if (allButton) allButton.classList.add('active-all');

      await loadReviews();
    } catch (error) {
      console.error(error);
      setMessage('Gagal mengirim testimoni. Periksa Supabase RLS policy dan koneksi.', 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Kirim Testimoni';
      }
    }
  });

  document.querySelectorAll('.review-filter').forEach(button => {
    button.addEventListener('click', () => {
      activeReviewFilter = button.dataset.reviewFilter || 'all';
      document.querySelectorAll('.review-filter').forEach(item => item.classList.remove('active-all', 'active-rating'));
      button.classList.add(activeReviewFilter === 'all' ? 'active-all' : 'active-rating');
      renderReviews();
    });
  });

  loadReviews();
})();