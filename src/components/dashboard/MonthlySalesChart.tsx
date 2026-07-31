import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'
import { CHART_COLORS } from '@/components/dashboard/chartColors'

export interface MonthlyDatum {
  month: string
  revenue: number
  profit: number
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.name}: <span className="font-medium text-foreground">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  )
}

export function MonthlySalesChart({ data }: { data: MonthlyDatum[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas por mes</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="30%" barGap={2}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              tickFormatter={(v) => `$${v}`}
              width={56}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--secondary)' }} />
            <Legend
              formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
            />
            <Bar
              dataKey="revenue"
              name="Ingresos"
              fill={CHART_COLORS.revenue}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              dataKey="profit"
              name="Ganancia"
              fill={CHART_COLORS.profit}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
