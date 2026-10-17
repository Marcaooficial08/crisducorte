"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import Header from "./header";
import ErrorState from "./error-state";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  message: string;
}

// Conteúdo dos error.tsx do App Router: busca os dados de novo no servidor e remonta a página.
const RouteError = ({ error, reset, message }: RouteErrorProps) => {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const handleRetry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <>
      <Header />
      <div className="px-page py-6">
        <ErrorState message={message} onRetry={handleRetry} />
      </div>
    </>
  );
};

export default RouteError;
