"use client";

import { FormEvent, useState } from "react";

type FakeDoorProps = {
  onClickBeta: () => void;
  onSubmitEmail: (email: string) => Promise<void>;
  lang: "ko" | "en";
};

export function FakeDoor({ onClickBeta, onSubmitEmail, lang }: FakeDoorProps) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmitEmail(email.trim());
      setDone(true);
      setEmail("");
    } finally {
      setSubmitting(false);
    }
  }

  const text = lang === "ko"
    ? {
        title: "팀 기능/구독 관심 있나요? (Coming soon)",
        beta: "팀용 기능 베타 신청",
        emailPlaceholder: "이메일(선택)",
        submitting: "제출 중...",
        submit: "관심 등록",
        done: "관심 등록 완료"
      }
    : {
        title: "Interested in team features/subscription? (Coming soon)",
        beta: "Request Team Beta",
        emailPlaceholder: "Email (optional)",
        submitting: "Submitting...",
        submit: "Register Interest",
        done: "Interest registered"
      };

  return (
    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm font-semibold text-blue-900">{text.title}</p>
      <button
        type="button"
        onClick={onClickBeta}
        className="mt-2 rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
      >
        {text.beta}
      </button>
      <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder={text.emailPlaceholder}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? text.submitting : text.submit}
        </button>
      </form>
      {done && <p className="mt-2 text-xs text-blue-900">{text.done}</p>}
    </div>
  );
}
