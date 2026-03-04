type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export default function ErrorState({
  title = "Noe gikk galt",
  message,
  onRetry,
  retryLabel = "Prøv igjen",
}: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-100">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-red-200">{message}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-4 rounded-md bg-red-200 px-4 py-2 text-sm font-medium text-red-950 hover:bg-red-100"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
