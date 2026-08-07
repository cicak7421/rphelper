/**
 * ══════════════════════════════════════════════════════════════
 * DATA HARGA RP ASSISTENCE — edit di sini, BUKAN di pricing.html
 * ══════════════════════════════════════════════════════════════
 * Ubah teks/angka di bawah lalu simpan file ini. pricing.html akan
 * otomatis render ulang paket & fiturnya, tidak perlu sentuh HTML/CSS.
 *
 * Struktur tiap paket:
 *   id        : pengenal unik (bebas, huruf kecil, tanpa spasi)
 *   emoji     : ikon di kartu
 *   name      : nama paket
 *   caption   : subjudul kecil di bawah nama
 *   price     : angka harga yang ditampilkan besar (contoh: "Rp0", "Rp10rb")
 *   priceColor: salah satu dari "gf" (abu netral) | "gi" (biru) | "gv" (ungu)
 *   period    : keterangan periode/harga kecil di bawah angka
 *   popular   : true untuk menampilkan label "Populer" (hanya 1 paket sebaiknya)
 *   cardStyle : "" (default) | "pop" (disorot) | "ent" (gaya enterprise/ungu)
 *   features  : daftar fitur. Tiap item:
 *       { text: "Nama fitur", note: "(catatan opsional)", included: true/false }
 *     - included:true  -> tanda centang hijau
 *     - included:false -> tanda strip (fitur belum termasuk di paket ini)
 *     - note bersifat opsional, tampil dengan warna lebih tegas
 *   cta       : tombol aksi di bawah kartu
 *       { text: "Teks tombol", href: "url atau file.html", style: "pb-o|pb-i|pb-v", newTab: true/false }
 */
window.RP_PRICING = {
  inviteUrl: "https://discord.com/oauth2/authorize?client_id=1503557882719768758&permissions=8&integration_type=0&scope=bot",

  plans: [
    {
      id: "starter",
      emoji: "🌱",
      name: "Starter",
      caption: "Gratis selamanya",
      price: "Rp0",
      priceColor: "gf",
      period: "/ bulan · tidak perlu kartu kredit",
      popular: false,
      cardStyle: "",
      features: [
        { text: "Ticket system", note: "(maks 3 panel)", included: true },
        { text: "Ticket Wizard, Status, Staffconfig", included: true },
        { text: "HR System (wizard, action, employee list)", included: true },
        { text: "Welcome & Goodbye wizard", included: true },
        { text: "AI Chat channel", included: true },
        { text: "SSRP Image Gen", note: "(3×/hari)", included: true },
        { text: "Ad Count", note: "(1 sesi aktif)", included: true },
        { text: "Giveaway", note: "(2/hari)", included: true },
        { text: "Embed", note: "(maks 5 total) · Announce (3/hari)", included: true },
        { text: "Server Stats, Forum, Name Change", included: true },
        { text: "Ads Wizard & Rekap Iklan", included: false },
        { text: "Payroll · Tax · Bank Virtual", included: false }
      ],
      cta: { text: "Invite Gratis", href: "__INVITE__", style: "pb-o", newTab: true }
    },
    {
      id: "professional",
      emoji: "⚡",
      name: "Professional",
      caption: "Untuk server aktif & tim bisnis",
      price: "Rp10rb",
      priceColor: "gi",
      period: "/ bulan per server",
      popular: true,
      cardStyle: "pop",
      features: [
        { text: "Semua fitur Starter", included: true, strong: true },
        { text: "Ticket panel", note: "(maks 6)", included: true },
        { text: "Ads Wizard & /adsrekap otomatis", included: true },
        { text: "SSRP Image Gen", note: "(6×/hari)", included: true },
        { text: "Ad Count", note: "(3 sesi aktif)", included: true },
        { text: "Giveaway", note: "(5/hari)", included: true },
        { text: "Embed", note: "(10/hari) · Announce (6/hari)", included: true },
        { text: "Embed warna custom", included: true },
        { text: "Prioritas support", included: true },
        { text: "Payroll · Tax · Bank Virtual", included: false }
      ],
      cta: { text: "Upgrade Sekarang", href: "contact.html", style: "pb-i", newTab: false }
    },
    {
      id: "enterprise",
      emoji: "💎",
      name: "Enterprise",
      caption: "Untuk komunitas & bisnis besar",
      price: "Rp15rb",
      priceColor: "gv",
      period: "/ bulan per server",
      popular: false,
      cardStyle: "ent",
      features: [
        { text: "Semua fitur Professional", included: true, strong: true },
        { text: "Ticket panel", note: "unlimited", included: true },
        { text: "Payroll otomatis + manual run", included: true },
        { text: "Tax Wizard (auto dari /accept, per divisi)", included: true },
        { text: "Bank Virtual (balance · withdraw · transfer)", included: true },
        { text: "SSRP Image Gen", note: "unlimited", included: true },
        { text: "Ad Count", note: "unlimited sesi", included: true },
        { text: "Giveaway", note: "(10/hari)", included: true },
        { text: "Embed & Announce", note: "unlimited", included: true },
        { text: "Dedicated support & onboarding", included: true }
      ],
      cta: { text: "Hubungi Kami", href: "contact.html", style: "pb-v", newTab: false }
    }
  ]
};
