# ---------- builder ----------
# node:22-alpine: postcss-merge-longhand (cssnano в цепочке Nuxt) использует
# Set.prototype.difference (ES2025) — в Node 20 этого API нет вообще.
FROM node:22-alpine AS builder

WORKDIR /app

# Репо на pnpm (см. AGENTS.md): ставим фиксированный pnpm и зависимости
# строго по lockfile. Пир-ворнинг @vee-validate/zod/zod — известный,
# нефатальный: pnpm лишь предупреждает, в отличие от npm (ERESOLVE).
# Мост vee-validate+zod оставлен сознательно для будущих shadcn-форм.
RUN npm i -g pnpm@10

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Nuxt SPA (ssr:false) в статику для nginx: именно generate, т.к. `nuxt build`
# HTML-шелл не пишет (он остаётся в nitro-сервере), а generate кладёт
# index.html + 200.html/404.html + prerender страниц в .output/public.
# API-URL зашит дефолтом runtimeConfig public.apiUrl='/api' под nginx-прокси.
RUN pnpm generate

# ---------- runtime ----------
FROM nginx:1.27-alpine

# кастомный конфиг для SPA + проксирования /api
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/.output/public /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
    CMD wget -qO- http://localhost/ || exit 1

# nginx резолвит upstream на старте и падает [emerg], если DNS бэка ещё не готов
# (наблюдалось: crash-loop + RUN_PROBLEM). Поэтому стартуем через проверку конфига
# с ретраями; exec сохраняет nginx как PID 1 для корректных сигналов.
CMD ["sh", "-c", "for i in $(seq 1 12); do if nginx -t; then exec nginx -g 'daemon off;'; fi; echo \"nginx config test failed (attempt $i), retrying...\"; sleep 5; done; exit 1"]
