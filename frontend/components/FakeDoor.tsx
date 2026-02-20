"use client";

import { FormEvent, useState } from "react";

type FakeDoorProps = {
  onClickBeta: () => void;
  onSubmitEmail: (email: string) => Promise<void>;
};

export function FakeDoor({ onClickBeta, onSubmitEmail }: FakeDoorProps) {
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

  return (
    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm font-semibold text-blue-900">팀 기능/구독 관심 있나요? (Coming soon)</p>
      <button
        type="button"
        onClick={onClickBeta}
        className="mt-2 rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
      >
        팀용 기능 베타 신청
      </button>
      <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="이메일 (선택)"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "제출 중..." : "관심 등록"}
        </button>
      </form>
      {done && <p className="mt-2 text-xs text-blue-900">관심 등록 완료</p>}
    </div>
  );
}
