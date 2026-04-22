"use client";

import { useQuery } from "@tanstack/react-query";
import { getWalletDashboard } from "@/services/wallets.service";
import type { DashboardResponse, DashboardQueryParams } from "@/types/api";

export function useDashboard(walletId: string, params?: DashboardQueryParams) {
  return useQuery<DashboardResponse, Error>({
    queryKey: ["dashboard", walletId, params?.from ?? null, params?.to ?? null],
    queryFn: () => getWalletDashboard(walletId, params),
    enabled: !!walletId,
    staleTime: 1000 * 60, // 1 minute — dashboard data does not need real-time freshness
  });
}
