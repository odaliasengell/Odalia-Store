const MAX_DIMENSION = 1000
const QUALITY = 0.75

/** Redimensiona y convierte una imagen a WebP en el navegador antes de subirla. */
export async function convertImageToWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No se pudo procesar la imagen en este navegador.')
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', QUALITY),
    )
    if (!blob) throw new Error('No se pudo convertir la imagen a WebP.')
    return blob
  } finally {
    bitmap.close()
  }
}
