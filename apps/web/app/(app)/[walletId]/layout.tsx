"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useWalletStore } from "@/lib/stores/wallet-store";

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const walletId = params?.walletId as string;
  const { setActiveWallet } = useWalletStore();

  useEffect(() => {
    if (walletId) {
      setActiveWallet(walletId);
    }
  }, [walletId, setActiveWallet]);

  return <>{children}</>;
}
