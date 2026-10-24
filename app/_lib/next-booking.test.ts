import { describe, expect, it } from "vitest";
import { bookingOwnersWhere } from "./next-booking";

// Reservas "do cliente" (home e /bookings): as da conta e, com MENSALISTAS, as de mensalista pelo e-mail.
describe("bookingOwnersWhere", () => {
  it("sem a flag: só as reservas da própria conta", () => {
    expect(bookingOwnersWhere({ id: "u1", email: "pedro@example.com" }, false)).toEqual([{ userId: "u1" }]);
  });

  it("com a flag: também mensalista ativo com o mesmo e-mail, sem diferenciar maiúsculas", () => {
    expect(bookingOwnersWhere({ id: "u1", email: "Pedro@Example.com" }, true)).toEqual([
      { userId: "u1" },
      {
        source: "MENSALISTA",
        mensalista: { is: { email: { equals: "Pedro@Example.com", mode: "insensitive" }, status: "ATIVO" } },
      },
    ]);
  });

  it("conta sem e-mail: só as próprias", () => {
    expect(bookingOwnersWhere({ id: "u1", email: null }, true)).toEqual([{ userId: "u1" }]);
  });
});
