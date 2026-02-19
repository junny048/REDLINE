"use client";

import { useMemo, useState } from "react";
import { analyzeResume, improveQuestion } from "@/lib/api";
import { AnalyzeResumeResponse, ImproveQuestionResponse } from "@/lib/types";

const EMPTY_ANALYSIS: AnalyzeResumeResponse = {
  key_risks: [],
  pressure_questions: []
};

export default function HomePage() {
  const [jobDescription, setJobDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeResumeResponse>(EMPTY_ANALYSIS);
  const [questionInput, setQuestionInput] = useState("");
  const [improved, setImproved] = useState<ImproveQuestionResponse | null>(null);
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [loadingImprove, setLoadingImprove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const risks = useMemo(() => analysis.key_risks, [analysis.key_risks]);

  async function onAnalyze() {
    setError(null);
    setLoadingAnalyze(true);
    try {
      const formData = new FormData();
      if (file) {
        formData.append("file", file);
      }
      formData.append("job_description", jobDescription);
      const result = await analyzeResume(formData);
      setAnalysis(result);
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

  async function onFileChange(next: File | null) {
    setFile(next);
    if (!next) {
      setResumeText("");
      return;
    }
    if (next.type === "text/plain") {
      const text = await next.text();
      setResumeText(text);
      return;
    }
    setResumeText("PDF preview is not parsed on the client. Analyze will use backend extraction.");
  }

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <h1 className="text-2xl font-bold">REDLINE MVP Skeleton</h1>
        <div className="rounded-xl bg-panel p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">JD</label>
              <textarea
                className="min-h-24 rounded border border-slate-300 p-2 text-sm"
                placeholder="직무 설명을 붙여넣으세요."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Resume (PDF/TXT)</label>
              <input
                type="file"
                accept=".pdf,.txt"
                className="rounded border border-slate-300 p-2 text-sm"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={onAnalyze}
                disabled={loadingAnalyze}
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
              {resumeText || "No resume uploaded yet."}
            </pre>
          </section>

          <section className="rounded-xl bg-panel p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">RIGHT: AI Verification Report</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-danger">Logical Risks / Suspicious Claims</h3>
                {risks.length === 0 ? (
                  <p className="text-sm text-slate-500">No analysis result yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {risks.map((risk, index) => (
                      <li key={`${risk.type}-${index}`} className="rounded border border-slate-200 p-2 text-sm">
                        <p className="font-semibold">{risk.type}</p>
                        <p className="text-slate-700">Quote: {risk.quote}</p>
                        <p className="text-slate-700">Why: {risk.analysis}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-danger">Pressure Interview Questions (Top 5)</h3>
                {analysis.pressure_questions.length === 0 ? (
                  <p className="text-sm text-slate-500">No questions yet.</p>
                ) : (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {analysis.pressure_questions.map((item, index) => (
                      <li key={`${item.question}-${index}`}>
                        {item.question} ({item.goal})
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded border border-blue-200 bg-blue-50 p-3">
                <h3 className="font-semibold text-blue-900">Interview Question Improver</h3>
                <textarea
                  className="mt-2 min-h-20 w-full rounded border border-slate-300 p-2 text-sm"
                  placeholder="면접관 질문 입력"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={onImprove}
                  disabled={loadingImprove}
                  className="mt-2 rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {loadingImprove ? "Improving..." : "Improve Question"}
                </button>
                {improved && (
                  <div className="mt-3 space-y-1 text-sm">
                    <p>Generic: {improved.is_generic ? "Yes" : "No"}</p>
                    <p>Improved: {improved.improved_question}</p>
                    <p>Trade-off: {improved.follow_ups.trade_off}</p>
                    <p>Metrics: {improved.follow_ups.metrics}</p>
                    <p>Personal Contribution: {improved.follow_ups.personal_contribution}</p>
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
