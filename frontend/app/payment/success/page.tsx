"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { track } from "@/lib/analytics";
import { confirmPayment } from "@/lib/api";

const STORAGE_UNLOCKED = "redline.unlocked";

function normalizeError(error: unknown): { code: string; message: string } {
  if (!(error instanceof Error)) {
    return { code: "CONFIRM_FAILED", message: "Payment confirmation failed." };
  }

  const raw = error.message || "";
  try {
    const parsed = JSON.parse(raw) as { code?: string; message?: string };
    if (parsed.code || parsed.message) {
      return {
        code: parsed.code ?? "CONFIRM_FAILED",
        message: parsed.message ?? "Payment confirmation failed."
      };
    }
  } catch {
    // Fallback to plain text message.
  }

  return {
    code: "CONFIRM_FAILED",
    message: raw || "Payment confirmation failed."
  };
}

function PaymentSuccessPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("Processing payment confirmation...");

  useEffect(() => {
    async function run() {
      const paymentKey = params.get("paymentKey");
      const orderId = params.get("orderId");
      const amountRaw = params.get("amount");
      const amount = Number(amountRaw);

      if (!paymentKey || !orderId || !Number.isFinite(amount)) {
        track("payment_fail_or_cancel", { reason: "missing_query_params" });
        const next = new URLSearchParams({
          payment: "fail",
          code: "MISSING_QUERY_PARAMS",
          message: "Missing payment callback query parameters."
        });
        router.replace(`/?${next.toString()}`);
        return;
      }

      try {
        await confirmPayment({ paymentKey, orderId, amount });
        sessionStorage.setItem(STORAGE_UNLOCKED, "1");
        track("payment_success", { amount, orderId });
        setMessage("Payment completed. Unlocking results...");
        router.replace("/?payment=success");
      } catch (error) {
        const normalized = normalizeError(error);
        track("payment_fail_or_cancel", normalized);
        const next = new URLSearchParams({
          payment: "fail",
          code: normalized.code,
          message: normalized.message
        });
        router.replace(`/?${next.toString()}`);
      }
    }

    run();
  }, [params, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
      <p className="text-center text-sm text-slate-700">{message}</p>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
          <p className="text-center text-sm text-slate-700">Processing payment confirmation...</p>
        </main>
      }
    >
      <PaymentSuccessPageContent />
    </Suspense>
  );
}
