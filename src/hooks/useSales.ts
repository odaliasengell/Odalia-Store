import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type {
  Sale,
  SaleBalance,
  SaleGroup,
  SaleGroupWithItems,
  SaleWithBalance,
  SaleWithCustomer,
} from '@/types'

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

export interface SaleGroupsPage {
  groups: SaleGroupWithItems[]
  count: number
}

async function fetchSaleGroupsPage(
  filters: SaleFilters,
  page: number,
  pageSize: number,
): Promise<SaleGroupsPage> {
  let categoryGroupIds: string[] | null = null
  if (filters.category) {
    const { data, error } = await supabase
      .from('sales')
      .select('sale_group_id')
      .eq('category', filters.category)
    if (error) throw error
    categoryGroupIds = [...new Set((data as { sale_group_id: string }[]).map((d) => d.sale_group_id))]
    if (categoryGroupIds.length === 0) return { groups: [], count: 0 }
  }

  let query = supabase
    .from('sale_groups')
    .select('*', { count: 'exact' })
    .order('sale_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.from) query = query.gte('sale_date', filters.from)
  if (filters.to) query = query.lte('sale_date', filters.to)
  if (filters.customerId) query = query.eq('customer_id', filters.customerId)
  if (filters.paymentStatus) query = query.eq('payment_status', filters.paymentStatus)
  if (categoryGroupIds) query = query.in('sale_group_id', categoryGroupIds)

  const from = (page - 1) * pageSize
  const { data: groups, count, error } = await query.range(from, from + pageSize - 1)
  if (error) throw error

  const groupIds = (groups as SaleGroup[]).map((g) => g.sale_group_id)
  let items: SaleWithBalance[] = []
  if (groupIds.length > 0) {
    const { data: rawItems, error: itemsError } = await supabase
      .from('sales')
      .select('*, customer:customers(id, name), expense:expenses(id, description)')
      .in('sale_group_id', groupIds)
      .order('created_at', { ascending: true })
    if (itemsError) throw itemsError

    const ids = (rawItems ?? []).map((s) => (s as unknown as Sale).id)
    let balances: SaleBalance[] = []
    if (ids.length > 0) {
      const { data, error: balancesError } = await supabase
        .from('sale_balances')
        .select('*')
        .in('sale_id', ids)
      if (balancesError) throw balancesError
      balances = data as SaleBalance[]
    }
    const balanceMap = new Map(balances.map((b) => [b.sale_id, b]))

    items = (rawItems as unknown as SaleWithBalance[]).map((sale) => ({
      ...sale,
      balance: balanceMap.get(sale.id) ?? {
        sale_id: sale.id,
        total_amount: sale.total_amount,
        paid_amount: 0,
        balance_due: sale.total_amount,
        payment_status: 'pendiente' as const,
      },
    }))
  }

  const itemsByGroup = new Map<string, SaleWithBalance[]>()
  for (const item of items) {
    const arr = itemsByGroup.get(item.sale_group_id) ?? []
    arr.push(item)
    itemsByGroup.set(item.sale_group_id, arr)
  }

  const merged: SaleGroupWithItems[] = (groups as SaleGroup[]).map((g) => {
    const groupItems = itemsByGroup.get(g.sale_group_id) ?? []
    return { ...g, items: groupItems, customer: groupItems[0]?.customer ?? null }
  })

  return { groups: merged, count: count ?? 0 }
}

export function useSaleGroupsPage(filters: SaleFilters, page: number, pageSize: number) {
  return useQuery({
    queryKey: ['sales', 'groups', 'page', filters, page, pageSize],
    queryFn: () => fetchSaleGroupsPage(filters, page, pageSize),
  })
}

export function useSalesByCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: ['sales', { customerId }],
    queryFn: () => fetchSalesWithBalances({ customerId }),
    enabled: !!customerId,
  })
}

async function fetchSalesByGroup(groupId: string): Promise<SaleWithBalance[]> {
  const { data: sales, error } = await supabase
    .from('sales')
    .select('*, customer:customers(id, name), expense:expenses(id, description)')
    .eq('sale_group_id', groupId)
    .order('created_at', { ascending: true })
  if (error) throw error

  const ids = (sales ?? []).map((s) => (s as unknown as Sale).id)
  let balances: SaleBalance[] = []
  if (ids.length > 0) {
    const { data, error: balancesError } = await supabase
      .from('sale_balances')
      .select('*')
      .in('sale_id', ids)
    if (balancesError) throw balancesError
    balances = data as SaleBalance[]
  }
  const balanceMap = new Map(balances.map((b) => [b.sale_id, b]))

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
}

export function useSalesByGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ['sales', 'group', groupId],
    queryFn: () => fetchSalesByGroup(groupId!),
    enabled: !!groupId,
  })
}

export function useUpdateSaleGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      groupId,
      customer_id,
      sale_date,
      delivery_date,
    }: {
      groupId: string
      customer_id: string | null
      sale_date: string
      delivery_date: string | null
    }) => {
      const { error } = await supabase
        .from('sales')
        .update({ customer_id, sale_date, delivery_date })
        .eq('sale_group_id', groupId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
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

async function fetchDeliveryGroupsPage(
  filters: DeliveryFilters,
  page: number,
  pageSize: number,
): Promise<SaleGroupsPage> {
  let query = supabase
    .from('sale_groups')
    .select('*', { count: 'exact' })
    .not('delivery_date', 'is', null)
    .order('delivery_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (filters.status === 'pendiente') query = query.eq('delivered', false)
  if (filters.status === 'entregada') query = query.eq('delivered', true)

  const from = (page - 1) * pageSize
  const { data: groups, count, error } = await query.range(from, from + pageSize - 1)
  if (error) throw error

  const groupIds = (groups as SaleGroup[]).map((g) => g.sale_group_id)
  let items: SaleWithBalance[] = []
  if (groupIds.length > 0) {
    const { data: rawItems, error: itemsError } = await supabase
      .from('sales')
      .select('*, customer:customers(id, name), expense:expenses(id, description)')
      .in('sale_group_id', groupIds)
      .order('created_at', { ascending: true })
    if (itemsError) throw itemsError

    const ids = (rawItems ?? []).map((s) => (s as unknown as Sale).id)
    let balances: SaleBalance[] = []
    if (ids.length > 0) {
      const { data, error: balancesError } = await supabase
        .from('sale_balances')
        .select('*')
        .in('sale_id', ids)
      if (balancesError) throw balancesError
      balances = data as SaleBalance[]
    }
    const balanceMap = new Map(balances.map((b) => [b.sale_id, b]))

    items = (rawItems as unknown as SaleWithBalance[]).map((sale) => ({
      ...sale,
      balance: balanceMap.get(sale.id) ?? {
        sale_id: sale.id,
        total_amount: sale.total_amount,
        paid_amount: 0,
        balance_due: sale.total_amount,
        payment_status: 'pendiente' as const,
      },
    }))
  }

  const itemsByGroup = new Map<string, SaleWithBalance[]>()
  for (const item of items) {
    const arr = itemsByGroup.get(item.sale_group_id) ?? []
    arr.push(item)
    itemsByGroup.set(item.sale_group_id, arr)
  }

  const merged: SaleGroupWithItems[] = (groups as SaleGroup[]).map((g) => {
    const groupItems = itemsByGroup.get(g.sale_group_id) ?? []
    return { ...g, items: groupItems, customer: groupItems[0]?.customer ?? null }
  })

  return { groups: merged, count: count ?? 0 }
}

export function useDeliveryGroupsPage(filters: DeliveryFilters, page: number, pageSize: number) {
  return useQuery({
    queryKey: ['sales', 'deliveries', 'groups', filters, page, pageSize],
    queryFn: () => fetchDeliveryGroupsPage(filters, page, pageSize),
  })
}

export function useDeliveryCounts() {
  return useQuery({
    queryKey: ['sales', 'deliveries', 'counts'],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)
      const base = () =>
        supabase
          .from('sale_groups')
          .select('sale_group_id', { count: 'exact', head: true })
          .not('delivery_date', 'is', null)

      const [pendientesRes, entregadasRes, hoyRes, atrasadasRes] = await Promise.all([
        base().eq('delivered', false),
        base().eq('delivered', true),
        base().eq('delivered', false).eq('delivery_date', today),
        base().eq('delivered', false).lt('delivery_date', today),
      ])

      if (pendientesRes.error) throw pendientesRes.error
      if (entregadasRes.error) throw entregadasRes.error
      if (hoyRes.error) throw hoyRes.error
      if (atrasadasRes.error) throw atrasadasRes.error

      return {
        pendientes: pendientesRes.count ?? 0,
        entregadas: entregadasRes.count ?? 0,
        hoy: hoyRes.count ?? 0,
        atrasadas: atrasadasRes.count ?? 0,
      }
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
  sale_group_id?: string
  item_name: string
  category?: string | null
  sale_price: number
  cost_price?: number | null
  shipping_fee: number
  customer_id?: string | null
  expense_id?: string | null
  sale_date: string
  delivery_date?: string | null
  photo_path?: string | null
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

export function useDeleteSaleGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from('sales').delete().eq('sale_group_id', groupId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}
