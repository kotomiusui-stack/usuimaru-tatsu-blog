// 臼井丸 釣果帖：data/posts.json を読み込んで一覧・絞り込み・釣れどき帖を描く
(function () {
  "use strict";
  const KANJI = "〇一二三四五六七八九";
  const WEEK = "日月火水木金土";
  const kn = (n) => {
    if (n < 10) return KANJI[n];
    const t = Math.floor(n / 10), o = n % 10;
    return (t > 1 ? KANJI[t] : "") + "十" + (o ? KANJI[o] : "");
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtKg = (v) => (v == null ? "" : (Math.round(v * 10) / 10).toString());
  const parts = (d) => { const [y, m, day] = d.split("-").map(Number); return { y, m, d: day, w: WEEK[new Date(y, m - 1, day).getDay()] }; };

  const state = { plan: "all", month: "all", slot: "all", fish: "", notices: false };
  let DATA = null;

  // 釣り物のまとめ方（絞り込みのボタン）
  const PLAN_GROUPS = [
    { key: "マダイ", label: "マダイ", match: (p) => p === "マダイ" },
    { key: "ヒラメ", label: "ヒラメ・ハタ", match: (p) => p === "ヒラメ" || p === "ハタ・ヒラメ" },
    { key: "根魚", label: "根魚五目", match: (p) => p === "根魚五目" },
    { key: "イサキ", label: "イサキ・シマアジ", match: (p) => p && p.includes("イサキ") },
  ];

  function fishOf(post) {
    const s = new Set(post.catches.map((c) => c.fish));
    post.others.forEach((f) => s.add(f));
    return [...s];
  }

  function seals(post) {
    const out = [];
    const maxCount = Math.max(0, ...post.catches.map((c) => c.max ?? 0));
    const maxKg = Math.max(0, ...post.catches.map((c) => c.maxKg ?? 0));
    if (maxKg >= 2.5 || /大ダイ|中ダイ/.test(post.title + post.note)) out.push("大物");
    if (maxCount >= 10 || /爆|好調|喰い良く|アタリ良く/.test(post.title + post.note)) out.push("大漁");
    if (/全員/.test(post.title + post.note)) out.push("全員<br>安打");
    return out.slice(0, 2);
  }

  function catchLine(c) {
    const n = c.min != null && c.max != null ? `${c.min}〜${c.max}枚` : c.max != null ? `トップ${c.max}枚` : "";
    const kg = c.minKg != null && c.maxKg != null ? `${fmtKg(c.minKg)}〜${fmtKg(c.maxKg)}kg` : c.maxKg != null ? `最大${fmtKg(c.maxKg)}kg` : "";
    return `<li><span class="f">${esc(c.fish)}</span><span class="num">${n}</span><span class="num">${kg}</span></li>`;
  }

  function photo(src, label, n) {
    return `<div class="photo">${src ? `<img src="${esc(src)}" alt="${esc(label)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}<span class="ph" aria-hidden="true">写真</span>${n ? `<span class="n">全${n}枚</span>` : ""}</div>`;
  }

  function dateCol(post) {
    const p = parts(post.date);
    return `<div class="date" aria-label="${p.m}月${p.d}日"><span>${kn(p.m)}月${kn(p.d)}日</span><small>${p.w}曜</small></div>`;
  }

  function entryHTML(post) {
    if (post.kind === "notice") {
      return `<article class="entry notice">${dateCol(post)}
        <div class="body"><div class="tags">${post.cancelled ? '<span class="kesson">欠航</span>' : ""}<span class="est">お知らせ・${post.time}</span></div>
        <h3>${esc(post.title)}</h3><p class="note">${esc(post.note)}</p>
        <div class="actions"><a href="${esc(post.url)}" target="_blank" rel="noopener">元の記事を読む</a></div></div></article>`;
    }
    const slot = post.slot ? `<span class="slot ${post.slot === "午前" ? "am" : "pm"}">${post.slot}</span>` : "";
    const plan = post.plan ? `<span class="plan">${esc(post.plan)}</span>${post.planEstimated ? '<span class="est">（推定）</span>' : ""}` : "";
    const sl = seals(post).map((s) => `<span class="seal">${s}</span>`).join("");
    const extra = post.images.length > 1
      ? `<details class="gallery"><summary>写真をみる（${post.images.length}枚）</summary><div class="gallery-grid">${post.images.map((s, i) => photo(s, `${post.title} 写真${i + 1}`)).join("")}</div></details>`
      : "";
    return `<article class="entry ${post.kind === "event" ? "event" : ""}">${dateCol(post)}
      <div class="photo-wrap">${photo(post.images[0], post.title, post.imageCount)}</div>
      <div class="body">
        <div class="tags">${slot}${plan}${post.kind === "event" ? '<span class="est">大会</span>' : ""}</div>
        <h3>${esc(post.title)}</h3>
        ${post.catches.length ? `<ul class="catch">${post.catches.map(catchLine).join("")}</ul>` : ""}
        ${post.others.length ? `<p class="others">${post.others.map((f) => `<span>${esc(f)}</span>`).join("")}</p>` : ""}
        <p class="note">${esc(post.note)}</p>
        ${sl ? `<div class="seals">${sl}</div>` : ""}
        <div class="actions">${extra}<a href="${esc(post.url)}" target="_blank" rel="noopener">元の記事を読む</a></div>
      </div></article>`;
  }

  function filtered() {
    return DATA.posts.filter((p) => {
      if (p.kind === "notice" && !state.notices) return false;
      if (state.month !== "all" && Number(p.date.slice(5, 7)) !== Number(state.month)) return false;
      if (state.slot !== "all" && p.slot !== state.slot) return false;
      if (state.plan !== "all") {
        const g = PLAN_GROUPS.find((x) => x.key === state.plan);
        if (!g || !g.match(p.plan)) return false;
      }
      if (state.fish && !fishOf(p).includes(state.fish)) return false;
      return true;
    });
  }

  function renderLog() {
    const list = filtered();
    document.getElementById("count").innerHTML = `<b class="num">${list.length}</b> 件`;
    document.getElementById("log").innerHTML = list.length
      ? list.map(entryHTML).join("")
      : `<p class="empty">この条件の記録はありません</p>`;
  }

  function chipRow(id, items, key) {
    const el = document.getElementById(id);
    el.innerHTML = items.map(([v, l]) => `<button type="button" class="chip" data-k="${key}" data-v="${esc(v)}" aria-pressed="${String(state[key]) === String(v)}">${l}</button>`).join("");
  }

  function renderFilters() {
    chipRow("f-plan", [["all", "すべて"], ...PLAN_GROUPS.map((g) => [g.key, g.label])], "plan");
    const months = [...new Set(DATA.posts.map((p) => Number(p.date.slice(5, 7))))].sort((a, b) => a - b);
    chipRow("f-month", [["all", "すべて"], ...months.map((m) => [m, `${kn(m)}月`])], "month");
    chipRow("f-slot", [["all", "両方"], ["午前", "午前"], ["午後", "午後"]], "slot");
    const sel = document.getElementById("f-fish");
    const counts = fishCounts();
    sel.innerHTML = `<option value="">魚で探す</option>` + counts.map(([f, n]) => `<option value="${esc(f)}"${state.fish === f ? " selected" : ""}>${esc(f)}（${n}）</option>`).join("");
    document.getElementById("f-notice").checked = state.notices;
  }

  function fishCounts() {
    const m = new Map();
    DATA.posts.filter((p) => p.kind !== "notice").forEach((p) => fishOf(p).forEach((f) => m.set(f, (m.get(f) || 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"));
  }

  function renderIndex() {
    document.getElementById("index").innerHTML = fishCounts()
      .map(([f, n]) => `<button type="button" data-fish="${esc(f)}">${esc(f)}<sup class="num">${n}</sup></button>`).join("");
  }

  // 月ごとの棒（墨の短冊）。最大の月だけ朱で示す
  function bars(rows, unit) {
    const W = 220, H = 92, base = 70, top = 18, bw = 34;
    const max = Math.max(...rows.map((r) => r.v ?? 0), 1);
    const step = W / rows.length;
    const best = rows.reduce((a, r) => ((r.v ?? -1) > (a.v ?? -1) ? r : a), rows[0]);
    const g = rows.map((r, i) => {
      const x = i * step + (step - bw) / 2;
      const h = r.v ? ((base - top) * r.v) / max : 0;
      return `${r.v ? `<rect class="bar${r === best ? " top" : ""}" x="${x}" y="${base - h}" width="${bw}" height="${h}"></rect>
        <text class="val" x="${x + bw / 2}" y="${base - h - 5}" text-anchor="middle">${r.v}${unit}</text>` : `<text x="${x + bw / 2}" y="${base - 5}" text-anchor="middle">記録なし</text>`}
        <text x="${x + bw / 2}" y="${base + 16}" text-anchor="middle">${kn(r.m)}月</text>`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="月別の推移">${g}<line class="base" x1="0" x2="${W}" y1="${base}" y2="${base}"></line></svg>`;
  }

  function renderSeason() {
    const months = [...new Set(DATA.posts.map((p) => Number(p.date.slice(5, 7))))].sort((a, b) => a - b);
    const trips = DATA.posts.filter((p) => p.kind === "catch");
    const col = (title, ruby, group, fish, mode) => {
      const ps = trips.filter((p) => group.match(p.plan));
      const cs = ps.flatMap((p) => p.catches.filter((c) => c.fish === fish).map((c) => ({ ...c, m: Number(p.date.slice(5, 7)) })));
      const rows = months.map((m) => {
        const mc = cs.filter((c) => c.m === m);
        const v = mode === "kg" ? Math.max(0, ...mc.map((c) => c.maxKg ?? 0)) : Math.max(0, ...mc.map((c) => c.max ?? 0));
        return { m, v: v ? (mode === "kg" ? Math.round(v * 10) / 10 : v) : 0 };
      });
      const maxKg = Math.max(0, ...cs.map((c) => c.maxKg ?? 0));
      const maxN = Math.max(0, ...cs.map((c) => c.max ?? 0));
      return `<div class="season-col"><h3><ruby>${title}<rt>${ruby}</rt></ruby></h3>
        <p class="facts">出船記録 <b class="num">${ps.length}</b> 回　トップ <b class="num">${maxN || "—"}</b>${maxN ? "枚" : ""}　最大 <b class="num">${maxKg ? fmtKg(maxKg) : "—"}</b>${maxKg ? "kg" : ""}</p>
        <div class="bars">${bars(rows, mode === "kg" ? "kg" : "枚")}</div>
        <p class="season-note">${mode === "kg" ? "月ごとの最大重量" : "月ごとのトップ枚数"}</p></div>`;
    };
    const neg = trips.filter((p) => p.plan === "根魚五目");
    const nf = new Map();
    neg.forEach((p) => fishOf(p).forEach((f) => nf.set(f, (nf.get(f) || 0) + 1)));
    const topN = [...nf.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const negRows = months.map((m) => ({ m, v: neg.filter((p) => Number(p.date.slice(5, 7)) === m).length }));
    document.getElementById("season").innerHTML =
      col("真鯛", "マダイ", PLAN_GROUPS[0], "マダイ", "count") +
      col("平目", "ヒラメ", PLAN_GROUPS[1], "ヒラメ", "kg") +
      `<div class="season-col"><h3><ruby>根魚五目<rt>ねざかなごもく</rt></ruby></h3>
        <p class="facts">よく釣れた魚　${topN.map(([f, n]) => `<b>${esc(f)}</b><span class="num">${n}</span>`).join("　")}</p>
        <div class="bars">${bars(negRows, "回")}</div>
        <p class="season-note">月ごとの出船記録の数（10月からは午前がヒラメ船に）</p></div>`;
  }

  function renderCover() {
    const [s, e] = DATA.period.map(parts);
    document.getElementById("period").textContent = `${kn(s.m)}月〜${kn(e.m)}月の記録`;
    const latest = DATA.posts.find((p) => p.kind === "notice");
    if (latest) {
      const p = parts(latest.date);
      document.getElementById("latest").innerHTML = `<span class="label">お知らせ</span><p>${esc(latest.note)}</p>
        <p class="when">${p.m}月${p.d}日（${p.w}）の記事より　<a href="${esc(latest.url)}" target="_blank" rel="noopener">元の記事</a></p>`;
    }
    const u = parts(DATA.updated);
    document.getElementById("updated").textContent = `${u.y}年${u.m}月${u.d}日`;
  }

  function bind() {
    document.addEventListener("click", (ev) => {
      const chip = ev.target.closest(".chip");
      if (chip) { state[chip.dataset.k] = chip.dataset.v; renderFilters(); renderLog(); return; }
      const fb = ev.target.closest("[data-fish]");
      if (fb) {
        state.fish = fb.dataset.fish; renderFilters(); renderLog();
        document.getElementById("kiroku").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    document.getElementById("f-fish").addEventListener("change", (e) => { state.fish = e.target.value; renderLog(); });
    document.getElementById("f-notice").addEventListener("change", (e) => { state.notices = e.target.checked; renderLog(); });
  }

  async function load() {
    if (window.USUIMARU_DATA) return window.USUIMARU_DATA;
    const r = await fetch("data/posts.json", { cache: "no-cache" });
    if (!r.ok) throw new Error("data");
    return r.json();
  }

  load().then((d) => {
    DATA = d;
    renderCover(); renderSeason(); renderFilters(); renderIndex(); renderLog(); bind();
  }).catch(() => {
    document.getElementById("log").innerHTML = `<p class="empty">釣果データを読み込めませんでした。時間をおいて再読み込みしてください。</p>`;
  });
})();
