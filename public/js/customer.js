import { api, won, esc, clamp, optionText, menuArt, artTile, icons, STATUS, STATUS_FLOW } from './shared.js';

const root = document.getElementById('app');
const KEYS = { cart: 'pickupon.cart', last: 'pickupon.lastOrder', customer: 'pickupon.customer' };
const POLL_MS = 3000;

let menu = null;
let timer = null;
let routeToken = 0;
let toast = '';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => (value == null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)));
const getCart = () => read(KEYS.cart, []);
const countOf = (lines) => lines.reduce((n, l) => n + l.qty, 0);
const totalOf = (lines) => lines.reduce((n, l) => n + l.unitPrice * l.qty, 0);
const unitPrice = (item, sel) =>
  item.price + (sel.size === 'Large' ? menu.optionPrices.large : 0) + sel.shots * menu.optionPrices.shot;

// 시연 화면(/demo)이 고른 옵션을 옆에 보여 줄 수 있게 알린다.
function tellParent(message) {
  if (window.parent !== window) window.parent.postMessage({ source: 'pickupon-customer', ...message }, location.origin);
}

function cartButton(count = countOf(getCart())) {
  return `<a class="c-icon-btn" href="#/cart" aria-label="장바구니 ${count}개">${icons.bag}${count ? `<span class="c-badge num">${count}</span>` : ''}</a>`;
}

function topBar(title, back, { cart = false } = {}) {
  return `<header class="c-top">
    <a class="c-icon-btn" href="${back}" aria-label="뒤로">${icons.back}</a>
    <h1 class="c-top-title">${title}</h1>
    ${cart ? cartButton() : '<span></span>'}
  </header>`;
}

const bottom = (inner) => `<div class="c-bottom"><div class="c-bottom-inner">${inner}</div></div>`;

function showToast() {
  if (!toast) return;
  const el = document.createElement('div');
  el.className = 'c-toast';
  el.setAttribute('role', 'status');
  el.textContent = toast;
  toast = '';
  root.append(el);
  setTimeout(() => el.remove(), 1900);
}

/* 메뉴 목록 보기 */
function renderMenu() {
  const lines = getCart();
  const count = countOf(lines);
  const last = read(KEYS.last, null);
  root.innerHTML = `
  <div class="c-page${count ? ' has-bottom' : ''}">
    <header class="c-home">
      <div>
        <p class="c-brand">픽업온</p>
        <h1 class="c-store">하루빈 역삼점</h1>
        <p class="c-meta">영업시간 ${menu.hours.open}~${menu.hours.close} · 매장에서 받아 가요</p>
      </div>
      ${cartButton(count)}
    </header>
    ${last ? `<a class="c-last" href="#/order/${last.no}">주문번호 <b class="num">${last.no}</b><span class="c-last-status" data-last-status>상태 보기</span>${icons.next}</a>` : ''}
    ${menu.categories
      .map(
        (cat) => `
      <section class="c-section">
        <h2>${cat.name}</h2>
        <ul class="c-list">${menu.items.filter((m) => m.category === cat.id).map(itemRow).join('')}</ul>
      </section>`,
      )
      .join('')}
    ${count ? bottom(`<a class="btn btn-primary c-cartbar" href="#/cart"><span>장바구니 보기</span><span class="num">${count}개 · ${won(totalOf(lines))}</span></a>`) : ''}
  </div>`;
  if (last) refreshLastOrder(last.no);
  showToast();
}

function itemRow(item) {
  const iceOnly = item.temps.length === 1;
  return `<li><a class="c-item" href="#/menu/${item.id}">
    <span class="c-thumb" style="--tile:${artTile(item.id)}">${menuArt(item.id, item.temps[0])}</span>
    <span class="c-item-body">
      <span class="c-item-name">${esc(item.name)}${iceOnly ? '<span class="c-tag">ICE만</span>' : ''}</span>
      <span class="c-item-desc">${esc(item.description)}</span>
      <span class="c-item-price num">${won(item.price)}</span>
    </span>
  </a></li>`;
}

async function refreshLastOrder(no) {
  const { ok, data } = await api(`/api/orders/${no}`);
  if (!ok || data.order.status === 'done') {
    write(KEYS.last, null);
    root.querySelector('.c-last')?.remove();
    return;
  }
  const el = root.querySelector('[data-last-status]');
  if (el) el.textContent = STATUS[data.order.status];
}

/* 메뉴 옵션 고르기 */
function renderDetail(id) {
  const item = menu.items.find((m) => m.id === id);
  if (!item) return location.replace('#/');
  const sel = { temp: item.temps[0] ?? null, size: item.sizes ? 'Regular' : null, shots: 0, qty: 1 };
  const hasOptions = item.temps.length || item.sizes || item.shots;

  root.innerHTML = `
  <div class="c-page has-bottom c-detail">
    ${topBar('', '#/', { cart: true })}
    <div class="c-hero" style="--tile:${artTile(item.id)}" data-art></div>
    <div class="c-detail-head">
      <h1>${esc(item.name)}</h1>
      <p class="c-desc">${esc(item.description)}</p>
      <p class="c-price num" data-unit></p>
    </div>
    ${item.temps.length ? `
    <section class="c-opt" data-opt="temp">
      <div class="c-opt-head"><h2>온도</h2>${item.temps.length === 1 ? '<span class="c-opt-note">ICE만 주문할 수 있어요</span>' : ''}</div>
      <div class="c-seg">${['HOT', 'ICE'].map((t) => `<button type="button" data-temp="${t}" ${item.temps.includes(t) ? '' : 'disabled'}>${t}</button>`).join('')}</div>
    </section>` : ''}
    ${item.sizes ? `
    <section class="c-opt" data-opt="size">
      <div class="c-opt-head"><h2>사이즈</h2></div>
      <div class="c-seg">
        <button type="button" data-size="Regular">Regular</button>
        <button type="button" data-size="Large">Large <small>+${won(menu.optionPrices.large)}</small></button>
      </div>
    </section>` : ''}
    ${item.shots ? `
    <section class="c-opt c-opt-row" data-opt="shot">
      <div><h2>샷 추가</h2><p class="c-opt-sub">+${won(menu.optionPrices.shot)} · 최대 ${menu.maxShots}회</p></div>
      <div class="c-shot">
        <button type="button" data-shot="-1" aria-label="샷 빼기">${icons.minusSm}</button>
        <output class="num" data-shots></output>
        <button type="button" data-shot="1" aria-label="샷 추가">${icons.plusSm}</button>
      </div>
    </section>` : ''}
    ${hasOptions ? '' : '<p class="c-opt-none">베이커리는 고를 옵션이 없어요.</p>'}
    <section class="c-opt c-opt-row" data-opt="qty">
      <div><h2>수량</h2></div>
      <div class="c-qty">
        <button type="button" data-qty="-1" aria-label="수량 빼기">${icons.minus}</button>
        <output class="num" data-qty-value></output>
        <button type="button" data-qty="1" aria-label="수량 더하기">${icons.plus}</button>
      </div>
    </section>
    ${bottom('<button type="button" class="btn btn-primary btn-block" data-add>장바구니 담기 · <span class="num" data-total></span></button>')}
  </div>`;

  const page = root.querySelector('.c-detail');
  const $ = (sel) => page.querySelector(sel);
  let shownTemp;

  const sync = () => {
    page.querySelectorAll('[data-temp]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.temp === sel.temp)));
    page.querySelectorAll('[data-size]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.size === sel.size)));
    if (item.shots) {
      $('[data-shots]').textContent = sel.shots;
      $('[data-shot="-1"]').disabled = sel.shots <= 0;
      $('[data-shot="1"]').disabled = sel.shots >= menu.maxShots;
    }
    $('[data-qty-value]').textContent = sel.qty;
    $('[data-qty="-1"]').disabled = sel.qty <= 1;
    $('[data-qty="1"]').disabled = sel.qty >= menu.maxQty;
    if (shownTemp !== sel.temp) {
      $('[data-art]').innerHTML = menuArt(item.id, sel.temp);
      shownTemp = sel.temp;
    }
    const unit = unitPrice(item, sel);
    $('[data-unit]').textContent = won(unit);
    $('[data-total]').textContent = won(unit * sel.qty);
    tellParent({ type: 'selection', name: item.name, options: optionText(sel), qty: sel.qty, total: unit * sel.qty });
  };

  page.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const d = button.dataset;
    if (d.temp) sel.temp = d.temp;
    else if (d.size) sel.size = d.size;
    else if (d.shot) sel.shots = clamp(sel.shots + Number(d.shot), 0, menu.maxShots);
    else if (d.qty) sel.qty = clamp(sel.qty + Number(d.qty), 1, menu.maxQty);
    else if ('add' in d) return addToCart(item, sel);
    sync();
  });
  sync();
}

function addToCart(item, sel) {
  const lines = getCart();
  const key = [item.id, sel.temp, sel.size, sel.shots].join('|');
  const same = lines.find((l) => l.key === key);
  if (same) same.qty = Math.min(menu.maxQty, same.qty + sel.qty);
  else lines.push({ key, menuId: item.id, name: item.name, temp: sel.temp, size: sel.size, shots: sel.shots, qty: sel.qty, unitPrice: unitPrice(item, sel) });
  write(KEYS.cart, lines);
  toast = '장바구니에 담았어요';
  location.hash = '#/';
}

/* 장바구니 */
function renderCart() {
  const lines = getCart();
  root.innerHTML = `
  <div class="c-page has-bottom c-cart">
    ${topBar('장바구니', '#/')}
    ${
      lines.length
        ? `<ul class="c-lines">${lines.map(cartLine).join('')}</ul>
      <a class="c-more" href="#/">${icons.plusSm} 메뉴 더 담기</a>
      <dl class="c-sum"><dt>합계</dt><dd class="num">${won(totalOf(lines))}</dd></dl>`
        : `<div class="c-empty">
        <p class="c-empty-title">장바구니가 비어 있어요</p>
        <p class="c-empty-sub">메뉴를 담으면 여기에서 한 번에 주문할 수 있어요.</p>
        <a class="btn btn-secondary" href="#/">메뉴 보러 가기</a>
      </div>`
    }
    ${bottom(`<button type="button" class="btn btn-primary btn-block" data-checkout ${lines.length ? '' : 'disabled'}>주문하기</button>`)}
  </div>`;

  root.querySelector('.c-cart').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if ('checkout' in button.dataset) {
      location.hash = '#/checkout';
      return;
    }
    const next = getCart();
    const line = next.find((l) => l.key === button.closest('[data-key]')?.dataset.key);
    if (!line) return;
    if ('remove' in button.dataset) next.splice(next.indexOf(line), 1);
    else if (button.dataset.step) line.qty = clamp(line.qty + Number(button.dataset.step), 1, menu.maxQty);
    write(KEYS.cart, next);
    renderCart();
  });
}

function cartLine(l) {
  const options = optionText(l);
  return `<li class="c-line" data-key="${esc(l.key)}">
    <span class="c-thumb c-thumb-sm" style="--tile:${artTile(l.menuId)}">${menuArt(l.menuId, l.temp)}</span>
    <div class="c-line-body">
      <p class="c-line-name">${esc(l.name)}</p>
      ${options ? `<p class="c-line-opt">${esc(options)}</p>` : ''}
      <p class="c-line-price num">${won(l.unitPrice * l.qty)}</p>
    </div>
    <div class="c-line-side">
      <button type="button" class="c-text-btn" data-remove>삭제</button>
      <div class="c-qty c-qty-sm">
        <button type="button" data-step="-1" aria-label="수량 빼기" ${l.qty <= 1 ? 'disabled' : ''}>${icons.minusSm}</button>
        <output class="num">${l.qty}</output>
        <button type="button" data-step="1" aria-label="수량 더하기" ${l.qty >= menu.maxQty ? 'disabled' : ''}>${icons.plusSm}</button>
      </div>
    </div>
  </li>`;
}

const miniLines = (lines) =>
  lines
    .map((l) => {
      const options = optionText(l);
      return `<li><span>${esc(l.name)}${options ? `<small>${esc(options)}</small>` : ''}</span><span class="num">× ${l.qty}</span><span class="num">${won(l.unitPrice * l.qty)}</span></li>`;
    })
    .join('');

/* 주문하기(테스트 결제) */
function renderCheckout() {
  const lines = getCart();
  if (!lines.length) return location.replace('#/cart');
  const saved = read(KEYS.customer, { name: '', phone4: '' });
  const total = totalOf(lines);

  root.innerHTML = `
  <div class="c-page has-bottom c-checkout">
    ${topBar('주문하기', '#/cart')}
    <section class="c-card">
      <h2>픽업 매장</h2>
      <p class="c-card-main">하루빈 역삼점</p>
      <p class="c-card-sub">음료가 준비되면 픽업대에서 이름과 끝번호로 불러 드려요.</p>
    </section>
    <section class="c-card">
      <h2>주문자</h2>
      <label class="c-field"><span>이름</span><input name="name" maxlength="10" autocomplete="off" placeholder="예: 김하루" value="${esc(saved.name)}" /></label>
      <label class="c-field"><span>휴대폰 끝 4자리</span><input name="phone4" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="숫자 4자리" value="${esc(saved.phone4)}" /></label>
      <p class="c-field-error" data-field-error hidden></p>
    </section>
    <section class="c-card">
      <h2>주문 메뉴 <span class="c-card-count">${countOf(lines)}개</span></h2>
      <ul class="c-mini">${miniLines(lines)}</ul>
      <dl class="c-sum c-sum-in"><dt>결제 금액</dt><dd class="num">${won(total)}</dd></dl>
    </section>
    <section class="c-card">
      <h2>결제 수단</h2>
      <div class="c-pay">
        <span class="c-pay-radio" aria-hidden="true"></span>
        <div>
          <p class="c-card-main">테스트 결제</p>
          <p class="c-card-sub">카드 결제를 연동하기 전이라 테스트 결제로 진행해요. 실제로 돈이 나가지 않아요.</p>
        </div>
      </div>
    </section>
    ${bottom(`<div class="c-alert" role="alert" data-alert hidden></div><button type="button" class="btn btn-primary btn-block" data-pay>테스트 결제 · <span class="num">${won(total)}</span></button>`)}
  </div>`;

  const page = root.querySelector('.c-checkout');
  const nameInput = page.querySelector('[name=name]');
  const phoneInput = page.querySelector('[name=phone4]');
  const fieldError = page.querySelector('[data-field-error]');
  const alertBox = page.querySelector('[data-alert]');
  const payButton = page.querySelector('[data-pay]');
  const payLabel = payButton.innerHTML;

  phoneInput.addEventListener('input', () => {
    phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 4);
  });

  payButton.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    const phone4 = phoneInput.value.trim();
    alertBox.hidden = true;
    const problem = !name ? '이름을 입력해 주세요.' : !/^\d{4}$/.test(phone4) ? '휴대폰 끝 4자리를 숫자로 입력해 주세요.' : '';
    fieldError.textContent = problem;
    fieldError.hidden = !problem;
    if (problem) return;

    write(KEYS.customer, { name, phone4 });
    payButton.disabled = true;
    payButton.textContent = '테스트 결제 진행 중…';
    await sleep(450);

    const items = getCart().map(({ menuId, temp, size, shots, qty }) => ({ menuId, temp, size, shots, qty }));
    const { status, data } = await api('/api/orders', {
      method: 'POST',
      body: { items, customer: { name, phone4 }, payment: { method: 'test' } },
    }).catch(() => ({ status: 0, data: {} }));

    if (status === 201) {
      write(KEYS.cart, []);
      write(KEYS.last, { no: data.order.no });
      location.hash = `#/order/${data.order.no}`;
      return;
    }
    alertBox.textContent = data.message ?? '주문을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.';
    alertBox.hidden = false;
    payButton.disabled = false;
    payButton.innerHTML = payLabel;
  });
}

/* 주문번호와 상태 */
const STATUS_COPY = {
  received: ['주문이 접수되었어요', '매장에서 곧 만들기 시작해요.'],
  making: ['음료를 만들고 있어요', '조금만 기다려 주세요.'],
  ready: ['픽업대에서 받아 가세요', '이름과 끝번호를 말씀해 주세요.'],
  done: ['전달이 끝났어요', '맛있게 드세요.'],
};

function orderBody(o) {
  const [title, sub] = STATUS_COPY[o.status];
  const at = STATUS_FLOW.indexOf(o.status);
  const stepClass = (i) => (o.status === 'done' || i < at ? 'is-done' : i === at ? 'is-current' : '');
  return `
  <section class="c-order-hero">
    <p class="c-order-label">주문번호</p>
    <p class="c-order-no num" data-order-no>${o.no}</p>
    <h2 class="c-order-title">${title}</h2>
    <p class="c-order-sub">${sub}</p>
    <p class="c-order-who">${esc(o.customer.name)} · 끝번호 <span class="num">${esc(o.customer.phone4)}</span> · <span class="num">${o.orderedAt}</span> 주문</p>
  </section>
  <ol class="c-steps" aria-label="진행 상태">${STATUS_FLOW.map((s, i) => `<li class="${stepClass(i)}">${STATUS[s]}</li>`).join('')}</ol>
  <section class="c-card">
    <h2>주문 메뉴</h2>
    <ul class="c-mini">${miniLines(o.items)}</ul>
    <dl class="c-sum c-sum-in"><dt>테스트 결제 완료</dt><dd class="num">${won(o.total)}</dd></dl>
  </section>
  <p class="c-refresh">${icons.refresh} 3초마다 상태를 새로 확인해요</p>`;
}

async function renderOrder(no, token) {
  root.innerHTML = `
  <div class="c-page has-bottom c-order">
    ${topBar('주문 상태', '#/')}
    <div data-body><p class="c-loading">주문을 불러오는 중…</p></div>
    ${bottom('<a class="btn btn-secondary btn-block" href="#/">메뉴 더 보기</a>')}
  </div>`;
  let shown = '';
  const load = async () => {
    const { ok, data } = await api(`/api/orders/${no}`).catch(() => ({ ok: false, data: {} }));
    if (token !== routeToken) return;
    const body = root.querySelector('.c-order [data-body]');
    if (!ok) {
      clearInterval(timer);
      body.innerHTML = `<div class="c-empty"><p class="c-empty-title">주문을 찾을 수 없어요</p><p class="c-empty-sub">없는 주문번호이거나 시연 데이터를 초기화했어요.</p><a class="btn btn-secondary" href="#/">메뉴로 가기</a></div>`;
      return;
    }
    if (data.order.status !== shown) {
      shown = data.order.status;
      body.innerHTML = orderBody(data.order);
    }
  };
  await load();
  if (token === routeToken) timer = setInterval(load, POLL_MS);
}

/* 화면 전환 */
function route() {
  routeToken += 1;
  clearInterval(timer);
  timer = null;
  const [page, param] = location.hash.replace(/^#\/?/, '').split('/');
  if (page !== 'menu') tellParent({ type: 'selection', none: true });
  if (page === 'menu' && param) renderDetail(param);
  else if (page === 'cart') renderCart();
  else if (page === 'checkout') renderCheckout();
  else if (page === 'order' && param) renderOrder(Number(param), routeToken);
  else renderMenu();
}

window.addEventListener('hashchange', () => {
  route();
  window.scrollTo(0, 0);
});

const { ok, data } = await api('/api/menu').catch(() => ({ ok: false }));
if (ok) {
  menu = data;
  route();
} else {
  root.innerHTML = '<p class="c-loading">메뉴를 불러오지 못했어요. 새로 고침해 주세요.</p>';
}
