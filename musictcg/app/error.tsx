'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <h2 className="text-4xl font-black text-red-500 mb-4">¡Algo salió mal!</h2>
      <p className="text-gray-400 mb-8">{error.message || 'Ha ocurrido un error inesperado.'}</p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
