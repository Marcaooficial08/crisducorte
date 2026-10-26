// ✓ do cartão "Reservado!" (Prompt 21): círculo roxo que pulsa uma vez (anel que se
// expande e some) e o traço do ✓ desenhado. Com "reduzir movimento", o ✓ aparece pronto e o anel não aparece.
const SuccessCheck = () => (
  <span
    data-testid="success-check"
    aria-hidden="true"
    className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
  >
    <span className="absolute inset-0 rounded-full bg-primary opacity-0 motion-safe:animate-ring-pulse" />
    <svg viewBox="0 0 24 24" className="relative h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      {/* pathLength=1: o traço inteiro mede 1, e o keyframe check-draw vai de 1 a 0. */}
      <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} strokeDasharray={1} className="motion-safe:animate-check-draw" />
    </svg>
  </span>
);

export default SuccessCheck;
