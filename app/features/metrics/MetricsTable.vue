<script setup lang="ts">
import type { ClientMetrics } from '~~/shared/types/scenario'

import { fmtDuration, fmtPercent } from '~~/shared/utils/format'
import { REASON_LABEL } from '~~/shared/utils/routes'

import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'

defineProps<{
  metrics: Record<string, ClientMetrics>
  target: number
  reasons?: Record<string, string>
}>()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Метрики</CardTitle>
      <CardDescription>Сквозная достижимость и перерывы по клиентам</CardDescription>
    </CardHeader>
    <CardContent class="p-0">
      <Table class="min-w-[560px]">
        <TableHeader>
          <TableRow>
            <TableHead>Клиент</TableHead>
            <TableHead>Доступность</TableHead>
            <TableHead>Макс. перерыв</TableHead>
            <TableHead>Основная причина</TableHead>
            <TableHead>Цель ≥ {{ fmtPercent(target) }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(m, cid) in metrics" :key="cid">
            <TableCell><b>{{ cid }}</b></TableCell>
            <TableCell>{{ fmtPercent(m.availability) }}</TableCell>
            <TableCell>{{ fmtDuration(m.max_gap_s) }}</TableCell>
            <TableCell class="text-mist">{{ reasons?.[cid] ? (REASON_LABEL[reasons[cid]] ?? reasons[cid]) : '—' }}</TableCell>
            <TableCell>
              <Badge :variant="m.availability >= target ? 'default' : 'destructive'">
                {{ m.availability >= target ? '✓' : '✗' }}
              </Badge>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</template>
