<script setup lang="ts">
import { Toaster } from '~/components/ui/sonner'
import { TooltipProvider } from '~/components/ui/tooltip'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-neutral text-ink">
    <header class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-mist/40 bg-white px-4 py-2 sm:px-6 sm:py-3">
      <div class="flex min-w-0 items-center gap-3">
        <img src="/logo-mark.svg" alt="Спутниковод" width="28" height="28" class="size-7 shrink-0">
        <h1 class="truncate font-h2 text-base font-medium sm:text-h2">
          Спутниковод<span class="hidden md:inline"> — Проектирование группировки</span>
        </h1>
      </div>
      <nav class="flex w-full items-center gap-1 overflow-x-auto text-body-md sm:ml-auto sm:w-auto">
        <NuxtLink to="/" class="shrink-0 rounded-md px-3 py-2 text-secondary hover:bg-neutral" active-class="!text-primary font-medium">
          Проектирование
        </NuxtLink>
        <NuxtLink to="/config" class="shrink-0 rounded-md px-3 py-2 text-secondary hover:bg-neutral" active-class="!text-primary font-medium">
          Конфигурация
        </NuxtLink>
        <NuxtLink to="/compare" class="shrink-0 rounded-md px-3 py-2 text-secondary hover:bg-neutral" active-class="!text-primary font-medium">
          Сравнение
        </NuxtLink>
        <NuxtLink to="/projects" class="shrink-0 rounded-md px-3 py-2 text-secondary hover:bg-neutral" active-class="!text-primary font-medium">
          Проекты
        </NuxtLink>
      </nav>
    </header>
    <main class="flex-1 p-3 sm:p-4">
      <!-- reka-ui TooltipRoot требует предка TooltipProvider, иначе setup падает -->
      <TooltipProvider>
        <slot />
      </TooltipProvider>
    </main>
    <Toaster rich-colors position="bottom-right" />
  </div>
</template>
