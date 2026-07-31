import { formatCurrency, formatDate } from '@/lib/format'
import type { SaleWithBalance } from '@/types'

export function hasUsablePhone(phone: string | null | undefined): boolean {
  return !!phone && phone.replace(/\D/g, '').length >= 7
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

const DIVIDER = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄'

export function buildSaleReceiptMessage(params: {
  customerName?: string | null
  saleDate: string
  items: Pick<SaleWithBalance, 'item_name' | 'total_amount'>[]
  totalAmount: number
  paidAmount: number
  balanceDue: number
}): string {
  const { customerName, saleDate, items, totalAmount, paidAmount, balanceDue } = params
  const lines: string[] = []

  lines.push('🌸 *ODALIA STORE* 🌸')
  lines.push(`🧾 Recibo de compra · ${formatDate(saleDate)}`)
  lines.push(DIVIDER)
  lines.push(customerName ? `¡Hola ${customerName}! 👋 Este es el resumen de tu compra:` : 'Resumen de tu compra:')
  lines.push('')

  items.forEach((item, i) => {
    lines.push(`${i + 1}. ${item.item_name} — *${formatCurrency(item.total_amount)}*`)
  })

  lines.push(DIVIDER)
  lines.push(`💵 *Total:* ${formatCurrency(totalAmount)}`)
  if (paidAmount > 0) lines.push(`✅ *Pagado:* ${formatCurrency(paidAmount)}`)
  lines.push(
    balanceDue > 0
      ? `⏳ *Saldo pendiente:* ${formatCurrency(balanceDue)}`
      : '🎉 *Pagado por completo*',
  )
  lines.push(DIVIDER)
  lines.push('¡Gracias por tu compra! Vuelve pronto 💕')

  return lines.join('\n')
}
