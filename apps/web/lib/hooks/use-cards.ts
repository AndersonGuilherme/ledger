"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listCards,
  createCard,
  updateCard,
} from "@/services/cards.service";
import type { CreditCard, CreateCardDto, UpdateCardDto } from "@/types/api";

export function useCards(walletId: string) {
  return useQuery<CreditCard[], Error>({
    queryKey: ["cards", walletId],
    queryFn: () => listCards(walletId),
    enabled: !!walletId,
    staleTime: 1000 * 30,
  });
}

export function useCreateCard(walletId: string) {
  const queryClient = useQueryClient();

  return useMutation<CreditCard, Error, CreateCardDto>({
    mutationFn: (dto) => createCard(walletId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", walletId] });
    },
  });
}

export function useUpdateCard(walletId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    CreditCard,
    Error,
    { cardId: string; dto: UpdateCardDto }
  >({
    mutationFn: ({ cardId, dto }) => updateCard(walletId, cardId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", walletId] });
    },
  });
}
