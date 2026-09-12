// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  // SPA по решению: карты/canvas без SSR-сложностей
  ssr: false,

  modules: ['@nuxt/eslint'],

  app: {
    head: {
      title: 'Спутниковод — Проектирование группировки',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },

  // shadcn-vue держим с явными импортами; index.ts-баррели не сканируем как компоненты
  components: [{ path: '~/components', pathPrefix: false, extensions: ['vue'] }],

  css: [
    '~/assets/css/tailwind.css',
  ],

  devServer: {
    port: 5173,
  },

  runtimeConfig: {
    public: {
      // В dev ходим тем же origin → CORS нет (см. nitro.routeRules ниже).
      // В проде /api проксирует nginx (см. nginx.conf).
      apiUrl: '/api',
    },
  },

  nitro: {
    // devProxy не подходит: Nitro монтирует его через app.use(route) и h3
    // срезает префикс (/api/health → /health), а pathRewrite node-http-proxy
    // не поддерживает. routeRules-proxy маппит путь явно и работает в dev.
    // В проде /api проксирует nginx (см. nginx.conf).
    routeRules: {
      '/api/**': { proxy: 'http://localhost:8000/api/**' },
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },
})
