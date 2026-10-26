import { describe, expect, it } from "vitest";
import { bookingOwnersWhere } from "./next-booking";

// Reservas "do cliente" (home e /bookings): as da conta e as de mensalista pelo e-mail.
describe("bookingOwnersWhere", () => {
  it("a própria conta e mensalista ativo com o mesmo e-mail, sem diferenciar maiúsculas", () => {
    expect(bookingOwnersWhere({ id: "u1", email: "Pedro@Example.com" })).toEqual([
      { userId: "u1" },
      {
        source: "MENSALISTA",
        mensalista: { is: { email: { equals: "Pedro@Example.com", mode: "insensitive" }, status: "ATIVO" } },
      },
    ]);
  });

  it("conta sem e-mail: só as próprias", () => {
    expect(bookingOwnersWhere({ id: "u1", email: null })).toEqual([{ userId: "u1" }]);
  });
});
