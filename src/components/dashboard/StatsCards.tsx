import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'

interface StatTileProps {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'warning' | 'good'
}

function StatTile({ label, value, hint, tone = 'default' }: StatTileProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={cn(
            'text-2xl font-semibold',
            tone === 'warning' && 'text-rose-600',
            tone === 'good' && 'text-emerald-600',
          )}
        >
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

interface StatsCardsProps {
  totalRevenue: number
  monthRevenue: number
  monthCount: number
  totalProfit: number
  pendingBalance: number
  totalExpenses: number
  netProfit: number
}

export function StatsCards({
  totalRevenue,
  monthRevenue,
  monthCount,
  totalProfit,
  pendingBalance,
  totalExpenses,
  netProfit,
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <StatTile
        label="Ventas de este mes"
        value={formatCurrency(monthRevenue)}
        hint={`${monthCount} venta${monthCount === 1 ? '' : 's'}`}
      />
      <StatTile label="Total vendido histórico" value={formatCurrency(totalRevenue)} />
      <StatTile
        label="Por cobrar"
        value={formatCurrency(pendingBalance)}
        hint="Créditos y abonos pendientes"
        tone={pendingBalance > 0 ? 'warning' : 'default'}
      />
      <StatTile
        label="Ganancia por prenda"
        value={formatCurrency(totalProfit)}
        hint="Solo ventas con costo registrado"
        tone="good"
      />
      <StatTile
        label="Gastos del negocio"
        value={formatCurrency(totalExpenses)}
        hint="Pacas y otros costos"
      />
      <StatTile
        label="Ganancia neta del negocio"
        value={formatCurrency(netProfit)}
        hint="Ingresos − gastos"
        tone={netProfit >= 0 ? 'good' : 'warning'}
      />
    </div>
  )
}
