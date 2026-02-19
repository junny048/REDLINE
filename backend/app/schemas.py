from typing import List, Literal

from pydantic import BaseModel


RiskType = Literal[
    "weak_causality",
    "vague_claim",
    "exaggeration",
    "inconsistency",
    "role_mismatch",
]


class KeyRisk(BaseModel):
    type: RiskType
    quote: str
    analysis: str
    interviewer_intent: str


class PressureQuestion(BaseModel):
    question: str
    goal: str


class AnalyzeResumeResponse(BaseModel):
    key_risks: List[KeyRisk]
    pressure_questions: List[PressureQuestion]


class ImproveQuestionRequest(BaseModel):
    question: str
    job_description: str | None = None


class FollowUps(BaseModel):
    trade_off: str
    metrics: str
    personal_contribution: str


class ImproveQuestionResponse(BaseModel):
    is_generic: bool
    issues: List[str]
    improved_question: str
    follow_ups: FollowUps
