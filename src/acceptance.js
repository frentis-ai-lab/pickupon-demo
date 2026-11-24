// '장바구니에 담아 주문하기' 스토리의 인수조건 1~5를 실제 API로 확인한다.
// 기준 문구는 BIBLE.md를 그대로 옮겼다. 코드의 상수를 가져다 쓰지 않는다(코드가 틀려도 시험은 기준을 지킨다).
import { once } from 'node:events';

const CLOSED_MESSAGE = '지금은 주문할 수 없습니다(영업시간 07:00~21:00)';
const SHOW_WITHIN_MS = 30_000;
const CUSTOMER = { name: '이수진', phone4: '0000' };
const AMERICANO = { menuId: 'americano', temp: 'ICE', size: 'Regular', shots: 0, qty: 1 };
const LATTE = { menuId: 'cafe-latte', temp: 'HOT', size: 'Large', shots: 1, qty: 1 };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const won = (n) => `${n.toLocaleString('ko-KR')}원`;

function describe(time, response) {
  if (response.status === 201) return `${time} 접수(주문번호 ${response.data.order.no})`;
  if (response.data?.message === CLOSED_MESSAGE) return `${time} 거절(안내 문구 표시)`;
  return `${time} 거절(응답 ${response.status}, 안내 문구 다름)`;
}

export const CONDITIONS = [
  {
    no: 1,
    kind: '정상',
    text: '장바구니에 메뉴 2개를 담고 [주문하기]를 누르면, 테스트 결제를 거쳐 주문번호가 나오고 매장 주문 목록에 같은 주문이 30초 안에 나타난다.',
    testName: '조건 1 (정상) 메뉴 2개를 주문하면 주문번호가 나오고 30초 안에 매장 목록에 나타난다',
    expected: '테스트 결제 승인, 주문번호 발급, 30초 안에 매장 목록에 같은 주문 표시',
    async run(api) {
      await api.at('10:00:00');
      const response = await api.order([AMERICANO, LATTE]);
      if (response.status !== 201) {
        return { pass: false, actual: `주문이 만들어지지 않음(응답 ${response.status}, ${response.data?.message ?? ''})` };
      }
      const order = response.data.order;
      const paid = order.payment?.method === 'test' && order.payment?.status === 'approved';

      const started = Date.now();
      let shown = null;
      while (!shown && Date.now() - started <= SHOW_WITHIN_MS) {
        shown = (await api.storeOrders()).find((o) => o.no === order.no) ?? null;
        if (!shown) await sleep(500);
      }
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      api.log(`GET /api/store/orders → 주문번호 ${order.no} ${shown ? `${seconds}초 만에 확인` : '30초 동안 없음'}`);

      const same = Boolean(shown) && shown.items.length === 2 && shown.total === order.total;
      return {
        pass: paid && same,
        actual: [
          paid ? '테스트 결제 승인' : '결제 승인 없음',
          `주문번호 ${order.no} 발급`,
          same ? `${seconds}초 만에 매장 목록에 같은 주문(메뉴 2개, ${won(order.total)}) 표시` : '30초 안에 매장 목록에 같은 주문이 나타나지 않음',
        ].join(', '),
      };
    },
  },
  {
    no: 2,
    kind: '예외',
    text: '장바구니가 비어 있으면 [주문하기]를 누를 수 없다.',
    testName: '조건 2 (예외) 장바구니가 비어 있으면 주문할 수 없다',
    expected: '빈 장바구니 주문 거절, 저장되는 주문 없음(고객 화면의 [주문하기]는 비활성)',
    async run(api) {
      await api.at('10:00:00');
      const before = (await api.storeOrders()).length;
      const response = await api.order([]);
      const saved = (await api.storeOrders()).length - before;
      const rejected = response.status === 400 && response.data?.code === 'EMPTY_CART';
      return {
        pass: rejected && saved === 0,
        actual: `${rejected ? '빈 장바구니 주문 거절(응답 400)' : `주문 요청이 받아들여짐(응답 ${response.status})`}, 새로 저장된 주문 ${saved}건`,
      };
    },
  },
  {
    no: 3,
    kind: '예외',
    text: '영업시간(07:00~21:00)이 아니면 "지금은 주문할 수 없습니다(영업시간 07:00~21:00)"를 표시하고 주문을 저장하지 않는다.',
    testName: '조건 3 (예외) 영업시간이 아니면 안내 문구를 보여 주고 주문을 저장하지 않는다',
    expected: '06:59:00, 21:01:00 모두 거절, 안내 문구 표시, 저장되는 주문 없음',
    async run(api) {
      const before = (await api.storeOrders()).length;
      const results = [];
      for (const time of ['06:59:00', '21:01:00']) {
        await api.at(time);
        results.push([time, await api.order([AMERICANO])]);
      }
      const saved = (await api.storeOrders()).length - before;
      const allRejected = results.every(([, r]) => r.status !== 201 && r.data?.message === CLOSED_MESSAGE);
      return {
        pass: allRejected && saved === 0,
        actual: `${results.map(([time, r]) => describe(time, r)).join(', ')}, 새로 저장된 주문 ${saved}건`,
      };
    },
  },
  {
    no: 4,
    kind: '경계',
    text: '20:59에 한 주문은 접수되고, 21:00 정각부터는 접수되지 않는다.',
    testName: '조건 4 (경계) 21:00 정각부터는 접수되지 않는다',
    expected: '20:59:00 접수, 21:00:00 거절(안내 문구 표시)',
    async run(api) {
      await api.at('20:59:00');
      const before = await api.order([AMERICANO]);
      await api.at('21:00:00');
      const atClose = await api.order([AMERICANO]);
      const closedOk = atClose.status !== 201 && atClose.data?.message === CLOSED_MESSAGE;
      return {
        pass: before.status === 201 && closedOk,
        actual: `${describe('20:59:00', before)}, ${describe('21:00:00', atClose)}`,
      };
    },
  },
  {
    no: 5,
    kind: '경계',
    text: '07:00 정각에 한 주문은 접수된다.',
    testName: '조건 5 (경계) 07:00 정각에 한 주문은 접수된다',
    expected: '07:00:00 접수',
    async run(api) {
      await api.at('07:00:00');
      const response = await api.order([AMERICANO]);
      return { pass: response.status === 201, actual: describe('07:00:00', response) };
    },
  },
];

function createClient(base) {
  const steps = [];
  let time = null;
  async function call(method, path, body) {
    const response = await fetch(base + path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, data: await response.json().catch(() => null) };
  }
  return {
    steps,
    log: (line) => steps.push(line),
    async at(next) {
      const response = await call('PUT', '/api/clock', { time: next });
      if (response.status !== 200) throw new Error(`시연 시각을 ${next}로 바꾸지 못했습니다(응답 ${response.status})`);
      time = next;
    },
    async order(items) {
      const response = await call('POST', '/api/orders', { items, customer: CUSTOMER, payment: { method: 'test' } });
      steps.push(`${time} POST /api/orders → ${response.status}`);
      return response;
    },
    async storeOrders() {
      return (await call('GET', '/api/store/orders')).data?.orders ?? [];
    },
  };
}

/** 시연 데이터와 섞이지 않게 같은 코드로 서버를 하나 더 띄운다(127.0.0.1, 빈 포트). */
export async function startIsolatedServer(createApp) {
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    async close() {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

export async function runCondition(base, condition) {
  const api = createClient(base);
  const { no, kind, text, testName, expected } = condition;
  try {
    const { pass, actual } = await condition.run(api);
    return { no, kind, text, testName, expected, actual, pass, steps: api.steps };
  } catch (error) {
    return { no, kind, text, testName, expected, actual: `검사 중 오류: ${error.message}`, pass: false, steps: api.steps };
  }
}

export async function runAcceptance(createApp) {
  const started = Date.now();
  const server = await startIsolatedServer(createApp);
  try {
    const results = [];
    for (const condition of CONDITIONS) results.push(await runCondition(server.base, condition));
    return {
      story: '장바구니에 담아 주문하기',
      ranAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      passed: results.filter((r) => r.pass).length,
      total: results.length,
      results,
    };
  } finally {
    await server.close();
  }
}
