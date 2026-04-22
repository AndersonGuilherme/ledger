"use client";

import { useRouter } from "next/navigation";
import { Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InvitesPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center p-4 md:p-8 max-w-md mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center">
        <CheckCircle2 className="h-7 w-7 text-green-600" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Convites são ativados automaticamente</h2>
        <p className="text-sm text-muted-foreground">
          Quando alguém convidar você para uma carteira, o acesso é concedido automaticamente
          no momento em que você faz login. Não é necessária nenhuma aceitação manual.
        </p>
        <p className="text-sm text-muted-foreground">
          Se você foi convidado recentemente, suas novas carteiras já estão disponíveis.
        </p>
      </div>
      <Button onClick={() => router.push("/wallets")} className="gap-2 min-h-10">
        <Mail className="h-4 w-4" />
        Ir para minhas carteiras
      </Button>
    </div>
  );
}
