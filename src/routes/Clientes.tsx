import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useCustomers } from '@/hooks/useCustomers'
import { useSalesByCustomer } from '@/hooks/useSales'
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog'
import { CustomerDetailDialog } from '@/components/customers/CustomerDetailDialog'
import { formatCurrency } from '@/lib/format'
import type { Customer } from '@/types'

function CustomerCard({ customer, onOpen }: { customer: Customer; onOpen: () => void }) {
  const { data: sales } = useSalesByCustomer(customer.id)
  const pendingBalance = (sales ?? []).reduce((sum, s) => sum + s.balance.balance_due, 0)

  return (
    <button
      onClick={onOpen}
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-brand-pink-strong"
    >
      <p className="font-medium">{customer.name}</p>
      {customer.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
      <div className="mt-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{sales?.length ?? 0} compras</span>
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
  const { data: customers, isLoading } = useCustomers()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<Customer | undefined>()

  const filtered = useMemo(() => {
    if (!customers) return []
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q),
    )
  }, [customers, search])

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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre o teléfono…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando clientes…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No hay clientes que coincidan con la búsqueda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onOpen={() => setSelected(customer)}
            />
          ))}
        </div>
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
