// Headers de segurança em todas as respostas (Prompt 22). CSP só com diretivas que não dependem de
// nonce: um script-src com nonce deixaria todas as páginas dinâmicas. O HSTS a Vercel já manda.
export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["date-fns-tz"],
  // Prompt 22 (D1, D2): a página da barbearia e a home antiga saíram; links antigos e o Google caem na home.
  async redirects() {
    return [
      { source: "/barbershop/:id", destination: "/", permanent: true },
      { source: "/classic", destination: "/", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
