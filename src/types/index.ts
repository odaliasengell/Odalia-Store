export type PaymentStatus = 'pagado' | 'parcial' | 'pendiente'

export interface Customer {
  id: string
  name: string
  phone: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface Sale {
  id: string
  item_name: string
  category: string | null
  sale_price: number
  cost_price: number | null
  shipping_fee: number
  total_amount: number
  customer_id: string | null
  expense_id: string | null
  sale_date: string
  delivery_date: string | null
  delivered: boolean
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface SaleWithCustomer extends Sale {
  customer: Pick<Customer, 'id' | 'name'> | null
  expense: Pick<Expense, 'id' | 'description'> | null
}

export type PaymentMethod = 'efectivo' | 'transferencia'

export interface Payment {
  id: string
  sale_id: string
  amount: number
  payment_date: string
  payment_method: PaymentMethod | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface SaleBalance {
  sale_id: string
  total_amount: number
  paid_amount: number
  balance_due: number
  payment_status: PaymentStatus
}

export interface SaleWithBalance extends SaleWithCustomer {
  balance: SaleBalance
}

export interface Expense {
  id: string
  description: string
  amount: number
  item_count: number | null
  expense_date: string
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface ExpenseStock {
  expense_id: string
  item_count: number | null
  sold_count: number
  remaining: number | null
}

export interface ExpenseWithStock extends Expense {
  stock: ExpenseStock
}

export interface Profile {
  id: string
  full_name: string | null
  role: 'owner' | 'employee'
  created_at: string
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
}

export const ITEM_CATEGORIES = [
  'Bodys',
  'Blusas',
  'Camisetas',
  'Busos',
  'Conjuntos',
  'Enterizos',
  'Faldas',
  'Palazzos',
  'Pantalones',
  'Pareos',
  'Shorts',
  'Trajes de baño',
  'Vestidos',
  'Licras',
  'Otro',
] as const
