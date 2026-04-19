"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listPurchases, createPurchase } from "@/services/purchases.service";
import type {
  CreditCardPurchase,
  CreatePurchaseDto,
} from "@/types/api";

export function usePurchases(walletId: string, cardId: string) {
  return useQuery<CreditCardPurchase[], Error>({
    queryKey: ["purchases", walletId, cardId],
    queryFn: () => listPurchases(walletId, cardId),
    enabled: !!walletId && !!cardId,
    staleTime: 1000 * 30,
  });
}

export function useCreatePurchase(walletId: string, cardId: string) {
  const queryClient = useQueryClient();

  return useMutation<CreditCardPurchase, Error, CreatePurchaseDto>({
    mutationFn: (dto) => createPurchase(walletId, cardId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchases", walletId, cardId],
      });
      queryClient.invalidateQueries({
        queryKey: ["faturas", walletId, cardId],
      });
    },
  });
}
