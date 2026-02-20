import { AnalyzeResumeResponse, ImproveQuestionRequest, ImproveQuestionResponse } from "@/lib/types";

const DEFAULT_PROD_API_BASE_URL = "https://redline-hbvz.onrender.com";
const ENV_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const IS_LOCALHOST_RUNTIME =
  typeof window !== "undefined" && window.location.hostname === "localhost";
const HAS_LOCALHOST_ENV =
  typeof ENV_API_BASE_URL === "string" && ENV_API_BASE_URL.includes("localhost");

const API_BASE_URL =
  ENV_API_BASE_URL && (IS_LOCALHOST_RUNTIME || !HAS_LOCALHOST_ENV)
    ? ENV_API_BASE_URL
    : IS_LOCALHOST_RUNTIME
      ? "http://localhost:8000"
      : DEFAULT_PROD_API_BASE_URL;

async function parseError(response: Response, fallbackMessage: string): Promise<never> {
  let message = fallbackMessage;
  try {
    const data = (await response.json()) as { detail?: string };
    if (data.detail) {
      message = data.detail;
    }
  } catch {
    // Keep fallback message.
  }
  throw new Error(message);
}

export async function analyzeResume(formData: FormData): Promise<AnalyzeResumeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/analyze-resume`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    await parseError(response, "Failed to analyze resume.");
  }

  return response.json();
}

export async function improveQuestion(payload: ImproveQuestionRequest): Promise<ImproveQuestionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/improve-question`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    await parseError(response, "Failed to improve question.");
  }

  return response.json();
}

export async function confirmPayment(payload: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/api/payment/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    await parseError(response, "Failed to confirm payment.");
  }

  return response.json();
}

export async function submitFakeDoorLead(payload: { email?: string }): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/api/fakedoor/lead`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    await parseError(response, "Failed to submit fake door lead.");
  }

  return response.json();
}
