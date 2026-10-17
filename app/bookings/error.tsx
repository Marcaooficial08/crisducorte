"use client";

import RouteError from "@/app/_components/route-error";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} message="Não conseguimos carregar seus agendamentos agora. Tente de novo em instantes." />;
}
