// 臼井丸 釣果帖：data/posts.json を読み込んで一覧・絞り込み・釣れどき帖を描く
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

  // 絵グラフ：釣れた数だけ魚の絵を積む（1つ＝unit）。いちばん多い月の数字は朱で
  function bars(rows, unit, kind) {
    const sym = { tai: "f-tai", hirame: "f-hirame", kasago: "f-kasago" }[kind] || "f-tai";
    const max = Math.max(...rows.map((r) => r.v ?? 0), 0);
    const per = max > 24 ? Math.ceil(max / 20) : 1;          // 多すぎる時は1つの絵で何枚分かにまとめる
    const units = max / per;
    const perRow = units <= 4 ? 1 : units <= 12 ? 3 : 4;
    const w = perRow === 1 ? "72%" : `${100 / perRow}%`;
    const best = rows.reduce((a, r) => ((r.v ?? -1) > (a.v ?? -1) ? r : a), rows[0]);
    const one = (f) => `<span class="ico${f < 1 ? " part" : ""}"${f < 1 ? ` style="--f:${f.toFixed(2)}"` : ""}><svg viewBox="0 0 100 50" aria-hidden="true"><use href="#${sym}"></use></svg></span>`;
    const cols = rows.map((r) => {
      if (!r.v) return `<div class="pm"><span class="nodata">記録なし</span></div>`;
      const n = r.v / per, whole = Math.floor(n), frac = n - whole;
      const icons = Array.from({ length: whole }, () => one(1)).join("") + (frac >= 0.1 ? one(frac) : "");
      return `<div class="pm${r === best && rows.filter((q) => q.v === r.v).length === 1 ? " top" : ""}">
        <span class="val num">${r.v}<small>${unit}</small></span><div class="pile">${icons}</div></div>`;
    }).join("");
    const label = rows.map((r) => `${kn(r.m)}月 ${r.v ? r.v + unit : "記録なし"}`).join("、");
    const key = per === 1 ? `絵1つ＝1${unit}` : `絵1つ＝${per}${unit}`;
    return `<div class="picto" style="--n:${rows.length};--w:${w}" role="img" aria-label="月別の推移：${label}">${cols}
      <div class="mons">${rows.map((r) => `<span>${kn(r.m)}月</span>`).join("")}</div></div>
      <span hidden class="key">${key}</span>`;
  }

  function renderSeason() {
    // 基準日＝データの最終日。グラフは基準日を含む直近3か月、数字とランキングは直近30日
    const lastPost = DATA.posts.reduce((a, p) => (p.date > a ? p.date : a), "");
    const baseStr = (DATA.period && DATA.period[1]) || DATA.updated || lastPost;
    const base = new Date(baseStr + "T00:00:00");
    const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const from30 = ymd(new Date(base.getFullYear(), base.getMonth(), base.getDate() - 29));
    const in30 = (p) => p.date >= from30 && p.date <= baseStr;
    const md = (str) => `${Number(str.slice(5, 7))}/${Number(str.slice(8, 10))}`;
    const span30 = `直近30日（${md(from30)}〜${md(baseStr)}）`;
    const months = [2, 1, 0].map((k) => {
      const d = new Date(base.getFullYear(), base.getMonth() - k, 1);
      return { key: ymd(d).slice(0, 7), m: d.getMonth() + 1 };
    });
    const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const partial = base.getDate() < lastDay ? base.getDate() : 0;   // 今月が途中なら「◯日まで」
    const monthNote = partial ? `${kn(months[2].m)}月は${partial}日まで。` : "";
    const ymOf = (p) => p.date.slice(0, 7);
    const trips = DATA.posts.filter((p) => p.kind === "catch");

    const col = (title, ruby, group, fish, mode, kind) => {
      const ps = trips.filter((p) => group.match(p.plan));
      const cs = ps.flatMap((p) => p.catches.filter((c) => c.fish === fish).map((c) => ({ ...c, ym: ymOf(p), recent: in30(p) })));
      const rows = months.map(({ key, m }) => {
        const mc = cs.filter((c) => c.ym === key);
        const v = mode === "kg" ? Math.max(0, ...mc.map((c) => c.maxKg ?? 0)) : Math.max(0, ...mc.map((c) => c.max ?? 0));
        return { m, v: v ? (mode === "kg" ? Math.round(v * 10) / 10 : v) : 0 };
      });
      const rc = cs.filter((c) => c.recent);
      const n30 = ps.filter(in30).length;
      const maxKg = Math.max(0, ...rc.map((c) => c.maxKg ?? 0));
      const maxN = Math.max(0, ...rc.map((c) => c.max ?? 0));
      return `<div class="season-col"><h3><ruby>${title}<rt>${ruby}</rt></ruby></h3>
        <p class="facts"><span class="span30">${span30}</span><br>出船記録 <b class="num">${n30}</b> 回　トップ <b class="num">${maxN || "—"}</b>${maxN ? "枚" : ""}　最大 <b class="num">${maxKg ? fmtKg(maxKg) : "—"}</b>${maxKg ? "kg" : ""}</p>
        <div class="bars">${bars(rows, mode === "kg" ? "kg" : "枚", kind)}</div>
        <p class="season-note">${mode === "kg" ? "直近3か月の月ごとの最大重量（絵1つ＝1kg）" : "直近3か月の月ごとのトップ枚数（絵1つ＝1枚）"}${monthNote}</p></div>`;
    };

    const neg = trips.filter((p) => p.plan === "根魚五目");
    const neg30 = neg.filter(in30);
    // 直近30日の出船が3回未満なら、ランキングは直近3か月で集計する
    const rankBase = neg30.length >= 3 ? neg30 : neg.filter((p) => months.some((x) => x.key === ymOf(p)));
    const rankSpan = neg30.length >= 3 ? span30 : `直近3か月（直近30日は出船${neg30.length}回のため）`;
    const nf = new Map();
    rankBase.forEach((p) => fishOf(p).forEach((f) => nf.set(f, (nf.get(f) || 0) + 1)));
    const rank = [...nf.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja")).slice(0, 8);
    let prev = null, pos = 0;   // 同数は同じ順位にする
    const ranked = rank.map(([f, n], i) => { if (n !== prev) { pos = i + 1; prev = n; } return { f, n, pos }; });
    const negRows = months.map(({ key, m }) => ({ m, v: neg.filter((p) => ymOf(p) === key).length }));
    const rankHTML = ranked.map(({ f, n, pos }) => `<li class="${pos === 1 ? "first" : ""}">
          <span class="rk num">${pos}</span><span class="nm">${esc(f)}</span>
          <span class="meter" aria-hidden="true"><i style="width:${(100 * n) / Math.max(rankBase.length, 1)}%"></i></span>
          <span class="ct num">${n}<small>回</small></span></li>`).join("");
    document.getElementById("season").innerHTML =
      col("真鯛", "マダイ", PLAN_GROUPS[0], "マダイ", "count", "tai") +
      col("平目", "ヒラメ", PLAN_GROUPS[1], "ヒラメ", "kg", "hirame") +
      `<div class="season-col"><h3><ruby>根魚五目<rt>ねざかなごもく</rt></ruby></h3>
        <p class="facts"><span class="span30">${span30}</span><br>出船記録 <b class="num">${neg30.length}</b> 回</p>
        <div class="bars">${bars(negRows, "回", "kasago")}</div>
        <p class="season-note">直近3か月の月ごとの出船記録の数（絵1つ＝1回。10月からは午前がヒラメ船に）${monthNote}</p>
        <p class="facts" style="margin-top:18px">よく釣れた魚のランキング<br><span class="span30">${rankSpan}</span></p>
        <ol class="ranking">${rankHTML}</ol>
        <p class="season-note">釣果に名前が出た出船の回数（全${rankBase.length}回のうち）</p></div>`;
  }

  function renderCover() {
    const [s, e] = DATA.period.map(parts);
    document.getElementById("period").textContent = `${kn(s.m)}月〜${kn(e.m)}月の記録`;
    // いちばん新しい記事を表示（出船案内なら「お知らせ」、釣果なら「最新の釣果」）
    const latest = DATA.posts[0];
    if (latest) {
      const p = parts(latest.date);
      const label = latest.kind === "notice" ? "お知らせ" : "最新の釣果";
      document.getElementById("latest").innerHTML = `<span class="label">${label}</span><p>${esc(latest.note)}</p>
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
