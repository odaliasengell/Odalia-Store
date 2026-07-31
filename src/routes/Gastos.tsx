import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ExpenseTable } from '@/components/expenses/ExpenseTable'
import { ExpenseFormDialog } from '@/components/expenses/ExpenseFormDialog'
import { Pagination } from '@/components/Pagination'
import { useExpensesPage, useExpenseTotals } from '@/hooks/useExpenses'
import { formatCurrency } from '@/lib/format'

const PAGE_SIZE = 20

export function Gastos() {
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useExpensesPage(page, PAGE_SIZE)
  const { data: totals } = useExpenseTotals()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Gastos</h1>
          <p className="text-sm text-muted-foreground">
            Registra las pacas y otros costos del negocio para ver tu ganancia neta real.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Nuevo gasto
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Gastado en total</p>
            <p className="text-2xl font-semibold">{formatCurrency(totals?.totalAmount ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Prendas compradas (registradas)</p>
            <p className="text-2xl font-semibold">{totals?.totalItems ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando gastos…</p>
      ) : (
        <>
          <ExpenseTable expenses={data?.expenses ?? []} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.count ?? 0} onPageChange={setPage} />
        </>
      )}

      <ExpenseFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
