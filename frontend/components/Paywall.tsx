type PaywallProps = {
  price?: number;
  locked: boolean;
  onPay: () => void;
  isPaying?: boolean;
};

export function Paywall({ price = 2000, locked, onPay, isPaying = false }: PaywallProps) {
  if (!locked) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">Full Verification Locked 🔒</p>
      <button
        type="button"
        onClick={onPay}
        disabled={isPaying}
        className="mt-2 rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPaying ? "결제 진행 중..." : `${price.toLocaleString()} 결제하고 전체 보기`}
      </button>
    </div>
  );
}
