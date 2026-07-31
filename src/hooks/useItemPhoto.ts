import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { convertImageToWebp } from '@/lib/imageToWebp'

const BUCKET = 'item-photos'

export function getPhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export function useUploadItemPhoto() {
  return useMutation({
    mutationFn: async (file: File) => {
      const webp = await convertImageToWebp(file)
      const path = `${crypto.randomUUID()}.webp`
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, webp, { contentType: 'image/webp' })
      if (error) throw error
      return path
    },
  })
}

export function useDeleteItemPhoto() {
  return useMutation({
    mutationFn: async (path: string) => {
      const { error } = await supabase.storage.from(BUCKET).remove([path])
      if (error) throw error
    },
  })
}
