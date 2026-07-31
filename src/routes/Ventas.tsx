import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SaleTable } from '@/components/sales/SaleTable'
import { SaleFormDialog } from '@/components/sales/SaleFormDialog'
import { useSales, type SaleFilters } from '@/hooks/useSales'
import { useCustomers } from '@/hooks/useCustomers'
import { ITEM_CATEGORIES } from '@/types'
import type { PaymentStatus } from '@/types'

const ALL = '__all__'

export function Ventas() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [customerId, setCustomerId] = useState(ALL)
  const [category, setCategory] = useState(ALL)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | typeof ALL>(ALL)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: customers } = useCustomers()

  const filters: SaleFilters = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      customerId: customerId === ALL ? undefined : customerId,
      category: category === ALL ? undefined : category,
      paymentStatus: paymentStatus === ALL ? undefined : paymentStatus,
    }),
    [from, to, customerId, category, paymentStatus],
  )

  const { data: sales, isLoading } = useSales(filters)

  const customerItems = useMemo(
    () => ({ [ALL]: 'Todos', ...Object.fromEntries((customers ?? []).map((c) => [c.id, c.name])) }),
    [customers],
  )
  const categoryItems = useMemo(
    () => ({ [ALL]: 'Todas', ...Object.fromEntries(ITEM_CATEGORIES.map((c) => [c, c])) }),
    [],
  )
  const paymentStatusItems = {
    [ALL]: 'Todos',
    pagado: 'Pagado',
    parcial: 'Parcial',
    pendiente: 'Pendiente',
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Ventas</h1>
          <p className="text-sm text-muted-foreground">
            Registra cada prenda vendida y controla los pagos pendientes.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Nueva venta
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-from">Desde</Label>
          <Input id="filter-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-to">Hasta</Label>
          <Input id="filter-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Cliente</Label>
          <Select
            value={customerId}
            onValueChange={(value) => setCustomerId(value ?? ALL)}
            items={customerItems}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {customers?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Categoría</Label>
          <Select
            value={category}
            onValueChange={(value) => setCategory(value ?? ALL)}
            items={categoryItems}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              {ITEM_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Estado de pago</Label>
          <Select
            value={paymentStatus}
            onValueChange={(value) => setPaymentStatus((value ?? ALL) as typeof paymentStatus)}
            items={paymentStatusItems}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              <SelectItem value="pagado">Pagado</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando ventas…</p>
      ) : (
        <SaleTable sales={sales ?? []} />
      )}

      <SaleFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
