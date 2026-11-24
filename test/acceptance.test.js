// 인수조건 시험: '장바구니에 담아 주문하기' 조건 1~5
// 점검표 화면(/acceptance)과 같은 검사를 터미널에서 실행한다. 실행: pnpm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { CONDITIONS, startIsolatedServer, runCondition } from '../src/acceptance.js';

let server;

before(async () => {
  server = await startIsolatedServer(createApp);
});

after(async () => {
  await server?.close();
});

for (const condition of CONDITIONS) {
  test(condition.testName, async () => {
    const result = await runCondition(server.base, condition);
    assert.ok(result.pass, `기대값: ${result.expected}\n실제값: ${result.actual}`);
  });
}

// PICK-24 경계 보강: 조건 4를 초 단위로 확인한다. 21:00 정각 1초 전까지는 접수하고, 21:00:00부터 거절한다.
test('조건 4 보강 (경계) 20:59:59 주문은 접수되고 21:00:00 주문은 거절된다', async () => {
  const CLOSED_MESSAGE = '지금은 주문할 수 없습니다(영업시간 07:00~21:00)';
  const send = async (method, path, body) => {
    const response = await fetch(server.base + path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  const orderAt = async (time) => {
    assert.equal((await send('PUT', '/api/clock', { time })).status, 200);
    return send('POST', '/api/orders', {
      items: [{ menuId: 'americano', temp: 'ICE', size: 'Regular', shots: 0, qty: 1 }],
      customer: { name: '이수진', phone4: '0000' },
      payment: { method: 'test' },
    });
  };

  const lastSecond = await orderAt('20:59:59');
  assert.equal(lastSecond.status, 201, '20:59:59 주문은 접수되어야 한다');

  const atClose = await orderAt('21:00:00');
  assert.notEqual(atClose.status, 201, '21:00:00 주문은 접수되지 않아야 한다');
  assert.equal(atClose.data?.message, CLOSED_MESSAGE);
});
