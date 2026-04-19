"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreditCard, Plus, Archive } from "lucide-react";
import { toast } from "sonner";

import { useCards, useCreateCard } from "@/lib/hooks/use-cards";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

const createCardSchema = z.object({
  name: z.string().min(1, "Name is required"),
  closingDay: z
    .number({ coerce: true })
    .int()
    .min(1, "Must be between 1 and 28")
    .max(28, "Must be between 1 and 28"),
  dueDay: z
    .number({ coerce: true })
    .int()
    .min(1, "Must be between 1 and 28")
    .max(28, "Must be between 1 and 28"),
  creditLimitReais: z
    .number({ coerce: true })
    .nonnegative("Must be zero or positive")
    .optional()
    .or(z.literal("")),
});

type CreateCardFormValues = z.infer<typeof createCardSchema>;

export default function CardsPage() {
  const params = useParams();
  const router = useRouter();
  const walletId = params?.walletId as string;

  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: cards, isLoading } = useCards(walletId);
  const createCard = useCreateCard(walletId);

  const form = useForm<CreateCardFormValues>({
    resolver: zodResolver(createCardSchema),
    defaultValues: {
      name: "",
      closingDay: 1,
      dueDay: 10,
      creditLimitReais: "",
    },
  });

  function handleOpenDialog() {
    form.reset();
    setDialogOpen(true);
  }

  async function onSubmit(values: CreateCardFormValues) {
    const creditLimitCents =
      values.creditLimitReais && values.creditLimitReais !== 0
        ? Math.round(Number(values.creditLimitReais) * 100)
        : undefined;

    try {
      await createCard.mutateAsync({
        name: values.name,
        closingDay: values.closingDay,
        dueDay: values.dueDay,
        ...(creditLimitCents !== undefined && { creditLimitCents }),
      });
      toast.success("Card created successfully");
      setDialogOpen(false);
    } catch {
      toast.error("Failed to create card");
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Credit Cards
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage your credit cards and invoices
            </p>
          </div>
        </div>
        <Button onClick={handleOpenDialog} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add card
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : !cards || cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <CreditCard className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No cards yet
          </h2>
          <p className="text-muted-foreground max-w-sm mb-6">
            Add your first credit card to start tracking purchases and faturas.
          </p>
          <Button onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add card
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() =>
                router.push(`/${walletId}/cards/${card.id}`)
              }
              className="text-left group"
            >
              <div className="relative rounded-2xl p-6 bg-gradient-to-br from-slate-800 to-slate-900 shadow-md hover:shadow-xl transition-shadow cursor-pointer h-44 flex flex-col justify-between overflow-hidden">
                {card.isArchived && (
                  <div className="absolute top-3 right-3">
                    <Badge
                      variant="secondary"
                      className="bg-slate-700 text-slate-300 text-xs"
                    >
                      <Archive className="h-3 w-3 mr-1" />
                      Archived
                    </Badge>
                  </div>
                )}

                <div>
                  <p className="font-bold text-white text-lg leading-tight">
                    {card.name}
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    Closing day: {card.closingDay} | Due day: {card.dueDay}
                  </p>
                </div>

                <div>
                  {card.availableCreditCents !== null ? (
                    <p className="text-white font-semibold">
                      {formatCurrency(card.availableCreditCents)}{" "}
                      <span className="text-slate-400 text-xs font-normal">
                        available
                      </span>
                    </p>
                  ) : (
                    <p className="text-slate-400 text-sm">No credit info</p>
                  )}
                  {card.creditLimitCents !== null && (
                    <p className="text-slate-400 text-xs mt-0.5">
                      Limit: {formatCurrency(card.creditLimitCents)}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add credit card</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card name</FormLabel>
                    <FormControl>
                      <Input placeholder="Nubank, Itaú..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="closingDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Closing day</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={28}
                          placeholder="15"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due day</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={28}
                          placeholder="25"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="creditLimitReais"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit limit (R$) — optional</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="5000.00"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createCard.isPending}>
                  {createCard.isPending ? "Creating..." : "Create card"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
