import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Sale, SaleBalance, SaleWithBalance, SaleWithCustomer } from '@/types'

export interface SaleFilters {
  from?: string
  to?: string
  customerId?: string
  category?: string
  paymentStatus?: SaleBalance['payment_status']
}

async function fetchSalesWithBalances(filters: SaleFilters = {}): Promise<SaleWithBalance[]> {
  let query = supabase
    .from('sales')
    .select('*, customer:customers(id, name), expense:expenses(id, description)')
    .order('sale_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.from) query = query.gte('sale_date', filters.from)
  if (filters.to) query = query.lte('sale_date', filters.to)
  if (filters.customerId) query = query.eq('customer_id', filters.customerId)
  if (filters.category) query = query.eq('category', filters.category)

  const { data: sales, error } = await query
  if (error) throw error

  const { data: balances, error: balancesError } = await supabase
    .from('sale_balances')
    .select('*')
  if (balancesError) throw balancesError

  const balanceMap = new Map((balances as SaleBalance[]).map((b) => [b.sale_id, b]))

  const merged = (sales as unknown as SaleWithBalance[]).map((sale) => ({
    ...sale,
    balance: balanceMap.get(sale.id) ?? {
      sale_id: sale.id,
      total_amount: sale.total_amount,
      paid_amount: 0,
      balance_due: sale.total_amount,
      payment_status: 'pendiente' as const,
    },
  }))

  if (filters.paymentStatus) {
    return merged.filter((sale) => sale.balance.payment_status === filters.paymentStatus)
  }
  return merged
}

export function useSales(filters: SaleFilters = {}) {
  return useQuery({
    queryKey: ['sales', filters],
    queryFn: () => fetchSalesWithBalances(filters),
  })
}

export function useSalesByCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: ['sales', { customerId }],
    queryFn: () => fetchSalesWithBalances({ customerId }),
    enabled: !!customerId,
  })
}

export function useTodaysDeliveries() {
  const today = new Date().toISOString().slice(0, 10)
  return useQuery({
    queryKey: ['sales', 'deliveries', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, customer:customers(id, name), expense:expenses(id, description)')
        .eq('delivery_date', today)
        .eq('delivered', false)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as unknown as SaleWithCustomer[]
    },
    refetchOnMount: true,
  })
}

export interface DeliveryFilters {
  status?: 'pendiente' | 'entregada'
}

export function useDeliveries(filters: DeliveryFilters = {}) {
  return useQuery({
    queryKey: ['sales', 'deliveries', 'all', filters],
    queryFn: async (): Promise<SaleWithBalance[]> => {
      let query = supabase
        .from('sales')
        .select('*, customer:customers(id, name), expense:expenses(id, description)')
        .not('delivery_date', 'is', null)
        .order('delivery_date', { ascending: true })

      if (filters.status === 'pendiente') query = query.eq('delivered', false)
      if (filters.status === 'entregada') query = query.eq('delivered', true)

      const { data: sales, error } = await query
      if (error) throw error

      const { data: balances, error: balancesError } = await supabase
        .from('sale_balances')
        .select('*')
      if (balancesError) throw balancesError

      const balanceMap = new Map((balances as SaleBalance[]).map((b) => [b.sale_id, b]))

      return (sales as unknown as SaleWithBalance[]).map((sale) => ({
        ...sale,
        balance: balanceMap.get(sale.id) ?? {
          sale_id: sale.id,
          total_amount: sale.total_amount,
          paid_amount: 0,
          balance_due: sale.total_amount,
          payment_status: 'pendiente' as const,
        },
      }))
    },
  })
}

export function useMarkDelivered() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, delivered }: { id: string; delivered: boolean }) => {
      const { error } = await supabase.from('sales').update({ delivered }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })
}

export type SaleInput = {
  item_name: string
  category?: string | null
  sale_price: number
  cost_price?: number | null
  shipping_fee: number
  customer_id?: string | null
  expense_id?: string | null
  sale_date: string
  delivery_date?: string | null
  notes?: string | null
}

export function useCreateSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaleInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('sales')
        .insert({ ...input, created_by: user?.id })
        .select()
        .single()
      if (error) throw error
      return data as Sale
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

export function useUpdateSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: SaleInput & { id: string }) => {
      const { data, error } = await supabase
        .from('sales')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Sale
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

export function useDeleteSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sales').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}
