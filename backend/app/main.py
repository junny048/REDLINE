from io import BytesIO

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PyPDF2 import PdfReader

from .schemas import (
    AnalyzeResumeResponse,
    ImproveQuestionRequest,
    ImproveQuestionResponse,
    FollowUps,
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
    if file.content_type == "text/plain" or file.filename.lower().endswith(".txt"):
        raw = file.file.read()
        return raw.decode("utf-8", errors="ignore").strip()

    if file.content_type == "application/pdf" or file.filename.lower().endswith(".pdf"):
        raw = file.file.read()
        reader = PdfReader(BytesIO(raw))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages).strip()

    raise HTTPException(status_code=400, detail="Only PDF/TXT is supported.")


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
        else "No resume text provided. Only JD-based provisional risk."
    )

    return AnalyzeResumeResponse(
        key_risks=[
            KeyRisk(
                type="vague_claim",
                quote=quote,
                analysis="Temporary mock response. jun branch will replace with OpenAI-based verification.",
                interviewer_intent="Ask for concrete facts, scope, and measurable outcomes.",
            )
        ],
        pressure_questions=[
            PressureQuestion(
                question="그 성과가 본인 기여라는 근거를 수치와 전후 비교로 설명해 주세요.",
                goal="개인 기여도와 검증 가능성을 확인",
            )
        ],
    )


@app.post("/api/improve-question", response_model=ImproveQuestionResponse)
async def improve_question(payload: ImproveQuestionRequest) -> ImproveQuestionResponse:
    text = payload.question.strip()
    if not text:
        raise HTTPException(status_code=400, detail="question is required.")

    return ImproveQuestionResponse(
        is_generic=True,
        issues=[
            "질문 범위가 넓어 검증 포인트가 흐려짐",
            "성과를 판단할 수 있는 측정 기준이 없음",
        ],
        improved_question=(
            "최근 6개월 내 본인이 주도한 개선 사례를 하나 선택해, "
            "상황(S), 과제(T), 행동(A), 결과(R)를 각각 수치와 함께 설명해 주세요."
        ),
        follow_ups=FollowUps(
            trade_off="당시 포기한 대안은 무엇이었고, 왜 그 선택을 했나요?",
            metrics="개선 전후 핵심 지표 2개를 수치로 제시해 주세요.",
            personal_contribution="팀 성과가 아닌 본인 단독 기여를 분리해서 설명해 주세요.",
        ),
    )
