"use client";

import { useQuery } from "@tanstack/react-query";
import { listWallets, getWallet } from "@/services/wallets.service";
import { useWalletStore } from "@/lib/stores/wallet-store";
import type { WalletListItem, WalletDetail } from "@/types/api";

export function useWallets() {
  return useQuery<WalletListItem[], Error>({
    queryKey: ["wallets"],
    queryFn: listWallets,
    staleTime: 1000 * 30,
  });
}

export function useWallet(id: string) {
  return useQuery<WalletDetail, Error>({
    queryKey: ["wallets", id],
    queryFn: () => getWallet(id),
    staleTime: 1000 * 30,
    enabled: !!id,
  });
}

export function useActiveWallet() {
  const { activeWalletId } = useWalletStore();

  const query = useQuery<WalletDetail, Error>({
    queryKey: ["wallets", activeWalletId],
    queryFn: () => getWallet(activeWalletId!),
    staleTime: 1000 * 30,
    enabled: !!activeWalletId,
  });

  return {
    ...query,
    activeWalletId,
  };
}
