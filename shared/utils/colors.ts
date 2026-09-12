// Стабильные цвета плоскостей/маршрутов по хэшу id (порт src/utils/colors.ts).
// Палитра для тёмной карты; маршрут выбранного клиента — azure из DESIGN.md.
const PALETTE = [
  '#e6194b',
  '#3cb44b',
  '#4363d8',
  '#f58231',
  '#911eb4',
  '#46f0f0',
  '#f032e6',
  '#bcf60c',
  '#fabebe',
  '#008080',
  '#e6beff',
  '#9a6324',
  '#fffac8',
  '#800000',
  '#aaffc3',
]

function hash(id: string, salt: number): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * salt + id.charCodeAt(i)) >>> 0
  return h
}

export function planeColor(planeId: string): string {
  return PALETTE[hash(planeId, 31) % PALETTE.length] ?? '#e6194b'
}

export function routeColor(clientId: string): string {
  return PALETTE[hash(clientId, 37) % PALETTE.length] ?? '#e6194b'
}

/** Активный маршрут на карте — всегда azure (DESIGN.md route-active). */
export const ACTIVE_ROUTE_COLOR = '#598ebc'
