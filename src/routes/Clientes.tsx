import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pagination } from '@/components/Pagination'
import { useCustomersPage, type CustomerStatusFilter } from '@/hooks/useCustomers'
import { useSaleGroupsByCustomer } from '@/hooks/useSales'
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog'
import { CustomerDetailDialog } from '@/components/customers/CustomerDetailDialog'
import { formatCurrency } from '@/lib/format'
import type { Customer } from '@/types'

const PAGE_SIZE = 24

const STATUS_ITEMS: Record<CustomerStatusFilter, string> = {
  active: 'Activos',
  inactive: 'Inactivos',
  all: 'Todos',
}

function CustomerCard({ customer, onOpen }: { customer: Customer; onOpen: () => void }) {
  const { data: groups } = useSaleGroupsByCustomer(customer.id)
  const pendingBalance = (groups ?? []).reduce((sum, g) => sum + g.balance_due, 0)

  return (
    <button
      onClick={onOpen}
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-brand-pink-strong"
    >
      <div className="flex items-center gap-2">
        <p className="font-medium">{customer.name}</p>
        {!customer.active && <Badge variant="secondary">Inactivo</Badge>}
      </div>
      {customer.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
      <div className="mt-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{groups?.length ?? 0} compras</span>
        {pendingBalance > 0 ? (
          <span className="font-medium text-rose-600">
            Debe {formatCurrency(pendingBalance)}
          </span>
        ) : (
          <span className="font-medium text-emerald-600">Al corriente</span>
        )}
      </div>
    </button>
  )
}

export function Clientes() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<CustomerStatusFilter>('active')
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<Customer | undefined>()

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status])

  const { data, isLoading } = useCustomersPage(debouncedSearch, page, PAGE_SIZE, status)
  const customers = data?.customers ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Historial de compras y saldo pendiente por cliente.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Nuevo cliente
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre o teléfono…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => setStatus((v ?? 'active') as CustomerStatusFilter)}
          items={STATUS_ITEMS}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando clientes…</p>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No hay clientes que coincidan con la búsqueda.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onOpen={() => setSelected(customer)}
              />
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.count ?? 0} onPageChange={setPage} />
        </>
      )}

      <CustomerFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CustomerDetailDialog
        customer={selected}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(undefined)}
      />
    </div>
  )
}
