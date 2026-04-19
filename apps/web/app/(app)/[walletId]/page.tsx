"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Plus,
  CreditCard,
  ArrowUpRight,
} from "lucide-react";
import { useWallet } from "@/lib/hooks/use-wallet";
import { useTransactions } from "@/lib/hooks/use-transactions";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Transaction } from "@/types/api";

function formatAmount(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

const WALLET_TYPE_LABELS: Record<string, string> = {
  personal: "Personal",
  household: "Household",
  business: "Business",
  family: "Family",
  project: "Project",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  income: "Income",
  expense: "Expense",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
  credit_card_purchase: "Card purchase",
  credit_card_refund: "Card refund",
  invoice_payment: "Invoice payment",
};

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
          isIncome
            ? "bg-green-50"
            : isExpense
            ? "bg-red-50"
            : "bg-gray-50"
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
            isIncome
              ? "text-green-600"
              : isExpense
              ? "text-red-600"
              : "text-foreground"
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

export default function WalletDashboardPage() {
  const params = useParams();
  const walletId = params?.walletId as string;

  const { data: wallet, isLoading: walletLoading } = useWallet(walletId);
  const { data: txData, isLoading: txLoading } = useTransactions(walletId, {
    limit: 5,
    page: 1,
  });

  const currencyCode = wallet?.currencyCode ?? "BRL";
  const canWrite = wallet?.role === "owner" || wallet?.role === "editor";

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        {walletLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-40" />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {wallet?.name ?? "Dashboard"}
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
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
          </div>
        )}
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Settled Balance
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
              Confirmed transactions only
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projected Balance
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
              Including pending transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-semibold">
            Recent Transactions
          </CardTitle>
          <Link
            href={`/${walletId}/transactions`}
            className="flex items-center gap-1 text-sm text-brand-primary hover:underline"
          >
            View all
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
                No transactions yet
              </p>
              <p className="text-xs text-muted-foreground">
                Create your first transaction to get started.
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

      {/* Quick Actions */}
      {canWrite && (
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/${walletId}/transactions`}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New transaction
            </Button>
          </Link>
          <Link href={`/${walletId}/cards`}>
            <Button variant="outline" className="gap-2">
              <CreditCard className="h-4 w-4" />
              New card
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
