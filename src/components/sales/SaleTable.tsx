import { useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil, Trash2, Wallet, PackageCheck, Package } from 'lucide-react'
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
import { PaymentStatusBadge } from '@/components/PaymentStatusBadge'
import { formatCurrency, formatDate } from '@/lib/format'
import { useDeleteSale, useMarkDelivered } from '@/hooks/useSales'
import { SaleFormDialog } from '@/components/sales/SaleFormDialog'
import { PaymentDialog } from '@/components/sales/PaymentDialog'
import type { SaleWithBalance } from '@/types'

export function SaleTable({ sales }: { sales: SaleWithBalance[] }) {
  const deleteSale = useDeleteSale()
  const markDelivered = useMarkDelivered()
  const [editingSale, setEditingSale] = useState<SaleWithBalance | undefined>()
  const [paymentSale, setPaymentSale] = useState<SaleWithBalance | undefined>()

  async function handleDelete(sale: SaleWithBalance) {
    if (!confirm(`¿Eliminar la venta "${sale.item_name}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteSale.mutateAsync(sale.id)
      toast.success('Venta eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error')
    }
  }

  async function handleToggleDelivered(sale: SaleWithBalance) {
    try {
      await markDelivered.mutateAsync({ id: sale.id, delivered: !sale.delivered })
      toast.success(sale.delivered ? 'Marcada como no entregada' : 'Marcada como entregada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error')
    }
  }

  if (sales.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        No hay ventas que coincidan con el filtro.
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden md:table-cell">Fecha</TableHead>
              <TableHead>Prenda</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="hidden text-right md:table-cell">Ganancia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => {
              const profit =
                sale.cost_price != null ? sale.total_amount - sale.cost_price : null
              return (
                <TableRow key={sale.id}>
                  <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground md:table-cell">
                    {formatDate(sale.sale_date)}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{sale.item_name}</p>
                    <p className="text-xs text-muted-foreground md:hidden">
                      {formatDate(sale.sale_date)}
                    </p>
                    {sale.category && (
                      <p className="text-xs text-muted-foreground">{sale.category}</p>
                    )}
                    {sale.expense && (
                      <p className="text-xs text-muted-foreground">De: {sale.expense.description}</p>
                    )}
                    {sale.delivery_date && (
                      <p
                        className={`text-xs ${sale.delivered ? 'text-emerald-600' : 'text-brand-pink-strong'}`}
                      >
                        {sale.delivered ? 'Entregada' : 'Entrega'}: {formatDate(sale.delivery_date)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {sale.customer?.name ?? (
                      <span className="text-muted-foreground">Cliente de paso</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(sale.total_amount)}
                    {sale.shipping_fee > 0 && (
                      <p className="text-xs font-normal text-muted-foreground">
                        incl. envío {formatCurrency(sale.shipping_fee)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-right md:table-cell">
                    {profit != null ? (
                      <span className={profit >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                        {formatCurrency(profit)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <button onClick={() => setPaymentSale(sale)}>
                      <PaymentStatusBadge status={sale.balance.payment_status} />
                    </button>
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
                        <DropdownMenuItem onClick={() => setPaymentSale(sale)}>
                          <Wallet className="size-4" />
                          Abonos
                        </DropdownMenuItem>
                        {sale.delivery_date && (
                          <DropdownMenuItem onClick={() => handleToggleDelivered(sale)}>
                            {sale.delivered ? (
                              <Package className="size-4" />
                            ) : (
                              <PackageCheck className="size-4" />
                            )}
                            {sale.delivered ? 'Marcar como no entregada' : 'Marcar como entregada'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setEditingSale(sale)}>
                          <Pencil className="size-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDelete(sale)}
                        >
                          <Trash2 className="size-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
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
