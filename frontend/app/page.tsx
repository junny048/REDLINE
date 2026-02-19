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
  const [resumeTextPreview, setResumeTextPreview] = useState("");
  const [pastedResumeText, setPastedResumeText] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeResumeResponse>(EMPTY_ANALYSIS);
  const [questionInput, setQuestionInput] = useState("");
  const [improved, setImproved] = useState<ImproveQuestionResponse | null>(null);
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [loadingImprove, setLoadingImprove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const risks = useMemo(() => analysis.key_risks, [analysis.key_risks]);
  const manualMode = pastedResumeText.trim().length > 0;

  async function onAnalyze() {
    setError(null);
    setLoadingAnalyze(true);

    try {
      const formData = new FormData();
      formData.append("job_description", jobDescription);

      if (manualMode) {
        formData.append("resume_text", pastedResumeText.trim());
      } else if (file) {
        formData.append("file", file);
      }

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

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <h1 className="text-2xl font-bold">REDLINE MVP</h1>

        <div className="rounded-xl bg-panel p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Job Description</label>
              <textarea
                className="min-h-24 rounded border border-slate-300 p-2 text-sm"
                placeholder="Paste JD (optional for Question Improver, recommended for better context)."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Resume File (PDF/TXT)</label>
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

          <div className="mt-3">
            <label className="text-sm font-semibold">Fallback: Paste Resume Text</label>
            <textarea
              className="mt-1 min-h-28 w-full rounded border border-slate-300 p-2 text-sm"
              placeholder="If file extraction fails, paste text here and click Analyze again."
              value={pastedResumeText}
              onChange={(e) => setPastedResumeText(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">
              When pasted text exists, it is used instead of uploaded file.
            </p>
          </div>

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl bg-panel p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">LEFT: Resume Raw Text</h2>
            <pre className="max-h-[650px] overflow-auto whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              {manualMode
                ? pastedResumeText
                : resumeTextPreview || "No resume uploaded yet. You can also use paste fallback."}
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
                        <p className="text-slate-700">Intent: {risk.interviewer_intent}</p>
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
                <p className="mt-1 text-xs text-blue-900/80">
                  Works independently even without resume upload.
                </p>
                <textarea
                  className="mt-2 min-h-20 w-full rounded border border-slate-300 p-2 text-sm"
                  placeholder="Enter interviewer question"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
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
