// Render kartu harga di pricing.html.
// Sumber utama: API publik /api/pricing (data dari Supabase, diisi lewat admin.html).
// Fallback: window.RP_PRICING dari assets/js/pricing-data.js jika API belum ada isinya
// atau gagal diakses (misal saat develop lokal tanpa backend).
(function () {
  function el(tag, cls, html) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function renderFeature(feature) {
    const li = document.createElement("li");
    const mark = el("span", feature.included ? "pck" : "pxk", feature.included ? "✓" : "–");
    li.appendChild(mark);

    const label = document.createElement("span");
    label.className = feature.included ? "" : "pdim";
    if (feature.strong) label.classList.add("phl");
    label.textContent = feature.text + (feature.note ? " " : "");
    li.appendChild(label);

    if (feature.note) {
      const note = el("span", "phl", null);
      note.textContent = feature.note;
      li.appendChild(note);
    }
    return li;
  }

  function renderPlan(plan, inviteUrl) {
    const card = el("div", "pc ao" + (plan.cardStyle ? " " + plan.cardStyle : ""));

    if (plan.popular) card.appendChild(el("span", "ptag", "Populer"));

    card.appendChild(el("div", "pemo", plan.emoji));
    card.appendChild(el("div", "pname", plan.name));
    card.appendChild(el("div", "pcap", plan.caption));

    const amount = el("div", "pamount");
    amount.appendChild(el("span", "pnum " + plan.priceColor, plan.price));
    card.appendChild(amount);

    card.appendChild(el("div", "pper", plan.period));
    card.appendChild(el("div", "pdiv"));

    const list = el("ul", "plist");
    (plan.features || []).forEach((f) => list.appendChild(renderFeature(f)));
    card.appendChild(list);

    const href = plan.cta.href === "__INVITE__" ? inviteUrl : plan.cta.href;
    const cta = el("a", "pbt " + plan.cta.style, plan.cta.text);
    cta.setAttribute("href", href);
    if (plan.cta.newTab) {
      cta.setAttribute("target", "_blank");
      cta.setAttribute("rel", "noopener");
    }
    card.appendChild(cta);

    return card;
  }

  function paint(plans, inviteUrl) {
    const grid = document.getElementById("pricingGrid");
    if (!grid) return;
    grid.replaceChildren();
    plans.forEach((plan) => grid.appendChild(renderPlan(plan, inviteUrl)));

    if (window.requestAnimationFrame) {
      requestAnimationFrame(() => {
        grid.querySelectorAll(".ao").forEach((node, i) => {
          node.style.transitionDelay = (i % 8) * 45 + "ms";
          node.classList.add("vis");
        });
      });
    }
  }

  function normalizeRemotePlan(row) {
    return {
      id: row.plan_key || row.id,
      emoji: row.emoji || "",
      name: row.name,
      caption: row.caption || "",
      price: row.price,
      priceColor: row.price_color || "gf",
      period: row.period || "",
      popular: !!row.popular,
      cardStyle: row.card_style || "",
      features: Array.isArray(row.features) ? row.features : [],
      cta: {
        text: row.cta_text || "Pilih Paket",
        href: row.cta_href || "contact.html",
        style: row.cta_style || "pb-o",
        newTab: row.cta_href === "__INVITE__"
      }
    };
  }

  async function fetchRemotePlans() {
    const apiBase = (window.RP_ASSISTENCE_DASHBOARD_API || "https://rphelper.vercel.app").replace(/\/$/, "");
    const res = await fetch(apiBase + "/api/pricing");
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok || !Array.isArray(data.data) || !data.data.length) {
      throw new Error("Data harga dari server kosong.");
    }
    return data.data.map(normalizeRemotePlan);
  }

  async function init() {
    const grid = document.getElementById("pricingGrid");
    const local = window.RP_PRICING;
    if (!grid || !local) return;

    try {
      const remotePlans = await fetchRemotePlans();
      paint(remotePlans, local.inviteUrl);
    } catch (error) {
      console.warn("Pakai data harga lokal (fallback):", error.message);
      paint(local.plans, local.inviteUrl);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
