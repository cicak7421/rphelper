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


// TicketForge testimonials interactions
(function () {
  const form = document.getElementById('testimonialForm');
  const list = document.getElementById('testimonialList');
  if (!form || !list) return;

  const storageKey = 'ticketforge_testimonials_v1';
  const seedReviews = [
    { name: 'Arkana Enterprise', rating: 5, comment: 'Ticket system dan HR wizard-nya sangat membantu operasional server. Setup jadi lebih cepat dan staff lebih mudah tracking laporan.', date: '2026-06-10' },
    { name: 'Jogja Roleplay', rating: 5, comment: 'Fitur SSRP AI dan ad count bikin workflow komunitas jauh lebih rapi. Cocok untuk server RP yang butuh bot serba bisa.', date: '2026-06-08' },
    { name: 'Nusantara Community', rating: 4, comment: 'Panel ticket mudah dipakai, command jelas, dan harga paketnya masuk akal untuk komunitas aktif.', date: '2026-06-05' }
  ];

  let activeReviewFilter = 'all';

  function safeText(value) {
    return String(value || '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function getReviews() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (Array.isArray(stored)) return stored;
    } catch (error) {}
    return seedReviews;
  }

  function saveReviews(reviews) {
    localStorage.setItem(storageKey, JSON.stringify(reviews));
  }

  function starText(rating) {
    const value = Math.max(1, Math.min(5, Number(rating) || 5));
    return '★★★★★'.slice(0, value) + '☆☆☆☆☆'.slice(0, 5 - value);
  }

  function initials(name) {
    return String(name || 'C').trim().split(/\s+/).slice(0, 2).map(word => word[0] || '').join('').toUpperCase() || 'C';
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || '';
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function renderSummary(reviews) {
    const avgEl = document.getElementById('avgRating');
    const starsEl = document.getElementById('avgStars');
    const countEl = document.getElementById('reviewCount');
    const barsEl = document.getElementById('ratingBars');
    const total = reviews.length;
    const average = total ? reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / total : 0;
    if (avgEl) avgEl.textContent = average.toFixed(1);
    if (starsEl) starsEl.textContent = total ? starText(Math.round(average)) : '☆☆☆☆☆';
    if (countEl) countEl.textContent = total;
    if (barsEl) {
      barsEl.innerHTML = [5,4,3,2,1].map(star => {
        const count = reviews.filter(item => Number(item.rating) === star).length;
        const percent = total ? Math.round((count / total) * 100) : 0;
        return `<div class="rating-bar-row"><span>${star}★</span><div class="rating-bar-track"><span class="rating-bar-fill" style="width:${percent}%"></span></div><span>${count}</span></div>`;
      }).join('');
    }
  }

  function renderReviews() {
    const reviews = getReviews();
    renderSummary(reviews);
    const filtered = activeReviewFilter === 'all' ? reviews : reviews.filter(item => String(item.rating) === activeReviewFilter);

    if (!filtered.length) {
      list.innerHTML = '<div class="testimonial-empty"><strong>Belum ada testimoni untuk filter ini.</strong><span>Coba pilih filter lain atau isi testimoni baru.</span></div>';
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

  const comment = document.getElementById('customerComment');
  const counter = document.getElementById('commentCounter');
  const message = document.getElementById('testimonialMessage');

  if (comment && counter) {
    const updateCounter = () => { counter.textContent = String(comment.value.length); };
    comment.addEventListener('input', updateCounter);
    updateCounter();
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const name = document.getElementById('customerName').value.trim();
    const rating = Number(document.getElementById('customerRating').value || 5);
    const reviewComment = document.getElementById('customerComment').value.trim();

    if (!name || !reviewComment) {
      if (message) {
        message.textContent = 'Nama dan komentar wajib diisi.';
        message.classList.add('error');
      }
      return;
    }

    const reviews = getReviews();
    reviews.unshift({ name, rating, comment: reviewComment, date: new Date().toISOString() });
    saveReviews(reviews);
    form.reset();
    if (counter) counter.textContent = '0';
    if (message) {
      message.textContent = 'Terima kasih! Testimoni berhasil ditambahkan.';
      message.classList.remove('error');
    }
    activeReviewFilter = 'all';
    document.querySelectorAll('.review-filter').forEach(button => button.classList.remove('active-all', 'active-rating'));
    const allButton = document.querySelector('.review-filter[data-review-filter="all"]');
    if (allButton) allButton.classList.add('active-all');
    renderReviews();
  });

  document.querySelectorAll('.review-filter').forEach(button => {
    button.addEventListener('click', () => {
      activeReviewFilter = button.dataset.reviewFilter || 'all';
      document.querySelectorAll('.review-filter').forEach(item => item.classList.remove('active-all', 'active-rating'));
      button.classList.add(activeReviewFilter === 'all' ? 'active-all' : 'active-rating');
      renderReviews();
    });
  });

  const clearButton = document.getElementById('clearTestimonials');
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      localStorage.removeItem(storageKey);
      if (message) {
        message.textContent = 'Data demo dikembalikan ke testimoni bawaan.';
        message.classList.remove('error');
      }
      renderReviews();
    });
  }

  renderReviews();
})();
