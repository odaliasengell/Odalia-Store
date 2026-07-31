import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'
import { CHART_COLORS } from '@/components/dashboard/chartColors'

export interface RankedDatum {
  label: string
  value: number
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: RankedDatum }[]
}) {
  if (!active || !payload?.length) return null
  const { label, value } = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">{formatCurrency(value)}</p>
    </div>
  )
}

export function RankedBarChart({ title, data }: { title: string; data: RankedDatum[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Aún no hay datos suficientes.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                tickFormatter={(v) => `$${v}`}
              />
              <YAxis
                type="category"
                dataKey="label"
                tickLine={false}
                axisLine={false}
                width={100}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--secondary)' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {data.map((entry) => (
                  <Cell key={entry.label} fill={CHART_COLORS.single} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
