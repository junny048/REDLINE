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
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

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
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  const buildUrl = (path: string) => `${origin}${BASE_PATH}${path}`;

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
    successUrl: buildUrl("/payment/success"),
    failUrl: buildUrl("/payment/fail")
  });
}

export {};
