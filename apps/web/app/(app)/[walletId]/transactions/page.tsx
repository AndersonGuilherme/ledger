"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
  Search,
  X,
  Pencil,
} from "lucide-react";
import { useWallet } from "@/lib/hooks/use-wallet";
import { useTransactions, useCreateTransaction, useUpdateTransaction, usePayTransaction, useCancelTransaction } from "@/lib/hooks/use-transactions";
import { useBankAccounts } from "@/lib/hooks/use-bank-accounts";
import { useCategories } from "@/lib/hooks/use-categories";
import { useCards } from "@/lib/hooks/use-cards";
import { createPurchase } from "@/services/purchases.service";
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
  income: "Receita",
  expense: "Despesa",
  transfer_in: "Transferência entrada",
  transfer_out: "Transferência saída",
  credit_card_purchase: "Compra no cartão",
  credit_card_refund: "Estorno no cartão",
  invoice_payment: "Pagamento de fatura",
};

const STATUS_LABELS: Record<TransactionStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  canceled: "Cancelado",
};

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

const PAYMENT_TYPES = [
  { value: "expense", label: "Despesa (dinheiro / pix / débito)" },
  { value: "income", label: "Receita" },
  { value: "credit_card_purchase", label: "Compra no cartão de crédito" },
] as const;

type PaymentType = (typeof PAYMENT_TYPES)[number]["value"];

const regularSchema = z.object({
  mode: z.literal("regular"),
  type: z.enum(["income", "expense"] as const),
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.coerce.number({ invalid_type_error: "Informe um valor válido" }).positive("O valor deve ser positivo"),
  dueDate: z.string().min(1, "Vencimento é obrigatório"),
  status: z.enum(["pending", "paid"] as const).optional(),
  bankAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
});

const cardPurchaseSchema = z.object({
  mode: z.literal("card"),
  cardId: z.string().min(1, "Selecione um cartão"),
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.coerce.number({ invalid_type_error: "Informe um valor válido" }).positive("O valor deve ser positivo"),
  purchaseDate: z.string().min(1, "Data da compra é obrigatória"),
  installmentCount: z.coerce.number().int().min(1).max(48),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
});

const createSchema = z.discriminatedUnion("mode", [regularSchema, cardPurchaseSchema]);
type CreateFormValues = z.infer<typeof createSchema>;

const INSTALLMENT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36, 48];

function CreateTransactionDialog({
  walletId,
  open,
  onOpenChange,
}: {
  walletId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [paymentType, setPaymentType] = useState<PaymentType>("expense");

  const { data: bankAccountsRaw } = useBankAccounts(walletId);
  const { data: categories } = useCategories(walletId);
  const { data: cards } = useCards(walletId);
  const bankAccounts = bankAccountsRaw?.filter((a) => !a.isArchived);
  const activeCards = cards?.filter((c) => !c.isArchived);

  const { mutate: createTx, isPending: txPending } = useCreateTransaction(walletId);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      mode: "regular",
      type: "expense",
      status: "pending",
      installmentCount: 1,
      purchaseDate: new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }),
    } as unknown as CreateFormValues,
  });

  const watchedMode = paymentType === "credit_card_purchase" ? "card" : "regular";
  const watchedType = paymentType === "income" ? "income" : "expense";

  const filteredCategories = categories?.filter(
    (c) => !c.isArchived && (c.type === (paymentType === "income" ? "income" : "expense") || c.type === "any")
  );

  function handlePaymentTypeChange(val: PaymentType) {
    setPaymentType(val);
    reset({
      mode: val === "credit_card_purchase" ? "card" : "regular",
      type: val === "income" ? "income" : "expense",
      status: "pending",
      installmentCount: 1,
      purchaseDate: new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }),
    } as unknown as CreateFormValues);
  }

  function onSubmit(values: CreateFormValues) {
    if (values.mode === "card") {
      createPurchase(walletId, values.cardId, {
        description: values.description,
        totalAmountCents: Math.round(values.amount * 100),
        installmentCount: values.installmentCount,
        purchaseDate: values.purchaseDate,
        ...(values.categoryId ? { categoryId: values.categoryId } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["transactions", walletId] });
        queryClient.invalidateQueries({ queryKey: ["faturas", walletId] });
        queryClient.invalidateQueries({ queryKey: ["cards", walletId] });
        toast.success(
          values.installmentCount > 1
            ? `Compra parcelada em ${values.installmentCount}x. Confira as faturas do cartão.`
            : "Compra registrada no cartão."
        );
        reset();
        onOpenChange(false);
      }).catch(() => toast.error("Não foi possível criar a compra."));
      return;
    }

    createTx(
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
          toast.success("Transação criada com sucesso.");
          reset();
          onOpenChange(false);
        },
        onError: () => {
          toast.error("Não foi possível criar a transação. Tente novamente.");
        },
      }
    );
  }

  const isCard = paymentType === "credit_card_purchase";
  const isPending = txPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); setPaymentType("expense"); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Transação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo de pagamento */}
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={paymentType} onValueChange={(v) => handlePaymentTypeChange(v as PaymentType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TYPES.map((pt) => (
                  <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seletor de cartão */}
          {isCard && (
            <div className="space-y-1.5">
              <Label>Cartão de Crédito</Label>
              <Controller
                name={"cardId" as never}
                control={control}
                render={({ field }: { field: { value: string; onChange: (v: string) => void } }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o cartão" />
                    </SelectTrigger>
                    <SelectContent>
                      {(!activeCards || activeCards.length === 0) ? (
                        <SelectItem value="_none" disabled>Nenhum cartão — adicione primeiro</SelectItem>
                      ) : activeCards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {"cardId" in errors && errors.cardId && (
                <p className="text-xs text-destructive">{(errors.cardId as { message?: string }).message}</p>
              )}
            </div>
          )}

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" className="w-full" placeholder="Ex: Supermercado" {...register("description")} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          {/* Valor */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Valor total (R$)</Label>
            <Input id="amount" type="number" step="0.01" min="0.01" placeholder="0.00" className="w-full" {...register("amount")} />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          {/* Parcelas */}
          {isCard && (
            <div className="space-y-1.5">
              <Label>Parcelas</Label>
              <Controller
                name={"installmentCount" as never}
                control={control}
                render={({ field }: { field: { value: number; onChange: (v: string) => void } }) => (
                  <Select value={String(field.value ?? 1)} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INSTALLMENT_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n === 1 ? "1× (à vista)" : `${n}× parcelas`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Data */}
          <div className="space-y-1.5">
            <Label htmlFor="date">{isCard ? "Data da compra" : "Vencimento"}</Label>
            <Input
              id="date"
              type="date"
              className="w-full"
              {...register(isCard ? "purchaseDate" as never : "dueDate" as never)}
            />
            {"dueDate" in errors && errors.dueDate && (
              <p className="text-xs text-destructive">{(errors.dueDate as { message?: string }).message}</p>
            )}
            {"purchaseDate" in errors && errors.purchaseDate && (
              <p className="text-xs text-destructive">{(errors.purchaseDate as { message?: string }).message}</p>
            )}
          </div>

          {/* Status */}
          {!isCard && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Controller
                name={"status" as never}
                control={control}
                render={({ field }: { field: { value: string; onChange: (v: string) => void } }) => (
                  <Select value={field.value ?? "pending"} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Conta bancária */}
          {!isCard && bankAccounts && bankAccounts.length > 0 && (
            <div className="space-y-1.5">
              <Label>Conta (opcional)</Label>
              <Controller
                name={"bankAccountId" as never}
                control={control}
                render={({ field }: { field: { value: string; onChange: (v: string) => void } }) => (
                  <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Sem conta" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem conta</SelectItem>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}{account.institution ? ` — ${account.institution}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Categoria */}
          <div className="space-y-1.5">
            <Label>Categoria (opcional)</Label>
            <Controller
              name={"categoryId" as never}
              control={control}
              render={({ field }: { field: { value: string; onChange: (v: string) => void } }) => (
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                  disabled={!filteredCategories || filteredCategories.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={!filteredCategories || filteredCategories.length === 0 ? "Sem categorias — adicione nas configurações" : "Sem categoria"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {filteredCategories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea id="notes" placeholder="Observações adicionais..." rows={2} className="w-full" {...register("notes")} />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
              {isPending ? "Criando..." : isCard ? "Adicionar ao cartão" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Transaction Dialog ──────────────────────────────────────────────────

const editSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória").max(255),
  dueDate: z.string().min(1, "Vencimento é obrigatório"),
  categoryId: z.string().optional(),
  bankAccountId: z.string().optional(),
  notes: z.string().optional(),
});
type EditFormValues = z.infer<typeof editSchema>;

const EDITABLE_TYPES: TransactionType[] = ["income", "expense", "credit_card_refund"];

function EditTransactionDialog({
  walletId,
  tx,
  open,
  onOpenChange,
}: {
  walletId: string;
  tx: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: bankAccountsRaw } = useBankAccounts(walletId);
  const { data: categories } = useCategories(walletId);
  const { mutate: updateTx, isPending } = useUpdateTransaction(walletId);

  const bankAccounts = bankAccountsRaw?.filter((a) => !a.isArchived);
  const allCategories = categories ?? [];

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
  });

  // Populate form when dialog opens with a transaction
  useEffect(() => {
    if (tx && open) {
      reset({
        description: tx.description ?? "",
        dueDate: tx.dueDate?.split("T")[0] ?? "",
        categoryId: tx.categoryId ?? "",
        bankAccountId: tx.bankAccountId ?? "",
        notes: tx.notes ?? "",
      });
    }
  }, [tx, open, reset]);

  // Reset on open change
  function handleOpenChange(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  function onSubmit(values: EditFormValues) {
    if (!tx) return;
    updateTx(
      {
        id: tx.id,
        dto: {
          description: values.description,
          dueDate: values.dueDate,
          ...(values.categoryId && values.categoryId !== "none" ? { categoryId: values.categoryId } : { categoryId: null }),
          ...(values.bankAccountId && values.bankAccountId !== "none" ? { bankAccountId: values.bankAccountId } : {}),
          notes: values.notes || undefined,
        },
      },
      {
        onSuccess: () => { toast.success("Transação atualizada."); handleOpenChange(false); },
        onError: () => toast.error("Não foi possível atualizar a transação."),
      }
    );
  }

  const showBankAccount = tx ? EDITABLE_TYPES.includes(tx.type) : false;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Transação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Descrição</Label>
            <Input id="edit-description" {...register("description")} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-dueDate">Vencimento</Label>
            <Input id="edit-dueDate" type="date" {...register("dueDate")} />
            {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
          </div>

          {showBankAccount && (
            <div className="space-y-1.5">
              <Label>Conta bancária (opcional)</Label>
              <Controller
                name="bankAccountId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Sem conta" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem conta</SelectItem>
                      {bankAccounts?.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}{a.institution ? ` — ${a.institution}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Categoria (opcional)</Label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                  disabled={allCategories.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={allCategories.length === 0 ? "Sem categorias" : "Sem categoria"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {allCategories.filter((c) => !c.isArchived).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Observações (opcional)</Label>
            <Textarea id="edit-notes" rows={2} {...register("notes")} />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => handleOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
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
  canWrite,
  onPay,
  onEdit,
  onCancel,
}: {
  tx: Transaction;
  currencyCode: string;
  categoryName?: string;
  canWrite: boolean;
  onPay: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  onCancel: (id: string) => void;
}) {
  const isIncome = tx.sign === 1;
  const isExpense = tx.sign === -1;
  const isPending = tx.status === "pending";
  const isCanceled = tx.status === "canceled";

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors group">
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
        <p className={`text-sm font-semibold truncate ${isCanceled ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {tx.description ?? TRANSACTION_TYPE_LABELS[tx.type]}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {categoryName ?? TRANSACTION_TYPE_LABELS[tx.type]}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <p className={`text-sm font-semibold ${isIncome ? "text-green-600" : isExpense ? "text-red-600" : "text-foreground"}`}>
          {isExpense ? "-" : isIncome ? "+" : ""}
          {formatAmount(tx.amount, currencyCode)}
        </p>
        <p className="text-xs text-muted-foreground">{formatDate(tx.dueDate)}</p>
      </div>

      <Badge variant="secondary" className={`text-xs flex-shrink-0 hidden sm:inline-flex ${statusBadgeClass(tx.status)}`}>
        {STATUS_LABELS[tx.status]}
      </Badge>

      {canWrite && !isCanceled && (
        <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {isPending && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50"
              onClick={() => onPay(tx.id)}
            >
              Pagar
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(tx)}
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onCancel(tx.id)}
          >
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const params = useParams();
  const walletId = params?.walletId as string;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");

  const { data: wallet } = useWallet(walletId);
  const canWrite = wallet?.role === "owner" || wallet?.role === "editor";
  const { data: categories } = useCategories(walletId);
  const { data: bankAccountsRaw } = useBankAccounts(walletId);
  const activeBankAccounts = bankAccountsRaw?.filter((a) => !a.isArchived);

  const queryParams = {
    page,
    limit: 20,
    ...(statusFilter !== "all" && { status: statusFilter }),
    ...(typeFilter !== "all" && { type: typeFilter }),
    ...(dateFrom && { dueDateFrom: dateFrom }),
    ...(dateTo && { dueDateTo: dateTo }),
    ...(search.trim() && { search: search.trim() }),
    ...(categoryFilter !== "all" && { categoryId: categoryFilter }),
    ...(accountFilter !== "all" && { bankAccountId: accountFilter }),
  };

  const { data, isLoading } = useTransactions(walletId, queryParams);
  const { mutate: payTx } = usePayTransaction(walletId);
  const { mutate: cancelTx } = useCancelTransaction(walletId);

  const currencyCode = wallet?.currencyCode ?? "BRL";

  const categoryMap = new Map(categories?.map((c) => [c.id, c.name]) ?? []);

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Transações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Receitas, despesas e transferências
          </p>
        </div>
        {canWrite && (
          <Button className="gap-2 min-h-10" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova transação
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Linha 1: busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 pr-9 h-10 w-full"
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => { setSearch(""); setPage(1); }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Linha 2: dropdowns + intervalo de datas */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="canceled">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
              <SelectItem value="transfer_in">Transferência entrada</SelectItem>
              <SelectItem value="transfer_out">Transferência saída</SelectItem>
              <SelectItem value="credit_card_purchase">Compra no cartão</SelectItem>
              <SelectItem value="credit_card_refund">Estorno no cartão</SelectItem>
              <SelectItem value="invoice_payment">Pagamento de fatura</SelectItem>
            </SelectContent>
          </Select>

          {categories && categories.filter(c => !c.isArchived).length > 0 && (
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.filter(c => !c.isArchived).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {activeBankAccounts && activeBankAccounts.length > 0 && (
            <Select value={accountFilter} onValueChange={(v) => { setAccountFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {activeBankAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="date"
              className="w-36 h-10"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            />
            <span className="text-muted-foreground text-sm">até</span>
            <Input
              type="date"
              className="w-36 h-10"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      {/* Lista de Transações */}
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
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              Nenhuma transação encontrada
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {statusFilter !== "all" || typeFilter !== "all" || dateFrom || dateTo || search || categoryFilter !== "all" || accountFilter !== "all"
                ? "Tente ajustar os filtros."
                : "Crie sua primeira transação para começar."}
            </p>
            {canWrite && statusFilter === "all" && typeFilter === "all" && !dateFrom && !dateTo && !search && categoryFilter === "all" && accountFilter === "all" && (
              <Button
                className="mt-4 gap-2"
                size="sm"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Nova transação
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
                canWrite={canWrite}
                onPay={(id) => payTx({ id }, { onSuccess: () => toast.success("Marcado como pago."), onError: () => toast.error("Não foi possível marcar como pago.") })}
                onEdit={(t) => setEditTx(t)}
                onCancel={(id) => cancelTx(id, { onSuccess: () => toast.success("Transação cancelada."), onError: () => toast.error("Não foi possível cancelar a transação.") })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Paginação */}
      {!isLoading && data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            Página {data.page} de {data.totalPages} — {data.total} total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CreateTransactionDialog
        walletId={walletId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      <EditTransactionDialog
        walletId={walletId}
        tx={editTx}
        open={editTx !== null}
        onOpenChange={(v) => { if (!v) setEditTx(null); }}
      />
    </div>
  );
}
