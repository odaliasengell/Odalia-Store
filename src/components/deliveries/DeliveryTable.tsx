import { useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil, ReceiptText, Wallet, PackageCheck, Package } from 'lucide-react'
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
import { SaleGroupDialog } from '@/components/sales/SaleGroupDialog'
import { PaymentDialog } from '@/components/sales/PaymentDialog'
import type { SaleGroupWithItems, SaleWithBalance } from '@/types'

export function DeliveryTable({ groups }: { groups: SaleGroupWithItems[] }) {
  const markDelivered = useMarkDelivered()
  const [editingSale, setEditingSale] = useState<SaleWithBalance | undefined>()
  const [paymentSale, setPaymentSale] = useState<SaleWithBalance | undefined>()
  const [groupId, setGroupId] = useState<string | undefined>()

  async function handleToggleDelivered(sale: SaleWithBalance) {
    try {
      await markDelivered.mutateAsync({ id: sale.id, delivered: !sale.delivered })
      toast.success(sale.delivered ? 'Marcada como no entregada' : 'Marcada como entregada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error')
    }
  }

  async function handleMarkGroupDelivered(group: SaleGroupWithItems) {
    const targets = group.items.filter((i) => i.delivery_date && !i.delivered)
    try {
      await Promise.all(targets.map((i) => markDelivered.mutateAsync({ id: i.id, delivered: true })))
      toast.success('Venta marcada como entregada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error')
    }
  }

  if (groups.length === 0) {
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
              <TableHead>Prenda(s)</TableHead>
              <TableHead className="hidden md:table-cell">Cliente</TableHead>
              <TableHead className="hidden text-right md:table-cell">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => {
              const single = group.items.length === 1 ? group.items[0] : undefined
              return (
                <TableRow
                  key={group.sale_group_id}
                  className="cursor-pointer"
                  onClick={() => setGroupId(group.sale_group_id)}
                >
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(group.delivery_date!)}
                  </TableCell>
                  <TableCell className="max-w-[220px] whitespace-normal sm:max-w-xs">
                    <p className="break-words font-medium">
                      {single ? single.item_name : `${group.item_count} prendas`}
                    </p>
                    <p className="text-xs text-muted-foreground md:hidden">
                      {group.customer?.name ?? 'Cliente de paso'} · {formatCurrency(group.total_amount)}
                    </p>
                    {!single && (
                      <p className="truncate text-xs text-muted-foreground">
                        {group.items.map((i) => i.item_name).join(', ')}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden max-w-[140px] whitespace-normal break-words text-sm md:table-cell">
                    {group.customer?.name ?? (
                      <span className="text-muted-foreground">Cliente de paso</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-right font-medium md:table-cell">
                    {formatCurrency(group.total_amount)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setGroupId(group.sale_group_id)}>
                      <DeliveryStatusBadge
                        deliveryDate={group.delivery_date!}
                        delivered={group.delivered}
                      />
                    </button>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setGroupId(group.sale_group_id)}>
                          <ReceiptText className="size-4" />
                          Ver venta completa
                        </DropdownMenuItem>
                        {single ? (
                          <>
                            <DropdownMenuItem onClick={() => handleToggleDelivered(single)}>
                              {single.delivered ? (
                                <Package className="size-4" />
                              ) : (
                                <PackageCheck className="size-4" />
                              )}
                              {single.delivered ? 'Marcar como no entregada' : 'Marcar como entregada'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPaymentSale(single)}>
                              <Wallet className="size-4" />
                              Abonos
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingSale(single)}>
                              <Pencil className="size-4" />
                              Editar
                            </DropdownMenuItem>
                          </>
                        ) : (
                          !group.delivered && (
                            <DropdownMenuItem onClick={() => handleMarkGroupDelivered(group)}>
                              <PackageCheck className="size-4" />
                              Marcar todas como entregadas
                            </DropdownMenuItem>
                          )
                        )}
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
      <SaleGroupDialog
        open={!!groupId}
        onOpenChange={(open) => !open && setGroupId(undefined)}
        groupId={groupId}
      />
      <PaymentDialog
        open={!!paymentSale}
        onOpenChange={(open) => !open && setPaymentSale(undefined)}
        sale={paymentSale}
      />
    </>
  )
}
