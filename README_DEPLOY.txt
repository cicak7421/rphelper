TicketForge Static Website — Deploy Ready
========================================

Isi folder:
- index.html          : Beranda
- features.html       : Halaman Fitur
- commands.html       : Halaman Commands + search/filter
- pricing.html        : Halaman Harga
- developers.html     : Halaman Developer
- contact.html        : Halaman Kontak
- assets/css/style.css
- assets/js/main.js
- robots.txt

Cara deploy paling mudah:
1. Extract ZIP ini.
2. Upload seluruh isi folder ke hosting static/public_html.
3. Pastikan file index.html berada di root hosting.
4. Buka domain kamu.

Bisa dipakai di:
- cPanel / public_html
- Netlify
- Vercel static
- Cloudflare Pages
- GitHub Pages

Catatan yang perlu diganti sebelum live:
- Link Invite Bot masih placeholder: https://discord.com/oauth2/authorize
- Link Discord Server masih placeholder: https://discord.gg/
- Link WhatsApp masih placeholder: https://wa.me/
- Nama developer dan link GitHub/Discord masih bisa disesuaikan.


UPDATE TESTIMONI
----------------
Halaman testimoni tersedia di testimonials.html.
Fitur yang aktif:
- Form nama customer
- Pilihan rating bintang 1 sampai 5
- Komentar customer
- Daftar testimoni otomatis tampil setelah submit
- Ringkasan rata-rata rating dan jumlah testimoni
- Filter testimoni berdasarkan rating

Catatan produksi:
Saat ini website bersifat static deploy. Testimoni yang diinput tersimpan di browser pengunjung menggunakan localStorage.
Agar testimoni dari semua customer masuk ke satu database dan tampil publik lintas device, sambungkan form ke backend seperti Supabase, Firebase, Formspree, atau endpoint API sendiri.
