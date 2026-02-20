"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FakeDoor } from "@/components/FakeDoor";
import { LockedResults } from "@/components/LockedResults";
import { Paywall } from "@/components/Paywall";
import { track } from "@/lib/analytics";
import { analyzeResume, improveQuestion, submitFakeDoorLead } from "@/lib/api";
import { requestTossPayment } from "@/lib/toss";
import { AnalyzeResumeResponse, ImproveQuestionResponse } from "@/lib/types";

const PRICE = 2000;
const STORAGE_ANALYSIS = "redline.analysis";
const STORAGE_UNLOCKED = "redline.unlocked";
const STORAGE_LANG = "redline.lang";
const STORAGE_JOB_DESCRIPTION = "redline.jobDescription";
const STORAGE_RESUME_PREVIEW = "redline.resumePreview";
const STORAGE_FILE_NAME = "redline.fileName";

const EMPTY_ANALYSIS: AnalyzeResumeResponse = {
  key_risks: [],
  pressure_questions: []
};

type Lang = "ko" | "en";

function makeOrderId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `redline-${Date.now()}`;
}

function HomePageContent() {
  const [lang, setLang] = useState<Lang>("ko");
  const [jobDescription, setJobDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [resumeTextPreview, setResumeTextPreview] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeResumeResponse>(EMPTY_ANALYSIS);
  const [questionInput, setQuestionInput] = useState("");
  const [improved, setImproved] = useState<ImproveQuestionResponse | null>(null);
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [loadingImprove, setLoadingImprove] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasAnalysis = useMemo(
    () => analysis.key_risks.length > 0 || analysis.pressure_questions.length > 0,
    [analysis]
  );
  const locked = hasAnalysis && !isUnlocked;

  const ui =
    lang === "ko"
      ? {
          paymentSuccess: "잠금이 해제되었습니다",
          paymentFail: "결제가 취소/실패했습니다",
          jobDescription: "채용 공고",
          jobDescriptionPlaceholder: "채용 JD를 붙여넣어 주세요.",
          resumeFile: "이력서 파일 (PDF/TXT)",
          chooseFile: "파일 선택",
          noFile: "선택된 파일 없음",
          analyze: "분석하기",
          analyzing: "분석 중...",
          leftTitle: "왼쪽: 이력서 원문",
          rightTitle: "오른쪽: AI 검증 리포트",
          noResume: "아직 업로드된 이력서가 없습니다.",
          unlocked: "해제됨",
          risksTitle: "논리적 리스크 / 의심 주장",
          questionsTitle: "압박 면접 질문",
          noAnalysis: "아직 분석 결과가 없습니다.",
          noQuestions: "아직 질문이 없습니다.",
          quote: "인용",
          why: "분석",
          intent: "면접 의도",
          lockedMessage: "잠긴 결과입니다. 결제 후 전체를 볼 수 있습니다.",
          improverTitle: "면접 질문 개선기",
          improverDesc: "이력서 업로드 없이도 독립적으로 동작합니다.",
          improverPlaceholder: "면접 질문을 입력하세요",
          improve: "질문 개선",
          improving: "개선 중...",
          generic: "일반적 질문 여부",
          yes: "예",
          no: "아니오",
          issues: "문제점",
          noIssues: "큰 문제점이 없습니다.",
          starUpgrade: "STAR 개선",
          followTradeOff: "후속 질문 (트레이드오프)",
          followMetrics: "후속 질문 (지표)",
          followContribution: "후속 질문 (기여도)",
          pdfUploaded: "PDF 업로드 완료. 분석 시 백엔드에서 텍스트를 추출합니다.",
          loading: "로딩 중..."
        }
      : {
          paymentSuccess: "Unlocked",
          paymentFail: "Payment was canceled or failed.",
          jobDescription: "Job Description",
          jobDescriptionPlaceholder: "Paste job description.",
          resumeFile: "Resume File (PDF/TXT)",
          chooseFile: "Choose File",
          noFile: "No file selected",
          analyze: "Analyze",
          analyzing: "Analyzing...",
          leftTitle: "LEFT: Resume Raw Text",
          rightTitle: "RIGHT: AI Verification Report",
          noResume: "No resume uploaded yet.",
          unlocked: "Unlocked",
          risksTitle: "Logical Risks / Suspicious Claims",
          questionsTitle: "Pressure Interview Questions",
          noAnalysis: "No analysis result yet.",
          noQuestions: "No questions yet.",
          quote: "Quote",
          why: "Why",
          intent: "Intent",
          lockedMessage: "Locked results. Complete payment to view all.",
          improverTitle: "Interview Question Improver",
          improverDesc: "Works independently even without resume upload.",
          improverPlaceholder: "Enter interviewer question",
          improve: "Improve Question",
          improving: "Improving...",
          generic: "Generic",
          yes: "Yes",
          no: "No",
          issues: "Issues",
          noIssues: "No major issues detected.",
          starUpgrade: "STAR Upgrade",
          followTradeOff: "Follow-up (Trade-off)",
          followMetrics: "Follow-up (Metrics)",
          followContribution: "Follow-up (Contribution)",
          pdfUploaded: "PDF uploaded. Extraction runs on backend after Analyze.",
          loading: "Loading..."
        };

  useEffect(() => {
    const storedAnalysis = sessionStorage.getItem(STORAGE_ANALYSIS);
    const storedUnlocked = sessionStorage.getItem(STORAGE_UNLOCKED);
    const storedLang = sessionStorage.getItem(STORAGE_LANG);
    const storedJobDescription = sessionStorage.getItem(STORAGE_JOB_DESCRIPTION);
    const storedResumePreview = sessionStorage.getItem(STORAGE_RESUME_PREVIEW);
    const storedFileName = sessionStorage.getItem(STORAGE_FILE_NAME);

    if (storedLang === "ko" || storedLang === "en") {
      setLang(storedLang);
    }
    if (storedJobDescription) {
      setJobDescription(storedJobDescription);
    }
    if (storedResumePreview) {
      setResumeTextPreview(storedResumePreview);
    }
    if (storedFileName) {
      setSelectedFileName(storedFileName);
    }

    if (storedAnalysis) {
      try {
        setAnalysis(JSON.parse(storedAnalysis) as AnalyzeResumeResponse);
      } catch {
        sessionStorage.removeItem(STORAGE_ANALYSIS);
      }
    }
    if (storedUnlocked === "1") {
      setIsUnlocked(true);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_LANG, lang);
  }, [lang]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_JOB_DESCRIPTION, jobDescription);
  }, [jobDescription]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_RESUME_PREVIEW, resumeTextPreview);
  }, [resumeTextPreview]);

  useEffect(() => {
    if (selectedFileName) {
      sessionStorage.setItem(STORAGE_FILE_NAME, selectedFileName);
      return;
    }
    sessionStorage.removeItem(STORAGE_FILE_NAME);
  }, [selectedFileName]);

  useEffect(() => {
    if (locked) {
      track("paywall_viewed", {
        key_risks_count: analysis.key_risks.length,
        pressure_questions_count: analysis.pressure_questions.length
      });
    }
  }, [analysis.key_risks.length, analysis.pressure_questions.length, locked]);

  async function onAnalyze() {
    if (!file) {
      return;
    }

    setError(null);
    setLoadingAnalyze(true);
    setIsUnlocked(false);
    sessionStorage.setItem(STORAGE_UNLOCKED, "0");

    try {
      const formData = new FormData();
      formData.append("job_description", jobDescription);
      formData.append("language", lang);
      formData.append("file", file);

      const result = await analyzeResume(formData);
      setAnalysis(result);
      sessionStorage.setItem(STORAGE_ANALYSIS, JSON.stringify(result));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoadingAnalyze(false);
    }
  }

  async function onImprove() {
    setError(null);
    setLoadingImprove(true);

    try {
      const result = await improveQuestion({
        question: questionInput,
        job_description: jobDescription || undefined
      });
      setImproved(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoadingImprove(false);
    }
  }

  async function onPay() {
    setError(null);
    setIsPaying(true);
    track("pay_clicked", { price: PRICE });

    try {
      await requestTossPayment({
        amount: PRICE,
        orderId: makeOrderId()
      });
    } catch (e) {
      track("payment_fail_or_cancel", {
        reason: e instanceof Error ? e.message : "unknown"
      });
      setError(ui.paymentFail);
    } finally {
      setIsPaying(false);
    }
  }

  async function onFileChange(next: File | null) {
    setFile(next);
    setSelectedFileName(next?.name ?? "");
    if (!next) {
      setResumeTextPreview("");
      return;
    }
    if (next.type === "text/plain") {
      const text = await next.text();
      setResumeTextPreview(text);
      return;
    }
    setResumeTextPreview(ui.pdfUploaded);
  }

  async function onFakeDoorSubmit(email: string) {
    track("fakedoor_email_submitted", { email: email || null });
    await submitFakeDoorLead({ email: email || undefined });
  }

  const paymentNotice = searchParams.get("payment");
  const paymentFailCode = searchParams.get("code");
  const paymentFailMessage = searchParams.get("message");

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">REDLINE MVP</h1>
          <div className="flex items-center gap-2 rounded border border-slate-300 bg-white p-1 text-xs">
            <button
              type="button"
              onClick={() => setLang("ko")}
              className={`rounded px-2 py-1 ${lang === "ko" ? "bg-slate-900 text-white" : "text-slate-700"}`}
            >
              KO
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded px-2 py-1 ${lang === "en" ? "bg-slate-900 text-white" : "text-slate-700"}`}
            >
              EN
            </button>
          </div>
        </div>

        {paymentNotice === "success" && (
          <p className="rounded bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800">{ui.paymentSuccess}</p>
        )}
        {paymentNotice === "fail" && (
          <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-800">
            <p className="font-semibold">{ui.paymentFail}</p>
            {paymentFailCode && (
              <p className="mt-1">
                code: <span className="font-mono">{paymentFailCode}</span>
              </p>
            )}
            {paymentFailMessage && <p className="mt-1">{paymentFailMessage}</p>}
          </div>
        )}

        <div className="rounded-xl bg-panel p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">{ui.jobDescription}</label>
              <textarea
                className="min-h-24 rounded border border-slate-300 p-2 text-sm"
                placeholder={ui.jobDescriptionPlaceholder}
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">{ui.resumeFile}</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                className="hidden"
                onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              />
              <div className="flex items-center gap-2 rounded border border-slate-300 p-2 text-sm">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded border border-slate-400 bg-white px-2 py-1"
                >
                  {ui.chooseFile}
                </button>
                <span className="truncate text-slate-700">{selectedFileName || ui.noFile}</span>
              </div>
              <button
                type="button"
                onClick={onAnalyze}
                disabled={loadingAnalyze || !file || !jobDescription.trim()}
                className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loadingAnalyze ? ui.analyzing : ui.analyze}
              </button>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl bg-panel p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">{ui.leftTitle}</h2>
            <pre className="max-h-[650px] overflow-auto whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              {resumeTextPreview || ui.noResume}
            </pre>
          </section>

          <section className="rounded-xl bg-panel p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-lg font-semibold">{ui.rightTitle}</h2>
              {isUnlocked && <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{ui.unlocked}</span>}
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-danger">{ui.risksTitle}</h3>
                <LockedResults
                  items={analysis.key_risks}
                  locked={locked}
                  lockedMessage={ui.lockedMessage}
                  emptyMessage={ui.noAnalysis}
                  renderItem={(risk, index) => (
                    <div key={`${risk.type}-${index}`} className="rounded border border-slate-200 p-2 text-sm">
                      <p className="font-semibold">{risk.type}</p>
                      <p className="text-slate-700">{ui.quote}: {risk.quote}</p>
                      <p className="text-slate-700">{ui.why}: {risk.analysis}</p>
                      <p className="text-slate-700">{ui.intent}: {risk.interviewer_intent}</p>
                    </div>
                  )}
                />
              </div>

              <div>
                <h3 className="font-semibold text-danger">{ui.questionsTitle}</h3>
                <LockedResults
                  items={analysis.pressure_questions}
                  locked={locked}
                  lockedMessage={ui.lockedMessage}
                  emptyMessage={ui.noQuestions}
                  renderItem={(item, index) => (
                    <div key={`${item.question}-${index}`} className="rounded border border-slate-200 p-2 text-sm">
                      {item.question} ({item.goal})
                    </div>
                  )}
                />
              </div>

              <Paywall price={PRICE} locked={locked} onPay={onPay} isPaying={isPaying} lang={lang} />

              {isUnlocked && (
                <FakeDoor
                  lang={lang}
                  onClickBeta={() => track("fakedoor_clicked")}
                  onSubmitEmail={onFakeDoorSubmit}
                />
              )}

              <div className="rounded border border-blue-200 bg-blue-50 p-3">
                <h3 className="font-semibold text-blue-900">{ui.improverTitle}</h3>
                <p className="mt-1 text-xs text-blue-900/80">{ui.improverDesc}</p>
                <textarea
                  className="mt-2 min-h-20 w-full rounded border border-slate-300 p-2 text-sm"
                  placeholder={ui.improverPlaceholder}
                  value={questionInput}
                  onChange={(event) => setQuestionInput(event.target.value)}
                />
                <button
                  type="button"
                  onClick={onImprove}
                  disabled={loadingImprove || questionInput.trim().length === 0}
                  className="mt-2 rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {loadingImprove ? ui.improving : ui.improve}
                </button>

                {improved && (
                  <div className="mt-3 space-y-2 text-sm">
                    <p>
                      {ui.generic}: <span className="font-semibold">{improved.is_generic ? ui.yes : ui.no}</span>
                    </p>
                    <div>
                      <p className="font-semibold">{ui.issues}</p>
                      {improved.issues.length === 0 ? (
                        <p className="text-slate-700">{ui.noIssues}</p>
                      ) : (
                        <ul className="list-disc pl-5 text-slate-700">
                          {improved.issues.map((issue, idx) => (
                            <li key={`${issue}-${idx}`}>{issue}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <p>
                      <span className="font-semibold">{ui.starUpgrade}:</span> {improved.improved_question}
                    </p>
                    <p>
                      <span className="font-semibold">{ui.followTradeOff}:</span> {improved.follow_ups.trade_off}
                    </p>
                    <p>
                      <span className="font-semibold">{ui.followMetrics}:</span> {improved.follow_ups.metrics}
                    </p>
                    <p>
                      <span className="font-semibold">{ui.followContribution}:</span> {improved.follow_ups.personal_contribution}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6 md:p-10">Loading...</main>}>
      <HomePageContent />
    </Suspense>
  );
}
