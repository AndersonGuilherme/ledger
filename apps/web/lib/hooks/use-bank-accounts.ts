"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listBankAccounts,
  createBankAccount,
} from "@/services/bank-accounts.service";
import type { BankAccount, CreateBankAccountDto } from "@/types/api";

export function useBankAccounts(walletId: string) {
  return useQuery<BankAccount[], Error>({
    queryKey: ["bank-accounts", walletId],
    queryFn: () => listBankAccounts(walletId),
    enabled: !!walletId,
    staleTime: 1000 * 60,
  });
}

export function useCreateBankAccount(walletId: string) {
  const queryClient = useQueryClient();
  return useMutation<BankAccount, Error, CreateBankAccountDto>({
    mutationFn: (dto) => createBankAccount(walletId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", walletId] });
    },
  });
}
