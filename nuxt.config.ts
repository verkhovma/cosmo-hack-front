// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  modules: ['@nuxt/eslint'],

  css: [
    // Порядок важен: сначала tailwind (preflight/utilities),
    // затем main.css — текущая дизайн-система побеждает.
    // @theme-токены из DESIGN.md лягут в tailwind.css позже.
    '~/assets/css/tailwind.css',
    '~/assets/css/main.css',
  ],

  devServer: {
    port: 5173,
  },

  runtimeConfig: {
    public: {
      // В dev ходим тем же origin → CORS нет (см. nitro.devProxy ниже).
      // В проде /api проксирует nginx (см. nginx.conf).
      apiUrl: '/api',
    },
  },

  nitro: {
    devProxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },
})
