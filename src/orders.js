// 주문 저장소. DB 없이 메모리에 둔다(서버를 다시 켜면 비워진다).

export const STATUS = { received: '접수', making: '제조 중', ready: '픽업 대기', done: '전달 완료' };
export const NEXT_STATUS = { received: 'making', making: 'ready', ready: 'done' };

const FIRST_NO = 101;

export function createOrderBook() {
  let orders = [];
  let nextNo = FIRST_NO;
  return {
    all: () => orders,
    find: (no) => orders.find((o) => o.no === no) ?? null,
    add(fields) {
      const order = { no: nextNo++, ...fields };
      orders.push(order);
      return order;
    },
    reset() {
      orders = [];
      nextNo = FIRST_NO;
    },
  };
}
