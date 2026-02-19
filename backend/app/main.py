import json
import os
from io import BytesIO

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv
from pydantic import ValidationError
from PyPDF2 import PdfReader

from .schemas import (
    AnalyzeResumeResponse,
    FollowUps,
    ImproveQuestionRequest,
    ImproveQuestionResponse,
)

load_dotenv()

app = FastAPI(title="REDLINE API")

ANALYZE_SYSTEM_PROMPT = """
You are NOT an assistant.
You are a forensic hiring analyst whose job is to challenge candidates,
not to help them.

Your goal is to find logical gaps, weak causality, exaggerations,
unsupported claims, and role mismatch risks hidden inside a resume
or personal statement.

Rules:
1. Be skeptical by default.
2. Do NOT summarize unless necessary for reasoning.
3. Every criticism MUST reference an exact sentence from the text as "quote".
4. Never judge protected traits.
5. Output STRICT JSON only. No markdown. No extra text.
""".strip()

ANALYZE_USER_PROMPT_TEMPLATE = """
Job Role / JD:
{JOB_DESCRIPTION}

Candidate Statement:
{RESUME_TEXT}

Task:
Identify verification risks and generate aggressive but professional interview questions.

Output STRICT JSON in exactly this schema:
{
  "key_risks":[
    {"type":"...","quote":"...","analysis":"...","interviewer_intent":"..."}
  ],
  "pressure_questions":[
    {"question":"...","goal":"..."}
  ]
}
""".strip()

IMPROVE_SYSTEM_PROMPT = """
You are an interview question engineer.

Your job:
- detect whether a question is generic (too abstract / not verifiable)
- explain why it is weak
- rewrite it into a STAR-based, role-specific, verifiable question
- generate 3 follow-up questions:
  1) trade-off / constraints
  2) metrics / measurable impact
  3) personal contribution / ownership

Rules:
- be practical and specific
- avoid protected traits
- output STRICT JSON only (no markdown)
""".strip()

IMPROVE_USER_PROMPT_TEMPLATE = """
Role:
{ROLE}

Question:
{QUESTION}

Return STRICT JSON in this schema:
{
  "is_generic": boolean,
  "issues": string[],
  "improved_question": string,
  "followups": string[]
}

Important:
- If NOT generic, return is_generic=false and keep improved_question empty and followups empty.
- If generic, issues must have 2~4 items, followups must have exactly 3 items.
""".strip()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def extract_text_from_upload(file: UploadFile) -> str:
    filename = (file.filename or "").lower()
    is_txt = file.content_type == "text/plain" or filename.endswith(".txt")
    is_pdf = file.content_type == "application/pdf" or filename.endswith(".pdf")
    if not (is_txt or is_pdf):
        raise HTTPException(status_code=400, detail="Only PDF/TXT is supported.")

    raw = file.file.read()
    if is_txt:
        return raw.decode("utf-8", errors="ignore").strip()

    reader = PdfReader(BytesIO(raw))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages).strip()


def sanitize_json_text(raw_text: str) -> str:
    text = raw_text.strip()
    if not text.startswith("```"):
        return text

    lines = text.splitlines()
    if not lines:
        return text

    first = lines[0].strip().lower()
    if first in ("```json", "```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()


def generate_resume_analysis(job_description: str, resume_text: str) -> AnalyzeResumeResponse:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set.")

    model = os.getenv("OPENAI_MODEL", "gpt-5-mini")
    client = OpenAI(api_key=api_key)

    prompt = (
        ANALYZE_USER_PROMPT_TEMPLATE.replace("{JOB_DESCRIPTION}", job_description[:6000])
        .replace("{RESUME_TEXT}", resume_text[:12000])
        .strip()
    )

    def request_content(user_prompt: str) -> str:
        completion = client.chat.completions.create(
            model=model,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": ANALYZE_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
        return completion.choices[0].message.content or "{}"

    try:
        primary_content = request_content(prompt)
        primary_clean = sanitize_json_text(primary_content)
        parsed = json.loads(primary_clean)
        return AnalyzeResumeResponse.model_validate(parsed)
    except json.JSONDecodeError:
        retry_prompt = f"{prompt}\n\nJSON ONLY, no markdown, no extra text."
        try:
            retry_content = request_content(retry_prompt)
            retry_clean = sanitize_json_text(retry_content)
            retry_parsed = json.loads(retry_clean)
            return AnalyzeResumeResponse.model_validate(retry_parsed)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"JSON parsing retry failed: {exc}") from exc
    except ValidationError as exc:
        raise HTTPException(status_code=500, detail=f"Invalid model response schema: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OpenAI request failed: {exc}") from exc


def generate_question_improvement(question: str, job_description: str | None) -> ImproveQuestionResponse:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set.")

    model = os.getenv("OPENAI_MODEL", "gpt-5-mini")
    client = OpenAI(api_key=api_key)

    role_text = (job_description or "").strip()[:5000] or "N/A"
    prompt = (
        IMPROVE_USER_PROMPT_TEMPLATE.replace("{ROLE}", role_text)
        .replace("{QUESTION}", question[:3000])
        .strip()
    )

    def request_content(user_prompt: str) -> str:
        completion = client.chat.completions.create(
            model=model,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": IMPROVE_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
        return completion.choices[0].message.content or "{}"

    def normalize_response(parsed: dict) -> ImproveQuestionResponse:
        is_generic = bool(parsed.get("is_generic", False))
        issues = parsed.get("issues") if isinstance(parsed.get("issues"), list) else []
        issues = [str(item) for item in issues]

        improved_question = str(parsed.get("improved_question", ""))
        if not is_generic:
            improved_question = ""

        followups = parsed.get("followups") if isinstance(parsed.get("followups"), list) else []
        followups = [str(item) for item in followups]
        if len(followups) < 3:
            followups = followups + [""] * (3 - len(followups))
        elif len(followups) > 3:
            followups = followups[:3]

        if not is_generic:
            followups = ["", "", ""]

        normalized = {
            "is_generic": is_generic,
            "issues": issues,
            "improved_question": improved_question,
            "follow_ups": {
                "trade_off": followups[0],
                "metrics": followups[1],
                "personal_contribution": followups[2],
            },
        }
        return ImproveQuestionResponse.model_validate(normalized)

    try:
        primary_content = request_content(prompt)
        primary_clean = sanitize_json_text(primary_content)
        parsed = json.loads(primary_clean)
        return normalize_response(parsed)
    except json.JSONDecodeError:
        retry_prompt = f"{prompt}\n\nJSON ONLY, no markdown, no extra text."
        try:
            retry_content = request_content(retry_prompt)
            retry_clean = sanitize_json_text(retry_content)
            retry_parsed = json.loads(retry_clean)
            return normalize_response(retry_parsed)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"JSON parsing retry failed: {exc}") from exc
    except ValidationError as exc:
        raise HTTPException(status_code=500, detail=f"Invalid model response schema: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OpenAI request failed: {exc}") from exc


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/analyze-resume", response_model=AnalyzeResumeResponse)
async def analyze_resume(
    job_description: str = Form(...),
    file: UploadFile | None = File(default=None),
    resume_text: str | None = Form(default=None),
) -> AnalyzeResumeResponse:
    normalized_jd = job_description.strip()
    if not normalized_jd:
        raise HTTPException(status_code=400, detail="job_description is required.")

    manual_resume_text = (resume_text or "").strip()
    extracted_text = ""
    if file is not None and not manual_resume_text:
        try:
            extracted_text = extract_text_from_upload(file)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Extraction failed: {exc}") from exc

    final_resume_text = manual_resume_text or extracted_text
    if not final_resume_text:
        raise HTTPException(
            status_code=400,
            detail="Provide a resume file (PDF/TXT) or paste resume_text fallback.",
        )

    return generate_resume_analysis(normalized_jd, final_resume_text)


@app.post("/api/improve-question", response_model=ImproveQuestionResponse)
async def improve_question(payload: ImproveQuestionRequest) -> ImproveQuestionResponse:
    text = payload.question.strip()
    if not text:
        raise HTTPException(status_code=400, detail="question is required.")

    jd = payload.job_description.strip() if payload.job_description else None
    return generate_question_improvement(text, jd)
