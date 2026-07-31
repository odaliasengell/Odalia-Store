import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { DeliveryTable } from '@/components/deliveries/DeliveryTable'
import { useDeliveries, type DeliveryFilters } from '@/hooks/useSales'

const ALL = '__all__'

export function Entregas() {
  const [status, setStatus] = useState<string>(ALL)

  const filters: DeliveryFilters = useMemo(
    () => ({ status: status === ALL ? undefined : (status as 'pendiente' | 'entregada') }),
    [status],
  )

  const { data: deliveries, isLoading } = useDeliveries(filters)

  const today = new Date().toISOString().slice(0, 10)
  const counts = useMemo(() => {
    const list = deliveries ?? []
    return {
      pendientes: list.filter((d) => !d.delivered).length,
      atrasadas: list.filter((d) => !d.delivered && d.delivery_date! < today).length,
      hoy: list.filter((d) => !d.delivered && d.delivery_date === today).length,
      entregadas: list.filter((d) => d.delivered).length,
    }
  }, [deliveries, today])

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
            <p className="text-2xl font-semibold">{counts.pendientes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Para hoy</p>
            <p className="text-2xl font-semibold text-brand-pink-strong">{counts.hoy}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Atrasadas</p>
            <p className="text-2xl font-semibold text-rose-600">{counts.atrasadas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Entregadas</p>
            <p className="text-2xl font-semibold text-emerald-600">{counts.entregadas}</p>
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
        <DeliveryTable deliveries={deliveries ?? []} />
      )}
    </div>
  )
}
