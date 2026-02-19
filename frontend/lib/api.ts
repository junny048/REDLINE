import { AnalyzeResumeResponse, ImproveQuestionRequest, ImproveQuestionResponse } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function analyzeResume(formData: FormData): Promise<AnalyzeResumeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/analyze-resume`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error("Failed to analyze resume.");
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
    throw new Error("Failed to improve question.");
  }

  return response.json();
}
