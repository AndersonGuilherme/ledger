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
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { logout } from "@/services/auth.service";
import { useAuthContext } from "@/components/providers/auth-provider";
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
    label: "Dashboard",
    icon: LayoutDashboard,
    href: (walletId: string) => `/${walletId}`,
    exact: true,
  },
  {
    label: "Transactions",
    icon: ArrowLeftRight,
    href: (walletId: string) => `/${walletId}/transactions`,
    exact: false,
  },
  {
    label: "Cards",
    icon: CreditCard,
    href: (walletId: string) => `/${walletId}/cards`,
    exact: false,
  },
  {
    label: "Settings",
    icon: Settings,
    href: (walletId: string) => `/${walletId}/settings`,
    exact: false,
  },
];

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  const walletId = params?.walletId as string | undefined;

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      router.push("/login");
      toast.success("Logged out successfully.");
    },
    onError: () => {
      toast.error("Could not log out. Try again.");
    },
  });

  function isActive(href: string, exact: boolean): boolean {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="flex flex-col w-64 h-screen bg-white border-r border-neutral-border shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-neutral-border">
          <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <span className="font-bold text-lg text-foreground">Ledger</span>
        </div>

        {/* Wallet switcher */}
        <div className="px-3 py-3 border-b border-neutral-border">
          <WalletSwitcher />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {walletId ? (
            NAV_ITEMS.map((item) => {
              const href = item.href(walletId);
              const active = isActive(href, item.exact);

              return (
                <Link
                  key={item.label}
                  href={href}
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
                className="flex items-center gap-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Wallet className="h-4 w-4" />
                My Wallets
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
                {user ? getInitials(user.name, user.email) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.name ?? "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
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
                <p>Log out</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
