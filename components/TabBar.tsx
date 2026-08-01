"use client";

import Link from "next/link";

export type Tab = "input" | "result" | "favs";

type TabBarProps = {
  active: Tab;
  /**
   * Utelates på favorittsiden, som ligger på en egen rute. Da blir «Generer»
   * og «Oppskrift» vanlige lenker hjem i stedet for visningsbytter.
   */
  onSelectInput?: () => void;
  onSelectResult?: () => void;
  /** «Oppskrift» er død til det finnes noe å vise. */
  resultEnabled?: boolean;
};

const BASE =
  "flex-1 pt-3.5 pb-4 text-center text-xs font-medium transition-colors";

function toneFor(isActive: boolean, isEnabled: boolean): string {
  if (!isEnabled) return "text-dim cursor-default";
  return isActive ? "text-accent-1" : "text-faint hover:text-accent-1";
}

export default function TabBar({
  active,
  onSelectInput,
  onSelectResult,
  resultEnabled = true,
}: TabBarProps) {
  return (
    <nav className="flex shrink-0 border-t border-line-soft bg-bg pb-[env(safe-area-inset-bottom)]">
      {onSelectInput ? (
        <button type="button" onClick={onSelectInput} className={`${BASE} ${toneFor(active === "input", true)}`}>
          Generer
        </button>
      ) : (
        <Link href="/" className={`${BASE} ${toneFor(active === "input", true)}`}>
          Generer
        </Link>
      )}

      {onSelectResult ? (
        <button
          type="button"
          onClick={resultEnabled ? onSelectResult : undefined}
          aria-disabled={!resultEnabled}
          className={`${BASE} ${toneFor(active === "result", resultEnabled)}`}
        >
          Oppskrift
        </button>
      ) : (
        <Link href="/" className={`${BASE} ${toneFor(active === "result", true)}`}>
          Oppskrift
        </Link>
      )}

      <Link href="/favorites" className={`${BASE} ${toneFor(active === "favs", true)}`}>
        Favoritter
      </Link>
    </nav>
  );
}
