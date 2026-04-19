"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Mail, KeyRound, ArrowLeft } from "lucide-react";

import { requestOtp, verifyOtp } from "@/services/auth.service";
import { cn } from "@/lib/utils";
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

// ─── Schemas ──────────────────────────────────────────────────────────────────

const emailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

const otpSchema = z.object({
  token: z
    .string()
    .length(6, "The code must have exactly 6 characters")
    .regex(/^\d+$/, "The code must contain only numbers"),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [emailAddress, setEmailAddress] = useState("");

  // ── Step 1: Email form ──
  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const requestOtpMutation = useMutation({
    mutationFn: (email: string) => requestOtp(email),
    onSuccess: () => {
      toast.success("Code sent! Check your inbox.");
      setStep("otp");
    },
    onError: () => {
      toast.error("Could not send the code. Try again.");
    },
  });

  function handleEmailSubmit(values: EmailFormValues) {
    setEmailAddress(values.email);
    requestOtpMutation.mutate(values.email);
  }

  // ── Step 2: OTP form ──
  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { token: "" },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (token: string) => verifyOtp(emailAddress, token),
    onSuccess: () => {
      toast.success("Authenticated successfully!");
      router.push("/wallets");
    },
    onError: () => {
      toast.error("Invalid or expired code. Try again.");
      otpForm.reset();
    },
  });

  function handleOtpSubmit(values: OtpFormValues) {
    verifyOtpMutation.mutate(values.token);
  }

  function handleBack() {
    setStep("email");
    otpForm.reset();
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <Card className="shadow-lg border-neutral-border">
      <CardHeader className="space-y-1 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <span className="font-semibold text-lg text-foreground">Ledger</span>
        </div>

        {step === "email" ? (
          <>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              Enter your email to receive a login code
            </CardDescription>
          </>
        ) : (
          <>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription>
              We sent a 6-digit code to{" "}
              <span className="font-medium text-foreground">{emailAddress}</span>
            </CardDescription>
          </>
        )}
      </CardHeader>

      <CardContent>
        {step === "email" ? (
          <form
            onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  className={cn(
                    "pl-10",
                    emailForm.formState.errors.email && "border-destructive"
                  )}
                  {...emailForm.register("email")}
                />
              </div>
              {emailForm.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {emailForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-brand-primary hover:bg-brand-primary/90"
              disabled={requestOtpMutation.isPending}
            >
              {requestOtpMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                "Send code"
              )}
            </Button>
          </form>
        ) : (
          <form
            onSubmit={otpForm.handleSubmit(handleOtpSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="token">Login code</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="token"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                  inputMode="numeric"
                  className={cn(
                    "pl-10 text-center tracking-widest text-lg font-mono",
                    otpForm.formState.errors.token && "border-destructive"
                  )}
                  {...otpForm.register("token")}
                />
              </div>
              {otpForm.formState.errors.token && (
                <p className="text-sm text-destructive">
                  {otpForm.formState.errors.token.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-brand-primary hover:bg-brand-primary/90"
              disabled={verifyOtpMutation.isPending}
            >
              {verifyOtpMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Sign in"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleBack}
              disabled={verifyOtpMutation.isPending}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Change email
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Didn&apos;t receive the code?{" "}
              <button
                type="button"
                className="text-brand-primary hover:underline font-medium"
                onClick={() => requestOtpMutation.mutate(emailAddress)}
                disabled={requestOtpMutation.isPending}
              >
                Resend
              </button>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
