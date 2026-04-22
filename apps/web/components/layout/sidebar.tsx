"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  Settings,
  LogOut,
  Wallet,
  Menu,
  X,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";

import { logout } from "@/services/auth.service";
import { useAuthContext } from "@/components/providers/auth-provider";
import { useWalletStore } from "@/lib/stores/wallet-store";
import { WalletSwitcher } from "./wallet-switcher";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NAV_ITEMS = [
  {
    label: "Painel",
    icon: LayoutDashboard,
    href: (walletId: string) => `/${walletId}`,
    exact: true,
  },
  {
    label: "Transações",
    icon: ArrowLeftRight,
    href: (walletId: string) => `/${walletId}/transactions`,
    exact: false,
  },
  {
    label: "Cartões",
    icon: CreditCard,
    href: (walletId: string) => `/${walletId}/cards`,
    exact: false,
  },
  {
    label: "Configurações",
    icon: Settings,
    href: (walletId: string) => `/${walletId}/settings`,
    exact: false,
  },
];

function getInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

// ─── Shared nav content (used in both desktop sidebar and mobile drawer) ───────

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { setActiveWallet } = useWalletStore();

  const walletId = params?.walletId as string | undefined;

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      setActiveWallet(null);
      queryClient.clear();
      router.push("/login");
      toast.success("Sessão encerrada com sucesso.");
    },
    onError: () => {
      toast.error("Não foi possível sair. Tente novamente.");
    },
  });

  function isActive(href: string, exact: boolean): boolean {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Wallet switcher */}
      <div className="px-3 py-3 border-b border-neutral-border">
        <WalletSwitcher />
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {walletId ? (
          NAV_ITEMS.map((item) => {
            const href = item.href(walletId);
            const active = isActive(href, item.exact);
            return (
              <Link
                key={item.label}
                href={href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-primary-100 text-brand-primary"
                    : "text-muted-foreground hover:bg-neutral-surface hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-brand-primary" : "text-muted-foreground"
                  )}
                />
                {item.label}
              </Link>
            );
          })
        ) : (
          <div className="px-3 py-2">
            <Link
              href="/wallets"
              onClick={onNavigate}
              className="flex items-center gap-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Wallet className="h-4 w-4" />
              Minhas Carteiras
            </Link>
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="px-3 pb-4 space-y-2">
        <Separator className="mb-3" />
        <div className="flex items-center gap-3 px-2 py-1">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-brand-primary-100 text-brand-primary text-xs font-semibold">
              {user ? getInitials(user.email) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.email ?? "Usuário"}
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Sair</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </>
  );
}

// ─── Logo bar ─────────────────────────────────────────────────────────────────

function LogoBar() {
  return (
    <div className="flex items-center gap-2 px-4 py-5 border-b border-neutral-border shrink-0">
      <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center shrink-0">
        <span className="text-white font-bold text-sm">L</span>
      </div>
      <span className="font-bold text-lg text-foreground">Ledger</span>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex flex-col w-64 h-screen bg-white border-r border-neutral-border shrink-0">
        <LogoBar />
        <NavContent />
      </aside>

      {/* Mobile: backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile: slide-in drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-white border-r border-neutral-border transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="font-bold text-lg text-foreground">Ledger</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-col flex-1 overflow-y-auto">
          <NavContent onNavigate={() => setMobileOpen(false)} />
        </div>
      </aside>

      {/* Mobile: top header bar with hamburger — only visible on mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14 bg-white border-b border-neutral-border">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-primary flex items-center justify-center">
            <span className="text-white font-bold text-xs">L</span>
          </div>
          <span className="font-bold text-base text-foreground">Ledger</span>
        </div>
        {/* spacer to center logo */}
        <div className="w-9" />
      </div>
    </TooltipProvider>
  );
}
