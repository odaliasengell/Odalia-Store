import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  MessageCircle,
  MoreHorizontal,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PaymentStatusBadge } from '@/components/PaymentStatusBadge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { SaleFormDialog } from '@/components/sales/SaleFormDialog'
import { PaymentDialog } from '@/components/sales/PaymentDialog'
import { CustomerCombobox } from '@/components/customers/CustomerCombobox'
import {
  useSalesByGroup,
  useGroupBalance,
  useUpdateSaleGroup,
  useDeleteSale,
  useMarkDelivered,
} from '@/hooks/useSales'
import { getPhotoUrl } from '@/hooks/useItemPhoto'
import { useCustomers } from '@/hooks/useCustomers'
import { formatCurrency, formatDate } from '@/lib/format'
import { buildSaleReceiptMessage, buildWhatsAppUrl, hasUsablePhone } from '@/lib/whatsapp'
import type { SaleWithCustomer } from '@/types'

const NO_CUSTOMER = '__none__'

interface SaleGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId?: string
}

export function SaleGroupDialog({ open, onOpenChange, groupId }: SaleGroupDialogProps) {
  const { data: items, isLoading } = useSalesByGroup(groupId)
  const { data: group } = useGroupBalance(groupId)
  const { data: customers } = useCustomers()
  const updateGroup = useUpdateSaleGroup()
  const deleteSale = useDeleteSale()
  const markDelivered = useMarkDelivered()

  const [customerId, setCustomerId] = useState(NO_CUSTOMER)
  const [saleDate, setSaleDate] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [editingItem, setEditingItem] = useState<SaleWithCustomer | undefined>()
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<SaleWithCustomer | undefined>()
  const [addOpen, setAddOpen] = useState(false)

  const first = items?.[0]

  useEffect(() => {
    if (!open || !first) return
    setCustomerId(first.customer_id ?? NO_CUSTOMER)
    setSaleDate(first.sale_date)
    setDeliveryDate(first.delivery_date ?? '')
  }, [open, first])

  if (!groupId) return null

  const totalAmount = group?.total_amount ?? 0
  const paidAmount = group?.paid_amount ?? 0
  const balanceDue = group?.balance_due ?? 0
  const status = group?.payment_status ?? 'pendiente'

  const dirty =
    first &&
    (customerId !== (first.customer_id ?? NO_CUSTOMER) ||
      saleDate !== first.sale_date ||
      deliveryDate !== (first.delivery_date ?? ''))

  async function handleSaveShared() {
    if (!groupId) return
    try {
      await updateGroup.mutateAsync({
        groupId,
        customer_id: customerId === NO_CUSTOMER ? null : customerId,
        sale_date: saleDate,
        delivery_date: deliveryDate || null,
      })
      toast.success('Venta actualizada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error')
    }
  }

  async function handleToggleDelivered(item: SaleWithCustomer) {
    try {
      await markDelivered.mutateAsync({ id: item.id, delivered: !item.delivered })
      toast.success(item.delivered ? 'Marcada como no entregada' : 'Marcada como entregada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error')
    }
  }

  async function handleDeleteItem() {
    if (!deletingItem) return
    try {
      await deleteSale.mutateAsync(deletingItem.id)
      toast.success('Prenda eliminada')
      const wasLast = (items?.length ?? 0) <= 1
      setDeletingItem(undefined)
      if (wasLast) onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error')
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg lg:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Venta completa</DialogTitle>
            <DialogDescription>
              {items && items.length > 1
                ? `${items.length} prendas en esta venta.`
                : 'Todos los detalles de esta venta en un solo lugar.'}
            </DialogDescription>
          </DialogHeader>

          {isLoading || !items ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="group-date">Fecha</Label>
                  <Input
                    id="group-date"
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="group-customer">Cliente</Label>
                  <CustomerCombobox
                    id="group-customer"
                    customers={customers ?? []}
                    value={customerId}
                    onValueChange={setCustomerId}
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1.5 lg:col-span-1">
                  <Label htmlFor="group-delivery">Fecha de entrega (opcional)</Label>
                  <Input
                    id="group-delivery"
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </div>
              </div>

              {dirty && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="self-start"
                  disabled={updateGroup.isPending}
                  onClick={handleSaveShared}
                >
                  {updateGroup.isPending ? 'Guardando…' : 'Guardar cambios de la venta'}
                </Button>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-secondary/40 p-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-semibold">{formatCurrency(totalAmount)}</p>
                </div>
                <div className="rounded-lg bg-secondary/40 p-3">
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p
                    className={`text-lg font-semibold ${balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}
                  >
                    {formatCurrency(balanceDue)}
                  </p>
                </div>
                <div className="flex flex-col items-start justify-center gap-1 rounded-lg bg-secondary/40 p-3">
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <PaymentStatusBadge status={status} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setPaymentOpen(true)}
                  >
                    <Wallet className="size-4" />
                    Abonos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    disabled={!hasUsablePhone(first?.customer?.phone)}
                    onClick={() => {
                      if (!first?.customer?.phone) return
                      const message = buildSaleReceiptMessage({
                        customerName: first.customer.name,
                        saleDate,
                        items: items ?? [],
                        totalAmount,
                        paidAmount,
                        balanceDue,
                      })
                      window.open(buildWhatsAppUrl(first.customer.phone, message), '_blank')
                    }}
                  >
                    <MessageCircle className="size-4" />
                    Enviar por WhatsApp
                  </Button>
                </div>
                {!hasUsablePhone(first?.customer?.phone) && (
                  <p className="text-xs text-muted-foreground">
                    Agrega el teléfono del cliente para poder enviarle el recibo por WhatsApp.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Prendas</p>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setAddOpen(true)}>
                  <Plus className="size-3.5" />
                  Agregar prenda
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    {item.photo_path && (
                      <img
                        src={getPhotoUrl(item.photo_path) ?? ''}
                        alt=""
                        className="size-10 shrink-0 rounded-md border border-border object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.item_name}</p>
                      {item.expense && (
                        <p className="truncate text-xs text-muted-foreground">
                          De: {item.expense.description}
                        </p>
                      )}
                      {item.delivery_date && (
                        <p
                          className={`text-xs ${item.delivered ? 'text-emerald-600' : 'text-brand-pink-strong'}`}
                        >
                          {item.delivered ? 'Entregada' : 'Entrega'}: {formatDate(item.delivery_date)}
                        </p>
                      )}
                    </div>
                    <span className="w-20 shrink-0 text-right font-medium">
                      {formatCurrency(item.total_amount)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="size-7 shrink-0">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        {item.delivery_date && (
                          <DropdownMenuItem onClick={() => handleToggleDelivered(item)}>
                            {item.delivered ? (
                              <Package className="size-4" />
                            ) : (
                              <PackageCheck className="size-4" />
                            )}
                            {item.delivered ? 'Marcar como no entregada' : 'Marcar como entregada'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setEditingItem(item)}>
                          <Pencil className="size-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeletingItem(item)}>
                          <Trash2 className="size-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <SaleFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        groupId={groupId}
        defaultCustomerId={first?.customer_id ?? undefined}
        defaultSaleDate={first?.sale_date}
      />
      <SaleFormDialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(undefined)}
        sale={editingItem}
      />
      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        groupId={groupId}
        label={items && items.length === 1 ? items[0].item_name : `${items?.length ?? 0} prendas`}
      />
      <ConfirmDialog
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(undefined)}
        title="¿Eliminar esta prenda?"
        description={
          (items?.length ?? 0) <= 1
            ? `"${deletingItem?.item_name}" se eliminará junto con la venta y sus abonos registrados. Esta acción no se puede deshacer.`
            : `"${deletingItem?.item_name}" se eliminará. Esta acción no se puede deshacer.`
        }
        pending={deleteSale.isPending}
        onConfirm={handleDeleteItem}
      />
    </>
  )
}
