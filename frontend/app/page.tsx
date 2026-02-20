"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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

  const hasAnalysis = useMemo(
    () => analysis.key_risks.length > 0 || analysis.pressure_questions.length > 0,
    [analysis]
  );
  const locked = hasAnalysis && !isUnlocked;

  useEffect(() => {
    const storedAnalysis = sessionStorage.getItem(STORAGE_ANALYSIS);
    const storedUnlocked = sessionStorage.getItem(STORAGE_UNLOCKED);
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
      setError("결제가 취소/실패했습니다");
    } finally {
      setIsPaying(false);
    }
  }

  async function onFileChange(next: File | null) {
    setFile(next);
    if (!next) {
      setResumeTextPreview("");
      return;
    }
    if (next.type === "text/plain") {
      const text = await next.text();
      setResumeTextPreview(text);
      return;
    }
    setResumeTextPreview("PDF uploaded. Extraction runs on backend after Analyze.");
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
          <p className="rounded bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800">Unlocked ✅</p>
        )}
        {paymentNotice === "fail" && (
          <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-800">
            <p className="font-semibold">결제가 취소/실패했습니다</p>
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
              <label className="text-sm font-semibold">Job Description</label>
              <textarea
                className="min-h-24 rounded border border-slate-300 p-2 text-sm"
                placeholder={lang === "ko" ? "채용 JD를 붙여넣어 주세요." : "Paste job description."}
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Resume File (PDF/TXT)</label>
              <input
                type="file"
                accept=".pdf,.txt"
                className="rounded border border-slate-300 p-2 text-sm"
                onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={onAnalyze}
                disabled={loadingAnalyze || !file || !jobDescription.trim()}
                className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loadingAnalyze ? "Analyzing..." : "Analyze"}
              </button>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl bg-panel p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">LEFT: Resume Raw Text</h2>
            <pre className="max-h-[650px] overflow-auto whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              {resumeTextPreview || "No resume uploaded yet."}
            </pre>
          </section>

          <section className="rounded-xl bg-panel p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-lg font-semibold">RIGHT: AI Verification Report</h2>
              {isUnlocked && <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Unlocked</span>}
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-danger">Logical Risks / Suspicious Claims</h3>
                <LockedResults
                  items={analysis.key_risks}
                  locked={locked}
                  emptyMessage="No analysis result yet."
                  renderItem={(risk, index) => (
                    <div key={`${risk.type}-${index}`} className="rounded border border-slate-200 p-2 text-sm">
                      <p className="font-semibold">{risk.type}</p>
                      <p className="text-slate-700">Quote: {risk.quote}</p>
                      <p className="text-slate-700">Why: {risk.analysis}</p>
                      <p className="text-slate-700">Intent: {risk.interviewer_intent}</p>
                    </div>
                  )}
                />
              </div>

              <div>
                <h3 className="font-semibold text-danger">Pressure Interview Questions</h3>
                <LockedResults
                  items={analysis.pressure_questions}
                  locked={locked}
                  emptyMessage="No questions yet."
                  renderItem={(item, index) => (
                    <div key={`${item.question}-${index}`} className="rounded border border-slate-200 p-2 text-sm">
                      {item.question} ({item.goal})
                    </div>
                  )}
                />
              </div>

              <Paywall price={PRICE} locked={locked} onPay={onPay} isPaying={isPaying} />

              {isUnlocked && (
                <FakeDoor
                  onClickBeta={() => track("fakedoor_clicked")}
                  onSubmitEmail={onFakeDoorSubmit}
                />
              )}

              <div className="rounded border border-blue-200 bg-blue-50 p-3">
                <h3 className="font-semibold text-blue-900">Interview Question Improver</h3>
                <p className="mt-1 text-xs text-blue-900/80">Works independently even without resume upload.</p>
                <textarea
                  className="mt-2 min-h-20 w-full rounded border border-slate-300 p-2 text-sm"
                  placeholder="Enter interviewer question"
                  value={questionInput}
                  onChange={(event) => setQuestionInput(event.target.value)}
                />
                <button
                  type="button"
                  onClick={onImprove}
                  disabled={loadingImprove || questionInput.trim().length === 0}
                  className="mt-2 rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {loadingImprove ? "Improving..." : "Improve Question"}
                </button>

                {improved && (
                  <div className="mt-3 space-y-2 text-sm">
                    <p>
                      Generic: <span className="font-semibold">{improved.is_generic ? "Yes" : "No"}</span>
                    </p>
                    <div>
                      <p className="font-semibold">Issues</p>
                      {improved.issues.length === 0 ? (
                        <p className="text-slate-700">No major issues detected.</p>
                      ) : (
                        <ul className="list-disc pl-5 text-slate-700">
                          {improved.issues.map((issue, idx) => (
                            <li key={`${issue}-${idx}`}>{issue}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <p>
                      <span className="font-semibold">STAR Upgrade:</span> {improved.improved_question}
                    </p>
                    <p>
                      <span className="font-semibold">Follow-up (Trade-off):</span> {improved.follow_ups.trade_off}
                    </p>
                    <p>
                      <span className="font-semibold">Follow-up (Metrics):</span> {improved.follow_ups.metrics}
                    </p>
                    <p>
                      <span className="font-semibold">Follow-up (Contribution):</span> {improved.follow_ups.personal_contribution}
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
