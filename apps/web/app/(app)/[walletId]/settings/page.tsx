"use client";

import { useParams } from "next/navigation";
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
} from "lucide-react";

import { useWallet } from "@/lib/hooks/use-wallet";
import { updateWallet, listMembers, inviteMember, revokeMember } from "@/services/wallets.service";
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
import type { WalletMember } from "@/types/api";
import { useState } from "react";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const generalSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  description: z.string().max(500).optional(),
});

const inviteSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["editor", "viewer"]),
});

type GeneralFormValues = z.infer<typeof generalSchema>;
type InviteFormValues = z.infer<typeof inviteSchema>;

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

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  canRevoke,
  onRevoke,
  isRevoking,
}: {
  member: WalletMember;
  canRevoke: boolean;
  onRevoke: (id: string) => void;
  isRevoking: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
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
          {member.status}
        </Badge>
      </div>
      <Badge
        variant="outline"
        className={cn("text-xs gap-1 shrink-0", ROLE_COLORS[member.role])}
      >
        <RoleIcon role={member.role} />
        {member.role}
      </Badge>
      {canRevoke && member.role !== "owner" && (
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
  const walletId = params?.walletId as string;
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  const { data: wallet, isLoading: walletLoading } = useWallet(walletId);
  const { data: members, isLoading: membersLoading } = useQuery<WalletMember[]>({
    queryKey: ["members", walletId],
    queryFn: () => listMembers(walletId),
    enabled: !!walletId,
    staleTime: 1000 * 30,
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const isOwner = wallet?.role === "owner";

  // ── General form ──
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
      toast.success("Wallet updated.");
    },
    onError: () => toast.error("Could not update wallet."),
  });

  // ── Invite form ──
  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "editor" },
  });

  const inviteMutation = useMutation({
    mutationFn: (dto: InviteFormValues) => inviteMember(walletId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", walletId] });
      toast.success("Member invited.");
      setInviteOpen(false);
      inviteForm.reset();
    },
    onError: () => toast.error("Could not invite member."),
  });

  // ── Revoke ──
  const revokeMutation = useMutation({
    mutationFn: (memberId: string) => revokeMember(walletId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", walletId] });
      toast.success("Access revoked.");
      setRevokingId(null);
    },
    onError: () => {
      toast.error("Could not revoke access.");
      setRevokingId(null);
    },
  });

  function handleRevoke(memberId: string) {
    setRevokingId(memberId);
    revokeMutation.mutate(memberId);
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-6 w-6 text-brand-primary" />
        <div>
          {walletLoading ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <h1 className="text-2xl font-bold text-foreground">{wallet?.name}</h1>
          )}
          <p className="text-muted-foreground text-sm mt-0.5">
            Wallet settings and members
          </p>
        </div>
      </div>

      {/* General */}
      <Card className="border-neutral-border mb-6">
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
          <CardDescription>Wallet name and description</CardDescription>
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
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
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
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Optional"
                  disabled={!isOwner}
                  {...generalForm.register("description")}
                />
              </div>
              <div className="flex items-center gap-3 pt-1">
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
                      "Save"
                    )}
                  </Button>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card className="border-neutral-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Members
              </CardTitle>
              <CardDescription>
                {members?.length ?? 0} member{members?.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            {isOwner && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                Invite
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
                  canRevoke={isOwner && m.userId !== user?.id}
                  onRevoke={handleRevoke}
                  isRevoking={revokingId === m.id && revokeMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No members yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={inviteForm.handleSubmit((v) => inviteMutation.mutate(v))}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="colleague@example.com"
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
              <Label>Role</Label>
              <Select
                defaultValue="editor"
                onValueChange={(v) =>
                  inviteForm.setValue("role", v as "editor" | "viewer")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor — can create transactions</SelectItem>
                  <SelectItem value="viewer">Viewer — read only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-brand-primary hover:bg-brand-primary/90"
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Send invite"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
