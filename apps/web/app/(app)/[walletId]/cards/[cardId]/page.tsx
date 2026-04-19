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
} from "lucide-react";
import { toast } from "sonner";

import { useCards } from "@/lib/hooks/use-cards";
import { useWallet } from "@/lib/hooks/use-wallet";
import { useFaturas, usePayFatura } from "@/lib/hooks/use-faturas";
import { usePurchases, useCreatePurchase } from "@/lib/hooks/use-purchases";
import { useBankAccounts } from "@/lib/hooks/use-bank-accounts";
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
import type { Fatura, FaturaStatus, CreditCardPurchase } from "@/types/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatReferenceMonth(referenceMonth: string): string {
  const date = new Date(referenceMonth + "-01");
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function getFaturaStatusConfig(status: FaturaStatus) {
  switch (status) {
    case "open":
      return { label: "Open", className: "bg-blue-50 text-blue-700 border-blue-200" };
    case "closed":
      return { label: "Closed", className: "bg-amber-50 text-amber-700 border-amber-200" };
    case "overdue":
      return { label: "Overdue", className: "bg-red-50 text-red-700 border-red-200" };
    case "paid":
      return { label: "Paid", className: "bg-green-50 text-green-700 border-green-200" };
  }
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "faturas" | "purchases";

// ─── Pay Fatura Dialog Schema ─────────────────────────────────────────────────

const payFaturaSchema = z.object({
  bankAccountId: z.string().min(1, "Bank account is required"),
  paidAt: z.string().optional(),
});

type PayFaturaFormValues = z.infer<typeof payFaturaSchema>;

// ─── New Purchase Dialog Schema ───────────────────────────────────────────────

const createPurchaseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  totalAmountReais: z
    .number({ coerce: true, invalid_type_error: "Enter a valid amount" })
    .positive("Amount must be positive"),
  installmentCount: z
    .number({ coerce: true })
    .int()
    .min(1, "Minimum 1 installment")
    .max(48, "Maximum 48 installments"),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
});

type CreatePurchaseFormValues = z.infer<typeof createPurchaseSchema>;

// ─── Fatura Row ───────────────────────────────────────────────────────────────

function FaturaRow({
  fatura,
  walletId,
  cardId,
  onPay,
}: {
  fatura: Fatura;
  walletId: string;
  cardId: string;
  onPay: (fatura: Fatura) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = getFaturaStatusConfig(fatura.status);
  const canPay = fatura.status !== "paid";

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
              Due:{" "}
              {new Date(fatura.dueDate).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
              Pay
            </Button>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && fatura.installments && fatura.installments.length > 0 && (
        <div className="border-t bg-muted/20">
          <div className="px-4 py-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Installments
            </p>
            <div className="space-y-1">
              {fatura.installments.map((installment) => (
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
                      {installment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {expanded &&
        (!fatura.installments || fatura.installments.length === 0) && (
          <div className="border-t bg-muted/20 px-4 py-4 text-center text-sm text-muted-foreground">
            No installments found for this fatura.
          </div>
        )}
    </div>
  );
}

// ─── Purchase Row ─────────────────────────────────────────────────────────────

function PurchaseRow({ purchase }: { purchase: CreditCardPurchase }) {
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
            {purchase.status}
          </Badge>
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
              Installments
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
                      Due: {new Date(inst.dueDate).toLocaleDateString("pt-BR")}
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
                      {inst.status}
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

  // Pay fatura dialog
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedFatura, setSelectedFatura] = useState<Fatura | null>(null);

  // New purchase dialog
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);

  const { data: wallet } = useWallet(walletId);
  const canWrite = wallet?.role === "owner" || wallet?.role === "editor";

  const { data: cards, isLoading: cardsLoading } = useCards(walletId);
  const card = cards?.find((c) => c.id === cardId);

  const { data: faturas, isLoading: faturasLoading } = useFaturas(
    walletId,
    cardId
  );
  const { data: purchases, isLoading: purchasesLoading } = usePurchases(
    walletId,
    cardId
  );
  const { data: bankAccounts } = useBankAccounts(walletId);

  const payFatura = usePayFatura(walletId, cardId);
  const createPurchase = useCreatePurchase(walletId, cardId);

  // Pay fatura form
  const payForm = useForm<PayFaturaFormValues>({
    resolver: zodResolver(payFaturaSchema),
    defaultValues: { bankAccountId: "", paidAt: "" },
  });

  // Create purchase form
  const purchaseForm = useForm<CreatePurchaseFormValues>({
    resolver: zodResolver(createPurchaseSchema),
    defaultValues: {
      description: "",
      totalAmountReais: 0,
      installmentCount: 1,
      purchaseDate: new Date().toISOString().split("T")[0],
      categoryId: "",
      notes: "",
    },
  });

  function handleOpenPayDialog(fatura: Fatura) {
    setSelectedFatura(fatura);
    payForm.reset({ bankAccountId: "", paidAt: "" });
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
      toast.success("Fatura paid successfully");
      setPayDialogOpen(false);
    } catch {
      toast.error("Failed to pay fatura");
    }
  }

  function handleOpenPurchaseDialog() {
    purchaseForm.reset({
      description: "",
      totalAmountReais: 0,
      installmentCount: 1,
      purchaseDate: new Date().toISOString().split("T")[0],
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
      toast.success("Purchase created successfully");
      setPurchaseDialogOpen(false);
    } catch {
      toast.error("Failed to create purchase");
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
    <div className="p-8">
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push(`/${walletId}/cards`)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        All cards
      </button>

      {/* Card header */}
      {cardsLoading ? (
        <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-800 to-slate-900 mb-8 h-36">
          <Skeleton className="h-6 w-48 bg-slate-700 mb-2" />
          <Skeleton className="h-4 w-32 bg-slate-700" />
        </div>
      ) : card ? (
        <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-800 to-slate-900 mb-8 flex items-end justify-between">
          <div>
            <p className="font-bold text-white text-2xl">{card.name}</p>
            <p className="text-slate-400 text-sm mt-1">
              Closing day: {card.closingDay} | Due day: {card.dueDay}
            </p>
          </div>
          <div className="text-right">
            {card.availableCreditCents !== null && (
              <p className="text-white font-semibold">
                {formatCurrency(card.availableCreditCents)}{" "}
                <span className="text-slate-400 text-xs font-normal">available</span>
              </p>
            )}
            {card.creditLimitCents !== null && (
              <p className="text-slate-400 text-xs mt-0.5">
                Limit: {formatCurrency(card.creditLimitCents)}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-6 bg-muted mb-8 h-36 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Card not found</p>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 border-b">
        <button
          type="button"
          onClick={() => setActiveTab("faturas")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
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
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "purchases"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <ShoppingBag className="h-4 w-4" />
          Purchases
        </button>
      </div>

      {/* Faturas tab */}
      {activeTab === "faturas" && (
        <div>
          {faturasLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : !sortedFaturas || sortedFaturas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Receipt className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No faturas yet</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Faturas will appear here after purchases are made on this card.
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
                  onPay={handleOpenPayDialog}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Purchases tab */}
      {activeTab === "purchases" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {purchases ? `${purchases.length} purchases` : ""}
            </p>
            {canWrite && (
              <Button size="sm" onClick={handleOpenPurchaseDialog}>
                <Plus className="h-4 w-4 mr-2" />
                New purchase
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
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <ShoppingBag className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No purchases yet</h3>
              <p className="text-muted-foreground text-sm max-w-xs mb-6">
                Register your first purchase on this card.
              </p>
              {canWrite && (
                <Button onClick={handleOpenPurchaseDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  New purchase
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {purchases.map((purchase) => (
                <PurchaseRow key={purchase.id} purchase={purchase} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pay Fatura Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Pay fatura{" "}
              {selectedFatura
                ? formatReferenceMonth(selectedFatura.referenceMonth)
                : ""}
            </DialogTitle>
          </DialogHeader>

          {selectedFatura && (
            <div className="rounded-lg bg-muted/50 p-3 mb-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount due</span>
                <span className="font-semibold">
                  {formatCurrency(selectedFatura.totalCents)}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Due date</span>
                <span>
                  {new Date(selectedFatura.dueDate).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>
          )}

          {!bankAccounts || bankAccounts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-border p-6 text-center">
              <p className="text-sm font-medium text-foreground mb-1">No bank accounts configured</p>
              <p className="text-xs text-muted-foreground mb-3">
                You need at least one bank account to pay a fatura. Add one in wallet settings.
              </p>
              <Button variant="outline" size="sm" onClick={() => setPayDialogOpen(false)}>
                Close
              </Button>
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
                    <FormLabel>Bank account</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                            {account.bankName ? ` — ${account.bankName}` : ""}
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
                    <FormLabel>Payment date (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPayDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={payFatura.isPending}>
                  {payFatura.isPending ? "Processing..." : "Confirm payment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* New Purchase Dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New purchase</DialogTitle>
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Amazon, Netflix..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={purchaseForm.control}
                  name="totalAmountReais"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0.01}
                          step="0.01"
                          placeholder="150.00"
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
                      <FormLabel>Installments</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={48}
                          placeholder="1"
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
                    <FormLabel>Purchase date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPurchaseDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createPurchase.isPending}>
                  {createPurchase.isPending ? "Creating..." : "Add purchase"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
