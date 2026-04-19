"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listFaturas,
  getFatura,
  payFatura,
  type PayFaturaResponse,
} from "@/services/faturas.service";
import type { Fatura, FaturaStatus, PayFaturaDto } from "@/types/api";

export function useFaturas(
  walletId: string,
  cardId: string,
  status?: FaturaStatus
) {
  return useQuery<Fatura[], Error>({
    queryKey: ["faturas", walletId, cardId, status],
    queryFn: () => listFaturas(walletId, cardId, status),
    enabled: !!walletId && !!cardId,
    staleTime: 1000 * 30,
  });
}

export function useFatura(
  walletId: string,
  cardId: string,
  faturaId: string
) {
  return useQuery<Fatura, Error>({
    queryKey: ["faturas", walletId, cardId, faturaId],
    queryFn: () => getFatura(walletId, cardId, faturaId),
    enabled: !!walletId && !!cardId && !!faturaId,
    staleTime: 1000 * 30,
  });
}

export function usePayFatura(walletId: string, cardId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    PayFaturaResponse,
    Error,
    { faturaId: string; dto: PayFaturaDto }
  >({
    mutationFn: ({ faturaId, dto }) => payFatura(walletId, cardId, faturaId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["faturas", walletId, cardId],
      });
      queryClient.invalidateQueries({
        queryKey: ["transactions", walletId],
      });
      queryClient.invalidateQueries({
        queryKey: ["cards", walletId],
      });
    },
  });
}
