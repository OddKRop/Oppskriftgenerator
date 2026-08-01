import SectionLabel from "./SectionLabel";

/**
 * Skjelett av oppskriftskortet framfor en spinner. Genereringen tar rundt ti
 * sekunder på den lokale modellen, og en form som ligner resultatet sier mer om
 * hva som er på vei enn et roterende hjul gjør.
 */
export default function LoadingState() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Lager oppskrift …</span>

      <div className="bg-section px-6 pt-7 pb-6">
        <SectionLabel wide tone="onSection">
          Lager forslag …
        </SectionLabel>
        <div className="mt-3 h-8 w-4/5 animate-pulse rounded bg-white/10" />
        <div className="mt-2 h-8 w-3/5 animate-pulse rounded bg-white/10" />
        <div className="mt-4 flex gap-6">
          <div className="h-9 w-16 animate-pulse rounded bg-white/10" />
          <div className="h-9 w-16 animate-pulse rounded bg-white/10" />
        </div>
      </div>

      <div className="px-6 pt-5">
        <SectionLabel>Ingredienser</SectionLabel>
        <div className="mt-2.5">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="flex items-center gap-3 border-b border-hairline py-3">
              <div className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-white/10" />
              <div
                className="h-4 animate-pulse rounded bg-white/10"
                style={{ width: `${55 - row * 6}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
