// 서버가 영업시간을 판단할 때 쓰는 '시연 시각'.
// 기본은 실제 한국 시각이고, 시연할 때는 특정 시각으로 고정한다(고정하면 멈춰 있다).

const seoul = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function realTime(date = new Date()) {
  return seoul.format(date);
}

/** '21:00', '7:00', '21:00:00'을 'HH:MM:SS'로 맞춘다. 형식이 틀리면 null. */
export function normalizeTime(value) {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(value ?? '').trim());
  if (!match) return null;
  const [h, m, s] = [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
  if (h > 23 || m > 59 || s > 59) return null;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function createClock() {
  let fixed = null;
  return {
    now: () => fixed ?? realTime(),
    get mode() {
      return fixed ? 'fixed' : 'real';
    },
    fix(time) {
      fixed = time;
    },
    useReal() {
      fixed = null;
    },
  };
}
