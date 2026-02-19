"use client";

import { useMemo, useState } from "react";
import { analyzeResume, improveQuestion } from "@/lib/api";
import { AnalyzeResumeResponse, ImproveQuestionResponse } from "@/lib/types";

const EMPTY_ANALYSIS: AnalyzeResumeResponse = {
  key_risks: [],
  pressure_questions: []
};

type Lang = "ko" | "en";

const COPY = {
  ko: {
    title: "REDLINE MVP",
    jdLabel: "Job Description",
    jdPlaceholder: "채용 JD를 붙여넣어 주세요.",
    resumeLabel: "이력서 파일 (PDF/TXT)",
    analyze: "Analyze",
    analyzing: "분석 중...",
    leftTitle: "LEFT: 이력서 원문",
    noResume: "아직 업로드된 이력서가 없습니다.",
    pdfUploaded: "PDF 업로드 완료. 텍스트 추출은 Analyze 시 백엔드에서 수행됩니다.",
    rightTitle: "RIGHT: AI 검증 리포트",
    risksTitle: "논리 리스크 / 의심 주장",
    noAnalysis: "아직 분석 결과가 없습니다.",
    quote: "인용",
    why: "분석",
    intent: "검증 의도",
    pressureTitle: "압박 면접 질문",
    noQuestions: "아직 질문이 없습니다.",
    improverTitle: "면접 질문 개선기",
    improverHint: "자소서 업로드 없이도 단독으로 동작합니다.",
    improverPlaceholder: "면접관 질문을 입력하세요",
    improve: "질문 개선",
    improving: "개선 중...",
    generic: "Generic 여부",
    yes: "예",
    no: "아니오",
    issues: "문제점",
    noIssues: "큰 문제점이 감지되지 않았습니다.",
    star: "STAR 개선 질문",
    tradeoff: "추궁 (Trade-off)",
    metrics: "추궁 (Metrics)",
    contribution: "추궁 (Contribution)",
    langKo: "한국어",
    langEn: "English"
  },
  en: {
    title: "REDLINE MVP",
    jdLabel: "Job Description",
    jdPlaceholder: "Paste job description.",
    resumeLabel: "Resume File (PDF/TXT)",
    analyze: "Analyze",
    analyzing: "Analyzing...",
    leftTitle: "LEFT: Resume Raw Text",
    noResume: "No resume uploaded yet.",
    pdfUploaded: "PDF uploaded. Extraction runs on backend after Analyze.",
    rightTitle: "RIGHT: AI Verification Report",
    risksTitle: "Logical Risks / Suspicious Claims",
    noAnalysis: "No analysis result yet.",
    quote: "Quote",
    why: "Why",
    intent: "Intent",
    pressureTitle: "Pressure Interview Questions",
    noQuestions: "No questions yet.",
    improverTitle: "Interview Question Improver",
    improverHint: "Works independently even without resume upload.",
    improverPlaceholder: "Enter interviewer question",
    improve: "Improve Question",
    improving: "Improving...",
    generic: "Generic",
    yes: "Yes",
    no: "No",
    issues: "Issues",
    noIssues: "No major issues detected.",
    star: "STAR Upgrade",
    tradeoff: "Follow-up (Trade-off)",
    metrics: "Follow-up (Metrics)",
    contribution: "Follow-up (Contribution)",
    langKo: "Korean",
    langEn: "English"
  }
} as const;

export default function HomePage() {
  const [lang, setLang] = useState<Lang>("ko");
  const [jobDescription, setJobDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [resumeTextPreview, setResumeTextPreview] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeResumeResponse>(EMPTY_ANALYSIS);
  const [questionInput, setQuestionInput] = useState("");
  const [improved, setImproved] = useState<ImproveQuestionResponse | null>(null);
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [loadingImprove, setLoadingImprove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = COPY[lang];
  const risks = useMemo(() => analysis.key_risks, [analysis.key_risks]);

  async function onAnalyze() {
    setError(null);
    setLoadingAnalyze(true);

    try {
      const formData = new FormData();
      formData.append("job_description", jobDescription);
      formData.append("language", lang);
      if (file) {
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

    setResumeTextPreview(t.pdfUploaded);
  }

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t.title}</h1>
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

        <div className="rounded-xl bg-panel p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">{t.jdLabel}</label>
              <textarea
                className="min-h-24 rounded border border-slate-300 p-2 text-sm"
                placeholder={t.jdPlaceholder}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">{t.resumeLabel}</label>
              <input
                type="file"
                accept=".pdf,.txt"
                className="rounded border border-slate-300 p-2 text-sm"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={onAnalyze}
                disabled={loadingAnalyze || !file || !jobDescription.trim()}
                className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loadingAnalyze ? t.analyzing : t.analyze}
              </button>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl bg-panel p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">{t.leftTitle}</h2>
            <pre className="max-h-[650px] overflow-auto whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              {resumeTextPreview || t.noResume}
            </pre>
          </section>

          <section className="rounded-xl bg-panel p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">{t.rightTitle}</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-danger">{t.risksTitle}</h3>
                {risks.length === 0 ? (
                  <p className="text-sm text-slate-500">{t.noAnalysis}</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {risks.map((risk, index) => (
                      <li key={`${risk.type}-${index}`} className="rounded border border-slate-200 p-2 text-sm">
                        <p className="font-semibold">{risk.type}</p>
                        <p className="text-slate-700">{t.quote}: {risk.quote}</p>
                        <p className="text-slate-700">{t.why}: {risk.analysis}</p>
                        <p className="text-slate-700">{t.intent}: {risk.interviewer_intent}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-danger">{t.pressureTitle}</h3>
                {analysis.pressure_questions.length === 0 ? (
                  <p className="text-sm text-slate-500">{t.noQuestions}</p>
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
                <h3 className="font-semibold text-blue-900">{t.improverTitle}</h3>
                <p className="mt-1 text-xs text-blue-900/80">{t.improverHint}</p>
                <textarea
                  className="mt-2 min-h-20 w-full rounded border border-slate-300 p-2 text-sm"
                  placeholder={t.improverPlaceholder}
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={onImprove}
                  disabled={loadingImprove || questionInput.trim().length === 0}
                  className="mt-2 rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {loadingImprove ? t.improving : t.improve}
                </button>

                {improved && (
                  <div className="mt-3 space-y-2 text-sm">
                    <p>
                      {t.generic}: <span className="font-semibold">{improved.is_generic ? t.yes : t.no}</span>
                    </p>
                    <div>
                      <p className="font-semibold">{t.issues}</p>
                      {improved.issues.length === 0 ? (
                        <p className="text-slate-700">{t.noIssues}</p>
                      ) : (
                        <ul className="list-disc pl-5 text-slate-700">
                          {improved.issues.map((issue, idx) => (
                            <li key={`${issue}-${idx}`}>{issue}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <p>
                      <span className="font-semibold">{t.star}:</span> {improved.improved_question}
                    </p>
                    <p>
                      <span className="font-semibold">{t.tradeoff}:</span> {improved.follow_ups.trade_off}
                    </p>
                    <p>
                      <span className="font-semibold">{t.metrics}:</span> {improved.follow_ups.metrics}
                    </p>
                    <p>
                      <span className="font-semibold">{t.contribution}:</span> {improved.follow_ups.personal_contribution}
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
