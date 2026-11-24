// 하루빈 커피 역삼점 메뉴 (교육용 가상 데이터)

export const CATEGORIES = [
  { id: 'coffee', name: '커피' },
  { id: 'beverage', name: '음료' },
  { id: 'bakery', name: '베이커리' },
];

export const MENU = [
  { id: 'americano', category: 'coffee', name: '아메리카노', price: 4000, description: '하우스 블렌드 원두로 내린 고소한 커피', temps: ['HOT', 'ICE'], sizes: true, shots: true },
  { id: 'cafe-latte', category: 'coffee', name: '카페라떼', price: 4500, description: '에스프레소에 부드러운 우유를 더했어요', temps: ['HOT', 'ICE'], sizes: true, shots: true },
  { id: 'vanilla-latte', category: 'coffee', name: '바닐라라떼', price: 5000, description: '바닐라 시럽을 넣은 달콤한 라떼', temps: ['HOT', 'ICE'], sizes: true, shots: true },
  { id: 'cold-brew', category: 'coffee', name: '콜드브루', price: 5000, description: '찬물로 12시간 우려 깔끔해요', temps: ['ICE'], sizes: true, shots: true },
  { id: 'grapefruit-ade', category: 'beverage', name: '자몽에이드', price: 5500, description: '자몽청에 탄산수를 더한 상큼한 맛', temps: ['ICE'], sizes: true, shots: false },
  { id: 'green-tea-latte', category: 'beverage', name: '녹차라떼', price: 5000, description: '진한 녹차와 우유', temps: ['HOT', 'ICE'], sizes: true, shots: false },
  { id: 'croissant', category: 'bakery', name: '크루아상', price: 3800, description: '버터 향이 진한 결 살아 있는 빵', temps: [], sizes: false, shots: false },
  { id: 'bagel', category: 'bakery', name: '베이글', price: 3500, description: '쫄깃한 플레인 베이글', temps: [], sizes: false, shots: false },
];

export const OPTION_PRICES = { large: 500, shot: 500 };
export const MAX_SHOTS = 2;
export const MAX_QTY = 9;

export class OrderInputError extends Error {
  constructor(message) {
    super(message);
    this.code = 'INVALID_ITEM';
  }
}

/** 장바구니 한 줄을 메뉴 정보로 확인하고, 가격은 서버에서 다시 계산한다. */
export function buildLine(input) {
  const item = MENU.find((m) => m.id === input?.menuId);
  if (!item) throw new OrderInputError('메뉴를 찾을 수 없습니다');

  const qty = Number(input.qty ?? 1);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
    throw new OrderInputError(`수량은 1~${MAX_QTY}개로 골라 주세요`);
  }

  let temp = null;
  if (item.temps.length === 1) {
    temp = item.temps[0]; // ICE만 가능한 메뉴는 고정
  } else if (item.temps.length > 1) {
    temp = input.temp ?? item.temps[0];
    if (!item.temps.includes(temp)) throw new OrderInputError('온도는 HOT 또는 ICE로 골라 주세요');
  }

  let size = null;
  if (item.sizes) {
    size = input.size ?? 'Regular';
    if (!['Regular', 'Large'].includes(size)) throw new OrderInputError('사이즈는 Regular 또는 Large로 골라 주세요');
  }

  let shots = 0;
  if (item.shots) {
    shots = Number(input.shots ?? 0);
    if (!Number.isInteger(shots) || shots < 0 || shots > MAX_SHOTS) {
      throw new OrderInputError(`샷 추가는 최대 ${MAX_SHOTS}회까지 할 수 있습니다`);
    }
  }

  const unitPrice = item.price + (size === 'Large' ? OPTION_PRICES.large : 0) + shots * OPTION_PRICES.shot;
  return { menuId: item.id, name: item.name, temp, size, shots, qty, unitPrice, amount: unitPrice * qty };
}
