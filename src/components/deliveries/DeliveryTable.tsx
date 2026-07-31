import { useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil, Wallet, PackageCheck, Package } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeliveryStatusBadge } from '@/components/DeliveryStatusBadge'
import { formatCurrency, formatDate } from '@/lib/format'
import { useMarkDelivered } from '@/hooks/useSales'
import { SaleFormDialog } from '@/components/sales/SaleFormDialog'
import { PaymentDialog } from '@/components/sales/PaymentDialog'
import type { SaleWithBalance } from '@/types'

export function DeliveryTable({ deliveries }: { deliveries: SaleWithBalance[] }) {
  const markDelivered = useMarkDelivered()
  const [editingSale, setEditingSale] = useState<SaleWithBalance | undefined>()
  const [paymentSale, setPaymentSale] = useState<SaleWithBalance | undefined>()

  async function handleToggleDelivered(sale: SaleWithBalance) {
    try {
      await markDelivered.mutateAsync({ id: sale.id, delivered: !sale.delivered })
      toast.success(sale.delivered ? 'Marcada como no entregada' : 'Marcada como entregada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error')
    }
  }

  if (deliveries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        No hay entregas que coincidan con el filtro.
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entrega</TableHead>
              <TableHead>Prenda</TableHead>
              <TableHead className="hidden md:table-cell">Cliente</TableHead>
              <TableHead className="hidden text-right md:table-cell">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDate(sale.delivery_date!)}
                </TableCell>
                <TableCell>
                  <p className="font-medium">{sale.item_name}</p>
                  <p className="text-xs text-muted-foreground md:hidden">
                    {sale.customer?.name ?? 'Cliente de paso'} · {formatCurrency(sale.total_amount)}
                  </p>
                  {sale.category && <p className="text-xs text-muted-foreground">{sale.category}</p>}
                </TableCell>
                <TableCell className="hidden text-sm md:table-cell">
                  {sale.customer?.name ?? <span className="text-muted-foreground">Cliente de paso</span>}
                </TableCell>
                <TableCell className="hidden text-right font-medium md:table-cell">
                  {formatCurrency(sale.total_amount)}
                </TableCell>
                <TableCell>
                  <DeliveryStatusBadge deliveryDate={sale.delivery_date!} delivered={sale.delivered} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleToggleDelivered(sale)}>
                        {sale.delivered ? (
                          <Package className="size-4" />
                        ) : (
                          <PackageCheck className="size-4" />
                        )}
                        {sale.delivered ? 'Marcar como no entregada' : 'Marcar como entregada'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPaymentSale(sale)}>
                        <Wallet className="size-4" />
                        Abonos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditingSale(sale)}>
                        <Pencil className="size-4" />
                        Editar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <SaleFormDialog
        open={!!editingSale}
        onOpenChange={(open) => !open && setEditingSale(undefined)}
        sale={editingSale}
      />
      <PaymentDialog
        open={!!paymentSale}
        onOpenChange={(open) => !open && setPaymentSale(undefined)}
        sale={paymentSale}
      />
    </>
  )
}
