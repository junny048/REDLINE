import { AnalyzeResumeResponse, ImproveQuestionRequest, ImproveQuestionResponse } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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
