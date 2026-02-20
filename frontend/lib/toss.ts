declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (
        method: string,
        params: {
          amount: number;
          orderId: string;
          orderName: string;
          successUrl: string;
          failUrl: string;
          customerName?: string;
        }
      ) => Promise<void>;
    };
  }
}

let scriptLoadingPromise: Promise<void> | null = null;

async function loadTossScript(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Toss script is only available in browser.");
  }

  if (window.TossPayments) {
    return;
  }

  if (!scriptLoadingPromise) {
    scriptLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://js.tosspayments.com/v1/payment";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Toss Payments script."));
      document.head.appendChild(script);
    });
  }

  await scriptLoadingPromise;
}

export async function requestTossPayment(args: { amount: number; orderId: string }): Promise<void> {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!clientKey) {
    throw new Error("NEXT_PUBLIC_TOSS_CLIENT_KEY is not set.");
  }

  await loadTossScript();
  if (!window.TossPayments) {
    throw new Error("TossPayments SDK not available.");
  }

  const toss = window.TossPayments(clientKey);
  await toss.requestPayment("카드", {
    amount: args.amount,
    orderId: args.orderId,
    orderName: "REDLINE Resume Verification",
    successUrl: `${appUrl}/payment/success`,
    failUrl: `${appUrl}/payment/fail`,
  });
}

export {};
