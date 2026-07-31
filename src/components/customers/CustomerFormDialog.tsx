import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/useCustomers'
import type { Customer } from '@/types'

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer
  onCreated?: (customer: Customer) => void
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onCreated,
}: CustomerFormDialogProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const isEditing = !!customer
  const pending = createCustomer.isPending || updateCustomer.isPending

  useEffect(() => {
    if (open) {
      setName(customer?.name ?? '')
      setPhone(customer?.phone ?? '')
      setNotes(customer?.notes ?? '')
    }
  }, [open, customer])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (isEditing) {
        await updateCustomer.mutateAsync({
          id: customer.id,
          name,
          phone: phone || null,
          notes: notes || null,
        })
        toast.success('Cliente actualizado')
      } else {
        const created = await createCustomer.mutateAsync({
          name,
          phone: phone || null,
          notes: notes || null,
        })
        toast.success('Cliente agregado')
        onCreated?.(created)
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md lg:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualiza los datos del cliente.'
              : 'Agrega un cliente para llevar su historial de compras y saldo.'}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customer-name">Nombre</Label>
              <Input
                id="customer-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del cliente"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customer-phone">Teléfono (opcional)</Label>
              <Input
                id="customer-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. +593987654321"
              />
              <p className="text-xs text-muted-foreground">
                Incluye el código de país para poder enviar el recibo por WhatsApp.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer-notes">Notas (opcional)</Label>
            <Textarea
              id="customer-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dirección, referencias, etc."
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Agregar cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
