"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCategories, createCategory } from "@/services/categories.service";
import type { Category, CreateCategoryDto } from "@/types/api";

export function useCategories(walletId: string) {
  return useQuery<Category[], Error>({
    queryKey: ["categories", walletId],
    queryFn: () => listCategories(walletId),
    enabled: !!walletId,
    staleTime: 1000 * 60,
  });
}

export function useCreateCategory(walletId: string) {
  const queryClient = useQueryClient();
  return useMutation<Category, Error, CreateCategoryDto>({
    mutationFn: (dto) => createCategory(walletId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", walletId] });
    },
  });
}
