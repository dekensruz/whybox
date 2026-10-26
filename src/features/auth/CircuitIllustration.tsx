const WIRE = 'M60 150 V70 H140 M180 70 H260 V150 H200 M160 150 H60';
const LOOP = 'M60 150 V70 H260 V150 Z';
const ELECTRONS = [0, 1, 2, 3, 4, 5];

/** A simple circuit whose electrons are visible: the promise of Whybox in one picture. */
export function CircuitIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 210" role="img" aria-label="Circuit" className={className}>
      <defs>
        <radialGradient id="glow">
          <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <path d={WIRE} fill="none" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Electrons moving through the wire, drawn below the bulb and battery */}
      {ELECTRONS.map((index) => (
        <circle key={index} r="4" fill="var(--color-ink)">
          <animateMotion dur="6s" repeatCount="indefinite" path={LOOP} begin={`${-index}s`} />
        </circle>
      ))}

      {/* Bulb */}
      <circle cx="160" cy="70" r="44" fill="url(#glow)" />
      <circle cx="160" cy="70" r="20" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2.5" />
      <path d="M150 72 l5 -8 l5 8 l5 -8 l5 8" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Battery */}
      <line x1="170" y1="136" x2="170" y2="164" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="186" y1="143" x2="186" y2="157" stroke="var(--color-ink)" strokeWidth="5" strokeLinecap="round" />
      <path d="M160 150 H170 M186 150 H200" stroke="var(--color-ink)" strokeWidth="2.5" />

      <text x="160" y="196" textAnchor="middle" fontSize="11" fill="var(--color-subtle)" letterSpacing="0.08em">
        U = R × I
      </text>
    </svg>
  );
}
