import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { DeliveryTable } from '@/components/deliveries/DeliveryTable'
import { Pagination } from '@/components/Pagination'
import { useDeliveryGroupsPage, useDeliveryCounts, type DeliveryFilters } from '@/hooks/useSales'

const ALL = '__all__'
const PAGE_SIZE = 20

export function Entregas() {
  const [status, setStatus] = useState<string>(ALL)
  const [page, setPage] = useState(1)

  const filters: DeliveryFilters = useMemo(
    () => ({ status: status === ALL ? undefined : (status as 'pendiente' | 'entregada') }),
    [status],
  )

  useEffect(() => {
    setPage(1)
  }, [filters])

  const { data, isLoading } = useDeliveryGroupsPage(filters, page, PAGE_SIZE)
  const { data: counts } = useDeliveryCounts()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Entregas</h1>
        <p className="text-sm text-muted-foreground">
          Todas las ventas con fecha de entrega programada.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Pendientes</p>
            <p className="text-2xl font-semibold">{counts?.pendientes ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Para hoy</p>
            <p className="text-2xl font-semibold text-brand-pink-strong">{counts?.hoy ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Atrasadas</p>
            <p className="text-2xl font-semibold text-rose-600">{counts?.atrasadas ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Entregadas</p>
            <p className="text-2xl font-semibold text-emerald-600">{counts?.entregadas ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-1.5 sm:w-64">
        <Label>Estado</Label>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v ?? ALL)}
          items={{ [ALL]: 'Todas', pendiente: 'Pendientes', entregada: 'Entregadas' }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="entregada">Entregadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando entregas…</p>
      ) : (
        <>
          <DeliveryTable groups={data?.groups ?? []} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.count ?? 0} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
