"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCard,
  listCards,
  createCard,
  updateCard,
  archiveCard,
} from "@/services/cards.service";
import type { CreditCard, CreateCardDto, UpdateCardDto } from "@/types/api";

export function useCard(walletId: string, cardId: string) {
  return useQuery({
    queryKey: ["cards", walletId, cardId],
    queryFn: () => getCard(walletId, cardId),
    enabled: !!walletId && !!cardId,
    staleTime: 1000 * 60,
  });
}

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

export function useArchiveCard(walletId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (cardId) => archiveCard(walletId, cardId),
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
