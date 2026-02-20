"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { track } from "@/lib/analytics";

export default function PaymentFailPage() {
  const params = useSearchParams();
  const code = params.get("code");
  const message = params.get("message");

  useEffect(() => {
    track("payment_fail_or_cancel", {
      source: "fail_page",
      code: code ?? null,
      message: message ?? null
    });
  }, [code, message]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6">
      <p className="rounded bg-red-100 px-3 py-2 text-sm font-semibold text-red-800">
        Payment was canceled or failed.
      </p>
      {code && (
        <p className="text-sm text-slate-700">
          code: <span className="font-mono">{code}</span>
        </p>
      )}
      {message && <p className="text-center text-sm text-slate-700">{message}</p>}
      <Link href="/?payment=fail" className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
        Go back
      </Link>
    </main>
  );
}
