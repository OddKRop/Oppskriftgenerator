type EmptyStateProps = {
  title?: string;
  description: string;
  ctaLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({
  title = "Ingenting her ennå",
  description,
  ctaLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-4">
      <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
      <p className="mt-1 text-sm text-zinc-400">{description}</p>
      {ctaLabel && onAction ? (
        <button
          onClick={onAction}
          className="mt-4 rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-300"
        >
          {ctaLabel}
        </button>
      ) : null}
    </div>
  );
}
