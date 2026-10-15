// Rate limit simples em memória (janela deslizante).
// Na Vercel cada instância tem seu próprio Map: serve para travar cliques
// repetidos e abuso leve, não é um limite global.

export const RATE_LIMIT_MESSAGE = "Muitas tentativas seguidas. Aguarde 1 minuto.";

const hits = new Map<string, number[]>();

export const checkRateLimit = (
  key: string,
  limit = 10,
  windowMs = 60_000,
  now = Date.now(),
): boolean => {
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);
  return true;
};

export const resetRateLimit = () => {
  hits.clear();
};
