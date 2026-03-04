"use client";

import ErrorState from "@/components/ErrorState";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  console.error("[RuntimeError]", error);

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto w-full max-w-xl">
        <ErrorState
          title="Noe gikk galt"
          message="Appen traff en kjøretidsfeil. Prøv å laste inn siden på nytt."
          onRetry={reset}
          retryLabel="Prøv igjen"
        />
      </div>
    </main>
  );
}
