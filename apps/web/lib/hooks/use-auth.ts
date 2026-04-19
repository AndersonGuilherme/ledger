"use client";

import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/services/auth.service";
import type { User } from "@/types/api";

export function useAuth() {
  const {
    data: user,
    isLoading,
    isError,
    error,
  } = useQuery<User, Error>({
    queryKey: ["auth", "me"],
    queryFn: getMe,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user && !isError,
    error,
  };
}
