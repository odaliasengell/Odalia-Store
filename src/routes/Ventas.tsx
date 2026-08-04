import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SaleTable } from '@/components/sales/SaleTable'
import { SaleFormDialog } from '@/components/sales/SaleFormDialog'
import { CustomerCombobox } from '@/components/customers/CustomerCombobox'
import { Pagination } from '@/components/Pagination'
import { useSaleGroupsPage, type SaleFilters } from '@/hooks/useSales'
import { useCustomers } from '@/hooks/useCustomers'
import type { PaymentStatus } from '@/types'

const ALL = '__all__'
const PAGE_SIZE = 20

type SalesTab = 'por-cobrar' | 'pagadas' | 'todas'

const TAB_PAYMENT_STATUS: Record<SalesTab, PaymentStatus | PaymentStatus[] | undefined> = {
  'por-cobrar': ['pendiente', 'parcial'],
  pagadas: 'pagado',
  todas: undefined,
}

export function Ventas() {
  const [tab, setTab] = useState<SalesTab>('por-cobrar')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [customerId, setCustomerId] = useState(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const [page, setPage] = useState(1)

  const { data: customers } = useCustomers()

  const filters: SaleFilters = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      customerId: customerId === ALL ? undefined : customerId,
      paymentStatus: TAB_PAYMENT_STATUS[tab],
    }),
    [from, to, customerId, tab],
  )

  useEffect(() => {
    setPage(1)
  }, [filters])

  const { data, isLoading } = useSaleGroupsPage(filters, page, PAGE_SIZE)

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

      <Tabs value={tab} onValueChange={(v) => setTab((v ?? 'por-cobrar') as SalesTab)}>
        <TabsList>
          <TabsTrigger value="por-cobrar">Por cobrar</TabsTrigger>
          <TabsTrigger value="pagadas">Pagadas</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-from">Desde</Label>
          <Input id="filter-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-to">Hasta</Label>
          <Input id="filter-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
          <Label htmlFor="filter-customer">Cliente</Label>
          <CustomerCombobox
            id="filter-customer"
            customers={customers ?? []}
            value={customerId}
            onValueChange={setCustomerId}
            emptyValue={ALL}
            emptyLabel="Todos"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando ventas…</p>
      ) : (
        <>
          <SaleTable groups={data?.groups ?? []} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.count ?? 0} onPageChange={setPage} />
        </>
      )}

      <SaleFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
