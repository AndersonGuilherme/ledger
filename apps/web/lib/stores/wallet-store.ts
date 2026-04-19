import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WalletStore {
  activeWalletId: string | null;
  setActiveWallet: (id: string | null) => void;
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      activeWalletId: null,
      setActiveWallet: (id) => set({ activeWalletId: id }),
    }),
    {
      name: "ledger-active-wallet",
    }
  )
);
