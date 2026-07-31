import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PlusCircle, Plus, Trash2, ChevronDown, ChevronUp, ImagePlus, X } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCustomers } from '@/hooks/useCustomers'
import { useCreateSale, useUpdateSale } from '@/hooks/useSales'
import { useCreatePayment } from '@/hooks/usePayments'
import { useExpenses } from '@/hooks/useExpenses'
import { useUploadItemPhoto, useDeleteItemPhoto, getPhotoUrl } from '@/hooks/useItemPhoto'
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog'
import { formatCurrency } from '@/lib/format'
import { PAYMENT_METHOD_LABELS } from '@/types'
import type { Customer, PaymentMethod, SaleWithBalance } from '@/types'

const NO_CUSTOMER = '__none__'
const NO_PACA = '__none__'
const NO_METHOD = '__unspecified__'

interface ItemFormState {
  key: string
  itemName: string
  salePrice: string
  costPrice: string
  hasShipping: boolean
  shippingFee: string
  expenseId: string
  notes: string
  initialPayment: string
  collapsed: boolean
  photoPath: string
  uploadingPhoto: boolean
}

function blankItem(): ItemFormState {
  return {
    key: crypto.randomUUID(),
    itemName: '',
    salePrice: '',
    costPrice: '',
    hasShipping: false,
    shippingFee: '',
    expenseId: NO_PACA,
    notes: '',
    initialPayment: '',
    collapsed: false,
    photoPath: '',
    uploadingPhoto: false,
  }
}

function itemFromSale(sale: SaleWithBalance): ItemFormState {
  return {
    key: sale.id,
    itemName: sale.item_name,
    salePrice: String(sale.sale_price),
    costPrice: sale.cost_price != null ? String(sale.cost_price) : '',
    hasShipping: sale.shipping_fee > 0,
    shippingFee: sale.shipping_fee > 0 ? String(sale.shipping_fee) : '',
    expenseId: sale.expense_id ?? NO_PACA,
    notes: sale.notes ?? '',
    initialPayment: '',
    collapsed: false,
    photoPath: sale.photo_path ?? '',
    uploadingPhoto: false,
  }
}

function itemTotal(item: ItemFormState): number {
  const price = Number(item.salePrice) || 0
  const shipping = item.hasShipping ? Number(item.shippingFee) || 0 : 0
  return price + shipping
}

interface SaleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale?: SaleWithBalance
  defaultCustomerId?: string
  defaultSaleDate?: string
  /** Al agregar prendas a una venta ya existente, el grupo al que deben unirse. */
  groupId?: string
}

export function SaleFormDialog({
  open,
  onOpenChange,
  sale,
  defaultCustomerId,
  defaultSaleDate,
  groupId,
}: SaleFormDialogProps) {
  const { data: customers } = useCustomers()
  const { data: expenses } = useExpenses()
  const createSale = useCreateSale()
  const updateSale = useUpdateSale()
  const createPayment = useCreatePayment()
  const uploadPhoto = useUploadItemPhoto()
  const deletePhoto = useDeleteItemPhoto()
  const isEditing = !!sale

  const [items, setItems] = useState<ItemFormState[]>([blankItem()])
  const [customerId, setCustomerId] = useState<string>(NO_CUSTOMER)
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [deliveryDate, setDeliveryDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>(NO_METHOD)
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState('')

  const pending =
    createSale.isPending ||
    updateSale.isPending ||
    createPayment.isPending ||
    items.some((i) => i.uploadingPhoto)

  const grandTotal = useMemo(() => items.reduce((sum, item) => sum + itemTotal(item), 0), [items])

  const customerItems = useMemo(
    () => ({
      [NO_CUSTOMER]: 'Cliente de paso',
      ...Object.fromEntries((customers ?? []).map((c) => [c.id, c.name])),
    }),
    [customers],
  )
  const expenseItems = useMemo(
    () => ({
      [NO_PACA]: 'Sin especificar',
      ...Object.fromEntries(
        (expenses ?? []).map((e) => [
          e.id,
          e.stock.remaining != null ? `${e.description} (quedan ${e.stock.remaining})` : e.description,
        ]),
      ),
    }),
    [expenses],
  )
  const methodItems = { [NO_METHOD]: 'Sin especificar', ...PAYMENT_METHOD_LABELS }

  useEffect(() => {
    if (!open) return
    if (sale) {
      setItems([itemFromSale(sale)])
      setCustomerId(sale.customer_id ?? NO_CUSTOMER)
      setSaleDate(sale.sale_date)
      setDeliveryDate(sale.delivery_date ?? '')
    } else {
      setItems([blankItem()])
      setCustomerId(defaultCustomerId ?? NO_CUSTOMER)
      setSaleDate(defaultSaleDate ?? new Date().toISOString().slice(0, 10))
      setDeliveryDate('')
      setPaymentMethod(NO_METHOD)
      setActiveGroupId(groupId ?? crypto.randomUUID())
    }
  }, [open, sale, defaultCustomerId, defaultSaleDate, groupId])

  function updateItem(key: string, patch: Partial<ItemFormState>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)))
  }

  function addItem() {
    setItems((prev) => [...prev.map((it) => ({ ...it, collapsed: true })), blankItem()])
  }

  function removeItem(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev))
  }

  function toggleCollapsed(key: string) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, collapsed: !it.collapsed } : it)))
  }

  async function handlePhotoSelected(key: string, file: File | undefined) {
    if (!file) return
    updateItem(key, { uploadingPhoto: true })
    try {
      const path = await uploadPhoto.mutateAsync(file)
      updateItem(key, { photoPath: path, uploadingPhoto: false })
    } catch (err) {
      updateItem(key, { uploadingPhoto: false })
      toast.error(err instanceof Error ? err.message : 'No se pudo subir la foto')
    }
  }

  async function handleRemovePhoto(key: string) {
    const item = items.find((it) => it.key === key)
    if (!item?.photoPath) return
    const path = item.photoPath
    updateItem(key, { photoPath: '' })
    try {
      await deletePhoto.mutateAsync(path)
    } catch {
      // Si falla el borrado en el servidor no pasa nada grave: solo queda
      // un archivo huérfano en el bucket, pero la prenda ya no lo referencia.
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const sharedCustomerId = customerId === NO_CUSTOMER ? null : customerId
      const method: PaymentMethod | null =
        paymentMethod === NO_METHOD ? null : (paymentMethod as PaymentMethod)

      if (isEditing) {
        const item = items[0]
        await updateSale.mutateAsync({
          id: sale.id,
          item_name: item.itemName,
          sale_price: Number(item.salePrice),
          cost_price: item.costPrice ? Number(item.costPrice) : null,
          shipping_fee: item.hasShipping ? Number(item.shippingFee) || 0 : 0,
          customer_id: sharedCustomerId,
          expense_id: item.expenseId === NO_PACA ? null : item.expenseId,
          sale_date: saleDate,
          delivery_date: deliveryDate || null,
          photo_path: item.photoPath || null,
          notes: item.notes || null,
        })
        toast.success('Venta actualizada')
      } else {
        for (const item of items) {
          const total = itemTotal(item)
          const created = await createSale.mutateAsync({
            sale_group_id: activeGroupId,
            item_name: item.itemName,
            sale_price: Number(item.salePrice),
            cost_price: item.costPrice ? Number(item.costPrice) : null,
            shipping_fee: item.hasShipping ? Number(item.shippingFee) || 0 : 0,
            customer_id: sharedCustomerId,
            expense_id: item.expenseId === NO_PACA ? null : item.expenseId,
            sale_date: saleDate,
            delivery_date: deliveryDate || null,
            photo_path: item.photoPath || null,
            notes: item.notes || null,
          })
          const paymentAmount = Number(item.initialPayment) || 0
          if (paymentAmount > 0) {
            await createPayment.mutateAsync({
              sale_id: created.id,
              amount: Math.min(paymentAmount, total),
              payment_date: saleDate,
              payment_method: method,
            })
          }
        }
        toast.success(items.length > 1 ? `${items.length} ventas registradas` : 'Venta registrada')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error al guardar. Revisa qué se alcanzó a registrar.')
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg lg:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar prenda' : groupId ? 'Agregar prenda a la venta' : 'Registrar venta'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Captura la prenda vendida, su precio y, si aplica, el recargo de envío.'
                : groupId
                  ? 'Se agregará junto con las demás prendas de esta venta.'
                  : 'Puedes agregar varias prendas para el mismo cliente en una sola venta.'}
            </DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sale-date">Fecha</Label>
                <Input
                  id="sale-date"
                  type="date"
                  required
                  disabled={!!groupId}
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="customer">Cliente</Label>
                  {!groupId && (
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs font-medium text-brand-pink-strong hover:underline"
                      onClick={() => setCustomerDialogOpen(true)}
                    >
                      <PlusCircle className="size-3.5" />
                      Nuevo
                    </button>
                  )}
                </div>
                <Select
                  value={customerId}
                  onValueChange={(value) => setCustomerId(value ?? NO_CUSTOMER)}
                  items={customerItems}
                  disabled={!!groupId}
                >
                  <SelectTrigger id="customer" className="w-full">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CUSTOMER}>Cliente de paso</SelectItem>
                    {customers?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex flex-col gap-1.5 lg:col-span-1">
                <Label htmlFor="delivery-date">Fecha de entrega (opcional)</Label>
                <Input
                  id="delivery-date"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
            </div>

            {groupId && (
              <p className="-mt-2 text-xs text-muted-foreground">
                Cliente y fecha son los mismos de la venta; para cambiarlos, edítalos desde la venta
                completa.
              </p>
            )}
            <p className="-mt-2 text-xs text-muted-foreground">
              Si pones fecha de entrega, te avisaremos ese día en la app para que no se te olvide.
            </p>

            {!isEditing && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="payment-method">Método de pago (opcional)</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v ?? NO_METHOD)}
                  items={methodItems}
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
            )}

            <div className="flex flex-col gap-3">
              {items.map((item, idx) => (
                <div
                  key={item.key}
                  className="flex flex-col gap-3 rounded-lg border border-border p-3"
                >
                  {items.length > 1 && (
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(item.key)}
                        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                      >
                        {item.collapsed ? (
                          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronUp className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <p className="truncate text-xs font-semibold text-muted-foreground">
                          Prenda {idx + 1}
                          {item.collapsed &&
                            (item.itemName || item.salePrice) &&
                            ` — ${item.itemName || 'sin nombre'}${
                              item.salePrice ? ` · ${formatCurrency(itemTotal(item))}` : ''
                            }`}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}

                  {!item.collapsed && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`item-name-${item.key}`}>Prenda</Label>
                        <Input
                          id={`item-name-${item.key}`}
                          required
                          value={item.itemName}
                          onChange={(e) => updateItem(item.key, { itemName: e.target.value })}
                          placeholder="Ej. Blusa floral"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label>Foto (opcional)</Label>
                        {item.photoPath ? (
                          <div className="flex items-center gap-3">
                            <img
                              src={getPhotoUrl(item.photoPath) ?? ''}
                              alt=""
                              className="size-16 rounded-lg border border-border object-cover"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => handleRemovePhoto(item.key)}
                            >
                              <X className="size-3.5" />
                              Quitar foto
                            </Button>
                          </div>
                        ) : (
                          <label className="flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-brand-pink-strong hover:text-brand-pink-strong">
                            <ImagePlus className="size-4" />
                            {item.uploadingPhoto ? 'Subiendo…' : 'Agregar foto'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={item.uploadingPhoto}
                              onChange={(e) => {
                                handlePhotoSelected(item.key, e.target.files?.[0])
                                e.target.value = ''
                              }}
                            />
                          </label>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor={`paca-${item.key}`}>Paca de origen (opcional)</Label>
                          <Select
                            value={item.expenseId}
                            onValueChange={(value) =>
                              updateItem(item.key, { expenseId: value ?? NO_PACA })
                            }
                            items={expenseItems}
                          >
                            <SelectTrigger id={`paca-${item.key}`} className="w-full">
                              <SelectValue placeholder="¿De qué paca?" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_PACA}>Sin especificar</SelectItem>
                              {expenses?.map((exp) => (
                                <SelectItem key={exp.id} value={exp.id}>
                                  {exp.description}
                                  {exp.stock.remaining != null
                                    ? ` (quedan ${exp.stock.remaining})`
                                    : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor={`sale-price-${item.key}`}>Precio de venta ($)</Label>
                          <Input
                            id={`sale-price-${item.key}`}
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={item.salePrice}
                            onChange={(e) => updateItem(item.key, { salePrice: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor={`cost-price-${item.key}`}>Costo (opcional, $)</Label>
                          <Input
                            id={`cost-price-${item.key}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.costPrice}
                            onChange={(e) => updateItem(item.key, { costPrice: e.target.value })}
                            placeholder="Para calcular ganancia"
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-border bg-secondary/40 p-3">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <input
                            type="checkbox"
                            checked={item.hasShipping}
                            onChange={(e) => updateItem(item.key, { hasShipping: e.target.checked })}
                            className="size-4 accent-brand-pink-strong"
                          />
                          Llevó recargo de envío
                        </label>
                        {item.hasShipping && (
                          <div className="mt-2 flex flex-col gap-1.5">
                            <Label htmlFor={`shipping-fee-${item.key}`}>Monto del envío ($)</Label>
                            <Input
                              id={`shipping-fee-${item.key}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.shippingFee}
                              onChange={(e) => updateItem(item.key, { shippingFee: e.target.value })}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`notes-${item.key}`}>Notas (opcional)</Label>
                        <Textarea
                          id={`notes-${item.key}`}
                          value={item.notes}
                          onChange={(e) => updateItem(item.key, { notes: e.target.value })}
                          placeholder="Talla, color, detalles…"
                        />
                      </div>

                      {!isEditing && (
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor={`initial-payment-${item.key}`}>
                            Pago recibido al momento (de {formatCurrency(itemTotal(item))})
                          </Label>
                          <Input
                            id={`initial-payment-${item.key}`}
                            type="number"
                            min="0"
                            step="0.01"
                            max={itemTotal(item) || undefined}
                            value={item.initialPayment}
                            onChange={(e) => updateItem(item.key, { initialPayment: e.target.value })}
                            placeholder="0.00"
                          />
                          <p className="text-xs text-muted-foreground">
                            Déjalo vacío o en 0 si es a crédito/abonos. Pon el monto si te pagó parte o
                            todo.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            {!isEditing && (
              <button
                type="button"
                onClick={addItem}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-sm font-medium text-muted-foreground hover:border-brand-pink-strong hover:text-brand-pink-strong"
              >
                <Plus className="size-4" />
                Agregar otra prenda
              </button>
            )}

            {items.length > 1 && (
              <p className="text-right text-sm font-medium">
                Total de la compra: {formatCurrency(grandTotal)}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending
                  ? 'Guardando…'
                  : isEditing
                    ? 'Guardar cambios'
                    : items.length > 1
                      ? `Registrar ${items.length} ventas`
                      : 'Registrar venta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CustomerFormDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        onCreated={(customer: Customer) => setCustomerId(customer.id)}
      />
    </>
  )
}
