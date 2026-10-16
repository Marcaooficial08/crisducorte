// Brilho roxo decorativo no canto superior direito (MEL-006). Some com reduzir movimento/transparência (globals.css).
const AmbientGlow = () => (
  <div
    aria-hidden="true"
    className="ambient-glow pointer-events-none absolute -right-32 -top-32 -z-10 h-80 w-80"
  />
);

export default AmbientGlow;
