// TicketForge static multi-page interactions
(function () {
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll/reveal animation
  const reveal = () => {
    document.querySelectorAll('.ao').forEach((el, i) => {
      el.style.transitionDelay = ((i % 8) * 45) + 'ms';
      el.classList.add('vis');
    });
  };

  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('vis');
      });
    }, { threshold: .08 });

    document.querySelectorAll('.ao').forEach((el, i) => {
      el.style.transitionDelay = ((i % 8) * 45) + 'ms';
      io.observe(el);
    });
  } else {
    reveal();
  }

  // Mobile menu
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

  // Command filter tabs + search
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

    const empty = ensureEmptyState();
    empty.classList.toggle('show', visible === 0);
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



// TicketForge testimonials interactions — Supabase only, no dummy data
(function () {
  const form = document.getElementById('testimonialForm');
  const list = document.getElementById('testimonialList');
  if (!form || !list) return;

  const config = window.TICKETFORGE_SUPABASE || {};
  const tableName = config.table || 'testimonials';
  const comment = document.getElementById('customerComment');
  const counter = document.getElementById('commentCounter');
  const message = document.getElementById('testimonialMessage');
  let activeReviewFilter = 'all';
  let reviewsCache = [];

  // Bersihkan data demo/localStorage dari versi lama.
  // Data yang ditampilkan hanya berasal dari Supabase.
  try {
    localStorage.removeItem('ticketforge_testimonials_v1');
  } catch (error) {}

  function setMessage(text, type) {
    if (!message) return;
    message.textContent = text || '';
    message.classList.toggle('error', type === 'error');
  }

  function safeText(value) {
    return String(value || '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
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
      barsEl.innerHTML = [5, 4, 3, 2, 1].map(star => {
        const count = reviews.filter(item => Number(item.rating) === star).length;
        const percent = total ? Math.round((count / total) * 100) : 0;
        return `<div class="rating-bar-row"><span>${star}★</span><div class="rating-bar-track"><span class="rating-bar-fill" style="width:${percent}%"></span></div><span>${count}</span></div>`;
      }).join('');
    }
  }

  function renderReviews() {
    renderSummary(reviewsCache);
    const filtered = activeReviewFilter === 'all'
      ? reviewsCache
      : reviewsCache.filter(item => String(item.rating) === activeReviewFilter);

    if (!reviewsCache.length) {
      list.innerHTML = '<div class="testimonial-empty"><strong>Belum ada testimoni.</strong><span>Testimoni akan tampil di sini setelah customer mengirim ulasan asli.</span></div>';
      return;
    }

    if (!filtered.length) {
      list.innerHTML = '<div class="testimonial-empty"><strong>Belum ada testimoni untuk filter ini.</strong><span>Coba pilih filter lain.</span></div>';
      return;
    }

    list.innerHTML = filtered.map(item => `
      <article class="testimonial-card">
        <div class="testimonial-card-head">
          <div class="customer-avatar">${safeText(initials(item.name))}</div>
          <div class="customer-meta">
            <div class="customer-name">${safeText(item.name)}</div>
            <div class="customer-date">${safeText(formatDate(item.date))}</div>
          </div>
          <div class="customer-stars" aria-label="${Number(item.rating)} dari 5 bintang">${starText(item.rating)}</div>
        </div>
        <p class="testimonial-comment">${safeText(item.comment)}</p>
        <div class="testimonial-quote">”</div>
      </article>
    `).join('');
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
    list.innerHTML = '<div class="testimonial-empty"><strong>Memuat testimoni...</strong><span>Mengambil data asli dari Supabase.</span></div>';

    try {
      const client = getSupabaseClient();
      let query = client
        .from(tableName)
        .select('id, customer_name, rating, comment, created_at, is_approved')
        .order('created_at', { ascending: false });

      // Tampilkan hanya testimoni yang sudah approved kalau kolomnya tersedia.
      // Jika policy/table kamu tidak memakai approval, query fallback tetap jalan di bawah.
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
      list.innerHTML = '<div class="testimonial-empty"><strong>Testimoni belum bisa dimuat.</strong><span>Periksa konfigurasi Supabase, RLS policy, dan koneksi hosting.</span></div>';
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
