import json
import os
from io import BytesIO

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import ValidationError
from PyPDF2 import PdfReader

from .schemas import (
    AnalyzeResumeResponse,
    FollowUps,
    ImproveQuestionRequest,
    ImproveQuestionResponse,
    KeyRisk,
    PressureQuestion,
)

app = FastAPI(title="REDLINE API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def extract_text_from_upload(file: UploadFile) -> str:
    if file.content_type == "text/plain" or (file.filename or "").lower().endswith(".txt"):
        raw = file.file.read()
        return raw.decode("utf-8", errors="ignore").strip()

    if file.content_type == "application/pdf" or (file.filename or "").lower().endswith(".pdf"):
        raw = file.file.read()
        reader = PdfReader(BytesIO(raw))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages).strip()

    raise HTTPException(status_code=400, detail="Only PDF/TXT is supported.")


def generate_question_improvement(question: str, job_description: str | None) -> ImproveQuestionResponse:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set.")

    model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    client = OpenAI(api_key=api_key)

    prompt = f"""
You are REDLINE, an interview question verification engine.
Return strict JSON only. No markdown.

Task:
1) Judge whether the input question is generic/abstract.
2) If generic, explain concrete issues.
3) Rewrite it into a STAR-based, verifiable question.
4) Generate exactly 3 follow-up questions:
   - trade_off
   - metrics
   - personal_contribution

Output schema (keys must match exactly):
{{
  "is_generic": boolean,
  "issues": [string],
  "improved_question": string,
  "follow_ups": {{
    "trade_off": string,
    "metrics": string,
    "personal_contribution": string
  }}
}}

Rules:
- Keep questions concrete and evidence-oriented.
- If the original question is already specific, set is_generic=false and keep issues concise.
- improved_question must still be better than original for verification.

Job Description (optional):
{(job_description or "").strip()[:5000]}

Original Interview Question:
{question[:3000]}
""".strip()

    try:
        completion = client.chat.completions.create(
            model=model,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You produce strict JSON responses only."},
                {"role": "user", "content": prompt},
            ],
        )
        content = completion.choices[0].message.content or "{}"
        parsed = json.loads(content)
        return ImproveQuestionResponse.model_validate(parsed)
    except ValidationError as exc:
        raise HTTPException(status_code=502, detail=f"Invalid model response schema: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"OpenAI request failed: {exc}") from exc


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/analyze-resume", response_model=AnalyzeResumeResponse)
async def analyze_resume(
    job_description: str = Form(...),
    file: UploadFile | None = File(default=None),
) -> AnalyzeResumeResponse:
    resume_text = ""
    if file is not None:
        try:
            resume_text = extract_text_from_upload(file)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Extraction failed: {exc}") from exc

    quote = (
        resume_text.split(".")[0].strip()
        if resume_text
        else "No resume text provided. Placeholder risk generated from limited context."
    )

    return AnalyzeResumeResponse(
        key_risks=[
            KeyRisk(
                type="vague_claim",
                quote=quote,
                analysis="Placeholder response on hyeso branch. Real analyze logic is implemented on jun branch.",
                interviewer_intent="Ask for measurable evidence and specific personal ownership.",
            )
        ],
        pressure_questions=[
            PressureQuestion(
                question="Give one hard metric and a before/after comparison that proves this claim.",
                goal="Verify measurable impact and candidate ownership.",
            )
        ],
    )


@app.post("/api/improve-question", response_model=ImproveQuestionResponse)
async def improve_question(payload: ImproveQuestionRequest) -> ImproveQuestionResponse:
    text = payload.question.strip()
    if not text:
        raise HTTPException(status_code=400, detail="question is required.")

    jd = payload.job_description.strip() if payload.job_description else None
    return generate_question_improvement(text, jd)
