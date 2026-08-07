// RP Assistence — Admin: Kelola Harga Paket
// Reuses the same admin session (sessionStorage) established by changelog.js login.
(function () {
  const form = document.getElementById('pricingForm');
  if (!form) return;

  const ADMIN_AUTH_KEY = 'rp_assistence_admin_auth';
  const apiBase = (window.RP_ASSISTENCE_DASHBOARD_API || 'https://rphelper.vercel.app').replace(/\/$/, '');

  const listEl = document.getElementById('adminPricingList');
  const quickListEl = document.getElementById('quickPriceList');
  const messageEl = document.getElementById('pricingMessage');
  const resetBtn = document.getElementById('pricingFormReset');
  const refreshBtn = document.getElementById('refreshPricingList');
  const refreshQuickBtn = document.getElementById('refreshQuickPrice');
  const recordIdInput = document.getElementById('pkgRecordId');
  const featureRowsEl = document.getElementById('pkgFeatureRows');
  const featureAddBtn = document.getElementById('pkgFeatureAdd');

  function adminAuth() { return sessionStorage.getItem(ADMIN_AUTH_KEY) || ''; }

  function setMessage(text, type) {
    if (!messageEl) return;
    messageEl.textContent = text || '';
    messageEl.classList.remove('error', 'success');
    if (type) messageEl.classList.add(type);
  }

  async function adminApi(method, body, query) {
    const url = apiBase + '/api/admin/pricing' + (query || '');
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Admin-Auth': adminAuth() },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || ('Admin API gagal. HTTP ' + res.status));
    return data;
  }

  // ── Feature row builder (replaces the old "text | note | 1" textarea format) ──

  function makeFeatureRow(feature) {
    const f = feature || { text: '', note: '', included: true, strong: false };
    const row = document.createElement('div');
    row.className = 'feat-row';

    const text = document.createElement('input');
    text.type = 'text'; text.className = 'feat-text'; text.placeholder = 'Contoh: Ticket system';
    text.value = f.text || '';

    const note = document.createElement('input');
    note.type = 'text'; note.className = 'feat-note'; note.placeholder = 'Contoh: maks 3 panel';
    note.value = f.note || '';

    const includedWrap = document.createElement('label');
    includedWrap.className = 'feat-chk'; includedWrap.setAttribute('data-label', 'Termasuk: ');
    const included = document.createElement('input');
    included.type = 'checkbox'; included.className = 'feat-included';
    included.checked = f.included !== false;
    includedWrap.appendChild(included);

    const strongWrap = document.createElement('label');
    strongWrap.className = 'feat-chk'; strongWrap.setAttribute('data-label', 'Tebal: ');
    const strong = document.createElement('input');
    strong.type = 'checkbox'; strong.className = 'feat-strong';
    strong.checked = !!f.strong;
    strongWrap.appendChild(strong);

    const actions = document.createElement('div');
    actions.className = 'feat-row-actions';
    const upBtn = document.createElement('button');
    upBtn.type = 'button'; upBtn.title = 'Naik'; upBtn.textContent = '↑';
    upBtn.addEventListener('click', () => {
      const prev = row.previousElementSibling;
      if (prev) { featureRowsEl.insertBefore(row, prev); updatePreview(); }
    });
    const downBtn = document.createElement('button');
    downBtn.type = 'button'; downBtn.title = 'Turun'; downBtn.textContent = '↓';
    downBtn.addEventListener('click', () => {
      const next = row.nextElementSibling;
      if (next) { featureRowsEl.insertBefore(next, row); updatePreview(); }
    });
    const delBtn = document.createElement('button');
    delBtn.type = 'button'; delBtn.title = 'Hapus fitur ini'; delBtn.className = 'feat-del'; delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => { row.remove(); updatePreview(); });

    actions.append(upBtn, downBtn, delBtn);
    row.append(text, note, includedWrap, strongWrap, actions);

    row.addEventListener('input', updatePreview);
    row.addEventListener('change', updatePreview);
    return row;
  }

  function addFeatureRow(feature) {
    const row = makeFeatureRow(feature);
    featureRowsEl.appendChild(row);
    updatePreview();
    return row;
  }

  function setFeatureRows(features) {
    featureRowsEl.replaceChildren();
    const list = Array.isArray(features) ? features : [];
    if (!list.length) {
      addFeatureRow();
      return;
    }
    list.forEach(f => addFeatureRow(f));
  }

  function getFeaturesFromRows() {
    return Array.from(featureRowsEl.querySelectorAll('.feat-row'))
      .map(row => {
        const text = row.querySelector('.feat-text').value.trim();
        const note = row.querySelector('.feat-note').value.trim();
        const included = row.querySelector('.feat-included').checked;
        const strong = row.querySelector('.feat-strong').checked;
        if (!text) return null;
        const feature = { text, included };
        if (note) feature.note = note;
        if (strong) feature.strong = true;
        return feature;
      })
      .filter(Boolean);
  }

  if (featureAddBtn) featureAddBtn.addEventListener('click', () => addFeatureRow());

  // ── Live preview card (mirrors assets/js/pricing-render.js) ──

  const pv = {
    name: document.getElementById('pvName'),
    caption: document.getElementById('pvCaption'),
    price: document.getElementById('pvPrice'),
    period: document.getElementById('pvPeriod'),
    features: document.getElementById('pvFeatures'),
    cta: document.getElementById('pvCta'),
    card: document.getElementById('pkgPreviewCard')
  };

  function updatePreview() {
    if (!pv.card) return;
    const name = document.getElementById('pkgName').value.trim() || 'Nama Paket';
    const caption = document.getElementById('pkgCaption').value.trim() || 'Caption paket';
    const price = document.getElementById('pkgPrice').value.trim() || 'Rp0';
    const priceColor = document.getElementById('pkgPriceColor').value || 'gf';
    const period = document.getElementById('pkgPeriod').value.trim() || '/ bulan';
    const cardStyle = document.getElementById('pkgCardStyle').value || '';
    const popular = document.getElementById('pkgPopular').value === 'true';
    const ctaText = document.getElementById('pkgCtaText').value.trim() || 'Pilih Paket';
    const ctaStyle = document.getElementById('pkgCtaStyle').value || 'pb-o';

    pv.card.className = 'pc ao vis' + (cardStyle ? ' ' + cardStyle : '');
    pv.card.querySelectorAll('.ptag').forEach(t => t.remove());
    if (popular) {
      const tag = document.createElement('span');
      tag.className = 'ptag'; tag.textContent = 'Populer';
      pv.card.insertBefore(tag, pv.card.firstChild);
    }

    pv.name.textContent = name;
    pv.caption.textContent = caption;
    pv.price.textContent = price;
    pv.price.className = 'pnum ' + priceColor;
    pv.period.textContent = period;

    pv.features.replaceChildren();
    getFeaturesFromRows().forEach(f => {
      const li = document.createElement('li');
      const mark = document.createElement('span');
      mark.className = f.included ? 'pck' : 'pxk';
      mark.textContent = f.included ? '✓' : '–';
      li.appendChild(mark);
      const label = document.createElement('span');
      label.className = (f.included ? '' : 'pdim') + (f.strong ? ' phl' : '');
      label.textContent = f.text + (f.note ? ' ' : '');
      li.appendChild(label);
      if (f.note) {
        const note = document.createElement('span');
        note.className = 'phl'; note.textContent = f.note;
        li.appendChild(note);
      }
      pv.features.appendChild(li);
    });
    if (!pv.features.children.length) {
      const li = document.createElement('li');
      li.textContent = 'Belum ada fitur ditambahkan.';
      li.style.color = 'var(--muted)';
      pv.features.appendChild(li);
    }

    pv.cta.textContent = ctaText;
    pv.cta.className = 'pbt ' + ctaStyle;
  }

  form.addEventListener('input', updatePreview);
  form.addEventListener('change', updatePreview);

  // ── Full form (create/edit/delete a plan) ──

  function resetForm() {
    form.reset();
    recordIdInput.value = '';
    document.getElementById('pkgId').readOnly = false;
    setFeatureRows([]);
    setMessage('');
    updatePreview();
  }

  function fillForm(plan) {
    recordIdInput.value = plan.id;
    document.getElementById('pkgId').value = plan.plan_key || '';
    document.getElementById('pkgId').readOnly = true;
    document.getElementById('pkgEmoji').value = plan.emoji || '';
    document.getElementById('pkgSort').value = plan.sort_order || 0;
    document.getElementById('pkgName').value = plan.name || '';
    document.getElementById('pkgCaption').value = plan.caption || '';
    document.getElementById('pkgPrice').value = plan.price || '';
    document.getElementById('pkgPriceColor').value = plan.price_color || 'gf';
    document.getElementById('pkgPeriod').value = plan.period || '';
    document.getElementById('pkgCardStyle').value = plan.card_style || '';
    document.getElementById('pkgPopular').value = plan.popular ? 'true' : 'false';
    document.getElementById('pkgActive').value = plan.active === false ? 'false' : 'true';
    setFeatureRows(plan.features);
    document.getElementById('pkgCtaText').value = plan.cta_text || '';
    document.getElementById('pkgCtaHref').value = plan.cta_href || '';
    document.getElementById('pkgCtaStyle').value = plan.cta_style || 'pb-o';
    setMessage('Mengedit paket "' + (plan.name || plan.plan_key) + '". Simpan untuk memperbarui.', 'success');
    updatePreview();
    const editorPanel = document.getElementById('adminPricingEditorPanel');
    if (editorPanel) editorPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function renderList() {
    if (!listEl) return;
    listEl.innerHTML = '<p class="admin-small">Memuat paket harga...</p>';
    if (quickListEl) quickListEl.innerHTML = '<p class="admin-small">Memuat paket...</p>';
    try {
      const result = await adminApi('GET');
      const plans = result.data || [];
      renderQuickPriceList(plans);

      if (!plans.length) {
        listEl.innerHTML = '<p class="admin-small">Belum ada paket tersimpan di database. Isi form di atas untuk menambahkan.</p>';
        return;
      }
      listEl.replaceChildren();
      plans.forEach(plan => {
        const item = document.createElement('article');
        item.className = 'admin-log-item';
        const top = document.createElement('div');
        top.className = 'admin-log-top';
        const wrap = document.createElement('div');
        const title = document.createElement('h3');
        const meta = document.createElement('div');
        const summary = document.createElement('p');
        const actions = document.createElement('div');
        actions.className = 'admin-actions';
        const editBtn = document.createElement('button');
        const delBtn = document.createElement('button');

        title.textContent = (plan.emoji ? plan.emoji + ' ' : '') + (plan.name || plan.plan_key);
        meta.className = 'admin-small';
        meta.textContent = plan.plan_key + ' · ' + plan.price + (plan.period ? ' ' + plan.period : '') + (plan.active === false ? ' · disembunyikan' : '');
        summary.textContent = plan.caption || 'Tanpa caption.';
        editBtn.type = 'button'; editBtn.className = 'btngh'; editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => fillForm(plan));
        delBtn.type = 'button'; delBtn.className = 'danger-btn'; delBtn.textContent = 'Hapus';
        delBtn.addEventListener('click', () => deletePlan(plan));

        actions.append(editBtn, delBtn);
        wrap.append(title, meta);
        top.append(wrap, actions);
        item.append(top, summary);
        listEl.appendChild(item);
      });
    } catch (error) {
      console.error(error);
      listEl.innerHTML = '<p class="admin-message error">Gagal memuat paket: ' + error.message + '</p>';
      if (quickListEl) quickListEl.innerHTML = '<p class="admin-message error">Gagal memuat paket: ' + error.message + '</p>';
    }
  }

  // ── Quick price update: change just the price field of an existing plan ──

  function renderQuickPriceList(plans) {
    if (!quickListEl) return;
    if (!plans.length) {
      quickListEl.innerHTML = '<p class="admin-small">Belum ada paket tersimpan. Tambahkan paket lewat form "Kelola Paket & Fitur" di bawah dulu.</p>';
      return;
    }
    quickListEl.replaceChildren();
    plans.forEach(plan => {
      const item = document.createElement('div');
      item.className = 'quick-price-item';

      const nameWrap = document.createElement('div');
      nameWrap.className = 'qp-name';
      const b = document.createElement('b');
      b.textContent = (plan.emoji ? plan.emoji + ' ' : '') + (plan.name || plan.plan_key);
      const span = document.createElement('span');
      span.textContent = plan.plan_key + (plan.active === false ? ' · disembunyikan' : '');
      nameWrap.append(b, span);

      const inputWrap = document.createElement('div');
      inputWrap.className = 'qp-input-wrap';
      const input = document.createElement('input');
      input.type = 'text'; input.value = plan.price || '';
      const periodSpan = document.createElement('span');
      periodSpan.textContent = plan.period || '';
      inputWrap.append(input, periodSpan);

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button'; saveBtn.className = 'qp-save'; saveBtn.textContent = 'Simpan Harga';

      saveBtn.addEventListener('click', async () => {
        const newPrice = input.value.trim();
        if (!newPrice) { input.focus(); return; }
        saveBtn.disabled = true;
        saveBtn.textContent = 'Menyimpan...';
        saveBtn.classList.remove('saved');
        try {
          const payload = Object.assign({}, plan, { price: newPrice });
          await adminApi('PUT', payload, '?id=' + encodeURIComponent(plan.id));
          plan.price = newPrice;
          saveBtn.textContent = 'Tersimpan ✓';
          saveBtn.classList.add('saved');
          setTimeout(() => { saveBtn.textContent = 'Simpan Harga'; saveBtn.classList.remove('saved'); saveBtn.disabled = false; }, 1600);
          await renderList();
        } catch (error) {
          console.error(error);
          saveBtn.disabled = false;
          saveBtn.textContent = 'Gagal, coba lagi';
        }
      });

      item.append(nameWrap, inputWrap, saveBtn);
      quickListEl.appendChild(item);
    });
  }

  async function deletePlan(plan) {
    const ok = confirm('Hapus paket ini?\n\n' + (plan.name || plan.plan_key));
    if (!ok) return;
    try {
      setMessage('Menghapus paket...', 'success');
      await adminApi('DELETE', null, '?id=' + encodeURIComponent(plan.id));
      setMessage('Paket berhasil dihapus.', 'success');
      resetForm();
      await renderList();
    } catch (error) {
      console.error(error);
      setMessage('Gagal menghapus: ' + error.message, 'error');
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const id = recordIdInput.value;
    const payload = {
      plan_key: document.getElementById('pkgId').value.trim(),
      emoji: document.getElementById('pkgEmoji').value.trim(),
      sort_order: Number(document.getElementById('pkgSort').value || 0),
      name: document.getElementById('pkgName').value.trim(),
      caption: document.getElementById('pkgCaption').value.trim(),
      price: document.getElementById('pkgPrice').value.trim(),
      price_color: document.getElementById('pkgPriceColor').value,
      period: document.getElementById('pkgPeriod').value.trim(),
      card_style: document.getElementById('pkgCardStyle').value,
      popular: document.getElementById('pkgPopular').value === 'true',
      active: document.getElementById('pkgActive').value !== 'false',
      features: getFeaturesFromRows(),
      cta_text: document.getElementById('pkgCtaText').value.trim(),
      cta_href: document.getElementById('pkgCtaHref').value.trim(),
      cta_style: document.getElementById('pkgCtaStyle').value
    };

    if (!payload.plan_key || !payload.name || !payload.price) {
      setMessage('ID paket, nama, dan harga wajib diisi.', 'error');
      return;
    }

    const submitBtn = document.getElementById('submitPricing');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Menyimpan...'; }

    try {
      if (id) {
        await adminApi('PUT', payload, '?id=' + encodeURIComponent(id));
        setMessage('Paket berhasil diperbarui.', 'success');
      } else {
        await adminApi('POST', payload);
        setMessage('Paket baru berhasil disimpan.', 'success');
      }
      resetForm();
      await renderList();
    } catch (error) {
      console.error(error);
      setMessage('Gagal menyimpan: ' + error.message, 'error');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Simpan Paket'; }
    }
  });

  if (resetBtn) resetBtn.addEventListener('click', resetForm);
  if (refreshBtn) refreshBtn.addEventListener('click', renderList);
  if (refreshQuickBtn) refreshQuickBtn.addEventListener('click', renderList);

  setFeatureRows([]);
  updatePreview();

  let loaded = false;
  function activate() {
    if (loaded) return;
    loaded = true;
    renderList();
  }

  document.addEventListener('rp-admin-auth', event => {
    if (event.detail && event.detail.active) activate();
    else loaded = false;
  });

  // Catch the case where changelog.js already ran (and dispatched the event)
  // before this script attached its listener.
  if (adminAuth()) activate();
})();
