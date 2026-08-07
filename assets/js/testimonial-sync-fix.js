// Fix testimonial submit sync after hosting/cache migration.
// Runs after main.js and overrides the old submit handler safely.
(function () {
  const form = document.getElementById('testimonialForm');
  if (!form) return;

  const message = document.getElementById('testimonialMessage');
  const counter = document.getElementById('commentCounter');

  function setMessage(text, type) {
    if (!message) return;
    message.textContent = text || '';
    message.classList.toggle('error', type === 'error');
  }

  function client() {
    const config = window.RP_ASSISTENCE_SUPABASE || {};
    if (!window.supabase || !window.supabase.createClient) throw new Error('Library Supabase belum termuat.');
    if (!config.url || !config.anonKey) throw new Error('Konfigurasi Supabase belum diisi.');
    return window.supabase.createClient(config.url, config.anonKey);
  }

  async function insertReview(sb, tableName, payload) {
    const first = await sb.from(tableName).insert([{ ...payload, is_approved: true }]);

    if (first.error && /is_approved|column|schema/i.test(first.error.message || '')) {
      const fallback = await sb.from(tableName).insert([payload]);
      if (fallback.error) throw fallback.error;
      return;
    }

    if (first.error) throw first.error;
  }

  form.addEventListener('submit', async function fixedSubmit(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const nameInput = document.getElementById('customerName');
    const ratingInput = document.getElementById('customerRating');
    const commentInput = document.getElementById('customerComment');
    const customer_name = nameInput ? nameInput.value.trim() : '';
    const rating = ratingInput ? Number(ratingInput.value || 5) : 5;
    const comment = commentInput ? commentInput.value.trim() : '';

    if (!customer_name || !comment) {
      setMessage('Nama dan komentar wajib diisi.', 'error');
      return;
    }

    if (comment.length > 280) {
      setMessage('Komentar maksimal 280 karakter.', 'error');
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Mengirim...';
    }

    try {
      const config = window.RP_ASSISTENCE_SUPABASE || {};
      await insertReview(client(), config.table || 'testimonials', { customer_name, rating, comment });
      form.reset();
      if (counter) counter.textContent = '0';
      setMessage('Terima kasih! Testimoni berhasil dikirim dan ditampilkan.', 'success');
      window.setTimeout(() => window.location.reload(), 650);
    } catch (error) {
      console.error(error);
      setMessage('Gagal mengirim testimoni. Periksa Supabase RLS policy dan koneksi.', 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Kirim Testimoni';
      }
    }
  }, true);
})();
