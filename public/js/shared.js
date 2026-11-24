// 고객 화면과 매장 화면이 함께 쓰는 도구

export const STATUS = { received: '접수', making: '제조 중', ready: '픽업 대기', done: '전달 완료' };

export const won = (n) => `${Number(n).toLocaleString('ko-KR')}원`;

export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export function optionText(line) {
  const parts = [];
  if (line.temp) parts.push(line.temp);
  if (line.size) parts.push(line.size);
  if (line.shots) parts.push(`샷 추가 ${line.shots}`);
  return parts.join(' · ');
}

export async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(path, {
    method,
    cache: 'no-store',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

const svg = (paths, size = 24, stroke = 2) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

export const icons = {
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  next: svg('<path d="M9 6l6 6-6 6"/>', 18),
  bag: svg('<path d="M5 8h14l-1.1 11.2a2 2 0 0 1-2 1.8H8.1a2 2 0 0 1-2-1.8z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 20),
  minus: svg('<path d="M5 12h14"/>', 20),
  plusSm: svg('<path d="M12 6v12M6 12h12"/>', 14, 2.2),
  minusSm: svg('<path d="M6 12h12"/>', 14, 2.2),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 16, 2.4),
  cross: svg('<path d="M7 7l10 10M17 7L7 17"/>', 16, 2.4),
  refresh: svg('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>', 14),
};

// 메뉴 그림: 외부 이미지 없이 SVG로 그린다.
const LINE = '#d6ccbf';
const ART = {
  americano: { tile: '#eee4d8', liquid: '#4b2e1f' },
  'cafe-latte': { tile: '#f1e7db', liquid: '#a8764f', milk: '#ecdcc6' },
  'vanilla-latte': { tile: '#f4ecdd', liquid: '#c49a66', milk: '#f3e7cf' },
  'cold-brew': { tile: '#e8e2d9', liquid: '#2f1d13' },
  'grapefruit-ade': { tile: '#f9e5dc', liquid: '#ea7d60', bubbles: true },
  'green-tea-latte': { tile: '#e9efdd', liquid: '#86a352', milk: '#dbe7c2' },
  croissant: { tile: '#f5ebd8' },
  bagel: { tile: '#f0e6d9' },
};

function hotCup(a) {
  return `
  <path d="M49 21c-4 5 4 8 0 14M63 18c-4 5 4 8 0 14" fill="none" stroke="#cdbfaf" stroke-width="2.5" stroke-linecap="round"/>
  <ellipse cx="58" cy="96" rx="40" ry="7.5" fill="#fff" stroke="${LINE}" stroke-width="2"/>
  <path d="M86 56h4.5a10.5 10.5 0 0 1 0 21H84" fill="none" stroke="${LINE}" stroke-width="8" stroke-linecap="round"/>
  <path d="M86 56h4.5a10.5 10.5 0 0 1 0 21H84" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
  <path d="M27 48h62l-5.5 36a13 13 0 0 1-12.9 11H45.4a13 13 0 0 1-12.9-11z" fill="#fff" stroke="${LINE}" stroke-width="2" stroke-linejoin="round"/>
  <ellipse cx="58" cy="48" rx="31" ry="7" fill="#fff" stroke="${LINE}" stroke-width="2"/>
  <ellipse cx="58" cy="48.5" rx="26" ry="5" fill="${a.liquid}"/>
  ${a.milk ? `<ellipse cx="58" cy="48.5" rx="14" ry="2.6" fill="${a.milk}"/>` : ''}`;
}

function icedCup(a) {
  const milk = a.milk
    ? `<path d="M37.6 74H82.4l-2.2 22.6a5 5 0 0 1-5 4.4H44.8a5 5 0 0 1-5-4.4z" fill="${a.milk}"/>`
    : '';
  const bubbles = a.bubbles
    ? '<g fill="#fff" fill-opacity=".7"><circle cx="47" cy="82" r="2.2"/><circle cx="63" cy="90" r="1.8"/><circle cx="71" cy="76" r="2.4"/><circle cx="54" cy="94" r="1.6"/><circle cx="76" cy="88" r="1.5"/></g>'
    : '';
  return `
  <path d="M66 50L74 8" stroke="${LINE}" stroke-width="8" stroke-linecap="round"/>
  <path d="M66 50L74 8" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M31 30h58l-7 67a6 6 0 0 1-6 5.4H44a6 6 0 0 1-6-5.4z" fill="#fff" fill-opacity=".6" stroke="${LINE}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M34.7 46h50.6l-5.1 50.6a5 5 0 0 1-5 4.4H44.8a5 5 0 0 1-5-4.4z" fill="${a.liquid}"/>
  ${milk}${bubbles}
  <g fill="#fff">
    <rect x="42" y="41" width="16" height="16" rx="3.5" fill-opacity=".75" transform="rotate(-14 50 49)"/>
    <rect x="61" y="45" width="15" height="15" rx="3.5" fill-opacity=".6" transform="rotate(12 68.5 52.5)"/>
    <rect x="50" y="59" width="14" height="14" rx="3.5" fill-opacity=".35" transform="rotate(8 57 66)"/>
  </g>
  <rect x="27" y="25" width="66" height="8" rx="4" fill="#fff" stroke="${LINE}" stroke-width="2"/>`;
}

function croissant() {
  return `
  <ellipse cx="60" cy="88" rx="42" ry="6" fill="#000" fill-opacity=".06"/>
  <path d="M14 80c2-20 20-37 46-37s44 17 46 37c-6-5-13-6-19-2-4-9-11-14-27-14s-23 5-27 14c-6-4-13-3-19 2z" fill="#dea455" stroke="#b57a33" stroke-width="2" stroke-linejoin="round"/>
  <path d="M33 77c2-12 8-21 16-28M87 77c-2-12-8-21-16-28M60 66V44" fill="none" stroke="#b57a33" stroke-width="2" stroke-linecap="round"/>
  <path d="M45 52c9-4 21-4 30 0" fill="none" stroke="#f2c987" stroke-width="3" stroke-linecap="round"/>`;
}

function bagel(a) {
  const seeds = [[42, 40, 20], [70, 35, -30], [85, 57, 60], [77, 80, 15], [47, 83, -40], [35, 62, 80], [57, 30, 0], [88, 72, -10], [30, 48, 30]]
    .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="1.8" ry="1" transform="rotate(${r} ${x} ${y})"/>`)
    .join('');
  return `
  <ellipse cx="60" cy="96" rx="38" ry="6" fill="#000" fill-opacity=".06"/>
  <circle cx="60" cy="60" r="34" fill="#c88e53" stroke="#a46c36" stroke-width="2"/>
  <circle cx="60" cy="60" r="23" fill="none" stroke="#dca86c" stroke-width="7" stroke-opacity=".75"/>
  <circle cx="60" cy="60" r="10" fill="${a.tile}" stroke="#a46c36" stroke-width="2"/>
  <g fill="#f7ead0">${seeds}</g>`;
}

export const artTile = (id) => (ART[id] ?? ART.americano).tile;

export function menuArt(id, temp) {
  const a = ART[id] ?? ART.americano;
  let body;
  if (id === 'croissant') body = croissant();
  else if (id === 'bagel') body = bagel(a);
  else body = temp === 'ICE' ? icedCup(a) : hotCup(a);
  return `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">${body}</svg>`;
}
