import { api, esc, icons } from './shared.js';

const $ = (sel) => document.querySelector(sel);
const runButton = $('[data-run]');
const table = $('.a-table');

const clockFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
const clockOf = (iso) => clockFormat.format(new Date(iso));

function render(report) {
  const failed = report.results.filter((r) => !r.pass);
  const allPass = failed.length === 0;

  $('[data-summary]').innerHTML = `
    <div class="a-score ${allPass ? 'is-pass' : 'is-fail'}"><b class="num">${report.passed}/${report.total}</b><span>통과</span></div>
    <div class="a-verdict ${allPass ? 'is-good' : 'is-bad'}">
      <strong>${allPass ? '인수조건 5개를 모두 통과했습니다' : `조건 ${failed.map((r) => r.no).join(', ')} 실패: 이 스토리는 완료로 세지 않습니다`}</strong>
      <span>${allPass ? '나머지 완료 기준(코드 리뷰, 디자인 검수 등)을 확인한 뒤 완료로 옮깁니다.' : '합의한 인수조건을 만족하지 못한 결함입니다. 결함을 기록하고 수정 작업을 추가합니다.'}</span>
    </div>`;

  $('[data-rows]').innerHTML = report.results
    .map(
      (r) => `
    <tr class="${r.pass ? 'is-pass' : 'is-fail'}">
      <td class="num">${r.no}</td>
      <td><span class="a-kind">${r.kind}</span></td>
      <td>${esc(r.text)}</td>
      <td>${esc(r.expected)}</td>
      <td><p class="a-actual">${esc(r.actual)}</p>${r.steps.length ? `<p class="a-steps">${r.steps.map(esc).join('<br />')}</p>` : ''}</td>
      <td><span class="a-result ${r.pass ? 'is-pass' : 'is-fail'}">${r.pass ? icons.check : icons.cross}${r.pass ? '통과' : '실패'}</span></td>
    </tr>`,
    )
    .join('');

  $('[data-ran]').textContent = `마지막 실행 ${clockOf(report.ranAt)} · ${(report.durationMs / 1000).toFixed(2)}초`;
}

async function run() {
  runButton.disabled = true;
  runButton.textContent = '실행 중…';
  table.classList.add('is-running');
  try {
    const { ok, data } = await api('/api/acceptance/run', { method: 'POST' });
    if (ok) render(data);
    else $('[data-ran]').textContent = '실행하지 못했습니다. 서버 기록을 확인해 주세요.';
  } finally {
    runButton.disabled = false;
    runButton.textContent = '다시 실행';
    table.classList.remove('is-running');
  }
}

runButton.addEventListener('click', run);
run();
