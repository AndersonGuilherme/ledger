"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Wallet, Users, Briefcase, ArrowRight } from "lucide-react";
import { useWallets } from "@/lib/hooks/use-wallet";
import { useWalletStore } from "@/lib/stores/wallet-store";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { WalletListItem } from "@/types/api";

const WALLET_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  personal: { label: "Pessoal", icon: Wallet, color: "bg-brand-primary-50 text-brand-primary" },
  home: { label: "Casa", icon: Users, color: "bg-blue-50 text-blue-700" },
  custom: { label: "Personalizado", icon: Wallet, color: "bg-slate-50 text-slate-700" },
  business: { label: "Empresarial", icon: Briefcase, color: "bg-orange-50 text-orange-700" },
  family: { label: "Família", icon: Users, color: "bg-green-50 text-green-700" },
  project: { label: "Projeto", icon: Briefcase, color: "bg-purple-50 text-purple-700" },
};

function WalletCard({ wallet }: { wallet: WalletListItem }) {
  const router = useRouter();
  const { setActiveWallet } = useWalletStore();
  const config = WALLET_TYPE_CONFIG[wallet.type] ?? WALLET_TYPE_CONFIG.personal;
  const Icon = config.icon;

  function handleOpen() {
    setActiveWallet(wallet.id);
    router.push(`/${wallet.id}`);
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-shadow hover:shadow-md border-neutral-border",
        "group"
      )}
      onClick={handleOpen}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              config.color
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <Badge variant="secondary" className={cn("text-xs", config.color)}>
            {config.label}
          </Badge>
        </div>
        <CardTitle className="text-base font-semibold mt-3">
          {wallet.name}
        </CardTitle>
        <CardDescription className="text-xs">
          Criada em {new Date(wallet.createdAt).toLocaleDateString("pt-BR")}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Abrir carteira</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-brand-primary transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

function WalletCardSkeleton() {
  return (
    <Card className="border-neutral-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-5 w-40 mt-3" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="pt-0">
        <Skeleton className="h-4 w-24" />
      </CardContent>
    </Card>
  );
}

export default function WalletsPage() {
  const { data: wallets, isLoading, isError } = useWallets();

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6 md:mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Minhas Carteiras</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gerencie suas carteiras financeiras
          </p>
        </div>
        <Button
          asChild
          className="bg-brand-primary hover:bg-brand-primary/90 min-h-10"
        >
          <Link href="/wallets/new">
            <Plus className="mr-2 h-4 w-4" />
            Nova carteira
          </Link>
        </Button>
      </div>

      {/* Grade de carteiras */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <WalletCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">Não foi possível carregar as carteiras.</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      ) : wallets && wallets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map((wallet) => (
            <WalletCard key={wallet.id} wallet={wallet} />
          ))}
        </div>
      ) : (
        /* Estado vazio */
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-primary-50 flex items-center justify-center mb-4">
            <Wallet className="h-8 w-8 text-brand-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Nenhuma carteira ainda
          </h2>
          <p className="text-muted-foreground mb-6 max-w-sm text-sm">
            Crie sua primeira carteira para começar a controlar suas finanças.
          </p>
          <Button
            asChild
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            <Link href="/wallets/new">
              <Plus className="mr-2 h-4 w-4" />
              Criar carteira
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
