// 상주 모닝 브리핑 — dashboard (손글씨 스케치노트)
import { charaSVG } from './characters.js';

const CATS = {
  '시정·행정': 'var(--c-admin)',
  '농업·특산': 'var(--c-agri)',
  '관광·문화': 'var(--c-culture)',
  '경제·일자리': 'var(--c-economy)',
  '사회·복지': 'var(--c-welfare)',
  '안전·환경': 'var(--c-safety)',
  '교육·청년': 'var(--c-edu)',
  '의회·정치': 'var(--c-politics)',
};
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (id, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const doodle = (id, cls = '', vb = '0 0 300 22') => `<svg class="draw ${cls}" viewBox="${vb}" preserveAspectRatio="none" aria-hidden="true"><use href="#d-${id}"/></svg>`;
const catColor = (c) => CATS[c] || 'var(--orange)';
const rot = (i, amp = 1.4) => (((i * 7919) % 7) / 6 - .5) * 2 * amp; // 결정적 "삐뚤게 붙이기" 각도

const state = { data: null, dates: [], filter: 'all', query: '', shown: 24, range: 'week', week: null, weekLoading: false };

/* 페이지 준비(로딩 화면 걷힘) 이후에만 등장 모션 시작 */
let markReady;
const whenReady = new Promise((r) => { markReady = r; });

/* ---------------- characters ---------------- */
function typeHTML(text, base = 0) {
  let i = 0;
  return [...String(text)].map((ch) => ch === '\n' ? '<br>' : `<i style="--i:${i++};--b:${base}">${ch === ' ' ? '&nbsp;' : esc(ch)}</i>`).join('');
}
function chara(kind, { cls = '', bubble = '', label, base = 600 } = {}) {
  return `<figure class="chara chara--${kind} ${cls}" style="--bb:${base}ms" data-chara>
    <span class="chara__pop"><span class="chara__jump"><span class="chara__float">${charaSVG(kind, { label })}</span></span></span>
    ${bubble ? `<figcaption class="bubble"><span class="sr-only">${esc(bubble.replace(/\n/g, ' '))}</span><span class="type" aria-hidden="true">${typeHTML(bubble, base)}</span></figcaption>` : ''}
  </figure>`;
}

/* ---------------- formatting ---------------- */
function parseDate(d) { const [y, m, day] = d.split('-').map(Number); return new Date(y, m - 1, day); }
function fmtLongDate(d) { const t = parseDate(d); return `${t.getFullYear()}. ${String(t.getMonth() + 1).padStart(2, '0')}. ${String(t.getDate()).padStart(2, '0')} (${WEEK[t.getDay()]})`; }
function fmtTime(iso) {
  if (!iso) return '';
  const t = new Date(iso); if (isNaN(t)) return '';
  const now = new Date();
  const hm = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  return t.toDateString() === now.toDateString() ? hm : `${t.getMonth() + 1}.${t.getDate()} ${hm}`;
}
function relTime(iso) {
  const t = new Date(iso); if (isNaN(t)) return '';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return '방금'; if (m < 60) return `${m}분 전`;
  const h = Math.round(m / 60); if (h < 24) return `${h}시간 전`;
  return `${Math.round(h / 24)}일 전`;
}
const importanceBar = (n = 3) => `<span class="importance" aria-label="중요도 ${n}/5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
const tag = (c) => `<span class="tag" style="--c:${catColor(c)}">${esc(c)}</span>`;
const cautionTag = '<span class="tone-caution">주의</span>';
const numdot = (n, cls = '') => `<span class="numdot num ${cls}">${n}</span>`;

/* ---------------- api ---------------- */
async function api(path, opts) {
  const res = await fetch(path, opts);
  let body = null; try { body = await res.json(); } catch {}
  if (!res.ok) throw Object.assign(new Error(body?.error || body?.message || `요청 실패 (${res.status})`), { status: res.status });
  return body;
}

/* ---------------- toast ---------------- */
function toast(msg, type = 'info', ms = 4200) {
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.innerHTML = `<i></i><span>${esc(msg)}</span>`;
  $('#toasts').append(el);
  setTimeout(() => { el.classList.add('is-out'); setTimeout(() => el.remove(), 450); }, ms);
}

/* ---------------- render ---------------- */
function headlineHTML(text, keywords = []) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const keys = keywords.filter((k) => k && k.length >= 2);
  let hits = 0;
  return words.map((w, i) => {
    const hit = keys.some((k) => w.includes(k));
    const inner = hit ? `<em class="hl" style="--h:${hits++}">${esc(w)}</em>` : esc(w);
    return `<span class="w"><span style="--i:${i}">${inner}</span></span>`;
  }).join(' ');
}

const secHead = ({ eyebrow, title, desc = '', descId = '', extra = '', eyebrowCls = '' }) => `
  <div class="section__head reveal">
    <div class="section__text">
      <span class="eyebrow ${eyebrowCls}">${eyebrow}</span>
      <h2 class="section__title"><span>${title}</span>${doodle('underline', 'section__underline')}</h2>
      <p class="section__desc"${descId ? ` id="${descId}"` : ''}>${desc}</p>
    </div>${extra}
  </div>`;

function heroHTML(d) {
  const top = d.top?.[0];
  const s = d.stats || {};
  const notes = [
    { v: s.collected || 0, l: '수집 기사', c: 'yellow' },
    { v: s.selected || d.top?.length || 0, l: '주요 뉴스', c: 'blue' },
    { v: s.alerts || 0, l: '주의 이슈', c: s.alerts ? 'pink' : 'green' },
  ];
  return `
  <section class="hero">
    <div class="hero__main inview">
      <div class="hero__intro">
        ${chara('dori', { cls: 'hero__dori', bubble: '오늘의 상주 소식\n가져왔어요!', base: 700 })}
        <div class="hero__dateline">
          <span class="eyebrow">경북 상주 · 아침 브리핑</span>
          <p class="hero__date num">${fmtLongDate(d.date)}</p>
        </div>
      </div>
      <h1 class="hero__headline">${headlineHTML(d.headline || '오늘의 상주 소식', top?.keywords || [])}</h1>
      ${doodle('underline2', 'hero__squiggle', '0 0 300 26')}
      <p class="hero__briefing reveal" style="--d:300">${esc(d.briefing || '')}</p>
      <div class="stats">
        ${notes.map((n, i) => `<div class="stat postit postit--${n.c} reveal stick" style="--d:${450 + i * 110};--rot:${[-2.2, 1.6, -1.2][i]}deg">
          <div class="stat__value num"><span data-count="${n.v}">0</span><small>건</small></div><div class="stat__label">${n.l}</div></div>`).join('')}
        <div class="stat stat--mode reveal stick" style="--d:780;--rot:1.8deg">
          <div class="stat__mode">${d.mode === 'ai' ? 'AI 요약' : '자동 요약'}</div><div class="stat__label">${esc(relTime(d.generatedAt) || '')} 생성</div>
        </div>
      </div>
      <div class="hero__actions reveal" style="--d:900">
        <button class="btn btn--primary" data-action="story">${icon('play')}카드뉴스로 보기</button>
        <a class="btn" href="./output/cards/${esc(d.date)}/cover.png" target="_blank" rel="noopener">${icon('download')}카드 이미지</a>
        <button class="btn" data-action="refresh" title="지금 다시 수집·요약">${icon('refresh')}새로 수집</button>
        <button class="btn btn--primary hero__kakao" data-action="kakao" title="오늘 카드를 카카오톡으로 보내기">${icon('send')}카톡 발송</button>
      </div>
    </div>
    ${impactHTML(d) || (top ? featureHTML(top) : '')}
  </section>`;
}

function featureHTML(it) {
  return `
  <article class="feature sheet reveal stick" style="--d:350;--rot:1deg">
    <span class="tape"></span>
    <span class="eyebrow">오늘의 톱뉴스</span>
    <div class="feature__meta">${numdot('01')}${tag(it.category)}${it.tone === 'caution' ? cautionTag : ''}</div>
    <h2 class="feature__title">${esc(it.title)}</h2>
    <ul class="feature__summary">${(it.summary || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    <div class="feature__foot">
      <span>${esc(it.source || '')}${it.related > 1 ? ` 외 ${it.related - 1}건` : ''} · ${esc(fmtTime(it.publishedAt))}</span>
      <a class="link-arrow" href="${esc(it.url)}" target="_blank" rel="noopener">원문 보기${icon('arrow')}</a>
    </div>
  </article>`;
}

/* 오늘 무엇이 크게 다뤄졌나: 커버리지 다이얼 (손그림)
   링 호 길이 = 같은 사안을 보도한 매체 수 비중, 중앙 = 선택된 기사, 자동 순환 */
function impactHTML(d) {
  if (!d.top?.length) return '';
  const items = [...d.top].sort((a, b) => (b.related || 1) - (a.related || 1) || (b.importance || 0) - (a.importance || 0));
  const total = items.reduce((s, x) => s + (x.related || 1), 0);
  const C = 160, R = 126, GAP = 3.2;
  const pt = (deg, r) => { const a = (deg * Math.PI) / 180; return `${(C + r * Math.cos(a)).toFixed(2)},${(C + r * Math.sin(a)).toFixed(2)}`; };
  let a0 = -90;
  const arcs = items.map((it, i) => {
    const sweep = ((it.related || 1) / total) * 360;
    const s = a0 + GAP / 2, e = a0 + sweep - GAP / 2; a0 += sweep;
    return `<path class="dial__arc" data-idx="${i}" style="--c:${catColor(it.category)};--i:${i}" pathLength="1" d="M${pt(s, R)} A${R},${R} 0 ${e - s > 180 ? 1 : 0} 1 ${pt(Math.max(e, s + .5), R)}"/>`;
  }).join('');
  const ticks = Array.from({ length: 24 }, (_, i) => { const deg = i * 15 - 90, major = i % 6 === 0; const [x1, y1] = pt(deg, 152).split(','); const [x2, y2] = pt(deg, major ? 143 : 147).split(','); return `<line class="${major ? 'major' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; }).join('');
  const pct = (it) => Math.round(((it.related || 1) / total) * 100);
  impactHTML.items = items; impactHTML.total = total;
  return `
  <aside class="impact" id="impact">
    <div class="impact__panel sheet reveal stick" style="--d:350;--rot:.8deg">
      <span class="tape tape--l"></span><span class="tape tape--r"></span>
      <span class="eyebrow">오늘의 보도량</span>
      <h2 class="impact__title"><span>오늘 무엇이 크게 다뤄졌나</span>${doodle('underline', 'section__underline')}</h2>
      <p class="impact__desc">원의 호 길이는 같은 사안을 보도한 매체 수의 비중입니다.</p>
      <div class="cov">
        <div class="dial">
          <svg viewBox="0 0 320 320" aria-hidden="true">
            <g class="dial__sketch">
              <g class="dial__ticks">${ticks}</g>
              <circle class="dial__track" cx="${C}" cy="${C}" r="${R}" pathLength="1"/>
              <circle class="dial__inner" cx="${C}" cy="${C}" r="104" pathLength="1"/>
              ${arcs}
            </g>
          </svg>
          <div class="dial__center" aria-live="polite">${dialCenter(items[0], 0, pct(items[0]))}</div>
        </div>
        <ol class="cov__list">${items.map((it, i) => `
          <li><button class="cov__item${it.tone === 'caution' ? ' is-caution' : ''}${i === 0 ? ' is-active' : ''}" data-idx="${i}" data-id="${esc(it.id)}" style="--c:${catColor(it.category)};--w:${pct(it) / pct(items[0])};--i:${i}">
            <span class="cov__rank num">${i + 1}</span>
            <span class="cov__title">${esc(it.title)}</span>
            <span class="cov__pct num">${pct(it)}<small>%</small></span>
            <span class="cov__line"></span>
          </button></li>`).join('')}
        </ol>
      </div>
      <p class="impact__note">${icon('arrow')}항목에 마우스를 올리면 가운데에 표시 · 누르면 해당 카드로 이동</p>
    </div>
  </aside>`;
}

function dialCenter(it, i, p) {
  return `<span class="dial__rank num">${i + 1}위 · ${esc(it.category)}</span>
    <strong class="dial__pct num">${p}<small>%</small></strong>
    <span class="dial__title">${esc(it.title)}</span>
    <span class="dial__meta num">${it.related || 1}개 매체 보도${it.tone === 'caution' ? ' · <em>주의</em>' : ''}</span>`;
}

function bindImpact(root) {
  const panel = $('.impact__panel', root); if (!panel) return;
  const items = impactHTML.items, total = impactHTML.total;
  const center = $('.dial__center', panel), arcs = $$('.dial__arc', panel), rows = $$('.cov__item', panel);
  let cur = 0, timer = null, hold = false;
  const set = (i) => {
    if (i === cur) return; cur = i;
    arcs.forEach((a, k) => a.classList.toggle('is-active', k === i));
    rows.forEach((r, k) => r.classList.toggle('is-active', k === i));
    panel.classList.add('has-active');
    center.classList.add('is-swap');
    setTimeout(() => { center.innerHTML = dialCenter(items[i], i, Math.round(((items[i].related || 1) / total) * 100)); center.classList.remove('is-swap'); }, reduceMotion ? 0 : 200);
  };
  arcs[0]?.classList.add('is-active'); panel.classList.add('has-active');
  const cycle = () => { clearInterval(timer); if (reduceMotion) return; timer = setInterval(() => { if (!hold && panel.classList.contains('is-in')) set((cur + 1) % Math.min(items.length, 5)); }, 4200); };
  cycle();
  const pick = (e) => { const el = e.target.closest('[data-idx]'); if (el) { hold = true; set(Number(el.dataset.idx)); } };
  panel.addEventListener('pointerover', pick);
  panel.addEventListener('focusin', pick);
  panel.addEventListener('pointerleave', () => { hold = false; cycle(); });
  panel.addEventListener('click', (e) => {
    const el = e.target.closest('[data-idx]'); if (!el) return;
    const card = $(`.ncard[data-id="${CSS.escape(items[Number(el.dataset.idx)].id)}"]`); if (!card) return;
    card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    card.classList.remove('is-pinged'); void card.offsetWidth; card.classList.add('is-pinged');
  });
}

/* 아래로 스크롤 안내 */
function bindScrollHint(d) {
  let el = $('#scrollHint');
  if (!el) {
    el = document.createElement('button'); el.id = 'scrollHint'; el.className = 'scroll-hint';
    document.body.append(el);
    el.addEventListener('click', () => ($('#alerts') || $('#cards'))?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }));
    const upd = () => el.classList.toggle('is-off', scrollY > 140);
    addEventListener('scroll', upd, { passive: true }); upd();
  }
  el.innerHTML = `<span>주요 뉴스 ${d.top.length}건, 아래로 내려 보세요</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.2 9.4c2 2 3.8 3.8 5.8 5.8 2-2.1 3.9-4 5.8-5.9"/></svg>`;
}

function alertsHTML(d) {
  const list = (d.top || []).filter((x) => x.tone === 'caution');
  if (!list.length) return '';
  return `
  <section class="section" id="alerts">
    ${secHead({ eyebrow: '빨간 펜 체크', eyebrowCls: 'eyebrow--caution', title: '확인이 필요한 이슈', desc: '민원·사고·비판 보도 등 담당 부서의 확인이 필요한 기사입니다.' })}
    <div class="alerts">${list.map((it, i) => `
      <div class="alert reveal stick" style="--d:${i * 90};--rot:${rot(i, .6)}deg">
        <span class="alert__icon">${icon('alert')}</span>
        <div><div class="alert__title">${esc(it.title)}</div><div class="alert__insight">${esc(it.insight || it.summary?.[0] || '')}</div></div>
        <a class="link-arrow" href="${esc(it.url)}" target="_blank" rel="noopener">원문${icon('arrow')}</a>
      </div>`).join('')}
    </div>
  </section>`;
}

function cardHTML(it, i) {
  const c = catColor(it.category);
  const n = String(it.rank || i + 1);
  return `
  <article class="ncard reveal stick" style="--c:${c};--d:${(i % 4) * 90};--rot:${rot(i)}deg" data-cat="${esc(it.category)}" data-id="${esc(it.id)}">
    <div class="ncard__flipper tilt" data-tilt="4">
      <div class="ncard__face" tabindex="0" role="button" aria-label="${esc(it.title)} — 요약 보기">
        <span class="tape" style="--tr:${rot(i + 3, 4)}deg"></span>
        ${it.image ? `<div class="ncard__media"><img src="${esc(it.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.remove()"></div>` : ''}
        <div class="ncard__meta">${numdot(n)}${tag(it.category)}${it.tone === 'caution' ? cautionTag : importanceBar(it.importance)}</div>
        <h3 class="ncard__title">${esc(it.title)}</h3>
        <ul class="ncard__lead">${(it.summary || []).slice(0, it.image ? 1 : 3).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        <div class="ncard__foot"><span>${esc(it.source || '')} · ${esc(fmtTime(it.publishedAt))}</span><span class="ncard__flip-hint">요약 ${icon('flip')}</span></div>
      </div>
      <div class="ncard__face ncard__face--back" tabindex="-1">
        <span class="tape" style="--tr:${rot(i + 5, 4)}deg"></span>
        <span class="back__label">${numdot(n, 'numdot--sm')} 3줄 요약</span>
        <h3 class="back__title">${esc(it.title)}</h3>
        <ol class="back__list">${(it.summary || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        ${it.insight ? `<div class="back__insight"><strong>시정 참고</strong>${esc(it.insight)}</div>` : ''}
        <div class="back__actions">
          <a class="link-arrow" href="${esc(it.url)}" target="_blank" rel="noopener">원문 보기${icon('arrow')}</a>
          <span class="ncard__flip-hint">${icon('flip')}</span>
        </div>
      </div>
    </div>
  </article>`;
}

function gridHTML(d) {
  const counts = {};
  (d.top || []).forEach((x) => { counts[x.category] = (counts[x.category] || 0) + 1; });
  const chips = [`<button class="chip" aria-pressed="true" data-filter="all" style="--c:var(--orange)"><i></i>전체<b>${d.top?.length || 0}</b></button>`]
    .concat(Object.keys(CATS).filter((c) => counts[c]).map((c) => `<button class="chip" aria-pressed="false" data-filter="${esc(c)}" style="--c:${CATS[c]}"><i></i>${esc(c)}<b>${counts[c]}</b></button>`));
  return `
  <section class="section" id="cards">
    ${secHead({ eyebrow: '카드 뉴스', title: '오늘의 주요 뉴스', desc: '메모를 누르면 3줄 요약과 시정 참고 사항이 뒷면에 적혀 있어요.', extra: `<div class="chips" role="toolbar" aria-label="분야 필터">${chips.join('')}</div>` })}
    <div class="grid">${(d.top || []).map(cardHTML).join('')}</div>
  </section>`;
}

const QUICK = ['곶감', '시의회', '축제', '공모 선정', '사고', '예산'];
function timelineHTML() {
  return `
  <section class="section" id="articles">
    ${secHead({ eyebrow: '뉴스 찾기', title: '뉴스 검색', descId: 'tlDesc', extra: chara('suni', { cls: 'search__suni inview', bubble: '키워드로 일주일 치\n뉴스를 찾아봐요!', base: 400 }) })}
    <div class="finder sheet reveal">
      <div class="finder__row">
        <div class="seg" role="tablist" aria-label="검색 기간">
          <button role="tab" data-range="week" aria-selected="${state.range === 'week'}">최근 7일</button>
          <button role="tab" data-range="today" aria-selected="${state.range === 'today'}">이 날 수집분</button>
        </div>
        <label class="search">${icon('search')}<span class="sr-only">기사 검색</span><input id="q" type="search" placeholder="키워드 (예: 곶감, 시의회)" autocomplete="off" value="${esc(state.query)}"></label>
      </div>
      <div class="finder__quick">${QUICK.map((k) => `<button class="qchip" data-q="${esc(k)}">${esc(k)}</button>`).join('')}</div>
    </div>
    <ul class="timeline" id="timeline"></ul>
    <div class="more" id="more"></div>
  </section>`;
}

const dayKey = (iso) => { const t = new Date(iso); return isNaN(t) ? '' : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
const hm = (iso) => { const t = new Date(iso); return isNaN(t) ? '' : `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`; };

let weekTimer = 0, weekSeq = 0;
function fetchWeek() {
  clearTimeout(weekTimer);
  const q = state.query.trim();
  if (state.week && state.week.q === q && !state.week.error) return renderTimeline();
  state.weekLoading = true; renderTimeline();
  weekTimer = setTimeout(async () => {
    const seq = ++weekSeq;
    try {
      const r = await api(`/api/search?days=7&q=${encodeURIComponent(q)}`);
      if (seq === weekSeq) state.week = r;
    } catch (e) { if (seq === weekSeq) { state.week = { q, items: [], error: e.message }; } }
    if (seq === weekSeq) { state.weekLoading = false; renderTimeline(); }
  }, q ? 350 : 0);
}

function renderTimeline() {
  const d = state.data; if (!d || !$('#timeline')) return;
  const q = state.query.trim();
  const terms = q.split(/\s+/).filter(Boolean);
  const week = state.range === 'week';
  let list;
  if (week) {
    if (state.weekLoading || !state.week) {
      $('#tlDesc').textContent = '최근 7일 기사를 찾는 중…';
      $('#timeline').innerHTML = Array.from({ length: 5 }, () => '<li class="tl-item"><div class="skeleton" style="height:22px;margin:16px 0"></div></li>').join('');
      $('#more').innerHTML = '';
      return;
    }
    list = state.week.items || [];
    $('#tlDesc').innerHTML = state.week.error ? `검색 실패: ${esc(state.week.error)}` : `최근 7일 · ${q ? `‘${esc(q)}’ ` : ''}<span class="num">${list.length}</span>건 · 최신순`;
  } else {
    list = [...(d.articles || [])]
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
      .filter((a) => terms.every((t) => `${a.title} ${a.source} ${a.snippet || ''}`.includes(t)));
    $('#tlDesc').innerHTML = `${fmtLongDate(d.date)} 수집 · ${q ? `‘${esc(q)}’ ` : ''}<span class="num">${list.length}</span>건`;
  }
  const mark = (s) => { let e = esc(s); for (const t of terms) e = e.split(esc(t)).join(`<mark>${esc(t)}</mark>`); return e; };
  let lastDay = '';
  $('#timeline').innerHTML = list.slice(0, state.shown).map((a) => {
    const k = dayKey(a.publishedAt);
    const head = week && k !== lastDay ? `<li class="tl-day num">${k ? fmtLongDate(k) : '날짜 미상'}</li>` : '';
    lastDay = k;
    return `${head}
    <li class="tl-item"><a href="${esc(a.url)}" target="_blank" rel="noopener">
      <span class="tl-time">${esc(week ? hm(a.publishedAt) : fmtTime(a.publishedAt))}</span>
      <span class="tl-title">${a.category ? tag(a.category) + ' ' : ''}${mark(a.title)}${a.related > 1 ? `<small class="tl-rel">외 ${a.related - 1}건</small>` : ''}</span>
      <span class="tl-source">${esc(a.source || '')}</span>
    </a></li>`;
  }).join('') || `<li class="tl-empty">${chara('suni', { cls: 'tl-empty__suni is-in', label: '고개를 갸웃하는 수니' })}<p>검색 결과가 없어요.<br>다른 키워드나 기간을 골라 보세요.</p></li>`;
  $('#more').innerHTML = list.length > state.shown ? `<button class="btn" id="btnMore">더 보기 <span class="num">${list.length - state.shown}</span></button>` : '';
}

function emptyHTML(msg) {
  return `
  <section class="empty inview">
    ${chara('dori', { cls: 'empty__dori', bubble: '아직 모은 소식이 없어요', base: 500 })}
    <h2>아직 오늘의 브리핑이 없습니다</h2>
    <p>${esc(msg || '첫 수집을 시작하면 상주시 관련 뉴스를 모아 카드뉴스로 정리해 드립니다.')}</p>
    <button class="btn btn--primary" data-action="refresh">${icon('refresh')}지금 수집하기</button>
  </section>`;
}

function render(d) {
  state.data = d; state.filter = 'all'; state.shown = 24;
  const app = $('#app');
  if (!d || !d.top?.length) {
    app.innerHTML = emptyHTML(d ? '오늘은 상주시 관련 주요 기사가 아직 없습니다. 잠시 후 다시 수집해 보세요.' : '');
    observeReveal(app);
    return;
  }
  app.innerHTML = heroHTML(d) + alertsHTML(d) + `<div class="divider inview">${doodle('underline', '', '0 0 300 22')}</div>` + gridHTML(d) + `<div class="divider inview">${doodle('underline', '', '0 0 300 22')}</div>` + timelineHTML(d);
  if (state.range === 'week') fetchWeek(); else renderTimeline();
  bindTilt(app);
  bindImpact(app);
  bindScrollHint(d);
  observeReveal(app);
  whenReady.then(() => requestAnimationFrame(() => $$('[data-count]', app).forEach(countUp)));
}

/* ---------------- motion: count-up ---------------- */
function countUp(el) {
  const to = Number(el.dataset.count) || 0;
  if (reduceMotion || to === 0) { el.textContent = to; return; }
  const dur = 1300, start = performance.now() + 450;
  const step = (now) => {
    const p = Math.min(1, Math.max(0, (now - start) / dur));
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------------- motion: reveal (스크롤 진입) ---------------- */
let io;
function observeReveal(root) {
  const els = $$('.reveal, .inview', root);
  if (!('IntersectionObserver' in window) || reduceMotion) { els.forEach((e) => e.classList.add('is-in')); return; }
  whenReady.then(() => {
    io?.disconnect();
    io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    els.filter((e) => e.isConnected).forEach((e) => io.observe(e));
  });
}

/* ---------------- motion: 종이 들림(약한 3D 틸트) ---------------- */
function bindTilt(root) {
  if (!finePointer || reduceMotion) return;
  $$('[data-tilt]', root).forEach((el) => {
    const max = Number(el.dataset.tilt) || 4;
    let raf = 0;
    const card = el.closest('.ncard');
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // 뒤집힌 카드는 틸트하지 않음(3D 회전 중 뒷면 링크 클릭이 막히는 문제 방지)
        if (card?.classList.contains('is-flipped')) { el.classList.remove('is-active'); el.style.transform = ''; return; }
        el.classList.add('is-active');
        el.style.transform = `rotateX(${(.5 - y) * max * 2}deg) rotateY(${(x - .5) * max * 2}deg) translateZ(6px)`;
      });
    });
    el.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); el.classList.remove('is-active'); el.style.transform = ''; });
  });
}

/* ---------------- motion: 캐릭터 (눈동자 따라보기 · 점프 반응) ---------------- */
function bindCharacters() {
  const jump = (c) => {
    if (reduceMotion || c.classList.contains('is-jump')) return;
    c.classList.add('is-jump');
    setTimeout(() => c.classList.remove('is-jump'), 950);
  };
  document.addEventListener('click', (e) => { const c = e.target.closest('[data-chara]'); if (c) jump(c); });
  if (!finePointer || reduceMotion) return;
  document.addEventListener('pointerover', (e) => {
    const c = e.target.closest?.('[data-chara]');
    if (c && !c.contains(e.relatedTarget)) jump(c);
  });
  let raf = 0, px = 0, py = 0;
  addEventListener('pointermove', (e) => {
    px = e.clientX; py = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      for (const c of $$('[data-chara] .ch')) {
        const r = c.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height * .45);
        const len = Math.hypot(dx, dy) || 1, k = Math.min(1, len / 260);
        c.style.setProperty('--lx', `${((dx / len) * 3.4 * k).toFixed(2)}px`);
        c.style.setProperty('--ly', `${((dy / len) * 2.6 * k).toFixed(2)}px`);
      }
    });
  }, { passive: true });
}

/* ---------------- roaming buddy (화면을 돌아다니는 수니) ---------------- */
function initBuddy() {
  const el = document.createElement('div');
  el.className = 'buddy';
  el.innerHTML = `<div class="buddy__flip">${chara('suni', { cls: 'buddy__chara is-in', label: '화면을 돌아다니는 수니', base: 0 })}</div><div class="buddy__say" role="status" aria-live="polite"></div>`;
  document.body.appendChild(el);
  const c = $('.chara', el), say = $('.buddy__say', el), flip = $('.buddy__flip', el);
  const size = () => el.offsetWidth || 84;
  let x = innerWidth - size() - 24, y = innerHeight - size() - 24, timer = 0, sayTimer = 0, busy = false;
  const place = (dur = 0) => { el.style.transitionDuration = `${dur}ms`; el.style.transform = `translate(${x}px, ${y}px)`; };
  place();
  const tips = () => {
    const top = state.data?.top?.[0];
    return [
      top ? `오늘 1위는\n"${top.title.slice(0, 16)}${top.title.length > 16 ? '…' : ''}"` : '오늘 소식을 모으는 중!',
      '메모 카드를 누르면\n뒷면 요약이 보여요',
      '"카드뉴스로 보기"도\n눌러 보세요!',
      '검색창에 "곶감"을\n쳐 보세요',
      '오늘도 상주 화이팅!',
      '다이얼을 돌려 보면\n분야별 비중이 보여요',
    ];
  };
  const speak = (text, ms = 3600) => {
    clearTimeout(sayTimer);
    say.innerHTML = esc(text).replace(/\n/g, '<br>');
    el.classList.add('is-talk');
    el.classList.toggle('say-left', x > innerWidth / 2);
    sayTimer = setTimeout(() => el.classList.remove('is-talk'), ms);
  };
  const hop = () => { c.classList.remove('is-jump'); void c.offsetWidth; c.classList.add('is-jump'); setTimeout(() => c.classList.remove('is-jump'), 950); };
  const walkTo = (nx, ny) => {
    const s = size();
    nx = Math.max(8, Math.min(innerWidth - s - 8, nx));
    ny = Math.max(innerHeight * .35, Math.min(innerHeight - s - 12, ny));
    const dist = Math.hypot(nx - x, ny - y);
    if (dist < 4) return 0;
    flip.classList.toggle('is-left', nx < x);
    const dur = Math.max(500, (dist / 140) * 1000);
    x = nx; y = ny;
    el.classList.add('is-walk');
    place(dur);
    setTimeout(() => el.classList.remove('is-walk'), dur);
    return dur;
  };
  const wander = () => {
    if (document.hidden || document.querySelector('.story.is-open, .story[open]')) { timer = setTimeout(wander, 4000); return; }
    const dur = walkTo(Math.random() * innerWidth, innerHeight * (.4 + Math.random() * .6));
    timer = setTimeout(() => {
      const r = Math.random();
      if (r < .35) speak(tips()[Math.floor(Math.random() * tips().length)]);
      else if (r < .55) hop();
      timer = setTimeout(wander, 2200 + Math.random() * 4200);
    }, dur + 200);
  };
  el.addEventListener('click', () => { hop(); speak(tips()[Math.floor(Math.random() * tips().length)]); clearTimeout(timer); timer = setTimeout(wander, 4200); });
  addEventListener('resize', () => walkTo(x, y));
  if (reduceMotion) { el.classList.add('is-still'); return; }
  // 커서가 가까이 오면 깡총 피하기
  if (finePointer) {
    let last = 0;
    addEventListener('pointermove', (e) => {
      const now = performance.now(); if (now - last < 600 || busy) return;
      const s = size(), cx = x + s / 2, cy = y + s / 2, d = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (d > 90 || el.matches(':hover')) return;
      last = now; busy = true;
      hop(); clearTimeout(timer);
      const ang = Math.atan2(cy - e.clientY, cx - e.clientX);
      const dur = walkTo(x + Math.cos(ang) * 220, y + Math.sin(ang) * 120);
      setTimeout(() => { busy = false; }, dur);
      timer = setTimeout(wander, dur + 2600);
    }, { passive: true });
  }
  // 빠르게 스크롤하면 신나서 점프
  let sy = scrollY, st = 0;
  addEventListener('scroll', () => { if (Math.abs(scrollY - sy) > 600 && performance.now() - st > 2500) { st = performance.now(); hop(); } sy = scrollY; }, { passive: true });
  whenReady.then(() => { setTimeout(() => { speak('안녕하세요!\n수니가 안내할게요', 3200); }, 900); timer = setTimeout(wander, 4600); });
}

/* ---------------- doodles (배경 손그림 낙서, 스크롤 패럴랙스) ---------------- */
function initDoodles() {
  const P = {
    gam: '<circle cx="20" cy="22" r="13"/><path d="M13 10c4 3 10 3 14 0M20 9V4"/>',
    star: '<path d="M20 5l4 10 10 1-8 7 3 11-9-6-9 6 3-11-8-7 10-1z"/>',
    swirl: '<path d="M8 22c0-8 14-10 16-2s-8 10-10 4 6-6 8-2"/>',
    rice: '<path d="M20 36V10M20 14c-6-1-8-5-8-8 5 0 8 4 8 8zM20 22c6-1 8-5 8-8-5 0-8 4-8 8zM20 30c-6-1-8-5-8-8 5 0 8 4 8 8z"/>',
    heart: '<path d="M20 33S6 24 6 15c0-5 6-8 10-4l4 4 4-4c4-4 10-1 10 4 0 9-14 18-14 18z"/>',
    spark: '<path d="M20 6v8M20 26v8M6 20h8M26 20h8"/>',
  };
  const keys = Object.keys(P), n = innerWidth < 600 ? 8 : 16;
  const layer = document.createElement('div');
  layer.className = 'doodles'; layer.setAttribute('aria-hidden', 'true');
  let h = '';
  for (let i = 0; i < n; i++) {
    const k = keys[i % keys.length], side = i % 2 ? 'right' : 'left';
    h += `<svg class="doodle doodle--${k}" viewBox="0 0 40 40" style="${side}:${(2 + Math.random() * 9).toFixed(1)}%;top:${(i * (100 / n) + Math.random() * 4).toFixed(1)}%;--r:${(Math.random() * 40 - 20).toFixed(0)}deg;--d:${(i * 0.37 % 3).toFixed(2)}s;--z:${(0.15 + Math.random() * 0.5).toFixed(2)}">${P[k]}</svg>`;
  }
  layer.innerHTML = h;
  document.body.prepend(layer);
  if (reduceMotion) return;
  let raf = 0;
  addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; layer.style.setProperty('--sy', `${scrollY}`); });
  }, { passive: true });
}

/* ---------------- story viewer ---------------- */
const story = { i: 0, slides: [], timer: 0, dur: 7000, startedAt: 0, remaining: 0, paused: false };
function storySlides(d) {
  return [{ type: 'cover' }, ...(d.top || []).map((it) => ({ type: 'item', it }))];
}
function slideHTML(s, d, dir) {
  if (s.type === 'cover') {
    return `<div class="story__card ${dir < 0 ? 'is-back' : ''}" style="--c:var(--orange)">
      <span class="tape"></span>
      <span class="s-kicker">상주 모닝 브리핑</span>
      <div class="s-date num">${fmtLongDate(d.date)}</div>
      <div class="s-cover-chara">${charaSVG('dori', { label: false })}</div>
      <h2 class="s-cover-title">${esc(d.headline)}</h2>
      <ol class="s-cover-list">${(d.top || []).slice(0, 5).map((it, i) => `<li style="--i:${i}">${numdot(i + 1, 'numdot--sm')}<span>${esc(it.title)}</span></li>`).join('')}</ol>
      <div class="s-foot"><span>주요 뉴스 ${d.top.length}건</span><span>넘겨서 보기 ${icon('arrow')}</span></div>
    </div>`;
  }
  const it = s.it;
  return `<div class="story__card ${dir < 0 ? 'is-back' : ''}" style="--c:${catColor(it.category)}">
    <span class="tape"></span>
    <div class="s-meta">${numdot(it.rank)}${tag(it.category)}${it.tone === 'caution' ? cautionTag : ''}</div>
    <h2 class="s-title"><span class="hl-static">${esc(it.title)}</span></h2>
    <ul class="s-list">${(it.summary || []).map((x, i) => `<li style="--i:${i}">${esc(x)}</li>`).join('')}</ul>
    ${it.insight ? `<div class="s-insight"><strong>시정 참고</strong>${esc(it.insight)}</div>` : ''}
    <div class="s-foot"><span>${esc(it.source || '')} · ${esc(fmtTime(it.publishedAt))}</span><a class="s-link" href="${esc(it.url)}" target="_blank" rel="noopener">원문 ${icon('arrow')}</a></div>
  </div>`;
}
function storyShow(i, dir = 1) {
  const d = state.data; const st = $('#storyStage');
  if (i < 0) i = 0;
  if (i >= story.slides.length) return storyClose();
  story.i = i;
  const old = $('.story__card', st);
  if (old) { old.classList.add('is-leaving'); setTimeout(() => old.remove(), 420); }
  st.insertAdjacentHTML('beforeend', slideHTML(story.slides[i], d, dir));
  if (!$('.story__nav', st)) st.insertAdjacentHTML('beforeend', `<div class="story__nav"><button aria-label="이전" data-nav="-1"></button><button aria-label="다음" data-nav="1"></button></div>`);
  else st.append($('.story__nav', st));
  $$('#storyProgress span').forEach((p, k) => { p.className = k < i ? 'done' : ''; p.querySelector('i').style.animation = 'none'; void p.offsetWidth; p.querySelector('i').style.animation = ''; if (k === i) p.className = 'run'; });
  story.paused = false; $('#story').classList.remove('is-paused');
  storyTimer(story.dur);
}
function storyTimer(ms) { clearTimeout(story.timer); story.startedAt = Date.now(); story.remaining = ms; story.timer = setTimeout(() => storyShow(story.i + 1), ms); }
function storyOpen() {
  if (!state.data?.top?.length) return;
  story.slides = storySlides(state.data);
  $('#storyProgress').innerHTML = story.slides.map(() => '<span><i></i></span>').join('');
  $('#storyProgress').style.setProperty('--dur', `${story.dur}ms`);
  $('#story').classList.add('is-open');
  document.body.style.overflow = 'hidden';
  storyShow(0);
  $('#storyClose').focus();
}
function storyClose() {
  clearTimeout(story.timer);
  $('#story').classList.remove('is-open');
  document.body.style.overflow = '';
  setTimeout(() => $$('.story__card, .story__nav', $('#storyStage')).forEach((e) => e.remove()), 500);
}
function storyPause(on) {
  if (on && !story.paused) { story.paused = true; clearTimeout(story.timer); story.remaining -= Date.now() - story.startedAt; $('#story').classList.add('is-paused'); }
  else if (!on && story.paused) { story.paused = false; $('#story').classList.remove('is-paused'); storyTimer(Math.max(400, story.remaining)); }
}

/* ---------------- data loading ---------------- */
async function loadDates() {
  try {
    const r = await api('/api/dates');
    state.dates = Array.isArray(r) ? r : (r.dates || []);
  } catch { state.dates = []; }
  const sel = $('#dateSelect');
  sel.innerHTML = state.dates.length
    ? state.dates.map((x) => { const d = typeof x === 'string' ? x : x.date; return `<option value="${esc(d)}">${fmtLongDate(d)}</option>`; }).join('')
    : `<option>기록 없음</option>`;
  sel.disabled = !state.dates.length;
}
async function loadDay(date) {
  try {
    const d = await api(date ? `/api/day/${encodeURIComponent(date)}` : '/api/latest');
    render(d);
    if (d?.date) $('#dateSelect').value = d.date;
  } catch (e) {
    render(null);
    if (e.status !== 404) toast(e.message, 'error');
  }
}

async function doRefresh(btn) {
  const btns = [$('#btnRefresh'), btn].filter(Boolean);
  btns.forEach((b) => { b.classList.add('is-busy'); b.disabled = true; });
  toast('상주시 뉴스를 수집하고 요약하는 중입니다… (1~2분)');
  try {
    await api('/api/refresh', { method: 'POST' });
    await loadDates(); await loadDay();
    toast('오늘의 브리핑을 새로 만들었습니다', 'ok');
  } catch (e) { toast(e.message, 'error', 7000); }
  finally { btns.forEach((b) => { b.classList.remove('is-busy'); b.disabled = false; }); }
}
async function doKakao() {
  const btns = [$('#btnKakao'), ...$$('.hero__kakao')].filter(Boolean);
  if (btns.some((b) => b.disabled)) return;
  btns.forEach((b) => { b.classList.add('is-busy'); b.disabled = true; });
  try {
    const r = await api('/api/send-kakao', { method: 'POST' });
    toast(r?.message || '카카오톡으로 브리핑을 보냈습니다', 'ok');
  } catch (e) { toast(e.message, 'error', 8000); }
  finally { btns.forEach((b) => { b.classList.remove('is-busy'); b.disabled = false; }); }
}

/* ---------------- events ---------------- */
function bindGlobal() {
  $('#btnTheme').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    $('meta[name="theme-color"]').content = next === 'light' ? '#fbf6ea' : '#27322d';
    try { localStorage.setItem('smb-theme-v2', next); } catch {}
  });
  $('#btnRefresh').addEventListener('click', () => doRefresh());
  $('#btnKakao').addEventListener('click', doKakao);
  // 카카오 연동(REST 키·KAKAO_ENABLED)이 켜져 있을 때만 발송 버튼 표시
  // ≤400px에서는 상단바 대신 히어로의 .hero__kakao가 노출됨 (html.has-kakao 기준, styles.css)
  fetch('/api/status').then((r) => r.json()).then((s) => { if (s.kakaoEnabled) { $('#btnKakao').style.display = ''; document.documentElement.classList.add('has-kakao'); } }).catch(() => {});
  $('#dateSelect').addEventListener('change', (e) => { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); loadDay(e.target.value); });

  addEventListener('scroll', () => $('#topbar').classList.toggle('is-scrolled', scrollY > 8), { passive: true });

  $('#app').addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (a?.dataset.action === 'story') return storyOpen();
    if (a?.dataset.action === 'refresh') return doRefresh(a);
    if (a?.dataset.action === 'kakao') return doKakao();
    const rng = e.target.closest('[data-range]');
    if (rng) {
      state.range = rng.dataset.range; state.shown = 24;
      $$('[data-range]').forEach((b) => b.setAttribute('aria-selected', String(b === rng)));
      return state.range === 'week' ? fetchWeek() : renderTimeline();
    }
    const qc = e.target.closest('[data-q]');
    if (qc) {
      state.query = qc.dataset.q; $('#q').value = state.query; state.shown = 24;
      return state.range === 'week' ? fetchWeek() : renderTimeline();
    }
    const chip = e.target.closest('#cards .chip');
    if (chip) {
      state.filter = chip.dataset.filter;
      $$('#cards .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      $$('.ncard').forEach((card, k) => {
        const show = state.filter === 'all' || card.dataset.cat === state.filter;
        card.classList.toggle('is-hidden', !show);
        if (show) { card.classList.remove('is-in'); card.style.setProperty('--d', String((k % 4) * 70)); requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('is-in'))); }
      });
      return;
    }
    if (e.target.closest('#btnMore')) { state.shown += 24; return renderTimeline(); }
    if (e.target.closest('a')) return;
    const card = e.target.closest('.ncard');
    if (card) flip(card);
  });
  $('#app').addEventListener('keydown', (e) => {
    const card = e.target.closest('.ncard');
    if (card && (e.key === 'Enter' || e.key === ' ') && !e.target.closest('a')) { e.preventDefault(); flip(card); }
  });
  $('#app').addEventListener('input', (e) => {
    if (e.target.id !== 'q') return;
    state.query = e.target.value; state.shown = 24;
    if (state.range === 'week') fetchWeek(); else renderTimeline();
  });
  $('#btnSearch').addEventListener('click', () => {
    $('#articles')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => $('#q')?.focus({ preventScroll: true }), 500);
  });

  // story
  $('#storyClose').addEventListener('click', storyClose);
  $('#storyStage').addEventListener('click', (e) => {
    if (story.held) { story.held = false; return; }
    const n = e.target.closest('[data-nav]'); if (n) storyShow(story.i + Number(n.dataset.nav), Number(n.dataset.nav));
  });
  let holdT = 0;
  $('#storyStage').addEventListener('pointerdown', () => { story.held = false; holdT = setTimeout(() => { story.held = true; storyPause(true); }, 220); });
  addEventListener('pointerup', () => { clearTimeout(holdT); if (story.paused) setTimeout(() => storyPause(false), 0); });
  $('#story').addEventListener('click', (e) => { if (e.target.id === 'story') storyClose(); });
  addEventListener('keydown', (e) => {
    if (!$('#story').classList.contains('is-open')) return;
    if (e.key === 'Escape') storyClose();
    if (e.key === 'ArrowRight') storyShow(story.i + 1, 1);
    if (e.key === 'ArrowLeft') storyShow(story.i - 1, -1);
    if (e.key === ' ') { e.preventDefault(); storyPause(!story.paused); }
  });
}
function flip(card) {
  const f = $('.ncard__flipper', card);
  card.classList.toggle('is-flipped');
  f.style.transform = '';
  const back = card.classList.contains('is-flipped');
  $('.ncard__face--back', card).tabIndex = back ? 0 : -1;
  $('.ncard__face:not(.ncard__face--back)', card).tabIndex = back ? -1 : 0;
}

/* ---------------- boot ---------------- */
(async function boot() {
  const veil = $('#veilChara');
  if (veil) veil.innerHTML = `<span class="chara__float">${charaSVG('dori', { label: false })}</span>`;
  bindGlobal();
  bindCharacters();
  initBuddy();
  initDoodles();
  const qDate = new URLSearchParams(location.search).get('date');
  await Promise.all([loadDates(), loadDay(/^\d{4}-\d{2}-\d{2}$/.test(qDate || '') ? qDate : undefined), new Promise((r) => setTimeout(r, reduceMotion ? 0 : 900))]);
  try { await document.fonts?.ready; } catch {}
  document.body.classList.add('is-ready');
  setTimeout(markReady, reduceMotion ? 0 : 350);
})();
