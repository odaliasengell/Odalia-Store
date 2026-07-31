import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ExpenseTable } from '@/components/expenses/ExpenseTable'
import { ExpenseFormDialog } from '@/components/expenses/ExpenseFormDialog'
import { useExpenses } from '@/hooks/useExpenses'
import { formatCurrency } from '@/lib/format'

export function Gastos() {
  const { data: expenses, isLoading } = useExpenses()
  const [createOpen, setCreateOpen] = useState(false)

  const totalAmount = useMemo(
    () => (expenses ?? []).reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  )
  const totalItems = useMemo(
    () => (expenses ?? []).reduce((sum, e) => sum + (e.item_count ?? 0), 0),
    [expenses],
  )

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
            <p className="text-2xl font-semibold">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Prendas compradas (registradas)</p>
            <p className="text-2xl font-semibold">{totalItems}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando gastos…</p>
      ) : (
        <ExpenseTable expenses={expenses ?? []} />
      )}

      <ExpenseFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
