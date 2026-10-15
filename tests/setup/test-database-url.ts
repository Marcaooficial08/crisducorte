// Trava de segurança: os testes de integração e e2e APAGAM dados.
// Só rodam com TEST_DATABASE_URL, nunca com o banco de produção nem com o DATABASE_URL de dev.

const PRODUCTION_HOST_MARKERS = ["supabase"];

export const resolveTestDatabaseUrl = (env: Record<string, string | undefined>): string | null => {
  const url = env.TEST_DATABASE_URL;
  if (!url) {
    return null;
  }

  const host = new URL(url).host;
  if (PRODUCTION_HOST_MARKERS.some((marker) => host.includes(marker))) {
    throw new Error(`TEST_DATABASE_URL aponta para produção (${host}). Abortado.`);
  }
  if (env.DATABASE_URL && new URL(env.DATABASE_URL).host === host) {
    throw new Error(`TEST_DATABASE_URL usa o mesmo host do DATABASE_URL (${host}). Use um banco só de testes.`);
  }
  return url;
};
