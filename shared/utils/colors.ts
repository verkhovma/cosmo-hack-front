// Фирменные цвета карты из DESIGN.md — только токены палитры, без «светофора».
// Суша/маршрут уже были на токенах (orbital-blue..., azure); клиент/шлюз/плоскости
// переведены на них же, чтобы легенда совпадала с canvas.
export const CLIENT_COLOR = '#5b9dff'
export const GATEWAY_COLOR = '#ffffff'
export const INACTIVE_COLOR = '#6b7684'
export const ISL_COLOR = 'rgba(89,142,188,0.25)'

/** Активный маршрут на карте — всегда azure (DESIGN.md route-active). */
export const ACTIVE_ROUTE_COLOR = '#598ebc'

// Оттенки синей гаммы для плоскостей: различимы на ink-канве и не спорят
// с алым (primary зарезервирован под разрывы/действия) и azure (маршрут).
const PLANE_PALETTE = [
  '#5b9dff',
  '#46f0f0',
  '#92a8b4',
  '#4363d8',
  '#e6beff',
  '#008080',
]

function hash(id: string, salt: number): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * salt + id.charCodeAt(i)) >>> 0
  return h
}

export function planeColor(planeId: string): string {
  return PLANE_PALETTE[hash(planeId, 31) % PLANE_PALETTE.length] ?? PLANE_PALETTE[0] as string
}

export function routeColor(clientId: string): string {
  return PLANE_PALETTE[hash(clientId, 37) % PLANE_PALETTE.length] ?? PLANE_PALETTE[0] as string
}
