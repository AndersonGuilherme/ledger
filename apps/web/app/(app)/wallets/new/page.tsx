"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

import { createWallet } from "@/services/wallets.service";
import { useWalletStore } from "@/lib/stores/wallet-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(80, "Máximo 80 caracteres"),
  type: z.enum(["personal", "home", "custom", "business", "family", "project"] as const),
});

type FormValues = z.infer<typeof schema>;

export default function NewWalletPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setActiveWallet } = useWalletStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      type: "personal",
    },
  });

  const createMutation = useMutation({
    mutationFn: createWallet,
    onSuccess: (wallet) => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      setActiveWallet(wallet.id);
      toast.success(`Carteira "${wallet.name}" criada!`);
      router.push(`/${wallet.id}`);
    },
    onError: () => {
      toast.error("Não foi possível criar a carteira. Tente novamente.");
    },
  });

  function onSubmit(values: FormValues) {
    createMutation.mutate(values);
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl w-full mx-auto">
      <Button variant="ghost" asChild className="mb-6 -ml-2 text-muted-foreground">
        <Link href="/wallets">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para carteiras
        </Link>
      </Button>

      <Card className="border-neutral-border">
        <CardHeader>
          <CardTitle>Nova carteira</CardTitle>
          <CardDescription>
            Crie uma carteira para organizar suas finanças
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Ex: Finanças pessoais"
                className="w-full"
                autoFocus
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                defaultValue="personal"
                onValueChange={(v) =>
                  form.setValue("type", v as FormValues["type"])
                }
              >
                <SelectTrigger id="type" className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Pessoal</SelectItem>
                  <SelectItem value="home">Casa</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                  <SelectItem value="business">Empresarial</SelectItem>
                  <SelectItem value="family">Família</SelectItem>
                  <SelectItem value="project">Projeto</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.type && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.type.message}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                asChild
              >
                <Link href="/wallets">Cancelar</Link>
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-brand-primary hover:bg-brand-primary/90"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar carteira"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
