import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Expense, ExpenseStock, ExpenseWithStock } from '@/types'

export function useExpenses() {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async (): Promise<ExpenseWithStock[]> => {
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })
      if (error) throw error

      const { data: stock, error: stockError } = await supabase.from('expense_stock').select('*')
      if (stockError) throw stockError

      const stockMap = new Map((stock as ExpenseStock[]).map((s) => [s.expense_id, s]))

      return (expenses as Expense[]).map((expense) => ({
        ...expense,
        stock: stockMap.get(expense.id) ?? {
          expense_id: expense.id,
          item_count: expense.item_count,
          sold_count: 0,
          remaining: expense.item_count,
        },
      }))
    },
  })
}

export interface ExpensesPage {
  expenses: ExpenseWithStock[]
  count: number
}

export function useExpensesPage(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['expenses', 'page', page, pageSize],
    queryFn: async (): Promise<ExpensesPage> => {
      const from = (page - 1) * pageSize
      const { data: expenses, count, error } = await supabase
        .from('expenses')
        .select('*', { count: 'exact' })
        .order('expense_date', { ascending: false })
        .range(from, from + pageSize - 1)
      if (error) throw error

      const ids = (expenses as Expense[]).map((e) => e.id)
      let stock: ExpenseStock[] = []
      if (ids.length > 0) {
        const { data, error: stockError } = await supabase
          .from('expense_stock')
          .select('*')
          .in('expense_id', ids)
        if (stockError) throw stockError
        stock = data as ExpenseStock[]
      }
      const stockMap = new Map(stock.map((s) => [s.expense_id, s]))

      const merged = (expenses as Expense[]).map((expense) => ({
        ...expense,
        stock: stockMap.get(expense.id) ?? {
          expense_id: expense.id,
          item_count: expense.item_count,
          sold_count: 0,
          remaining: expense.item_count,
        },
      }))

      return { expenses: merged, count: count ?? 0 }
    },
  })
}

export function useExpenseTotals() {
  return useQuery({
    queryKey: ['expenses', 'totals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select('amount, item_count')
      if (error) throw error
      const rows = data as { amount: number; item_count: number | null }[]
      return {
        totalAmount: rows.reduce((sum, r) => sum + r.amount, 0),
        totalItems: rows.reduce((sum, r) => sum + (r.item_count ?? 0), 0),
      }
    },
  })
}

export type ExpenseInput = {
  description: string
  amount: number
  item_count?: number | null
  expense_date: string
  notes?: string | null
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ExpenseInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('expenses')
        .insert({ ...input, created_by: user?.id })
        .select()
        .single()
      if (error) throw error
      return data as Expense
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: ExpenseInput & { id: string }) => {
      const { data, error } = await supabase
        .from('expenses')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Expense
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}
