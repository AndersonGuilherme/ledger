"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/services/transactions.service";
import type {
  TransactionListResponse,
  Transaction,
  CreateTransactionDto,
  UpdateTransactionDto,
} from "@/types/api";

interface TransactionParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useTransactions(walletId: string, params?: TransactionParams) {
  return useQuery<TransactionListResponse, Error>({
    queryKey: ["transactions", walletId, params],
    queryFn: () => listTransactions(walletId, params),
    enabled: !!walletId,
    staleTime: 1000 * 30,
  });
}

export function useCreateTransaction(walletId: string) {
  const queryClient = useQueryClient();
  return useMutation<Transaction, Error, CreateTransactionDto>({
    mutationFn: (dto) => createTransaction(walletId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", walletId] });
      queryClient.invalidateQueries({ queryKey: ["wallets", walletId] });
    },
  });
}

export function useUpdateTransaction(walletId: string) {
  const queryClient = useQueryClient();
  return useMutation<Transaction, Error, { id: string; dto: UpdateTransactionDto }>({
    mutationFn: ({ id, dto }) => updateTransaction(walletId, id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", walletId] });
      queryClient.invalidateQueries({ queryKey: ["wallets", walletId] });
    },
  });
}

export function useDeleteTransaction(walletId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteTransaction(walletId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", walletId] });
      queryClient.invalidateQueries({ queryKey: ["wallets", walletId] });
    },
  });
}
