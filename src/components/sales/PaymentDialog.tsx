import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Trash2 } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { usePayments, useCreatePayment, useDeletePayment } from '@/hooks/usePayments'
import { formatCurrency, formatDate } from '@/lib/format'
import { PAYMENT_METHOD_LABELS } from '@/types'
import type { Payment, PaymentMethod, SaleWithBalance } from '@/types'

const NO_METHOD = '__unspecified__'

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale?: SaleWithBalance
}

export function PaymentDialog({ open, onOpenChange, sale }: PaymentDialogProps) {
  const { data: payments } = usePayments(sale?.id)
  const createPayment = useCreatePayment()
  const deletePayment = useDeletePayment()

  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState<string>(NO_METHOD)
  const [deletingPayment, setDeletingPayment] = useState<Payment | undefined>()

  if (!sale) return null

  function methodValue(): PaymentMethod | null {
    return method === NO_METHOD ? null : (method as PaymentMethod)
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!sale) return
    const value = Number(amount)
    if (!value || value <= 0) return
    try {
      await createPayment.mutateAsync({
        sale_id: sale.id,
        amount: value,
        payment_date: date,
        payment_method: methodValue(),
      })
      toast.success('Abono registrado')
      setAmount('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error')
    }
  }

  async function handleMarkAsPaid() {
    if (!sale) return
    try {
      await createPayment.mutateAsync({
        sale_id: sale.id,
        amount: sale.balance.balance_due,
        payment_date: date,
        payment_method: methodValue(),
      })
      toast.success('Venta marcada como pagada')
      setAmount('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error')
    }
  }

  async function handleDelete() {
    if (!sale || !deletingPayment) return
    try {
      await deletePayment.mutateAsync({ id: deletingPayment.id, sale_id: sale.id })
      toast.success('Abono eliminado')
      setDeletingPayment(undefined)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md lg:max-w-lg">
        <DialogHeader>
          <DialogTitle>Abonos — {sale.item_name}</DialogTitle>
          <DialogDescription>
            Total: {formatCurrency(sale.total_amount)} · Pagado:{' '}
            {formatCurrency(sale.balance.paid_amount)} · Saldo:{' '}
            {formatCurrency(sale.balance.balance_due)}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-3" onSubmit={handleAddPayment}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment-amount">Monto del abono</Label>
              <Input
                id="payment-amount"
                type="number"
                min="0.01"
                step="0.01"
                max={sale.balance.balance_due || undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment-date">Fecha</Label>
              <Input
                id="payment-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5 lg:col-span-1">
              <Label htmlFor="payment-method">Método de pago (opcional)</Label>
              <Select
                value={method}
                onValueChange={(v) => setMethod(v ?? NO_METHOD)}
                items={{ [NO_METHOD]: 'Sin especificar', ...PAYMENT_METHOD_LABELS }}
              >
                <SelectTrigger id="payment-method" className="w-full">
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_METHOD}>Sin especificar</SelectItem>
                  <SelectItem value="efectivo">{PAYMENT_METHOD_LABELS.efectivo}</SelectItem>
                  <SelectItem value="transferencia">
                    {PAYMENT_METHOD_LABELS.transferencia}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={createPayment.isPending || sale.balance.balance_due <= 0}
            >
              Agregar abono
            </Button>
          </div>

          {sale.balance.balance_due > 0 && (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={createPayment.isPending}
              onClick={handleMarkAsPaid}
            >
              <CheckCircle2 className="size-4" />
              Marcar como pagado ({formatCurrency(sale.balance.balance_due)})
            </Button>
          )}
        </form>

        <Separator />

        <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
          {!payments || payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay abonos registrados.</p>
          ) : (
            payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(p.payment_date)}
                    {p.payment_method && ` · ${PAYMENT_METHOD_LABELS[p.payment_method]}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeletingPayment(p)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDialog
        open={!!deletingPayment}
        onOpenChange={(open) => !open && setDeletingPayment(undefined)}
        title="¿Eliminar este abono?"
        description={`El abono de ${deletingPayment ? formatCurrency(deletingPayment.amount) : ''} se eliminará y el saldo pendiente de la venta aumentará. Esta acción no se puede deshacer.`}
        pending={deletePayment.isPending}
        onConfirm={handleDelete}
      />
    </Dialog>
  )
}
