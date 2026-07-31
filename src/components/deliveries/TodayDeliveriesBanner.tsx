import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Bell, CheckCircle2, PackageCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTodaysDeliveries, useMarkDelivered } from '@/hooks/useSales'

export function TodayDeliveriesBanner() {
  const { data: deliveries } = useTodaysDeliveries()
  const markDelivered = useMarkDelivered()
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )
  const notified = useRef(false)

  useEffect(() => {
    if (notifPermission !== 'granted' || notified.current) return
    if (!deliveries || deliveries.length === 0) return
    notified.current = true
    const names = deliveries.map((d) => d.customer?.name ?? d.item_name).slice(0, 3).join(', ')
    new Notification('Entregas de hoy — Odalia Store', {
      body:
        deliveries.length === 1
          ? `Tienes 1 entrega hoy: ${names}`
          : `Tienes ${deliveries.length} entregas hoy: ${names}${deliveries.length > 3 ? '…' : ''}`,
    })
  }, [deliveries, notifPermission])

  async function handleEnableNotifications() {
    if (typeof Notification === 'undefined') return
    const permission = await Notification.requestPermission()
    setNotifPermission(permission)
    if (permission === 'denied') {
      toast.error('No se activaron los avisos. Puedes habilitarlos desde los permisos del sitio en tu navegador.')
    }
  }

  async function handleMarkDelivered(id: string) {
    try {
      await markDelivered.mutateAsync({ id, delivered: true })
      toast.success('Marcada como entregada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error')
    }
  }

  if (!deliveries || deliveries.length === 0) return null

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-brand-pink-strong/30 bg-brand-bg p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PackageCheck className="size-5 text-brand-pink-strong" />
          <p className="font-medium text-foreground">
            Tienes {deliveries.length} entrega{deliveries.length === 1 ? '' : 's'} programada
            {deliveries.length === 1 ? '' : 's'} para hoy
          </p>
        </div>
        {notifPermission === 'default' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleEnableNotifications}
          >
            <Bell className="size-3.5" />
            Activar avisos del navegador
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {deliveries.map((sale) => (
          <div
            key={sale.id}
            className="flex items-center justify-between rounded-md bg-card px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium">{sale.item_name}</p>
              <p className="text-xs text-muted-foreground">
                {sale.customer?.name ?? 'Cliente de paso'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-emerald-700 hover:text-emerald-800"
              disabled={markDelivered.isPending}
              onClick={() => handleMarkDelivered(sale.id)}
            >
              <CheckCircle2 className="size-4" />
              Entregada
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
