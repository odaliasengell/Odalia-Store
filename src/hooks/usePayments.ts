import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Payment, PaymentMethod } from '@/types'

export function usePayments(saleId: string | undefined) {
  return useQuery({
    queryKey: ['payments', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('sale_id', saleId)
        .order('payment_date', { ascending: false })
      if (error) throw error
      return data as Payment[]
    },
    enabled: !!saleId,
  })
}

export type PaymentInput = {
  sale_id: string
  amount: number
  payment_date: string
  payment_method?: PaymentMethod | null
  notes?: string | null
}

export function useCreatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: PaymentInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('payments')
        .insert({ ...input, created_by: user?.id })
        .select()
        .single()
      if (error) throw error
      return data as Payment
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments', variables.sale_id] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; sale_id: string }) => {
      const { error } = await supabase.from('payments').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments', variables.sale_id] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })
}
