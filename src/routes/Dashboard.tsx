import { useMemo } from 'react'
import { format, isSameMonth, parseISO, startOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { useSales } from '@/hooks/useSales'
import { useExpenses } from '@/hooks/useExpenses'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { MonthlySalesChart, type MonthlyDatum } from '@/components/dashboard/MonthlySalesChart'
import { RankedBarChart, type RankedDatum } from '@/components/dashboard/RankedBarChart'

const MONTHS_TO_SHOW = 6

export function Dashboard() {
  const { data: sales, isLoading: salesLoading } = useSales({})
  const { data: expenses, isLoading: expensesLoading } = useExpenses()
  const isLoading = salesLoading || expensesLoading

  const stats = useMemo(() => {
    const list = sales ?? []
    const now = new Date()

    const totalRevenue = list.reduce((sum, s) => sum + s.total_amount, 0)
    const pendingBalance = list.reduce((sum, s) => sum + s.balance.balance_due, 0)
    const totalProfit = list.reduce(
      (sum, s) => sum + (s.cost_price != null ? s.total_amount - s.cost_price : 0),
      0,
    )
    const totalExpenses = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0)

    const monthSales = list.filter((s) => isSameMonth(parseISO(s.sale_date), now))
    const monthRevenue = monthSales.reduce((sum, s) => sum + s.total_amount, 0)

    return {
      totalRevenue,
      pendingBalance,
      totalProfit,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      monthRevenue,
      monthCount: monthSales.length,
    }
  }, [sales, expenses])

  const monthlyData: MonthlyDatum[] = useMemo(() => {
    const list = sales ?? []
    const now = startOfMonth(new Date())
    const buckets = Array.from({ length: MONTHS_TO_SHOW }, (_, i) => {
      const date = subMonths(now, MONTHS_TO_SHOW - 1 - i)
      return { key: format(date, 'yyyy-MM'), date, revenue: 0, profit: 0 }
    })
    const bucketByKey = new Map(buckets.map((b) => [b.key, b]))

    for (const sale of list) {
      const key = format(parseISO(sale.sale_date), 'yyyy-MM')
      const bucket = bucketByKey.get(key)
      if (!bucket) continue
      bucket.revenue += sale.total_amount
      if (sale.cost_price != null) bucket.profit += sale.total_amount - sale.cost_price
    }

    return buckets.map((b) => ({
      month: format(b.date, 'MMM yy', { locale: es }),
      revenue: Math.round(b.revenue * 100) / 100,
      profit: Math.round(b.profit * 100) / 100,
    }))
  }, [sales])

  const topCategories: RankedDatum[] = useMemo(() => {
    const totals = new Map<string, number>()
    for (const sale of sales ?? []) {
      const key = sale.category?.trim() || 'Sin categoría'
      totals.set(key, (totals.get(key) ?? 0) + sale.total_amount)
    }
    return [...totals.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [sales])

  const topCustomers: RankedDatum[] = useMemo(() => {
    const totals = new Map<string, number>()
    for (const sale of sales ?? []) {
      if (!sale.customer) continue
      totals.set(sale.customer.name, (totals.get(sale.customer.name) ?? 0) + sale.total_amount)
    }
    return [...totals.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [sales])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Estadísticas</h1>
        <p className="text-sm text-muted-foreground">Resumen del negocio y ganancias.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando estadísticas…</p>
      ) : (
        <>
          <StatsCards
            totalRevenue={stats.totalRevenue}
            monthRevenue={stats.monthRevenue}
            monthCount={stats.monthCount}
            totalProfit={stats.totalProfit}
            pendingBalance={stats.pendingBalance}
            totalExpenses={stats.totalExpenses}
            netProfit={stats.netProfit}
          />

          <MonthlySalesChart data={monthlyData} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RankedBarChart title="Prendas/categorías más vendidas" data={topCategories} />
            <RankedBarChart title="Top clientes" data={topCustomers} />
          </div>
        </>
      )}
    </div>
  )
}
