import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PaymentStatusBadge } from '@/components/PaymentStatusBadge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useSalesByCustomer } from '@/hooks/useSales'
import { useDeleteCustomer } from '@/hooks/useCustomers'
import { formatCurrency, formatDate } from '@/lib/format'
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog'
import { SaleFormDialog } from '@/components/sales/SaleFormDialog'
import { SaleGroupDialog } from '@/components/sales/SaleGroupDialog'
import type { Customer, PaymentStatus, SaleWithBalance } from '@/types'

interface CustomerDetailDialogProps {
  customer?: Customer
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerDetailDialog({ customer, open, onOpenChange }: CustomerDetailDialogProps) {
  const { data: sales } = useSalesByCustomer(customer?.id)
  const deleteCustomer = useDeleteCustomer()
  const [editOpen, setEditOpen] = useState(false)
  const [newSaleOpen, setNewSaleOpen] = useState(false)
  const [groupId, setGroupId] = useState<string | undefined>()
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const purchases = useMemo(() => {
    const map = new Map<string, SaleWithBalance[]>()
    for (const sale of sales ?? []) {
      const arr = map.get(sale.sale_group_id) ?? []
      arr.push(sale)
      map.set(sale.sale_group_id, arr)
    }
    return [...map.entries()]
      .map(([id, items]) => {
        const total = items.reduce((sum, i) => sum + i.total_amount, 0)
        const paid = items.reduce((sum, i) => sum + i.balance.paid_amount, 0)
        const balanceDue = items.reduce((sum, i) => sum + i.balance.balance_due, 0)
        const status: PaymentStatus = paid <= 0 ? 'pendiente' : balanceDue <= 0 ? 'pagado' : 'parcial'
        return { groupId: id, items, date: items[0].sale_date, total, status }
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [sales])

  if (!customer) return null

  const totalSpent = (sales ?? []).reduce((sum, s) => sum + s.total_amount, 0)
  const pendingBalance = (sales ?? []).reduce((sum, s) => sum + s.balance.balance_due, 0)

  async function handleDelete() {
    if (!customer) return
    try {
      await deleteCustomer.mutateAsync(customer.id)
      toast.success('Cliente eliminado')
      setDeleteConfirmOpen(false)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error')
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg lg:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>{customer.name}</DialogTitle>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Pencil className="size-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
                    <Trash2 className="size-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {customer.phone && <DialogDescription>{customer.phone}</DialogDescription>}
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-secondary/40 p-3">
              <p className="text-xs text-muted-foreground">Total comprado</p>
              <p className="text-lg font-semibold">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="rounded-lg bg-secondary/40 p-3">
              <p className="text-xs text-muted-foreground">Saldo pendiente</p>
              <p className={`text-lg font-semibold ${pendingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatCurrency(pendingBalance)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Historial de compras</p>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setNewSaleOpen(true)}>
              <Plus className="size-3.5" />
              Nueva venta
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {purchases.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin compras registradas.</p>
            ) : (
              purchases.map((purchase) => (
                <button
                  key={purchase.groupId}
                  onClick={() => setGroupId(purchase.groupId)}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:border-brand-pink-strong"
                >
                  <div>
                    <p className="font-medium">
                      {purchase.items.length > 1
                        ? `${purchase.items.length} prendas`
                        : purchase.items[0].item_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(purchase.date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(purchase.total)}</span>
                    <PaymentStatusBadge status={purchase.status} />
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CustomerFormDialog open={editOpen} onOpenChange={setEditOpen} customer={customer} />
      <SaleFormDialog open={newSaleOpen} onOpenChange={setNewSaleOpen} defaultCustomerId={customer.id} />
      <SaleGroupDialog
        open={!!groupId}
        onOpenChange={(open) => !open && setGroupId(undefined)}
        groupId={groupId}
      />
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="¿Eliminar este cliente?"
        description={`"${customer.name}" se eliminará. Sus ventas pasadas se conservan, pero quedarán sin cliente asignado. Esta acción no se puede deshacer.`}
        pending={deleteCustomer.isPending}
        onConfirm={handleDelete}
      />
    </>
  )
}
