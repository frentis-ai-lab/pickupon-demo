import { api, won } from './shared.js';

const $ = (sel) => document.querySelector(sel);
const customerFrame = $('[data-customer]');
const storeFrame = $('[data-store]');
const timeEl = $('[data-clock-time]');
const modeEl = $('[data-clock-mode]');
const phoneTimeEl = $('[data-phone-time]');
const presetButtons = [...document.querySelectorAll('[data-presets] button')];
const customForm = $('[data-custom]');
const resetButton = $('[data-reset]');
const viewButton = $('[data-view]');

function paintClock(clock) {
  timeEl.textContent = clock.time;
  phoneTimeEl.textContent = clock.time.slice(0, 5);
  const fixed = clock.mode === 'fixed';
  modeEl.textContent = fixed ? '고정' : '실제 시각';
  modeEl.classList.toggle('is-fixed', fixed);
  presetButtons.forEach((b) => {
    const on = fixed ? b.dataset.time === clock.time : b.dataset.time === 'real';
    b.setAttribute('aria-pressed', String(on));
  });
  const input = customForm.querySelector('input');
  if (fixed && document.activeElement !== input) input.value = clock.time;
}

async function loadClock() {
  const { ok, data } = await api('/api/clock').catch(() => ({ ok: false }));
  if (ok) paintClock(data);
}

function refreshStore() {
  storeFrame.contentWindow?.postMessage({ type: 'pickupon:refresh' }, location.origin);
}

async function setClock(body) {
  const { ok, data } = await api('/api/clock', { method: 'PUT', body });
  if (ok) paintClock(data);
  refreshStore();
}

presetButtons.forEach((button) =>
  button.addEventListener('click', () => setClock(button.dataset.time === 'real' ? { mode: 'real' } : { time: button.dataset.time })),
);

customForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = customForm.querySelector('input').value;
  if (value) setClock({ time: value });
});

// 초기화는 두 번 눌러야 실행한다(강의 중 실수 방지).
let armTimer = null;
resetButton.addEventListener('click', async () => {
  if (!resetButton.classList.contains('is-armed')) {
    resetButton.classList.add('is-armed');
    resetButton.textContent = '한 번 더 누르면 초기화';
    armTimer = setTimeout(() => {
      resetButton.classList.remove('is-armed');
      resetButton.textContent = '데이터 초기화';
    }, 3000);
    return;
  }
  clearTimeout(armTimer);
  resetButton.classList.remove('is-armed');
  resetButton.textContent = '데이터 초기화';
  const { data } = await api('/api/demo/reset', { method: 'POST' });
  ['pickupon.cart', 'pickupon.lastOrder', 'pickupon.customer'].forEach((key) => localStorage.removeItem(key));
  paintClock(data);
  customerFrame.src = '/';
  storeFrame.src = '/store';
});

// 고객 화면 크게 보기
function applyView(zoom) {
  document.body.classList.toggle('is-zoom', zoom);
  viewButton.textContent = zoom ? '나란히 보기' : '고객 화면 크게';
  const url = new URL(location.href);
  if (zoom) url.searchParams.set('view', 'zoom');
  else url.searchParams.delete('view');
  history.replaceState(null, '', url);
}
viewButton.addEventListener('click', () => applyView(!document.body.classList.contains('is-zoom')));
applyView(new URLSearchParams(location.search).get('view') === 'zoom');

// 고객 화면에서 고른 옵션을 옆 패널에 보여 준다.
window.addEventListener('message', (event) => {
  if (event.origin !== location.origin || event.data?.source !== 'pickupon-customer') return;
  const sel = event.data;
  if (sel.type !== 'selection') return;
  $('[data-sel-name]').textContent = sel.none ? '메뉴를 고르면 여기에 보여요' : sel.name;
  $('[data-sel-opt]').textContent = sel.none ? '' : [sel.options, `수량 ${sel.qty}`].filter(Boolean).join(' · ');
  $('[data-sel-price]').textContent = sel.none ? '' : won(sel.total);
});

loadClock();
setInterval(loadClock, 1000);
