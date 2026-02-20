type PaywallProps = {
  price?: number;
  locked: boolean;
  onPay: () => void;
  isPaying?: boolean;
  lang: "ko" | "en";
};

export function Paywall({ price = 2000, locked, onPay, isPaying = false, lang }: PaywallProps) {
  if (!locked) {
    return null;
  }

  const title = lang === "ko" ? "전체 검증 결과 잠김" : "Full Verification Locked";
  const buttonText = lang === "ko" ? `${price.toLocaleString()} 결제하고 전체 보기` : `Unlock all for ${price.toLocaleString()}`;
  const payingText = lang === "ko" ? "결제 진행 중..." : "Processing payment...";

  return (
    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">{title}</p>
      <button
        type="button"
        onClick={onPay}
        disabled={isPaying}
        className="mt-2 rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPaying ? payingText : buttonText}
      </button>
    </div>
  );
}
