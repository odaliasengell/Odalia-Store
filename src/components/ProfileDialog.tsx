import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { getInitials } from '@/lib/format'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Dueña',
  employee: 'Empleada',
}

export function ProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user, signOut } = useAuth()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')

  useEffect(() => {
    if (open) setFullName(profile?.full_name ?? '')
  }, [open, profile])

  const displayName = profile?.full_name || user?.email?.split('@')[0] || ''

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    try {
      await updateProfile.mutateAsync(fullName)
      toast.success('Perfil actualizado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error')
    }
  }

  async function handleSignOut() {
    await signOut()
    onOpenChange(false)
    navigate('/login')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mi perfil</DialogTitle>
          <DialogDescription>Tus datos de acceso a Odalia Store.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <Avatar size="lg">
            <AvatarFallback className="bg-brand-pink-strong text-white">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="overflow-hidden">
            <p className="truncate font-medium">{displayName}</p>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
          </div>
          {profile?.role && (
            <span className="ml-auto shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {ROLE_LABELS[profile.role] ?? profile.role}
            </span>
          )}
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSave}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-name">Nombre</Label>
            <Input
              id="profile-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>
          <Button type="submit" disabled={updateProfile.isPending} className="self-start">
            {updateProfile.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </form>

        <Separator />

        <DialogFooter>
          <Button variant="outline" className="w-full gap-2" onClick={handleSignOut}>
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
