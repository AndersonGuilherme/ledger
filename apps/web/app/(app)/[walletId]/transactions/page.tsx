"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useWallet } from "@/lib/hooks/use-wallet";
import { useTransactions, useCreateTransaction } from "@/lib/hooks/use-transactions";
import { useBankAccounts } from "@/lib/hooks/use-bank-accounts";
import { useCategories } from "@/lib/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Transaction, TransactionType, TransactionStatus } from "@/types/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
  credit_card_purchase: "Card purchase",
  credit_card_refund: "Card refund",
  invoice_payment: "Invoice payment",
};

const STATUS_LABELS: Record<TransactionStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  canceled: "Canceled",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function statusBadgeClass(status: TransactionStatus): string {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-700 border-green-200";
    case "pending":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "canceled":
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

// ─── Create Transaction Form ──────────────────────────────────────────────────

const createSchema = z.object({
  type: z.enum(["income", "expense"] as const),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce
    .number({ invalid_type_error: "Enter a valid amount" })
    .positive("Amount must be positive"),
  dueDate: z.string().min(1, "Due date is required"),
  status: z.enum(["pending", "paid"] as const).optional(),
  bankAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;

function CreateTransactionDialog({
  walletId,
  open,
  onOpenChange,
}: {
  walletId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: bankAccounts } = useBankAccounts(walletId);
  const { data: categories } = useCategories(walletId);
  const { mutate, isPending } = useCreateTransaction(walletId);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      type: "expense",
      status: "pending",
    },
  });

  const selectedType = watch("type");

  const filteredCategories = categories?.filter(
    (c) => c.type === selectedType || c.type === "transfer"
  );

  function onSubmit(values: CreateFormValues) {
    mutate(
      {
        type: values.type,
        description: values.description,
        amount: values.amount,
        dueDate: values.dueDate,
        status: values.status,
        bankAccountId: values.bankAccountId || undefined,
        categoryId: values.categoryId || undefined,
        notes: values.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Transaction created successfully.");
          reset();
          onOpenChange(false);
        },
        onError: () => {
          toast.error("Failed to create transaction. Please try again.");
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Transaction</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g. Grocery shopping"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              {...register("dueDate")}
            />
            {errors.dueDate && (
              <p className="text-xs text-destructive">{errors.dueDate.message}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? "pending"}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Bank Account */}
          {bankAccounts && bankAccounts.length > 0 && (
            <div className="space-y-1.5">
              <Label>Bank Account (optional)</Label>
              <Controller
                name="bankAccountId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No account</SelectItem>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                          {account.bankName ? ` — ${account.bankName}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Category */}
          {filteredCategories && filteredCategories.length > 0 && (
            <div className="space-y-1.5">
              <Label>Category (optional)</Label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {filteredCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              rows={2}
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Transaction List Item ────────────────────────────────────────────────────

function TransactionListItem({
  tx,
  currencyCode,
  categoryName,
}: {
  tx: Transaction;
  currencyCode: string;
  categoryName?: string;
}) {
  const isIncome = tx.sign === 1;
  const isExpense = tx.sign === -1;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors">
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
        <p className="text-sm font-semibold text-foreground truncate">
          {tx.description ?? TRANSACTION_TYPE_LABELS[tx.type]}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {categoryName ?? TRANSACTION_TYPE_LABELS[tx.type]}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
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

      <Badge
        variant="secondary"
        className={`text-xs flex-shrink-0 ${statusBadgeClass(tx.status)}`}
      >
        {STATUS_LABELS[tx.status]}
      </Badge>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const params = useParams();
  const walletId = params?.walletId as string;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { data: wallet } = useWallet(walletId);
  const { data: categories } = useCategories(walletId);

  const queryParams = {
    page,
    limit: 20,
    ...(statusFilter !== "all" && { status: statusFilter }),
    ...(typeFilter !== "all" && { type: typeFilter }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const { data, isLoading } = useTransactions(walletId, queryParams);

  const currencyCode = wallet?.currencyCode ?? "BRL";

  const categoryMap = new Map(categories?.map((c) => [c.id, c.name]) ?? []);

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Income, expenses and transfers
          </p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New transaction
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="transfer_in">Transfer in</SelectItem>
            <SelectItem value="transfer_out">Transfer out</SelectItem>
            <SelectItem value="credit_card_purchase">Card purchase</SelectItem>
            <SelectItem value="credit_card_refund">Card refund</SelectItem>
            <SelectItem value="invoice_payment">Invoice payment</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-36 h-10"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            placeholder="From"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            className="w-36 h-10"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            placeholder="To"
          />
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-card border border-neutral-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="space-y-1.5 text-right">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : !data?.transactions?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              No transactions found
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {statusFilter !== "all" || typeFilter !== "all" || dateFrom || dateTo
                ? "Try adjusting your filters."
                : "Create your first transaction to get started."}
            </p>
            {statusFilter === "all" && typeFilter === "all" && !dateFrom && !dateTo && (
              <Button
                className="mt-4 gap-2"
                size="sm"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                New transaction
              </Button>
            )}
          </div>
        ) : (
          <div className="p-2">
            {data.transactions.map((tx) => (
              <TransactionListItem
                key={tx.id}
                tx={tx}
                currencyCode={currencyCode}
                categoryName={tx.categoryId ? categoryMap.get(tx.categoryId) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages} — {data.total} total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <CreateTransactionDialog
        walletId={walletId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
