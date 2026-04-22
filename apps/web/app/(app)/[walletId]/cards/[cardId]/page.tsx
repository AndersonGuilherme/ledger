"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  CreditCard,
  ShoppingBag,
  FileText,
  ChevronDown,
  ChevronUp,
  Plus,
  Receipt,
  Archive,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useCard, useArchiveCard } from "@/lib/hooks/use-cards";
import { useWallet } from "@/lib/hooks/use-wallet";
import { useFaturas, useFatura, usePayFatura, useUpdateFaturaCategory } from "@/lib/hooks/use-faturas";
import { usePurchases, useCreatePurchase, useCancelPurchase } from "@/lib/hooks/use-purchases";
import { useBankAccounts } from "@/lib/hooks/use-bank-accounts";
import { useCategories } from "@/lib/hooks/use-categories";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Fatura, FaturaStatus, CreditCardPurchase, Category } from "@/types/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatReferenceMonth(referenceMonth: string): string {
  const date = new Date(referenceMonth + "-01T00:00:00Z");
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
}

function getFaturaStatusConfig(status: FaturaStatus) {
  switch (status) {
    case "open":
      return { label: "Aberta", className: "bg-blue-50 text-blue-700 border-blue-200" };
    case "closed":
      return { label: "Fechada", className: "bg-amber-50 text-amber-700 border-amber-200" };
    case "overdue":
      return { label: "Vencida", className: "bg-red-50 text-red-700 border-red-200" };
    case "paid":
      return { label: "Paga", className: "bg-green-50 text-green-700 border-green-200" };
  }
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "faturas" | "purchases";

// ─── Pay Fatura Dialog Schema ─────────────────────────────────────────────────

const payFaturaSchema = z.object({
  bankAccountId: z.string().min(1, "Conta bancária é obrigatória"),
  paidAt: z.string().optional(),
});

type PayFaturaFormValues = z.infer<typeof payFaturaSchema>;

// ─── New Purchase Dialog Schema ───────────────────────────────────────────────

const createPurchaseSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  totalAmountReais: z
    .number({ coerce: true, invalid_type_error: "Informe um valor válido" })
    .positive("O valor deve ser positivo"),
  installmentCount: z
    .number({ coerce: true })
    .int()
    .min(1, "Mínimo 1 parcela")
    .max(48, "Máximo 48 parcelas"),
  purchaseDate: z.string().min(1, "Data da compra é obrigatória"),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
});

type CreatePurchaseFormValues = z.infer<typeof createPurchaseSchema>;

// ─── Fatura Row ───────────────────────────────────────────────────────────────

function FaturaRow({
  fatura,
  walletId,
  cardId,
  canWrite,
  categories,
  onPay,
}: {
  fatura: Fatura;
  walletId: string;
  cardId: string;
  canWrite: boolean;
  categories: Category[];
  onPay: (fatura: Fatura) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = getFaturaStatusConfig(fatura.status);
  const canPay = fatura.status !== "paid";

  const updateCategory = useUpdateFaturaCategory(walletId, cardId);

  const { data: detail, isLoading: detailLoading } = useFatura(
    walletId,
    cardId,
    expanded ? fatura.id : ""
  );
  const installments = detail?.installments ?? [];

  const assignedCategory = fatura.categoryId
    ? categories.find((c) => c.id === fatura.categoryId)
    : null;

  function handleCategoryChange(value: string) {
    const newCategoryId = value === "__none__" ? null : value;
    updateCategory.mutate({ faturaId: fatura.id, dto: { categoryId: newCategoryId } });
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="font-medium text-sm capitalize">
              {formatReferenceMonth(fatura.referenceMonth)}
            </p>
            <p className="text-xs text-muted-foreground">
              Vencimento:{" "}
              {new Date(fatura.dueDate).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          <div onClick={(e) => e.stopPropagation()} className="flex items-center">
            {canWrite ? (
              <Select
                value={fatura.categoryId ?? "__none__"}
                onValueChange={handleCategoryChange}
                disabled={updateCategory.isPending}
              >
                <SelectTrigger className="h-7 text-xs w-32 border-dashed">
                  <SelectValue placeholder="Categoria..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground">Sem categoria</span>
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : assignedCategory ? (
              <Badge variant="outline" className="text-xs">
                {assignedCategory.name}
              </Badge>
            ) : null}
          </div>

          <span className="font-semibold text-sm">
            {formatCurrency(fatura.totalCents)}
          </span>
          <Badge
            variant="outline"
            className={cn("text-xs", statusConfig.className)}
          >
            {statusConfig.label}
          </Badge>
          {canPay && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={(e) => {
                e.stopPropagation();
                onPay(fatura);
              }}
            >
              Pagar
            </Button>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && detailLoading && (
        <div className="border-t bg-muted/20 px-4 py-4 text-center text-sm text-muted-foreground">
          Carregando parcelas...
        </div>
      )}

      {expanded && !detailLoading && installments.length > 0 && (
        <div className="border-t bg-muted/20">
          <div className="px-4 py-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Parcelas
            </p>
            <div className="space-y-1">
              {installments.map((installment) => (
                <div
                  key={installment.id}
                  className="flex items-center justify-between py-1.5 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {installment.installmentNumber}/{installment.totalInstallments}
                    </span>
                    <span className="truncate text-foreground">
                      {installment.purchaseDescription}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <span className="font-medium">
                      {formatCurrency(installment.amountCents)}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        installment.status === "paid"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : installment.status === "canceled"
                          ? "bg-slate-50 text-slate-500 border-slate-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      )}
                    >
                      {installment.status === "paid" ? "Pago" : installment.status === "canceled" ? "Cancelado" : "Pendente"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {expanded && !detailLoading && installments.length === 0 && (
        <div className="border-t bg-muted/20 px-4 py-4 text-center text-sm text-muted-foreground">
          Nenhuma parcela encontrada para esta fatura.
        </div>
      )}
    </div>
  );
}

// ─── Purchase Row ─────────────────────────────────────────────────────────────

function PurchaseRow({ purchase, canWrite, onCancel }: { purchase: CreditCardPurchase; canWrite: boolean; onCancel: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <ShoppingBag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {purchase.description}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(purchase.purchaseDate).toLocaleDateString("pt-BR")} •{" "}
              {purchase.installmentCount}x
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-semibold text-sm">
            {formatCurrency(purchase.totalAmountCents)}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              purchase.status === "active"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-slate-50 text-slate-500 border-slate-200"
            )}
          >
            {purchase.status === "active" ? "Ativo" : "Cancelado"}
          </Badge>
          {canWrite && purchase.status === "active" && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
              title="Cancelar compra"
              onClick={(e) => { e.stopPropagation(); onCancel(purchase.id); }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && purchase.installments.length > 0 && (
        <div className="border-t bg-muted/20">
          <div className="px-4 py-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Parcelas
            </p>
            <div className="space-y-1">
              {purchase.installments.map((inst) => (
                <div
                  key={inst.id}
                  className="flex items-center justify-between py-1.5 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {inst.installmentNumber}/{purchase.installmentCount}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Venc.: {new Date(inst.dueDate).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {formatCurrency(inst.amountCents)}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        inst.status === "paid"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : inst.status === "canceled"
                          ? "bg-slate-50 text-slate-500 border-slate-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      )}
                    >
                      {inst.status === "paid" ? "Pago" : inst.status === "canceled" ? "Cancelado" : "Pendente"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const walletId = params?.walletId as string;
  const cardId = params?.cardId as string;

  const [activeTab, setActiveTab] = useState<Tab>("faturas");

  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedFatura, setSelectedFatura] = useState<Fatura | null>(null);

  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);

  const { data: wallet } = useWallet(walletId);
  const canWrite = wallet?.role === "owner" || wallet?.role === "editor";

  const { data: card, isLoading: cardLoading } = useCard(walletId, cardId);

  const { data: faturas, isLoading: faturasLoading } = useFaturas(
    walletId,
    cardId
  );
  const { data: purchases, isLoading: purchasesLoading } = usePurchases(
    walletId,
    cardId
  );
  const { data: bankAccountsRaw } = useBankAccounts(walletId);
  const bankAccounts = bankAccountsRaw?.filter((a) => !a.isArchived);

  const { data: categoriesRaw } = useCategories(walletId);
  const categories = (categoriesRaw ?? []).filter((c) => !c.isArchived);

  const payFatura = usePayFatura(walletId, cardId);
  const createPurchase = useCreatePurchase(walletId, cardId);
  const cancelPurchase = useCancelPurchase(walletId, cardId);
  const archiveCard = useArchiveCard(walletId);

  const payForm = useForm<PayFaturaFormValues>({
    resolver: zodResolver(payFaturaSchema),
    defaultValues: { bankAccountId: "", paidAt: new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) },
  });

  const purchaseForm = useForm<CreatePurchaseFormValues>({
    resolver: zodResolver(createPurchaseSchema),
    defaultValues: {
      description: "",
      totalAmountReais: 0,
      installmentCount: 1,
      purchaseDate: new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }),
      categoryId: "",
      notes: "",
    },
  });

  function handleOpenPayDialog(fatura: Fatura) {
    setSelectedFatura(fatura);
    payForm.reset({ bankAccountId: "", paidAt: new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) });
    setPayDialogOpen(true);
  }

  async function onPaySubmit(values: PayFaturaFormValues) {
    if (!selectedFatura) return;
    try {
      await payFatura.mutateAsync({
        faturaId: selectedFatura.id,
        dto: {
          bankAccountId: values.bankAccountId,
          ...(values.paidAt ? { paidAt: values.paidAt } : {}),
        },
      });
      toast.success("Fatura paga com sucesso");
      setPayDialogOpen(false);
    } catch {
      toast.error("Não foi possível pagar a fatura");
    }
  }

  function handleOpenPurchaseDialog() {
    purchaseForm.reset({
      description: "",
      totalAmountReais: 0,
      installmentCount: 1,
      purchaseDate: new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }),
      categoryId: "",
      notes: "",
    });
    setPurchaseDialogOpen(true);
  }

  async function onPurchaseSubmit(values: CreatePurchaseFormValues) {
    try {
      await createPurchase.mutateAsync({
        description: values.description,
        totalAmountCents: Math.round(values.totalAmountReais * 100),
        installmentCount: values.installmentCount,
        purchaseDate: values.purchaseDate,
        ...(values.categoryId ? { categoryId: values.categoryId } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      });
      toast.success("Compra criada com sucesso");
      setPurchaseDialogOpen(false);
    } catch {
      toast.error("Não foi possível criar a compra");
    }
  }

  const sortedFaturas = faturas
    ? [...faturas].sort(
        (a, b) =>
          new Date(b.referenceMonth).getTime() -
          new Date(a.referenceMonth).getTime()
      )
    : [];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Botão voltar */}
      <button
        type="button"
        onClick={() => router.push(`/${walletId}/cards`)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Todos os cartões
      </button>

      {/* Cabeçalho do cartão */}
      {cardLoading ? (
        <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-800 to-slate-900 mb-8 h-36">
          <Skeleton className="h-6 w-48 bg-slate-700 mb-2" />
          <Skeleton className="h-4 w-32 bg-slate-700" />
        </div>
      ) : card ? (
        <div className="rounded-2xl p-4 sm:p-6 bg-gradient-to-br from-slate-800 to-slate-900 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="font-bold text-white text-xl sm:text-2xl">{card.name}</p>
            <p className="text-slate-400 text-sm mt-1">
              Fechamento: dia {card.closingDay} | Vencimento: dia {card.dueDay}
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            {card.creditLimitCents !== null && (
              <div className="text-left sm:text-right w-full sm:min-w-[180px]">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Utilizado</span>
                  <span>
                    {card.usedCreditCents !== null
                      ? formatCurrency(card.usedCreditCents)
                      : "—"}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-600 overflow-hidden mb-1">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      card.usedCreditCents !== null &&
                        card.usedCreditCents / card.creditLimitCents > 0.9
                        ? "bg-red-400"
                        : card.usedCreditCents !== null &&
                          card.usedCreditCents / card.creditLimitCents > 0.7
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    )}
                    style={{
                      width:
                        card.usedCreditCents !== null
                          ? `${Math.min(
                              100,
                              Math.round(
                                (card.usedCreditCents / card.creditLimitCents) * 100
                              )
                            )}%`
                          : "0%",
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-400">Disponível</span>
                  <span className="text-white font-semibold">
                    {card.availableCreditCents !== null
                      ? formatCurrency(card.availableCreditCents)
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Limite</span>
                  <span>{formatCurrency(card.creditLimitCents)}</span>
                </div>
              </div>
            )}
            {canWrite && wallet?.role === "owner" && (
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-white hover:bg-slate-700 h-7 text-xs gap-1"
                disabled={archiveCard.isPending}
                onClick={() => {
                  if (confirm("Arquivar este cartão? Esta ação não pode ser desfeita.")) {
                    archiveCard.mutate(cardId, {
                      onSuccess: () => { toast.success("Cartão arquivado."); router.push(`/${walletId}/cards`); },
                      onError: (err: unknown) => {
                        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                        if (msg === "CARD_HAS_OPEN_FATURAS") {
                          toast.error("Quite todas as faturas em aberto antes de arquivar o cartão.");
                        } else {
                          toast.error("Não foi possível arquivar o cartão.");
                        }
                      },
                    });
                  }
                }}
              >
                <Archive className="h-3.5 w-3.5" />
                Arquivar cartão
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-6 bg-muted mb-8 h-36 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Cartão não encontrado</p>
        </div>
      )}

      {/* Navegação por abas */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("faturas")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
            activeTab === "faturas"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText className="h-4 w-4" />
          Faturas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("purchases")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
            activeTab === "purchases"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <ShoppingBag className="h-4 w-4" />
          Compras
        </button>
      </div>

      {/* Aba Faturas */}
      {activeTab === "faturas" && (
        <div>
          {faturasLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : !sortedFaturas || sortedFaturas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Receipt className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Nenhuma fatura ainda</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                As faturas aparecerão aqui após compras serem realizadas neste cartão.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedFaturas.map((fatura) => (
                <FaturaRow
                  key={fatura.id}
                  fatura={fatura}
                  walletId={walletId}
                  cardId={cardId}
                  canWrite={canWrite}
                  categories={categories}
                  onPay={handleOpenPayDialog}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Aba Compras */}
      {activeTab === "purchases" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {purchases ? `${purchases.length} compra(s)` : ""}
            </p>
            {canWrite && (
              <Button size="sm" onClick={handleOpenPurchaseDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nova compra
              </Button>
            )}
          </div>

          {purchasesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : !purchases || purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <ShoppingBag className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Nenhuma compra ainda</h3>
              <p className="text-muted-foreground text-sm max-w-xs mb-6">
                Registre sua primeira compra neste cartão.
              </p>
              {canWrite && (
                <Button onClick={handleOpenPurchaseDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova compra
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {purchases.map((purchase) => (
                <PurchaseRow
                  key={purchase.id}
                  purchase={purchase}
                  canWrite={canWrite}
                  onCancel={(id) => {
                    if (confirm("Cancelar esta compra? Todas as parcelas pendentes serão removidas.")) {
                      cancelPurchase.mutate(id, {
                        onSuccess: () => toast.success("Compra cancelada."),
                        onError: () => toast.error("Não foi possível cancelar a compra."),
                      });
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Diálogo Pagar Fatura */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Pagar fatura{" "}
              {selectedFatura
                ? formatReferenceMonth(selectedFatura.referenceMonth)
                : ""}
            </DialogTitle>
          </DialogHeader>

          {selectedFatura && (
            <div className="rounded-lg bg-muted/50 p-3 mb-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-semibold">
                  {formatCurrency(selectedFatura.totalCents)}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Vencimento</span>
                <span>
                  {new Date(selectedFatura.dueDate).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>
          )}

          {!bankAccounts || bankAccounts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-border p-6 text-center">
              <p className="text-sm font-medium text-foreground mb-1">Nenhuma conta bancária configurada</p>
              <p className="text-xs text-muted-foreground mb-3">
                É necessário ter ao menos uma conta bancária para pagar uma fatura.
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setPayDialogOpen(false)}>
                  Fechar
                </Button>
                <Button size="sm" onClick={() => { setPayDialogOpen(false); router.push(`/${walletId}/settings`); }}>
                  Ir para configurações
                </Button>
              </div>
            </div>
          ) : (
          <Form {...payForm}>
            <form
              onSubmit={payForm.handleSubmit(onPaySubmit)}
              className="space-y-4"
            >
              <FormField
                control={payForm.control}
                name="bankAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conta bancária</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a conta..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                            {account.institution ? ` — ${account.institution}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={payForm.control}
                name="paidAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do pagamento (opcional)</FormLabel>
                    <FormControl>
                      <Input type="date" className="w-full" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setPayDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={payFatura.isPending}>
                  {payFatura.isPending ? "Processando..." : "Confirmar pagamento"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo Nova Compra */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova compra</DialogTitle>
          </DialogHeader>

          <Form {...purchaseForm}>
            <form
              onSubmit={purchaseForm.handleSubmit(onPurchaseSubmit)}
              className="space-y-4"
            >
              <FormField
                control={purchaseForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input className="w-full" placeholder="Amazon, Netflix..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={purchaseForm.control}
                  name="totalAmountReais"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0.01}
                          step="0.01"
                          placeholder="150.00"
                          className="w-full"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={purchaseForm.control}
                  name="installmentCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parcelas</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={48}
                          placeholder="1"
                          className="w-full"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={purchaseForm.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da compra</FormLabel>
                    <FormControl>
                      <Input type="date" className="w-full" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setPurchaseDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={createPurchase.isPending}>
                  {createPurchase.isPending ? "Criando..." : "Adicionar compra"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
