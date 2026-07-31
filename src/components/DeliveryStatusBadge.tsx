import { cn } from '@/lib/utils'

type DeliveryState = 'entregada' | 'atrasada' | 'hoy' | 'programada'

function getState(deliveryDate: string, delivered: boolean): DeliveryState {
  if (delivered) return 'entregada'
  const today = new Date().toISOString().slice(0, 10)
  if (deliveryDate < today) return 'atrasada'
  if (deliveryDate === today) return 'hoy'
  return 'programada'
}

const STYLES: Record<DeliveryState, string> = {
  entregada: 'bg-emerald-100 text-emerald-700',
  atrasada: 'bg-rose-100 text-rose-700',
  hoy: 'bg-brand-bg text-brand-pink-strong',
  programada: 'bg-secondary text-secondary-foreground',
}

const LABELS: Record<DeliveryState, string> = {
  entregada: 'Entregada',
  atrasada: 'Atrasada',
  hoy: 'Hoy',
  programada: 'Programada',
}

export function DeliveryStatusBadge({
  deliveryDate,
  delivered,
}: {
  deliveryDate: string
  delivered: boolean
}) {
  const state = getState(deliveryDate, delivered)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STYLES[state],
      )}
    >
      {LABELS[state]}
    </span>
  )
}
