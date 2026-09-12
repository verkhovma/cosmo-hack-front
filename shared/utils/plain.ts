// Снимает Vue-реактивность с данных. Чтение из useState/ref отдаёт reactive
// Proxy, а spread-объекты редактора (`{ ...props.scenario, design: {...} }`)
// несут Proxy и вложенно. Такие значения нельзя отдать structuredClone, а
// JSON-хранилище журнала/черновика всё равно требует plain-данные.
// Scenario — чистый JSON (числа/строки/массивы), поэтому deep-plain round-trip'ом.
// ВНИМАНИЕ: Map/Date/undefined-поля round-trip не сохранит — если Scenario
// отрастит такие типы, менять на deep-unwrap через toRaw, а не молча мириться с потерями.
export function toPlain<T>(value: T): T {
  // eslint-disable-next-line unicorn/prefer-structured-clone -- сам structuredClone и падает на Proxy
  return JSON.parse(JSON.stringify(value)) as T
}
