import Header from "./header";
import Skeleton from "./skeleton";

// Carregando /bookings e /adm: mesmo formato da lista de agendamentos.
const BookingsSkeleton = () => {
  return (
    <>
      <Header />
      {/* min-h-screen: o rodapé fica fora da tela enquanto carrega e não pula (CLS) quando a lista chega. */}
      <div className="px-page py-6 min-h-screen" aria-busy="true">
        <p role="status" className="sr-only">Carregando agendamentos…</p>
        <Skeleton className="h-6 w-48 mb-6" />
        <Skeleton className="h-4 w-28 mb-3" />
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-[116px] w-full" />
          ))}
        </div>
      </div>
    </>
  );
};

export default BookingsSkeleton;
