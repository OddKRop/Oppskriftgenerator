import SectionLabel from "./SectionLabel";

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

/**
 * Rød ramme på transparent, ikke fylt flate — specen tillater ingen store
 * mettede farger utenfor hero-båndet.
 */
export default function ErrorState({
  title = "Noe gikk galt",
  message,
  onRetry,
  retryLabel = "Prøv igjen",
}: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-lg border border-danger-line px-4 py-4">
      <SectionLabel className="text-danger">{title}</SectionLabel>
      <p className="mt-2 text-[15px] text-text">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3.5 rounded-lg border border-danger-line px-3.5 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-white/5"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
