import { Session } from "next-auth";

export type SessionUser = Session["user"];

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export const assertUser = (session: Session | null | undefined): SessionUser => {
  if (!session?.user?.id) {
    throw new AuthError("Não autenticado.");
  }
  return session.user;
};

export const assertAdmin = (session: Session | null | undefined): SessionUser => {
  const user = assertUser(session);
  if (user.isAdmin !== true) {
    throw new AuthError("Acesso restrito ao administrador.");
  }
  return user;
};
