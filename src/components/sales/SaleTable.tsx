import { useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil, ReceiptText, Trash2, Wallet, PackageCheck, Package } from 'lucide-react'
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
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { formatCurrency, formatDate } from '@/lib/format'
import { getPhotoUrl } from '@/hooks/useItemPhoto'
import { useDeleteSale, useDeleteSaleGroup, useMarkDelivered } from '@/hooks/useSales'
import { SaleFormDialog } from '@/components/sales/SaleFormDialog'
import { SaleGroupDialog } from '@/components/sales/SaleGroupDialog'
import { PaymentDialog } from '@/components/sales/PaymentDialog'
import type { SaleGroupWithItems, SaleWithBalance } from '@/types'

function groupProfit(group: SaleGroupWithItems): number | null {
  if (group.items.length === 0 || !group.items.every((i) => i.cost_price != null)) return null
  return group.items.reduce((sum, i) => sum + i.total_amount - (i.cost_price ?? 0), 0)
}

export function SaleTable({ groups }: { groups: SaleGroupWithItems[] }) {
  const deleteSale = useDeleteSale()
  const deleteSaleGroup = useDeleteSaleGroup()
  const markDelivered = useMarkDelivered()
  const [editingSale, setEditingSale] = useState<SaleWithBalance | undefined>()
  const [paymentSale, setPaymentSale] = useState<SaleWithBalance | undefined>()
  const [deletingSale, setDeletingSale] = useState<SaleWithBalance | undefined>()
  const [deletingGroup, setDeletingGroup] = useState<SaleGroupWithItems | undefined>()
  const [groupId, setGroupId] = useState<string | undefined>()

  async function handleDelete() {
    if (!deletingSale) return
    try {
      await deleteSale.mutateAsync(deletingSale.id)
      toast.success('Venta eliminada')
      setDeletingSale(undefined)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error')
    }
  }

  async function handleDeleteGroup() {
    if (!deletingGroup) return
    try {
      await deleteSaleGroup.mutateAsync(deletingGroup.sale_group_id)
      toast.success('Venta eliminada')
      setDeletingGroup(undefined)
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

  if (groups.length === 0) {
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
              <TableHead>Prenda(s)</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="hidden text-right md:table-cell">Ganancia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => {
              const single = group.items.length === 1 ? group.items[0] : undefined
              const profit = groupProfit(group)
              const deliveryDate = single ? single.delivery_date : group.delivery_date
              const delivered = single ? single.delivered : group.delivered
              return (
                <TableRow
                  key={group.sale_group_id}
                  className="cursor-pointer"
                  onClick={() => setGroupId(group.sale_group_id)}
                >
                  <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground md:table-cell">
                    {formatDate(group.sale_date)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start gap-2">
                      {single?.photo_path && (
                        <img
                          src={getPhotoUrl(single.photo_path) ?? ''}
                          alt=""
                          className="size-10 shrink-0 rounded-md border border-border object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium">
                          {single ? single.item_name : `${group.item_count} prendas`}
                        </p>
                        <p className="text-xs text-muted-foreground md:hidden">
                          {formatDate(group.sale_date)}
                        </p>
                        {single ? (
                          <>
                            {single.category && (
                              <p className="text-xs text-muted-foreground">{single.category}</p>
                            )}
                            {single.expense && (
                              <p className="text-xs text-muted-foreground">
                                De: {single.expense.description}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="truncate text-xs text-muted-foreground">
                            {group.items.map((i) => i.item_name).join(', ')}
                          </p>
                        )}
                        {deliveryDate && (
                          <p
                            className={`text-xs ${delivered ? 'text-emerald-600' : 'text-brand-pink-strong'}`}
                          >
                            {delivered ? 'Entregada' : 'Entrega'}: {formatDate(deliveryDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {group.customer?.name ?? (
                      <span className="text-muted-foreground">Cliente de paso</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(group.total_amount)}
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        single ? setPaymentSale(single) : setGroupId(group.sale_group_id)
                      }}
                    >
                      <PaymentStatusBadge status={group.payment_status} />
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
                        {single && (
                          <>
                            <DropdownMenuItem onClick={() => setPaymentSale(single)}>
                              <Wallet className="size-4" />
                              Abonos
                            </DropdownMenuItem>
                            {single.delivery_date && (
                              <DropdownMenuItem onClick={() => handleToggleDelivered(single)}>
                                {single.delivered ? (
                                  <Package className="size-4" />
                                ) : (
                                  <PackageCheck className="size-4" />
                                )}
                                {single.delivered ? 'Marcar como no entregada' : 'Marcar como entregada'}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setEditingSale(single)}>
                              <Pencil className="size-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeletingSale(single)}
                            >
                              <Trash2 className="size-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
                        {!single && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeletingGroup(group)}
                          >
                            <Trash2 className="size-4" />
                            Eliminar venta completa
                          </DropdownMenuItem>
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
      <ConfirmDialog
        open={!!deletingSale}
        onOpenChange={(open) => !open && setDeletingSale(undefined)}
        title="¿Eliminar esta venta?"
        description={`"${deletingSale?.item_name}" se eliminará junto con sus abonos registrados. Esta acción no se puede deshacer.`}
        pending={deleteSale.isPending}
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={!!deletingGroup}
        onOpenChange={(open) => !open && setDeletingGroup(undefined)}
        title="¿Eliminar esta venta completa?"
        description={`Se eliminarán las ${deletingGroup?.item_count ?? 0} prendas de esta venta junto con sus abonos registrados. Esta acción no se puede deshacer.`}
        pending={deleteSaleGroup.isPending}
        onConfirm={handleDeleteGroup}
      />
    </>
  )
}
