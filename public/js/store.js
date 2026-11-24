import { api, won, esc, optionText, icons, STATUS } from './shared.js';

const POLL_MS = 3000;
const ordersEl = document.querySelector('[data-orders]');
const doneEl = document.querySelector('[data-done]');
const summaryEl = document.querySelector('[data-summary]');
const clockEl = document.querySelector('[data-clock]');

const STEPS = [
  ['making', '제조 시작'],
  ['ready', '픽업 대기'],
  ['done', '전달 완료'],
];
const STEP_INDEX = { received: 0, making: 1, ready: 2, done: 3 };

let seen = null; // 이미 화면에 보여 준 주문번호
let lastPaint = '';

const items = (o) =>
  o.items
    .map((l) => {
      const options = optionText(l);
      return `<li><b>${esc(l.name)}</b>${options ? ` <span>${esc(options)}</span>` : ''}<em class="num">× ${l.qty}</em></li>`;
    })
    .join('');

function row(o, arriving) {
  const at = STEP_INDEX[o.status];
  const buttons = STEPS.map(([to, label], i) => {
    const state = i < at ? 'is-done' : i === at ? 'is-next' : 'is-later';
    return `<button type="button" class="s-act ${state}" data-to="${to}" ${state === 'is-next' ? '' : 'disabled'}>${state === 'is-done' ? icons.check : ''}${label}</button>`;
  }).join('');
  return `<article class="s-row s-${o.status}${arriving ? ' is-arriving' : ''}" data-no="${o.no}">
    <div class="s-no"><b class="num">${o.no}</b><span class="num">${o.orderedAt}</span></div>
    <div><span class="s-pill s-pill-${o.status}">${o.status === 'received' ? '새 주문' : STATUS[o.status]}</span></div>
    <div class="s-cust"><b>${esc(o.customer.name)}</b><span>끝번호 <span class="num">${esc(o.customer.phone4)}</span></span></div>
    <ul class="s-items">${items(o)}</ul>
    <div class="s-total num">${won(o.total)}<span>테스트 결제</span></div>
    <div class="s-actions">${buttons}</div>
  </article>`;
}

function doneRow(o) {
  const finished = o.history.at(-1)?.at ?? '';
  return `<div class="s-done-row">
    <b class="num">${o.no}</b>
    <span class="num">${o.orderedAt}</span>
    <span>${esc(o.customer.name)} · <span class="num">${esc(o.customer.phone4)}</span></span>
    <span>${o.items.map((l) => `${esc(l.name)} × ${l.qty}`).join(', ')}</span>
    <span class="s-total num">${won(o.total)}</span>
    <span class="num">${finished} 전달 완료</span>
  </div>`;
}

function render(data) {
  clockEl.textContent = data.time;
  const paint = JSON.stringify(data.orders.map((o) => [o.no, o.status]));
  if (paint === lastPaint) return;
  lastPaint = paint;

  const active = data.orders.filter((o) => o.status !== 'done');
  const done = data.orders.filter((o) => o.status === 'done');
  const count = (status) => data.orders.filter((o) => o.status === status).length;
  const arriving = new Set(seen ? data.orders.filter((o) => !seen.has(o.no)).map((o) => o.no) : []);
  seen = new Set(data.orders.map((o) => o.no));

  summaryEl.innerHTML = [
    ['received', '새 주문'],
    ['making', '제조 중'],
    ['ready', '픽업 대기'],
    ['done', '전달 완료'],
  ]
    .map(([status, label]) => `<div class="s-count${status === 'received' && count(status) ? ' is-new' : ''}"><span>${label}</span><b class="num">${count(status)}</b></div>`)
    .join('');

  ordersEl.innerHTML = active.length
    ? active.map((o) => row(o, arriving.has(o.no))).join('')
    : '<p class="s-empty"><b>아직 들어온 주문이 없어요</b>새 주문은 이 목록 맨 아래에 나타나요.</p>';

  doneEl.innerHTML = done.length
    ? `<h2>전달 완료 ${done.length}건</h2><div class="s-done-list">${done.slice().reverse().map(doneRow).join('')}</div>`
    : '';
}

async function load() {
  const { ok, data } = await api('/api/store/orders').catch(() => ({ ok: false }));
  if (ok) render(data);
}

ordersEl.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-to]');
  if (!button || button.disabled) return;
  button.disabled = true;
  const no = button.closest('[data-no]').dataset.no;
  await api(`/api/store/orders/${no}/status`, { method: 'POST', body: { status: button.dataset.to } });
  await load();
});

// 시연 화면에서 시각을 바꾸거나 초기화하면 바로 다시 읽는다.
window.addEventListener('message', (event) => {
  if (event.origin === location.origin && event.data?.type === 'pickupon:refresh') load();
});

load();
setInterval(load, POLL_MS);
