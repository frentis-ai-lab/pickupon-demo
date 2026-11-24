// 역삼점 파일럿 영업시간: 07:00~21:00

export const OPEN_AT = '07:00:00';
export const CLOSE_AT = '21:00:00';
export const HOURS = { open: '07:00', close: '21:00' };
export const CLOSED_MESSAGE = '지금은 주문할 수 없습니다(영업시간 07:00~21:00)';

// time은 'HH:MM:SS'(24시간, 두 자리 고정) 문자열이라 문자열 비교가 곧 시각 비교다.
export function isWithinBusinessHours(time) {
  return time >= OPEN_AT && time < CLOSE_AT;
}
