import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type {
  PaymentStatus,
  Sale,
  SaleGroup,
  SaleGroupWithItems,
  SaleWithCustomer,
} from '@/types'

const SALE_SELECT = '*, customer:customers(id, name, phone), expense:expenses(id, description)'

export interface SaleFilters {
  from?: string
  to?: string
  customerId?: string
  paymentStatus?: PaymentStatus | PaymentStatus[]
}

async function fetchSales(filters: SaleFilters = {}): Promise<SaleWithCustomer[]> {
  let query = supabase
    .from('sales')
    .select(SALE_SELECT)
    .order('sale_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.from) query = query.gte('sale_date', filters.from)
  if (filters.to) query = query.lte('sale_date', filters.to)
  if (filters.customerId) query = query.eq('customer_id', filters.customerId)

  const { data, error } = await query
  if (error) throw error
  return data as unknown as SaleWithCustomer[]
}

export function useSales(filters: SaleFilters = {}) {
  return useQuery({
    queryKey: ['sales', filters],
    queryFn: () => fetchSales(filters),
  })
}

async function fetchItemsByGroupIds(groupIds: string[]): Promise<Map<string, SaleWithCustomer[]>> {
  const itemsByGroup = new Map<string, SaleWithCustomer[]>()
  if (groupIds.length === 0) return itemsByGroup

  const { data: rawItems, error } = await supabase
    .from('sales')
    .select(SALE_SELECT)
    .in('sale_group_id', groupIds)
    .order('created_at', { ascending: true })
  if (error) throw error

  for (const item of rawItems as unknown as SaleWithCustomer[]) {
    const arr = itemsByGroup.get(item.sale_group_id) ?? []
    arr.push(item)
    itemsByGroup.set(item.sale_group_id, arr)
  }
  return itemsByGroup
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
  let query = supabase
    .from('sale_groups')
    .select('*', { count: 'exact' })
    .order('sale_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.from) query = query.gte('sale_date', filters.from)
  if (filters.to) query = query.lte('sale_date', filters.to)
  if (filters.customerId) query = query.eq('customer_id', filters.customerId)
  if (filters.paymentStatus) {
    query = Array.isArray(filters.paymentStatus)
      ? query.in('payment_status', filters.paymentStatus)
      : query.eq('payment_status', filters.paymentStatus)
  }

  const from = (page - 1) * pageSize
  const { data: groups, count, error } = await query.range(from, from + pageSize - 1)
  if (error) throw error

  const groupIds = (groups as SaleGroup[]).map((g) => g.sale_group_id)
  const itemsByGroup = await fetchItemsByGroupIds(groupIds)

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

async function fetchSaleGroupsByCustomer(customerId: string): Promise<SaleGroupWithItems[]> {
  const { data: groups, error } = await supabase
    .from('sale_groups')
    .select('*')
    .eq('customer_id', customerId)
    .order('sale_date', { ascending: false })
  if (error) throw error

  const groupIds = (groups as SaleGroup[]).map((g) => g.sale_group_id)
  const itemsByGroup = await fetchItemsByGroupIds(groupIds)

  return (groups as SaleGroup[]).map((g) => {
    const groupItems = itemsByGroup.get(g.sale_group_id) ?? []
    return { ...g, items: groupItems, customer: groupItems[0]?.customer ?? null }
  })
}

export function useSaleGroupsByCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: ['sales', 'groups', 'customer', customerId],
    queryFn: () => fetchSaleGroupsByCustomer(customerId!),
    enabled: !!customerId,
  })
}

async function fetchSalesByGroup(groupId: string): Promise<SaleWithCustomer[]> {
  const { data, error } = await supabase
    .from('sales')
    .select(SALE_SELECT)
    .eq('sale_group_id', groupId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as unknown as SaleWithCustomer[]
}

export function useSalesByGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ['sales', 'group', groupId],
    queryFn: () => fetchSalesByGroup(groupId!),
    enabled: !!groupId,
  })
}

export function useGroupBalance(groupId: string | undefined) {
  return useQuery({
    queryKey: ['sales', 'group-balance', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_groups')
        .select('*')
        .eq('sale_group_id', groupId)
        .single()
      if (error) throw error
      return data as SaleGroup
    },
    enabled: !!groupId,
  })
}

export function useAllSaleGroups() {
  return useQuery({
    queryKey: ['sales', 'groups', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sale_groups').select('*')
      if (error) throw error
      return data as SaleGroup[]
    },
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
        .select(SALE_SELECT)
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
  const itemsByGroup = await fetchItemsByGroupIds(groupIds)

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
      const { data: sale, error: fetchError } = await supabase
        .from('sales')
        .select('sale_group_id')
        .eq('id', id)
        .single()
      if (fetchError) throw fetchError

      const { count, error: countError } = await supabase
        .from('sales')
        .select('id', { count: 'exact', head: true })
        .eq('sale_group_id', sale.sale_group_id)
      if (countError) throw countError

      // Si es la última prenda de la venta, la venta completa desaparece con
      // ella — hay que borrar también sus abonos, que ya no pertenecen a nada.
      if ((count ?? 0) <= 1) {
        const { error: paymentsError } = await supabase
          .from('payments')
          .delete()
          .eq('sale_group_id', sale.sale_group_id)
        if (paymentsError) throw paymentsError
      }

      const { error } = await supabase.from('sales').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    },
  })
}

export function useDeleteSaleGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('sale_group_id', groupId)
      if (paymentsError) throw paymentsError

      const { error } = await supabase.from('sales').delete().eq('sale_group_id', groupId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    },
  })
}
