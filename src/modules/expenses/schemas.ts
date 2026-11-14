// Zod schemas for the expenses module (docs/conventions.md — Server actions).

import { z } from 'zod'

export const EXPENSE_CATEGORY_SUGGESTIONS = [
  'Packaging',
  'Courier',
  'Ads',
  'Rent',
  'Salary',
  'Utilities',
  'Other',
] as const

function parseAmountWon(value: string): number {
  return Number(value.replace(/,/g, '').trim())
}

export const expenseSchema = z.object({
  category: z.string().trim().min(1, 'Category is required').max(60, 'Keep it under 60 characters'),
  amount: z
    .string()
    .trim()
    .min(1, 'Amount is required')
    .refine((v) => Number.isFinite(parseAmountWon(v)) && parseAmountWon(v) > 0, {
      message: '0보다 큰 금액을 입력하세요',
    }),
  spent_at: z.string().trim().min(1, 'Date is required'),
  note: z.string().trim().max(500, 'Keep it under 500 characters').optional(),
  media_id: z.string().uuid().nullable().optional(),
})

export type ExpenseFormValues = z.infer<typeof expenseSchema>

export const updateExpenseSchema = expenseSchema.extend({ id: z.string().uuid() })
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>

export const deleteExpenseSchema = z.object({ id: z.string().uuid() })
export type DeleteExpenseInput = z.infer<typeof deleteExpenseSchema>
