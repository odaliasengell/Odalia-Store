import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateExpense, useUpdateExpense } from '@/hooks/useExpenses'
import type { Expense } from '@/types'

interface ExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: Expense
}

export function ExpenseFormDialog({ open, onOpenChange, expense }: ExpenseFormDialogProps) {
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()
  const isEditing = !!expense
  const pending = createExpense.isPending || updateExpense.isPending

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [itemCount, setItemCount] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    if (expense) {
      setDescription(expense.description)
      setAmount(String(expense.amount))
      setItemCount(expense.item_count != null ? String(expense.item_count) : '')
      setExpenseDate(expense.expense_date)
      setNotes(expense.notes ?? '')
    } else {
      setDescription('')
      setAmount('')
      setItemCount('')
      setExpenseDate(new Date().toISOString().slice(0, 10))
      setNotes('')
    }
  }, [open, expense])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const payload = {
        description,
        amount: Number(amount),
        item_count: itemCount ? Number(itemCount) : null,
        expense_date: expenseDate,
        notes: notes || null,
      }
      if (isEditing) {
        await updateExpense.mutateAsync({ id: expense.id, ...payload })
        toast.success('Gasto actualizado')
      } else {
        await createExpense.mutateAsync(payload)
        toast.success('Gasto registrado')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar gasto' : 'Registrar gasto'}</DialogTitle>
          <DialogDescription>
            Registra la compra de una paca u otro gasto del negocio para conocer tu ganancia neta real.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-description">Descripción</Label>
            <Input
              id="expense-description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Paca de blusas y vestidos"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expense-amount">Monto ($)</Label>
              <Input
                id="expense-amount"
                type="number"
                min="0"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1300"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expense-date">Fecha</Label>
              <Input
                id="expense-date"
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-items">Cantidad de prendas (opcional)</Label>
            <Input
              id="expense-items"
              type="number"
              min="0"
              step="1"
              value={itemCount}
              onChange={(e) => setItemCount(e.target.value)}
              placeholder="Para ver el costo promedio por prenda"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-notes">Notas (opcional)</Label>
            <Textarea
              id="expense-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Proveedor, referencia, etc."
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Registrar gasto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
