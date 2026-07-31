import { cn } from '@/lib/utils'
import type { PaymentStatus } from '@/types'

const STYLES: Record<PaymentStatus, string> = {
  pagado: 'bg-emerald-100 text-emerald-700',
  parcial: 'bg-amber-100 text-amber-700',
  pendiente: 'bg-rose-100 text-rose-700',
}

const LABELS: Record<PaymentStatus, string> = {
  pagado: 'Pagado',
  parcial: 'Parcial',
  pendiente: 'Pendiente',
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STYLES[status],
      )}
    >
      {LABELS[status]}
    </span>
  )
}
