"use client";

import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Settings,
  Users,
  UserX,
  UserPlus,
  Loader2,
  Crown,
  Edit2,
  Eye,
  Landmark,
  Plus,
  Archive,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import { useWallet } from "@/lib/hooks/use-wallet";
import { useBankAccounts, useCreateBankAccount } from "@/lib/hooks/use-bank-accounts";
import { deleteBankAccount } from "@/services/bank-accounts.service";
import { useCategories, useCreateCategory, useArchiveCategory } from "@/lib/hooks/use-categories";
import { updateWallet, listMembers, inviteMember, revokeMember, changeMemberRole, canDeleteWallet, deleteWallet } from "@/services/wallets.service";
import { useAuthContext } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WalletMember, BankAccountType, CategoryType } from "@/types/api";
import { useState } from "react";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const generalSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(80),
  description: z.string().max(500).optional(),
});

const inviteSchema = z.object({
  email: z.string().email("E-mail válido é obrigatório"),
  role: z.enum(["editor", "viewer"]),
});

const categorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(80),
  type: z.enum(["income", "expense", "any"] as const),
});

const bankAccountSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(80),
  type: z.enum(["checking", "savings", "investment", "credit_card", "cash", "other"] as const),
  institution: z.string().max(100).optional(),
});

type GeneralFormValues = z.infer<typeof generalSchema>;
type InviteFormValues = z.infer<typeof inviteSchema>;
type CategoryFormValues = z.infer<typeof categorySchema>;
type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

// ─── Role icon helper ──────────────────────────────────────────────────────────

function RoleIcon({ role }: { role: string }) {
  if (role === "owner") return <Crown className="h-3.5 w-3.5" />;
  if (role === "editor") return <Edit2 className="h-3.5 w-3.5" />;
  return <Eye className="h-3.5 w-3.5" />;
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-50 text-amber-700 border-amber-200",
  editor: "bg-blue-50 text-blue-700 border-blue-200",
  viewer: "bg-gray-50 text-gray-600 border-gray-200",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  pending: "bg-orange-50 text-orange-700",
  revoked: "bg-red-50 text-red-700",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  editor: "Editor",
  viewer: "Visualizador",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  pending: "Pendente",
  revoked: "Revogado",
};

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  canManage,
  onRevoke,
  onChangeRole,
  isRevoking,
}: {
  member: WalletMember;
  canManage: boolean;
  onRevoke: (id: string) => void;
  onChangeRole: (id: string, role: "editor" | "viewer") => void;
  isRevoking: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-3 flex-wrap">
      <div className="w-8 h-8 rounded-full bg-neutral-surface flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
        {(member.invitedEmail ?? "?")[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {member.invitedEmail ?? "—"}
        </p>
        <Badge
          variant="outline"
          className={cn("text-xs gap-1 mt-0.5", STATUS_COLORS[member.status])}
        >
          {STATUS_LABELS[member.status] ?? member.status}
        </Badge>
      </div>
      {canManage && member.role !== "owner" ? (
        <Select
          value={member.role}
          onValueChange={(v) => onChangeRole(member.id, v as "editor" | "viewer")}
        >
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="viewer">Visualizador</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Badge
          variant="outline"
          className={cn("text-xs gap-1 shrink-0", ROLE_COLORS[member.role])}
        >
          <RoleIcon role={member.role} />
          {ROLE_LABELS[member.role] ?? member.role}
        </Badge>
      )}
      {canManage && member.role !== "owner" && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
          onClick={() => onRevoke(member.id)}
          disabled={isRevoking}
        >
          <UserX className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const walletId = params?.walletId as string;
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  const { data: wallet, isLoading: walletLoading } = useWallet(walletId);
  const { data: bankAccountsRaw, isLoading: bankAccountsLoading } = useBankAccounts(walletId);
  const bankAccounts = bankAccountsRaw?.filter((a) => !a.isArchived);
  const { data: members, isLoading: membersLoading } = useQuery<WalletMember[]>({
    queryKey: ["members", walletId],
    queryFn: () => listMembers(walletId),
    enabled: !!walletId,
    staleTime: 1000 * 30,
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const isOwner = wallet?.role === "owner";

  // ── Formulário geral ──
  const generalForm = useForm<GeneralFormValues>({
    resolver: zodResolver(generalSchema),
    values: {
      name: wallet?.name ?? "",
      description: wallet?.description ?? "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: (dto: GeneralFormValues) => updateWallet(walletId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      toast.success("Carteira atualizada.");
    },
    onError: () => toast.error("Não foi possível atualizar a carteira."),
  });

  // ── Formulário de convite ──
  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "editor" },
  });

  const inviteMutation = useMutation({
    mutationFn: (dto: InviteFormValues) => inviteMember(walletId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", walletId] });
      toast.success("Membro convidado.");
      setInviteOpen(false);
      inviteForm.reset();
    },
    onError: () => toast.error("Não foi possível convidar o membro."),
  });

  // ── Categorias ──
  const { data: categoriesRaw, isLoading: categoriesLoading } = useCategories(walletId);
  const activeCategories = categoriesRaw?.filter((c) => !c.isArchived);
  const createCategory = useCreateCategory(walletId);
  const archiveCategory = useArchiveCategory(walletId);

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", type: "expense" },
  });

  async function onAddCategory(values: CategoryFormValues) {
    try {
      await createCategory.mutateAsync({ name: values.name, type: values.type as CategoryType });
      toast.success("Categoria adicionada.");
      setAddCategoryOpen(false);
      categoryForm.reset();
    } catch {
      toast.error("Não foi possível adicionar a categoria.");
    }
  }

  // ── Contas bancárias ──
  const createBankAccount = useCreateBankAccount(walletId);
  const archiveBankAccountMutation = useMutation({
    mutationFn: (id: string) => deleteBankAccount(walletId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", walletId] });
      toast.success("Conta arquivada.");
    },
    onError: () => toast.error("Não foi possível arquivar a conta."),
  });

  const bankAccountForm = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: { name: "", type: "checking", institution: "" },
  });

  async function onAddAccount(values: BankAccountFormValues) {
    try {
      await createBankAccount.mutateAsync({
        name: values.name,
        type: values.type as BankAccountType,
        ...(values.institution ? { institution: values.institution } : {}),
      });
      toast.success("Conta bancária adicionada.");
      setAddAccountOpen(false);
      bankAccountForm.reset();
    } catch {
      toast.error("Não foi possível adicionar a conta bancária.");
    }
  }

  // ── Alterar permissão ──
  const changeRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: "editor" | "viewer" }) =>
      changeMemberRole(walletId, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", walletId] });
      toast.success("Permissão atualizada.");
    },
    onError: () => toast.error("Não foi possível atualizar a permissão."),
  });

  // ── Revogar acesso ──
  const revokeMutation = useMutation({
    mutationFn: (memberId: string) => revokeMember(walletId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", walletId] });
      toast.success("Acesso revogado.");
      setRevokingId(null);
    },
    onError: () => {
      toast.error("Não foi possível revogar o acesso.");
      setRevokingId(null);
    },
  });

  function handleRevoke(memberId: string) {
    setRevokingId(memberId);
    revokeMutation.mutate(memberId);
  }

  // ── Excluir carteira ──
  const canDeleteQuery = useQuery({
    queryKey: ["wallet-can-delete", walletId],
    queryFn: () => canDeleteWallet(walletId),
    enabled: deleteOpen && isOwner,
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteWallet(walletId, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      toast.success("Carteira excluída.");
      router.push("/wallets");
    },
    onError: () => toast.error("Não foi possível excluir a carteira."),
  });

  const canDelete = canDeleteQuery.data;
  const deleteNameMatch = deleteConfirmName === wallet?.name;

  return (
    <div className="p-4 md:p-8 max-w-2xl w-full">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <Settings className="h-6 w-6 text-brand-primary" />
        <div>
          {walletLoading ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{wallet?.name}</h1>
          )}
          <p className="text-muted-foreground text-sm mt-0.5">
            Configurações e membros da carteira
          </p>
        </div>
      </div>

      {/* Geral */}
      <Card className="border-neutral-border mb-6">
        <CardHeader>
          <CardTitle className="text-base">Geral</CardTitle>
          <CardDescription>Nome e descrição da carteira</CardDescription>
        </CardHeader>
        <CardContent>
          {walletLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form
              onSubmit={generalForm.handleSubmit((v) => {
                if (!isOwner) return;
                updateMutation.mutate(v);
              })}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  className="w-full"
                  disabled={!isOwner}
                  {...generalForm.register("name")}
                />
                {generalForm.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {generalForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  placeholder="Opcional"
                  className="w-full"
                  disabled={!isOwner}
                  {...generalForm.register("description")}
                />
              </div>
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <Badge variant="outline" className="text-xs capitalize">
                  {wallet?.type}
                </Badge>
                <Badge variant="outline" className="text-xs uppercase">
                  {wallet?.currencyCode}
                </Badge>
                {isOwner && (
                  <Button
                    type="submit"
                    size="sm"
                    className="ml-auto bg-brand-primary hover:bg-brand-primary/90"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Salvar"
                    )}
                  </Button>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Categorias */}
      <Card className="border-neutral-border mb-6">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" /> Categorias
              </CardTitle>
              <CardDescription>Categorias de receita e despesa</CardDescription>
            </div>
            {isOwner && (
              <Button size="sm" variant="outline" onClick={() => setAddCategoryOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Adicionar categoria
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {categoriesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : !activeCategories || activeCategories.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">Nenhuma categoria ainda.</p>
              {isOwner && (
                <Button size="sm" onClick={() => setAddCategoryOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Adicionar primeira categoria
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-neutral-border">
              {activeCategories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{cat.name}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-xs shrink-0",
                    cat.type === "income" ? "bg-green-50 text-green-700 border-green-200" :
                    cat.type === "expense" ? "bg-red-50 text-red-700 border-red-200" :
                    "bg-gray-50 text-gray-600 border-gray-200"
                  )}>
                    {cat.type === "income" ? "Receita" : cat.type === "expense" ? "Despesa" : "Qualquer"}
                  </Badge>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => archiveCategory.mutate(cat.id, {
                        onSuccess: () => toast.success("Categoria arquivada."),
                        onError: () => toast.error("Não foi possível arquivar a categoria."),
                      })}
                      title="Arquivar categoria"
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contas Bancárias */}
      <Card className="border-neutral-border mb-6">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Landmark className="h-4 w-4" /> Contas Bancárias
              </CardTitle>
              <CardDescription>
                Contas usadas para pagamentos e transações
              </CardDescription>
            </div>
            {isOwner && (
              <Button size="sm" variant="outline" onClick={() => setAddAccountOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Adicionar conta
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {bankAccountsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : !bankAccounts || bankAccounts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">Nenhuma conta bancária ainda.</p>
              {isOwner && (
                <Button size="sm" onClick={() => setAddAccountOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Adicionar primeira conta
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-neutral-border">
              {bankAccounts.map((account) => (
                <div key={account.id} className="flex items-center gap-3 py-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-surface flex items-center justify-center shrink-0">
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.type}{account.institution ? ` · ${account.institution}` : ""}
                    </p>
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => archiveBankAccountMutation.mutate(account.id)}
                      disabled={archiveBankAccountMutation.isPending}
                      title="Arquivar conta"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Membros */}
      <Card className="border-neutral-border">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Membros
              </CardTitle>
              <CardDescription>
                {members?.length ?? 0} membro(s)
              </CardDescription>
            </div>
            {isOwner && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                Convidar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : members && members.length > 0 ? (
            <div className="divide-y divide-neutral-border">
              {members.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  canManage={isOwner && m.userId !== user?.id}
                  onRevoke={handleRevoke}
                  onChangeRole={(id, role) => changeRoleMutation.mutate({ memberId: id, role })}
                  isRevoking={revokingId === m.id && revokeMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum membro ainda.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Zona de Perigo */}
      {isOwner && (
        <Card className="border-destructive/40 mt-6">
          <CardHeader>
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Zona de Perigo
            </CardTitle>
            <CardDescription>
              Ações irreversíveis. Proceda com cuidado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Excluir esta carteira</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Remove permanentemente todas as transações, cartões, faturas e membros.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Excluir carteira
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diálogo excluir carteira */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setDeleteConfirmName(""); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Excluir carteira
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {canDeleteQuery.isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : canDelete?.blockers && canDelete.blockers.length > 0 ? (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 p-4 space-y-1">
                <p className="text-sm font-medium text-destructive">Não é possível excluir esta carteira</p>
                {canDelete.blockers.includes("WALLET_IS_LAST_WALLET") && (
                  <p className="text-sm text-muted-foreground">Você precisa ter ao menos uma carteira. Crie outra antes de excluir esta.</p>
                )}
              </div>
            ) : (
              <>
                {canDelete?.warnings && canDelete.warnings.length > 0 && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-3 space-y-1">
                    <p className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> Avisos
                    </p>
                    <ul className="text-sm text-amber-700 space-y-0.5 pl-1">
                      {canDelete.warnings.includes("WALLET_HAS_NONZERO_BALANCE") && (
                        <li>· O saldo não é zero (realizado: {canDelete.meta.settledBalance})</li>
                      )}
                      {canDelete.warnings.includes("WALLET_HAS_PENDING_INSTALLMENTS") && (
                        <li>· {canDelete.meta.pendingInstallmentsCount} parcela(s) pendente(s) serão perdidas</li>
                      )}
                      {canDelete.warnings.includes("WALLET_HAS_OPEN_FATURAS") && (
                        <li>· {canDelete.meta.openFaturasCount} fatura(s) em aberto serão perdidas</li>
                      )}
                      {canDelete.warnings.includes("WALLET_HAS_TRANSFERS") && (
                        <li>· {canDelete.meta.transferPairsCount} transferência(s) serão excluídas</li>
                      )}
                    </ul>
                  </div>
                )}
                <div className="space-y-1.5">
                  <p className="text-sm text-muted-foreground">
                    Digite <span className="font-semibold text-foreground">{wallet?.name}</span> para confirmar a exclusão permanente.
                  </p>
                  <Input
                    className="w-full"
                    placeholder={wallet?.name}
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    autoFocus
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setDeleteOpen(false); setDeleteConfirmName(""); }}>
              Cancelar
            </Button>
            {(!canDelete?.blockers || canDelete.blockers.length === 0) && (
              <Button
                variant="destructive"
                className="w-full sm:w-auto"
                disabled={!deleteNameMatch || deleteMutation.isPending || canDeleteQuery.isLoading}
                onClick={() => deleteMutation.mutate()}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Excluir permanentemente"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo adicionar categoria */}
      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar categoria</DialogTitle>
          </DialogHeader>
          <form onSubmit={categoryForm.handleSubmit(onAddCategory)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input className="w-full" placeholder="Alimentação, Transporte..." autoFocus {...categoryForm.register("name")} />
              {categoryForm.formState.errors.name && (
                <p className="text-xs text-destructive">{categoryForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                defaultValue="expense"
                onValueChange={(v) => categoryForm.setValue("type", v as CategoryFormValues["type"])}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="any">Qualquer (receita e despesa)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setAddCategoryOpen(false)}>Cancelar</Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={createCategory.isPending}>
                {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar categoria"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo adicionar conta bancária */}
      <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar conta bancária</DialogTitle>
          </DialogHeader>
          <form onSubmit={bankAccountForm.handleSubmit(onAddAccount)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input className="w-full" placeholder="Nubank, Bradesco..." autoFocus {...bankAccountForm.register("name")} />
              {bankAccountForm.formState.errors.name && (
                <p className="text-xs text-destructive">{bankAccountForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                defaultValue="checking"
                onValueChange={(v) => bankAccountForm.setValue("type", v as BankAccountFormValues["type"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Conta Corrente</SelectItem>
                  <SelectItem value="savings">Poupança</SelectItem>
                  <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                  <SelectItem value="investment">Investimento</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Instituição (opcional)</Label>
              <Input className="w-full" placeholder="Nubank, Itaú..." {...bankAccountForm.register("institution")} />
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setAddAccountOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={createBankAccount.isPending}>
                {createBankAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar conta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo convidar membro */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Convidar membro</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={inviteForm.handleSubmit((v) => inviteMutation.mutate(v))}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="colega@exemplo.com"
                className="w-full"
                autoFocus
                {...inviteForm.register("email")}
              />
              {inviteForm.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {inviteForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Permissão</Label>
              <Select
                defaultValue="editor"
                onValueChange={(v) =>
                  inviteForm.setValue("role", v as "editor" | "viewer")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor — pode criar transações</SelectItem>
                  <SelectItem value="viewer">Visualizador — somente leitura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setInviteOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto bg-brand-primary hover:bg-brand-primary/90"
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Enviar convite"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
