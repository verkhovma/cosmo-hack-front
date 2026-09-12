<script setup lang="ts">
import { Toaster } from '~/components/ui/sonner'
import { TooltipProvider } from '~/components/ui/tooltip'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-neutral text-ink">
    <header class="flex items-center justify-between gap-4 border-b border-mist/40 bg-white px-6 py-3">
      <div class="flex items-center gap-3">
        <span class="inline-block size-3 rounded-sm bg-primary" aria-hidden="true" />
        <h1 class="font-h2 text-h2 font-medium">
          КосмоХакатон 2026 — Проектирование группировки
        </h1>
      </div>
      <nav class="flex items-center gap-1 text-body-md">
        <NuxtLink to="/" class="rounded-md px-3 py-2 text-secondary hover:bg-neutral" active-class="!text-primary font-medium">
          Проектирование
        </NuxtLink>
        <NuxtLink to="/compare" class="rounded-md px-3 py-2 text-secondary hover:bg-neutral" active-class="!text-primary font-medium">
          Сравнение
        </NuxtLink>
        <NuxtLink to="/projects" class="rounded-md px-3 py-2 text-secondary hover:bg-neutral" active-class="!text-primary font-medium">
          Проекты
        </NuxtLink>
      </nav>
    </header>
    <main class="flex-1 p-4">
      <!-- reka-ui TooltipRoot требует предка TooltipProvider, иначе setup падает -->
      <TooltipProvider>
        <slot />
      </TooltipProvider>
    </main>
    <Toaster rich-colors position="bottom-right" />
  </div>
</template>
