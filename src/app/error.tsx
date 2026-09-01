'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <h1 className="text-xl font-extrabold text-slate-800">Une erreur est survenue</h1>
      <p className="text-sm text-slate-500">Veuillez réessayer. Si le problème persiste, contactez le support.</p>
      <button
        onClick={reset}
        className="btn btn-primary"
      >
        Réessayer
      </button>
    </div>
  );
}
