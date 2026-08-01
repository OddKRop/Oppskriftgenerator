type SectionLabelProps = {
  children: React.ReactNode;
  /** Brukes til hero-etiketter, som har luftigere sperring i designet. */
  wide?: boolean;
  className?: string;
  tone?: "faint" | "onSection" | "accent";
};

const TONE = {
  faint: "text-faint",
  onSection: "text-on-section-muted",
  accent: "text-accent-2",
} as const;

/**
 * Seksjonsetiketten designet bruker overalt: 10px, majuskler, sperret.
 * Egen komponent fordi den går igjen på hver eneste skjerm, og fordi
 * sperringen er lett å skrive feil.
 */
export default function SectionLabel({
  children,
  wide = false,
  className = "",
  tone = "faint",
}: SectionLabelProps) {
  return (
    <div
      className={`text-[10px] font-semibold uppercase ${
        wide ? "tracking-[0.16em]" : "tracking-[0.14em]"
      } ${TONE[tone]} ${className}`}
    >
      {children}
    </div>
  );
}
