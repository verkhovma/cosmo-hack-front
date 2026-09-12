# PLAN.md — Frontend (`cosmo-hack-front`)

> Зона ответственности: только frontend. Бэк не трогаем.
> Все несостыковки с бэком закрываем защитным кодом на фронте.
> Список запросов к бэк-команде — в конце.

## 0. Что уже есть (не переделывать)

- `StartPage.tsx`: примеры + upload JSON → `DesignerPage`.
- `ScenarioEditor + PlanesTab/BatchesTab/GroundSitesTab/FailuresTab/GatewayOutagesTab`: stage, RAAN/phase, отказы, шлюзы.
- `DesignerPage.tsx`: авто-`compute → getRoutes → getSnapshot(t_s)`, `MapView + Timeline + AvailabilityStrip + MetricsTable + ExportButton`, `JobsContext` для сравнения.
- `MapView.tsx`: Mercator-canvas, спутники/ISL/пункты/маршрут выбранного клиента, popup.
- `ComparePage + CompareView`: выбор ≥2 джобов, таблица `% + max_gap`.

---

## 1. P0 — блокеры демо (делать первым)

### 1.1. Защита от `path: null vs []`
- Файлы: `AvailabilityStrip.tsx:59,62`, `MapView.tsx:152`, `DesignerPage.tsx:250`.
- Проблема: проверка `e.path !== null` считает `[]` как «есть маршрут». Бэк в `/export` отдаёт `null`, ТЗ требует `[]`.
- Сделать: хелпер `utils/routes.ts` — `hasPath = Array.isArray(p) && p.length > 0`, использовать везде + в `groupSegments`.
- Приёмка: перерывы совпадают с `reason !== ok`.

### 1.2. Debounce расчёта + кнопка «Запустить»
- Файл: `DesignerPage.tsx:57-80`.
- Проблема: `useEffect[scenario]` шлёт `compute` на каждое нажатие клавиши → спам джобов, гонки.
- Сделать: локальный `draft` в `ScenarioEditor`, расчётный `scenario` обновляется по кнопке / debounce 600мс; добавить `catch` на `getSnapshot`.
- Приёмка: 10 быстрых правок RAAN = 1 запрос, `busy` не мигает.

### 1.3. «Отказ в 1 клик» (§6.3)
- Файлы: `DesignerPage:SatelliteDetails`, `FailuresTab.tsx`.
- Проблема: надо вручную копировать ID из 48 групп.
- Сделать: в `SatelliteDetails` кнопку `+ отказ [t_s; t_s+3600)`, проп `onAddFailure(satId)` → `setScenario`. В `FailuresTab` — фильтр/поиск по ID + подсветка «в текущем маршруте».
- Приёмка: клик по спутнику маршрута → отказ → видна перестройка/перерыв + причина.

### 1.4. Выгрузка именно сценария (§6.4)
- Файлы: `ExportButton.tsx`, `DesignerPage`.
- Проблема: есть только `/export` результата, выгрузки scenario.json нет.
- Сделать: вторую кнопку «Скачать scenario.json» — `Blob(JSON.stringify(scenario))` (+ `effective_scenario` если доступен).
- Приёмка: скачанный файл повторно грузится через `StartPage` upload.

### 1.5. Возврат на старт / сброс (§5)
- Файл: `DesignerPage.tsx:136`.
- Проблема: `showStart` только при старте, кнопки «Сменить сценарий / Сбросить» нет.
- Сделать: кнопку в header → `setShowStart(true)`.

### 1.6. Починка `ExportButton` при `jobId=""`
- Файл: `ExportButton.tsx:7-8`.
- Проблема: `href=undefined + class disabled` — битая ссылка.
- Сделать: рендерить `<button disabled>` вместо `<a>` когда `disabled`.

---

## 2. P1 — баллы за сравнение и рекомендации (§4.4, §18)

### 2.1. `CompareView.tsx`: из сырого JSON в решение
- Подсветка лучшего (`availability` max, `max_gap` min), колонка дельты vs первого, строка `Цель ≥90% ✓/✗` (данные из `JobsContext`, не только `compare`).
- `config_diff` сейчас `JSON.stringify` — расписать человечески: `stage 3→1`, `failures +N`, RAAN/phase поплоскостно (посчитать на фронте из сохранённых `scenario`).
- Приёмка: видно «что меняли → что получили».

### 2.2. Персист вариантов сравнения
- Файлы: `JobsContext.tsx`, `ComparePage.tsx`, `ProjectsPage`.
- Проблема: джобы только в памяти — reload убивает сравнение; на `ProjectsPage` только `<pre>JSON</pre>`.
- Сделать: сохранять `[{jobId,title,scenario,metrics}]` в `localStorage`; на `ProjectsPage` кнопку «Открыть в конструкторе».

### 2.3. Панель «Рекомендации» (фронтовые эвристики, без бэка)
- Новый `Recommendations.tsx` в `DesignerPage`, данные из имеющихся `routes + visible_log + metrics`:
  - доминирующая причина из `reasons` → текст («преобладает no_isl → разнести phase / поднять isl»);
  - топ-3 «уязвимых» спутника = частота вхождения в `routes` всех клиентов;
  - `availability < 0.9` → «поднять stage / сдвинуть phase P2 на +15°» с кнопкой «Применить» (мутация `scenario`).
- Закрывает критерий «Обоснованность рекомендаций 0–10».

### 2.4. `MetricsTable.tsx`: доложить §14
- Добавить: доля видимости (из `visibleLog`), `hop_counts` среднее/макс (бэк уже считает, лежит в `/routes`).
- Сейчас только сквозная доступность.

---

## 3. P2 — карта и шкала (полировка, если останется время)

- Треки орбит: по ТЗ нужны **положения в момент `t_s` + связи + маршрут**. Треки — опция: пунктир `t_s ± k·step` для выбранной плоскости, toggle.
- `MapView.tsx`: позиция popup (сейчас в координатах canvas 1200×600 без учёта CSS-scale), `onWheel preventDefault` в passive-слушателе, фильтр `hiddenSats` в `onClick`, легенда цветов плоскостей + «серый = неактивен».
- `Timeline.tsx + AvailabilityStrip`: кнопки play/±шаг, подпись причины под шкалой (клик `onSeek` уже есть).
- Мёртвый код: `AvailabilityChart, RouteView, ScenarioPicker` не импортируются; `api.editScenario/validate/getMetrics/listJobs` не вызываются — использовать `validate` для ошибок §17 либо удалить.
- `utils/validate.ts`: убрать самопальные лимиты (`altitude 200..1200` нет в ТЗ), добавить проверки §17: целочисленность `horizon/step`, кратность, уникальность ID.

---

## 4. Запросы к бэк-команде (не наша работа)

1. `startswith("S")` → множество ID из `design.satellites` (иначе файл жюри всё сломает).
2. `export.path: []` вместо `null` (ТЗ §16).
3. В `compare` добавить `visibility`, `hop_stats`, дифф RAAN/phase.
4. `GET /api/compute/{id}/scenario` для §6.4.
5. `visible_to` vs `elevation_deg`: фронт читает `(s as any).visible_to ?? []`, не падает если поля нет.

---

## 5. Порядок демо 5 мин

1. `01_full` → расчёт → карта + маршрут + 90% (30с).
2. Stage 3→1 → падение доступности, рост `max_gap` (1 мин).
3. Клик в спутник маршрута → «в отказ» → перестройка/перерыв + причина (1.5 мин).
4. `phase/RAAN` → сохранить вариант → Сравнение → Рекомендации → Экспорт (2 мин).

## Статус

- [ ] 1.1 `hasPath`
- [ ] 1.2 debounce + «Запустить»
- [ ] 1.3 отказ в 1 клик + поиск
- [ ] 1.4 скачать scenario.json
- [ ] 1.5 сменить сценарий / сброс
- [ ] 1.6 `ExportButton` disabled
- [ ] 2.1 `CompareView` дельты + лучший
- [ ] 2.2 localStorage + открыть в конструкторе
- [ ] 2.3 `Recommendations.tsx`
- [ ] 2.4 видимость + hops в `MetricsTable`
- [ ] 3.x полировка карты/шкалы/валидации
