// 상주시 캐릭터 도리·수니 — 인라인 SVG (web/assets/*.png 를 참고해 다시 그림)
// 파트별 <g>: body, armL, armR, head, leaf|flower, eyes, mouth, tray(도리)
// id는 인스턴스마다 접두어를 붙여 중복을 피하고, 애니메이션은 class(.ch-*)로 건다.
const OUT = '#5b3418';        // 진한 갈색 외곽선
const ORANGE = '#F08A24';     // 곶감 주황
const ORANGE_D = '#d9701a';
const LEAF = '#5c9a3a';
const CHEEK = '#f7a3a0';
const SW = 4.2;               // 굵은 손그림 외곽선

let seq = 0;

const LABEL = {
  dori: '상주시 캐릭터 도리: 곶감 쟁반을 든 주황 곶감 모자의 아이',
  suni: '상주시 캐릭터 수니: 노란 꽃을 단 채 윙크하며 손을 흔드는 아이',
};

function head(kind, p) {
  const face = `<path d="M100 44c-37 .4-66 27.6-66 65.6 0 36.6 28.6 64 66.4 64 37.6 0 65.8-27.8 65.4-64.6C165.4 70.4 137 43.6 100 44z" fill="#fff" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  const hair = kind === 'dori'
    ? `<path d="M35.4 114C31 66 63.4 39.6 100.4 39.4c37.2-.2 68.6 27.4 64.2 74.6-6.2-8.8-12.2-16.6-24.4-20.2-6.6-7.8-18.4-12.6-28.6-8.6-8.4-6.6-21.6-6.4-30 .6-10.6-3.4-22.4 1.4-28.8 9.4-8.8 3.8-13.6 10.4-17.4 18.8z" fill="${ORANGE}" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>
       <path d="M58 70c6-10 15-16 25-19" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".55"/>`
    : `<path d="M33.6 134C24 76 60 39.6 100.4 39.4c40.6-.2 76.2 35 66.2 94.6-7.4-1.6-11-9.8-12.6-21.4-6.8-11-17.2-19.6-30.6-19.4-7.6-7-22-8-30.6-.4-12.2-2.2-24.4 3.6-31 13.6-5.4 6.4-6 13.8-7.4 18.4-2 5-5.6 8.6-10.8 9.2z" fill="${ORANGE}" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>
       <path d="M56 72c6-10 16-17 27-20" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".55"/>`;
  const top = kind === 'dori'
    ? `<g class="ch-leaf" id="${p}-leaf" style="transform-origin:100px 42px">
         <path d="M100 42c-6-11-22-14-29-8 7 6 18 9 29 8zM100 42c6-11 22-14 29-8-7 6-18 9-29 8z" fill="${LEAF}" stroke="${OUT}" stroke-width="3.2" stroke-linejoin="round"/>
         <path d="M100 42c-1-9 1-16 7-21" stroke="${OUT}" stroke-width="4" fill="none" stroke-linecap="round"/>
       </g>`
    : `<g class="ch-flower" id="${p}-flower" style="transform-origin:100px 40px">
         <path d="M90 44c-8 2-14 0-17-5 6-4 13-3 17 5zM110 44c8 2 14 0 17-5-6-4-13-3-17 5z" fill="${LEAF}" stroke="${OUT}" stroke-width="2.8" stroke-linejoin="round"/>
         ${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="100" cy="23" rx="7" ry="9.5" transform="rotate(${a} 100 35)" fill="#ffd84a" stroke="${OUT}" stroke-width="2.6"/>`).join('')}
         <circle cx="100" cy="35" r="6.2" fill="${ORANGE_D}" stroke="${OUT}" stroke-width="2.6"/>
       </g>`;
  const eyes = kind === 'dori'
    ? `<g class="ch-look" id="${p}-eyes">
         <g class="ch-eye" style="transform-origin:80px 120px"><ellipse cx="80" cy="120" rx="6" ry="8.6" fill="${OUT}"/><circle cx="82.2" cy="116.4" r="2.2" fill="#fff"/></g>
         <g class="ch-eye" style="transform-origin:120px 120px"><ellipse cx="120" cy="120" rx="6" ry="8.6" fill="${OUT}"/><circle cx="122.2" cy="116.4" r="2.2" fill="#fff"/></g>
       </g>`
    : `<g class="ch-look" id="${p}-eyes">
         <path class="ch-wink" d="M71 122c5-8 13-8 18 0" stroke="${OUT}" stroke-width="4.6" fill="none" stroke-linecap="round"/>
         <g class="ch-eye ch-eye--wink" style="transform-origin:121px 119px"><ellipse cx="121" cy="119" rx="6.4" ry="9" fill="${OUT}"/><circle cx="123.4" cy="115.2" r="2.4" fill="#fff"/></g>
       </g>`;
  const mouth = kind === 'dori'
    ? `<path class="ch-mouth" id="${p}-mouth" d="M90 136c2.6 5 7.4 5 10 0 2.6 5 7.4 5 10 0" stroke="${OUT}" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<g class="ch-mouth" id="${p}-mouth" style="transform-origin:100px 138px">
         <path d="M88 134c3 15 21 15 24 0-8 1.6-16 1.6-24 0z" fill="#8d2f1d" stroke="${OUT}" stroke-width="3.2" stroke-linejoin="round"/>
         <path d="M93.6 142.4c3.6-3.4 9.2-3.4 12.8 0-3.6 3.6-9.2 3.6-12.8 0z" fill="#f58c8c"/>
       </g>`;
  const cheeks = `<ellipse cx="62" cy="139" rx="11" ry="6.6" fill="${CHEEK}" opacity=".85"/><ellipse cx="138" cy="139" rx="11" ry="6.6" fill="${CHEEK}" opacity=".85"/>`;
  return `<g class="ch-head" id="${p}-head" style="transform-origin:100px 172px">${face}${hair}${top}${cheeks}${eyes}${mouth}</g>`;
}

function body(p) {
  return `<g class="ch-body" id="${p}-body">
    <path d="M70 162c-9 22-11 46-3 62 4 6 13 7 18 3l3-6h24l3 6c5 4 14 3 18-3 8-16 6-40-3-62z" fill="#fff" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>
    <path d="M100 206v16" stroke="${OUT}" stroke-width="3" stroke-linecap="round" opacity=".6"/>
  </g>`;
}

function dori(p) {
  const persimmon = (x, y, r) => `<g><circle cx="${x}" cy="${y}" r="${r}" fill="${ORANGE}" stroke="${OUT}" stroke-width="3"/><path d="M${x - 5} ${y - r + 2}c3 2 7 2 10 0" stroke="${LEAF}" stroke-width="3.4" fill="none" stroke-linecap="round"/><circle cx="${x - r / 2.6}" cy="${y - r / 3}" r="${r / 5}" fill="#fff" opacity=".55"/></g>`;
  return `${body(p)}
    ${head('dori', p)}
    <g class="ch-tray" id="${p}-tray" style="transform-origin:100px 196px">
      ${persimmon(77, 182, 12.5)}${persimmon(123, 182, 12.5)}${persimmon(100, 177, 13.5)}${persimmon(89, 189, 11)}${persimmon(112, 189, 11)}
      <path d="M38 192c2 12 28 20 62 20s60-8 62-20c-20 6-41 8-62 8s-42-2-62-8z" fill="#b5763a" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M38 192c20 6 41 8 62 8s42-2 62-8" stroke="#e0a868" stroke-width="2.4" fill="none" opacity=".8"/>
    </g>
    <g class="ch-armL" id="${p}-armL" style="transform-origin:62px 180px"><path d="M66 176c-12 3-24 10-26 18 0 6 8 8 14 5 6-3 10-8 14-12" fill="#fff" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round"/></g>
    <g class="ch-armR" id="${p}-armR" style="transform-origin:138px 180px"><path d="M134 176c12 3 24 10 26 18 0 6-8 8-14 5-6-3-10-8-14-12" fill="#fff" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round"/></g>`;
}

function suni(p) {
  return `<g class="ch-armL" id="${p}-armL" style="transform-origin:70px 180px"><path d="M72 176c-12 6-18 16-16 24 2 6 10 6 13 0 2-5 5-10 8-14" fill="#fff" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round"/></g>
    ${body(p)}
    ${head('suni', p)}
    <g class="ch-armR" id="${p}-armR" style="transform-origin:132px 184px">
      <path d="M128 182c14-4 26-16 32-32 2-6 6-12 12-11 7 1 8 8 6 14-6 18-20 34-42 42" fill="#fff" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M174 140c0-9 2-16 7-17 5 0 5 7 2 17" fill="#fff" stroke="${OUT}" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/>
    </g>`;
}

/** 캐릭터 SVG 문자열. label=false 면 장식용(aria-hidden) */
export function charaSVG(kind = 'dori', { label } = {}) {
  const k = kind === 'suni' ? 'suni' : 'dori';
  const p = `${k}${++seq}`;
  const text = label === false ? '' : (label || LABEL[k]);
  const a11y = text ? `role="img" aria-label="${text}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="ch ch--${k}" id="${p}" viewBox="0 0 200 240" ${a11y}>
    <ellipse class="ch-shadow" cx="100" cy="232" rx="46" ry="5" fill="${OUT}" opacity=".14"/>
    <g class="ch-root" style="transform-origin:100px 230px">${k === 'dori' ? dori(p) : suni(p)}</g>
  </svg>`;
}
