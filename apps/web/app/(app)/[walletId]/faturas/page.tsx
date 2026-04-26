"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { useWalletFaturas } from "@/lib/hooks/use-faturas";
import { useWallet } from "@/lib/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { Fatura, FaturaStatus } from "@/types/api";

const STATUS_LABELS: Record<FaturaStatus, string> = {
  open: "Aberta",
  closed: "Fechada",
  overdue: "Atrasada",
  paid: "Paga",
};

const STATUS_VARIANTS: Record<
  FaturaStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  open: "outline",
  closed: "secondary",
  overdue: "destructive",
  paid: "default",
};

function currentMonthYYYYMM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

export default function FaturasPage() {
  const params = useParams();
  const walletId = params?.walletId as string;
  const [month, setMonth] = useState<string>(currentMonthYYYYMM());

  const { data: wallet } = useWallet(walletId);
  const { data: faturas = [], isLoading } = useWalletFaturas(walletId, month);
  const currency = wallet?.currencyCode ?? "BRL";

  return (
    <div className="container max-w-5xl py-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Faturas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Faturas de todos os cartões de crédito da carteira.
          </p>
        </div>

        <div className="flex items-center gap-2 border rounded-md px-1.5 py-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setMonth(shiftMonth(month, -1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium capitalize min-w-[140px] text-center">
            {formatMonthLabel(month)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setMonth(shiftMonth(month, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : faturas.length === 0 ? (
        <div className="border rounded-lg p-10 text-center text-sm text-muted-foreground">
          Nenhuma fatura para {formatMonthLabel(month)}.
        </div>
      ) : (
        <div className="space-y-2">
          {faturas.map((f) => (
            <FaturaRow key={f.id} fatura={f} walletId={walletId} currency={currency} />
          ))}
          <FaturasTotal faturas={faturas} currency={currency} />
        </div>
      )}
    </div>
  );
}

function FaturaRow({
  fatura,
  walletId,
  currency,
}: {
  fatura: Fatura;
  walletId: string;
  currency: string;
}) {
  return (
    <Link
      href={`/${walletId}/cards/${fatura.cardId}`}
      className="flex items-center justify-between gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Receipt className="h-4 w-4 text-blue-600" />
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{fatura.cardName ?? "Cartão"}</p>
          <p className="text-xs text-muted-foreground">
            Vence em {formatDate(fatura.dueDate)} · fecha {formatDate(fatura.closingDate)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Badge variant={STATUS_VARIANTS[fatura.status]} className="capitalize">
          {STATUS_LABELS[fatura.status]}
        </Badge>
        <span className="font-medium tabular-nums">
          {formatMoney(fatura.totalCents, currency)}
        </span>
      </div>
    </Link>
  );
}

function FaturasTotal({ faturas, currency }: { faturas: Fatura[]; currency: string }) {
  const open = faturas
    .filter((f) => f.status !== "paid")
    .reduce((sum, f) => sum + f.totalCents, 0);
  const paid = faturas
    .filter((f) => f.status === "paid")
    .reduce((sum, f) => sum + f.totalCents, 0);

  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      <div className="border rounded-lg p-4">
        <p className="text-xs text-muted-foreground">Total em aberto</p>
        <p className="text-lg font-semibold tabular-nums mt-1">
          {formatMoney(open, currency)}
        </p>
      </div>
      <div className="border rounded-lg p-4">
        <p className="text-xs text-muted-foreground">Total pago</p>
        <p className="text-lg font-semibold tabular-nums mt-1">
          {formatMoney(paid, currency)}
        </p>
      </div>
    </div>
  );
}
