import Header from "@/app/_components/header";
import Skeleton from "@/app/_components/skeleton";

export default function Loading() {
  return (
    // min-h-screen: o rodapé fica fora da tela enquanto carrega e não pula (CLS) quando o conteúdo chega.
    <div aria-busy="true" className="min-h-screen">
      <Header />
      <p role="status" className="sr-only">Carregando…</p>
      <div className="px-page pt-5 flex flex-col gap-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="px-page mt-6">
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="mt-6 px-page">
        <Skeleton className="h-4 w-28 mb-3" />
        <Skeleton className="aspect-square w-full max-w-sm" />
      </div>
    </div>
  );
}
