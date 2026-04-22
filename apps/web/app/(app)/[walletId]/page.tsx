"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Plus,
  CreditCard,
  ArrowUpRight,
  Wallet,
  BarChart3,
  Tag,
} from "lucide-react";
import { useWallet } from "@/lib/hooks/use-wallet";
import { useTransactions } from "@/lib/hooks/use-transactions";
import { useDashboard } from "@/lib/hooks/use-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DashboardDateFilter,
  filterValueToParams,
  type DateFilterValue,
} from "@/components/dashboard/dashboard-date-filter";
import type { Transaction, DashboardMonthlyTrendItem } from "@/types/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const WALLET_TYPE_LABELS: Record<string, string> = {
  personal: "Pessoal",
  home: "Casa",
  custom: "Personalizado",
  business: "Empresarial",
  family: "Família",
  project: "Projeto",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  editor: "Editor",
  viewer: "Visualizador",
};

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  income: "Receita",
  expense: "Despesa",
  transfer_in: "Transferência entrada",
  transfer_out: "Transferência saída",
  credit_card_purchase: "Compra no cartão",
  credit_card_refund: "Estorno no cartão",
  invoice_payment: "Pagamento de fatura",
};

// ─── Recent Transaction Row ───────────────────────────────────────────────────

function TransactionRow({
  tx,
  currencyCode,
}: {
  tx: Transaction;
  currencyCode: string;
}) {
  const isIncome = tx.sign === 1;
  const isExpense = tx.sign === -1;

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-b-0">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          isIncome ? "bg-green-50" : isExpense ? "bg-red-50" : "bg-gray-50"
        }`}
      >
        {isIncome ? (
          <TrendingUp className="h-4 w-4 text-green-600" />
        ) : isExpense ? (
          <TrendingDown className="h-4 w-4 text-red-600" />
        ) : (
          <ArrowLeftRight className="h-4 w-4 text-gray-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {tx.description ?? TRANSACTION_TYPE_LABELS[tx.type]}
        </p>
        <p className="text-xs text-muted-foreground">
          {TRANSACTION_TYPE_LABELS[tx.type]}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p
          className={`text-sm font-semibold ${
            isIncome ? "text-green-600" : isExpense ? "text-red-600" : "text-foreground"
          }`}
        >
          {isExpense ? "-" : isIncome ? "+" : ""}
          {formatAmount(tx.amount, currencyCode)}
        </p>
        <p className="text-xs text-muted-foreground">{formatDate(tx.dueDate)}</p>
      </div>
    </div>
  );
}

// ─── Mini Bar Chart (pure CSS) ────────────────────────────────────────────────

function MiniBarChart({
  data,
  currencyCode,
}: {
  data: DashboardMonthlyTrendItem[];
  currencyCode: string;
}) {
  const maxValue = Math.max(
    ...data.flatMap((d) => [d.income, d.expenses]),
    1,
  );

  return (
    <div className="flex items-end gap-1 sm:gap-1.5 h-28 w-full pt-2">
      {data.map((item, i) => {
        const incomeH = Math.round((item.income / maxValue) * 100);
        const expenseH = Math.round((item.expenses / maxValue) * 100);
        const isLast = i === data.length - 1;

        return (
          <div key={`${item.year}-${item.month}`} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              <div className="bg-popover border border-neutral-border rounded-md shadow-md px-2.5 py-1.5 text-xs whitespace-nowrap">
                <p className="font-semibold text-foreground mb-0.5">
                  {MONTH_NAMES[item.month - 1]} {item.year}
                </p>
                <p className="text-green-600">Rec: {formatAmount(item.income, currencyCode)}</p>
                <p className="text-red-500">Desp: {formatAmount(item.expenses, currencyCode)}</p>
              </div>
            </div>

            {/* Bars */}
            <div className="flex items-end gap-0.5 w-full h-24">
              <div
                className={`flex-1 rounded-sm transition-all ${isLast ? "bg-green-500" : "bg-green-200"}`}
                style={{ height: `${incomeH}%`, minHeight: item.income > 0 ? "2px" : "0" }}
              />
              <div
                className={`flex-1 rounded-sm transition-all ${isLast ? "bg-red-400" : "bg-red-200"}`}
                style={{ height: `${expenseH}%`, minHeight: item.expenses > 0 ? "2px" : "0" }}
              />
            </div>

            {/* Month label */}
            <span className={`text-[10px] font-medium ${isLast ? "text-foreground" : "text-muted-foreground"}`}>
              {MONTH_NAMES[item.month - 1]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Net indicator ────────────────────────────────────────────────────────────

function NetIndicator({ net, currencyCode }: { net: number; currencyCode: string }) {
  const positive = net >= 0;
  return (
    <span className={`text-sm font-semibold ${positive ? "text-green-600" : "text-red-600"}`}>
      {positive ? "+" : ""}
      {formatAmount(net, currencyCode)}
    </span>
  );
}

// ─── Default date filter (1-year range ending last month, UTC-safe) ───────────

function getDefaultDateFilter(): DateFilterValue {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const fromYear = String(now.getUTCFullYear());
  const toYear = String(now.getUTCFullYear() + 1);
  return { fromMonth: month, fromYear, toMonth: month, toYear };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WalletDashboardPage() {
  const params = useParams();
  const walletId = params?.walletId as string;

  const [dateFilter, setDateFilter] = useState<DateFilterValue>(getDefaultDateFilter);
  const dashboardParams = filterValueToParams(dateFilter);

  const { data: wallet, isLoading: walletLoading } = useWallet(walletId);
  const { data: txData, isLoading: txLoading } = useTransactions(walletId, {
    limit: 5,
    page: 1,
  });
  const { data: dashboard, isLoading: dashLoading } = useDashboard(
    walletId,
    dashboardParams,
  );

  const currencyCode = wallet?.currencyCode ?? "BRL";
  const canWrite = wallet?.role === "owner" || wallet?.role === "editor";

  const trendTitle = `${dateFilter.fromYear}-${dateFilter.fromMonth} a ${dateFilter.toYear}-${dateFilter.toMonth}`;
  const MONTH_ABBR = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const filterLabel = `${MONTH_ABBR[parseInt(dateFilter.fromMonth) - 1]} ${dateFilter.fromYear} – ${MONTH_ABBR[parseInt(dateFilter.toMonth) - 1]} ${dateFilter.toYear}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="mb-2">
        {walletLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-40" />
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {wallet?.name ?? "Painel"}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {WALLET_TYPE_LABELS[wallet?.type ?? ""] ?? wallet?.type}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {ROLE_LABELS[wallet?.role ?? ""] ?? wallet?.role}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {wallet?.currencyCode}
                </span>
              </div>
            </div>
            <DashboardDateFilter
              value={dateFilter}
              onChange={(v) => setDateFilter(v)}
              onReset={() => setDateFilter(getDefaultDateFilter())}
            />
          </div>
        )}
      </div>

      {/* ── Balance Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              Saldo Confirmado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {walletLoading ? (
              <Skeleton className="h-8 w-36" />
            ) : (
              <p className="text-2xl font-bold text-foreground">
                {formatAmount(wallet?.settledBalance ?? 0, currencyCode)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Apenas transações confirmadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Saldo Projetado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {walletLoading ? (
              <Skeleton className="h-8 w-36" />
            ) : (
              <p className="text-2xl font-bold text-foreground">
                {formatAmount(wallet?.projectedBalance ?? 0, currencyCode)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Inclui pendentes e faturas em aberto
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Monthly + Annual Summary ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Last Month */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Mês Passado</span>
              {!dashLoading && dashboard && (
                <span className="text-xs font-normal text-muted-foreground">
                  {MONTH_NAMES[dashboard.currentMonth.month - 1]} {dashboard.currentMonth.year}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </div>
            ) : dashboard ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                    Receitas
                  </span>
                  <span className="font-semibold text-green-600">
                    +{formatAmount(dashboard.currentMonth.income, currencyCode)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    Despesas
                  </span>
                  <span className="font-semibold text-red-600">
                    -{formatAmount(dashboard.currentMonth.expenses, currencyCode)}
                  </span>
                </div>
                <div className="pt-2 border-t flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Saldo</span>
                  <NetIndicator net={dashboard.currentMonth.net} currencyCode={currencyCode} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
            )}
          </CardContent>
        </Card>

        {/* This Year */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Este Ano</span>
              {!dashLoading && dashboard && (
                <span className="text-xs font-normal text-muted-foreground">
                  {dashboard.currentYear.year}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </div>
            ) : dashboard ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                    Receitas no Ano
                  </span>
                  <span className="font-semibold text-green-600">
                    +{formatAmount(dashboard.currentYear.income, currencyCode)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    Despesas no Ano
                  </span>
                  <span className="font-semibold text-red-600">
                    -{formatAmount(dashboard.currentYear.expenses, currencyCode)}
                  </span>
                </div>
                <div className="pt-2 border-t flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Saldo no Ano</span>
                  <NetIndicator net={dashboard.currentYear.net} currencyCode={currencyCode} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Monthly Trend Chart ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            {trendTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dashLoading ? (
            <div className="flex items-end gap-2 h-28 pt-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <Skeleton className="w-full" style={{ height: `${40 + Math.random() * 50}%` }} />
                  <Skeleton className="h-3 w-6" />
                </div>
              ))}
            </div>
          ) : dashboard && dashboard.monthlyTrend.length > 0 ? (
            <>
              <MiniBarChart data={dashboard.monthlyTrend} currencyCode={currencyCode} />
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-sm bg-green-400" />
                  Receitas
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-sm bg-red-300" />
                  Despesas
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Sem histórico de transações ainda.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Category Breakdown ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            Despesas por Categoria
            <span className="text-xs font-normal text-muted-foreground ml-auto">
              {filterLabel}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dashLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : dashboard && dashboard.categoryBreakdown.length > 0 ? (
            <div className="space-y-3">
              {(() => {
                const totalExpenses = dashboard.categoryBreakdown.reduce(
                  (s, c) => s + c.totalExpenses,
                  0,
                );
                return dashboard.categoryBreakdown.map((cat) => {
                  const pct = totalExpenses > 0
                    ? Math.round((cat.totalExpenses / totalExpenses) * 100)
                    : 0;
                  return (
                    <div key={cat.categoryId ?? "uncategorized"} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground truncate max-w-[60%]">
                          {cat.categoryName ?? "Sem categoria"}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                          <span className="font-semibold text-red-600">
                            {formatAmount(cat.totalExpenses, currencyCode)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-red-400 h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Tag className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma despesa registrada este mês.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Transactions ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-semibold">
            Transações Recentes
          </CardTitle>
          <Link
            href={`/${walletId}/transactions`}
            className="flex items-center gap-1 text-sm text-brand-primary hover:underline"
          >
            Ver todas
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {txLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <div className="space-y-1.5 text-right">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : !txData?.transactions?.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                Nenhuma transação ainda
              </p>
              <p className="text-xs text-muted-foreground">
                Crie sua primeira transação para começar.
              </p>
            </div>
          ) : (
            <div>
              {txData.transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} currencyCode={currencyCode} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      {canWrite && (
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/${walletId}/transactions`}>
            <Button className="gap-2 min-h-10">
              <Plus className="h-4 w-4" />
              Nova transação
            </Button>
          </Link>
          <Link href={`/${walletId}/cards`}>
            <Button variant="outline" className="gap-2 min-h-10">
              <CreditCard className="h-4 w-4" />
              Gerenciar cartões
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
