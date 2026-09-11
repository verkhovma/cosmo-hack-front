const PALETTE = [
  "#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4",
  "#46f0f0", "#f032e6", "#bcf60c", "#fabebe", "#008080",
  "#e6beff", "#9a6324", "#fffac8", "#800000", "#aaffc3",
];

export function planeColor(planeId: string): string {
  // стабильный цвет по хэшу id
  let h = 0;
  for (let i = 0; i < planeId.length; i++) h = (h * 31 + planeId.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function routeColor(clientId: string): string {
  let h = 0;
  for (let i = 0; i < clientId.length; i++) h = (h * 37 + clientId.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}