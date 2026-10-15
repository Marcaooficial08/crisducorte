// Marca um usuário como admin (isAdmin = true) pelo e-mail.
// Uso: npm run set-admin -- email@exemplo.com
// O usuário precisa ter feito login pelo menos uma vez para existir na tabela User.
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { createInterface } from "node:readline/promises";
import { PrismaClient } from "@prisma/client";

const dbHost = (url: string): string => {
  try {
    const { hostname, port } = new URL(url);
    return port ? `${hostname}:${port}` : hostname;
  } catch {
    return "(DATABASE_URL inválida)";
  }
};

const main = async (): Promise<void> => {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    console.error("Uso: npm run set-admin -- email@exemplo.com");
    process.exitCode = 1;
    return;
  }

  if (!process.env.DATABASE_URL && existsSync(".env")) loadEnvFile(".env");
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL não definida.");
    process.exitCode = 1;
    return;
  }

  const db = new PrismaClient({ datasourceUrl: url });
  try {
    console.log(`Banco: ${dbHost(url)}`);

    const user = await db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, name: true, email: true, isAdmin: true },
    });
    if (!user) {
      console.error(`Usuário ${email} não encontrado. Faça login com essa conta uma vez e rode de novo.`);
      process.exitCode = 1;
      return;
    }

    console.log(`Usuário: ${user.name ?? "(sem nome)"} <${user.email}> · isAdmin atual: ${user.isAdmin}`);
    if (user.isAdmin) {
      console.log("Já é admin. Nada a fazer.");
      return;
    }

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`Marcar isAdmin = true em ${dbHost(url)}? (s/N) `);
    rl.close();
    if (answer.trim().toLowerCase() !== "s") {
      console.log("Cancelado. Nada foi gravado.");
      return;
    }

    await db.user.update({ where: { id: user.id }, data: { isAdmin: true } });
    console.log("Pronto: isAdmin = true.");
  } finally {
    await db.$disconnect();
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
