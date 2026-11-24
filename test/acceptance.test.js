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
