import { useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency, formatDate } from '@/lib/format'
import { useDeleteExpense } from '@/hooks/useExpenses'
import { ExpenseFormDialog } from '@/components/expenses/ExpenseFormDialog'
import type { Expense, ExpenseWithStock } from '@/types'

export function ExpenseTable({ expenses }: { expenses: ExpenseWithStock[] }) {
  const deleteExpense = useDeleteExpense()
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>()

  async function handleDelete(expense: Expense) {
    if (!confirm(`¿Eliminar el gasto "${expense.description}"? Esta acción no se puede deshacer.`))
      return
    try {
      await deleteExpense.mutateAsync(expense.id)
      toast.success('Gasto eliminado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error')
    }
  }

  if (expenses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        Aún no has registrado gastos.
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Prendas</TableHead>
              <TableHead className="text-right">Vendidas</TableHead>
              <TableHead className="text-right">Restantes</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Costo/prenda</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => {
              const perItem =
                expense.item_count && expense.item_count > 0
                  ? expense.amount / expense.item_count
                  : null
              const { remaining, sold_count } = expense.stock
              return (
                <TableRow key={expense.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(expense.expense_date)}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{expense.description}</p>
                    {expense.notes && (
                      <p className="text-xs text-muted-foreground">{expense.notes}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {expense.item_count ?? '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {sold_count}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {remaining == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : remaining <= 0 ? (
                      <span className="font-medium text-rose-600">{remaining}</span>
                    ) : (
                      <span className="text-muted-foreground">{remaining}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {perItem != null ? formatCurrency(perItem) : '—'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingExpense(expense)}>
                          <Pencil className="size-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDelete(expense)}
                        >
                          <Trash2 className="size-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <ExpenseFormDialog
        open={!!editingExpense}
        onOpenChange={(open) => !open && setEditingExpense(undefined)}
        expense={editingExpense}
      />
    </>
  )
}
