"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown, Plus, Wallet } from "lucide-react";
import { useWallets } from "@/lib/hooks/use-wallet";
import { useWalletStore } from "@/lib/stores/wallet-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export function WalletSwitcher() {
  const router = useRouter();
  const { data: wallets, isLoading } = useWallets();
  const { activeWalletId, setActiveWallet } = useWalletStore();

  const activeWallet = wallets?.find((w) => w.id === activeWalletId);

  function handleSelect(walletId: string) {
    setActiveWallet(walletId);
    router.push(`/${walletId}`);
  }

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between h-10 px-3",
            "bg-white border-neutral-border hover:bg-neutral-surface"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Wallet className="h-4 w-4 text-brand-primary shrink-0" />
            <span className="truncate text-sm font-medium">
              {activeWallet?.name ?? "Select wallet"}
            </span>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Your wallets
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {wallets && wallets.length > 0 ? (
          wallets.map((wallet) => (
            <DropdownMenuItem
              key={wallet.id}
              onSelect={() => handleSelect(wallet.id)}
              className={cn(
                "cursor-pointer",
                wallet.id === activeWalletId && "bg-accent"
              )}
            >
              <Wallet className="mr-2 h-4 w-4 text-brand-primary" />
              <span className="truncate">{wallet.name}</span>
              {wallet.id === activeWalletId && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Active
                </span>
              )}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground text-sm">
              No wallets yet
            </span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => router.push("/wallets/new")}
          className="cursor-pointer text-brand-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          New wallet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
