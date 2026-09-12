<script setup lang="ts">
import type { Verdict } from '~~/shared/utils/compare'

import { DownloadIcon, ExternalLinkIcon, TrophyIcon } from 'lucide-vue-next'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

defineProps<{
  verdict: Verdict
  winnerTitle: string
  canOpen: boolean
}>()
const emit = defineEmits<{
  download: []
  open: []
}>()
</script>

<template>
  <Card class="border-orbital-blue">
    <CardHeader>
      <div class="flex items-center gap-2">
        <TrophyIcon data-icon="inline-start" />
        <CardTitle>{{ verdict.summary }}</CardTitle>
      </div>
      <CardDescription>Детерминированный скоринг: вето цели ≥90%, затем средняя доступность, затем перерыв</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-3">
      <ul class="flex list-disc flex-col gap-1 pl-5 text-sm">
        <li v-for="(b, i) in verdict.bullets" :key="i">{{ b }}</li>
      </ul>
      <div class="flex flex-wrap items-center gap-2">
        <Badge v-if="verdict.winnerId" variant="secondary">{{ winnerTitle }}</Badge>
        <div class="ml-auto flex gap-2">
          <Button size="sm" variant="secondary" :disabled="!canOpen" title="Загрузить сценарий победителя в конструктор" @click="emit('open')">
            <ExternalLinkIcon data-icon="inline-start" />Открыть в конструкторе
          </Button>
          <Button size="sm" variant="secondary" @click="emit('download')">
            <DownloadIcon data-icon="inline-start" />Отчёт .md
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
