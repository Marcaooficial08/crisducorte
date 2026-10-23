// Dica "Adicionar à tela inicial" (Prompt 20, MEL-023): qual instrução mostrar em cada aparelho e quando.
// Funções puras (testáveis); o componente lê navigator/window/localStorage e chama estas.

export type InstallPlatform = "ios" | "other";

export const INSTALL_HINT_DISMISSED_KEY = "cdc-install-hint-dismissed";
// Visitas (1 por sessão do navegador) e "já reservou": a dica nunca aparece na primeira tela da primeira visita.
export const VISITS_KEY = "cdc-visits";
export const VISIT_COUNTED_KEY = "cdc-visit-counted"; // sessionStorage
export const BOOKED_KEY = "cdc-booked";
// Disparado pelo BookingPicker depois de uma reserva com sucesso.
export const BOOKING_SUCCESS_EVENT = "cdc:booking-success";

export const MIN_VISITS = 2;

// Navegadores dentro de apps (Instagram, Facebook) não deixam adicionar à tela inicial.
const IN_APP_BROWSER = /Instagram|FBAN|FBAV|Line\//;

// iPhone/iPod, ou iPad (o iPadOS se apresenta como Mac, mas tem tela de toque).
export const installPlatform = (userAgent: string, maxTouchPoints: number): InstallPlatform => {
  if (IN_APP_BROWSER.test(userAgent)) {
    return "other";
  }
  if (/iPhone|iPad|iPod/.test(userAgent)) {
    return "ios";
  }
  if (/Macintosh/.test(userAgent) && maxTouchPoints > 1) {
    return "ios";
  }
  return "other";
};

// Já aberto como app instalado: Android/computador pelo display-mode; iPhone pelo navigator.standalone.
export const isStandalone = (displayModeStandalone: boolean, navigatorStandalone: boolean | undefined): boolean =>
  displayModeStandalone || navigatorStandalone === true;

// A partir da 2ª visita, ou depois de uma reserva com sucesso.
export const shouldOfferInstall = (visits: number, booked: boolean): boolean => booked || visits >= MIN_VISITS;

// Conta a visita uma vez por sessão do navegador (recarregar ou navegar no site não conta de novo).
// Sem armazenamento (aba anônima, bloqueado): 1 visita, sem lançar.
export const countVisit = (local: Storage | null, session: Storage | null): number => {
  try {
    const current = Number(local?.getItem(VISITS_KEY)) || 0;
    if (!local || !session || session.getItem(VISIT_COUNTED_KEY) === "1") {
      return Math.max(current, 1);
    }
    const next = current + 1;
    local.setItem(VISITS_KEY, String(next));
    session.setItem(VISIT_COUNTED_KEY, "1");
    return next;
  } catch {
    return 1;
  }
};
