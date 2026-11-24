import express from 'express';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, MENU, OPTION_PRICES, MAX_SHOTS, MAX_QTY, buildLine, OrderInputError } from './menu.js';
import { createClock, normalizeTime } from './clock.js';
import { HOURS, CLOSED_MESSAGE, isWithinBusinessHours } from './hours.js';
import { createOrderBook, STATUS, NEXT_STATUS } from './orders.js';
import { runAcceptance } from './acceptance.js';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const page = (name) => (req, res) => res.sendFile(name, { root: publicDir });

/** 앱 하나 = 메뉴 + 시연 시각 + 주문 저장소. 인수조건 점검은 이 함수로 별도 인스턴스를 만든다. */
export function createApp() {
  const app = express();
  const clock = createClock();
  const orders = createOrderBook();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  // 화면
  app.get('/', page('index.html'));
  app.get('/store', page('store.html'));
  app.get('/demo', page('demo.html'));
  app.get('/acceptance', page('acceptance.html'));
  app.use(express.static(publicDir, { index: false }));

  const clockState = () => ({ mode: clock.mode, time: clock.now(), hours: HOURS });

  // 메뉴
  app.get('/api/menu', (req, res) => {
    res.json({ categories: CATEGORIES, items: MENU, optionPrices: OPTION_PRICES, maxShots: MAX_SHOTS, maxQty: MAX_QTY, hours: HOURS });
  });

  // 시연 시각
  app.get('/api/clock', (req, res) => res.json(clockState()));
  app.put('/api/clock', (req, res) => {
    if (req.body?.mode === 'real') {
      clock.useReal();
    } else {
      const time = normalizeTime(req.body?.time);
      if (!time) return res.status(400).json({ code: 'INVALID_TIME', message: '시각은 HH:MM 또는 HH:MM:SS로 보내 주세요' });
      clock.fix(time);
    }
    res.json(clockState());
  });

  // 주문하기(테스트 결제)
  app.post('/api/orders', (req, res) => {
    const body = req.body ?? {};
    const time = clock.now();

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return res.status(400).json({ code: 'EMPTY_CART', message: '장바구니가 비어 있습니다' });

    let lines;
    try {
      lines = items.map(buildLine);
    } catch (error) {
      if (error instanceof OrderInputError) return res.status(400).json({ code: error.code, message: error.message });
      throw error;
    }

    const name = String(body.customer?.name ?? '').trim();
    const phone4 = String(body.customer?.phone4 ?? '').trim();
    if (!name || name.length > 10) return res.status(400).json({ code: 'INVALID_CUSTOMER', message: '이름을 1~10자로 입력해 주세요' });
    if (!/^\d{4}$/.test(phone4)) return res.status(400).json({ code: 'INVALID_CUSTOMER', message: '휴대폰 끝 4자리를 숫자로 입력해 주세요' });

    if (!isWithinBusinessHours(time)) {
      return res.status(409).json({ code: 'OUT_OF_HOURS', message: CLOSED_MESSAGE, time });
    }

    if (body.payment?.method !== 'test') {
      return res.status(400).json({ code: 'PAYMENT_METHOD', message: '지금은 테스트 결제만 할 수 있습니다' });
    }

    const total = lines.reduce((sum, line) => sum + line.amount, 0);
    const order = orders.add({
      customer: { name, phone4 },
      items: lines,
      total,
      payment: { method: 'test', label: '테스트 결제', status: 'approved', amount: total },
      status: 'received',
      orderedAt: time,
      history: [{ status: 'received', at: time }],
    });
    res.status(201).json({ order });
  });

  // 내 주문 상태
  app.get('/api/orders/:no', (req, res) => {
    const order = orders.find(Number(req.params.no));
    if (!order) return res.status(404).json({ code: 'NOT_FOUND', message: '주문을 찾을 수 없습니다' });
    res.json({ order });
  });

  // 매장 주문 목록(오래된 주문이 위, 새 주문이 맨 아래)
  app.get('/api/store/orders', (req, res) => {
    res.json({ ...clockState(), orders: orders.all() });
  });

  app.post('/api/store/orders/:no/status', (req, res) => {
    const order = orders.find(Number(req.params.no));
    if (!order) return res.status(404).json({ code: 'NOT_FOUND', message: '주문을 찾을 수 없습니다' });
    const next = req.body?.status;
    if (NEXT_STATUS[order.status] !== next) {
      return res.status(409).json({ code: 'INVALID_STATUS', message: `'${STATUS[order.status]}' 다음 단계가 아닙니다` });
    }
    order.status = next;
    order.history.push({ status: next, at: clock.now() });
    res.json({ order });
  });

  // 시연 도구
  app.post('/api/demo/reset', (req, res) => {
    orders.reset();
    clock.useReal();
    res.json(clockState());
  });

  app.post('/api/acceptance/run', async (req, res) => {
    res.json(await runAcceptance(createApp));
  });

  app.use('/api', (req, res) => res.status(404).json({ code: 'NOT_FOUND', message: '없는 주소입니다' }));
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    const status = error.status ?? error.statusCode ?? 500;
    if (status >= 500) console.error(error);
    res.status(status).json({
      code: status < 500 ? 'BAD_REQUEST' : 'SERVER_ERROR',
      message: status < 500 ? '요청 형식이 올바르지 않습니다' : '서버에서 오류가 났습니다',
    });
  });

  return app;
}
