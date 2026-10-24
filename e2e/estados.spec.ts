import { expect, test } from "@playwright/test";
import { FIXTURES } from "../tests/setup/fixtures";
import { E2E, testDb } from "./db";
import { atSaoPauloTime, futureWednesdayNoon, gotoLoggedIn, loginAs } from "./helpers";

const { barbershop, service, clienteA, admin } = FIXTURES;

const TIME_GRID = ["09:00", "10:30", "11:30", "12:30", "13:30", "14:30", "15:30", "16:30", "17:30", "18:30", "19:30"];

// O admin não tem reservas próprias.
test("Meus agendamentos vazio mostra o convite para agendar", async ({ page, context }) => {
  await loginAs(context, admin.sessionToken);

  await page.goto("/bookings");
  await expect(page.getByText("Você ainda não tem horários marcados.")).toBeVisible();
  await page.getByRole("link", { name: "Agendar agora" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("sábado lotado sugere a sexta", async ({ page, context }) => {
  const wednesday = futureWednesdayNoon();
  const saturday = new Date(wednesday);
  saturday.setUTCDate(saturday.getUTCDate() + 3);

  // Lota o sábado (nenhum outro teste usa esse dia).
  const db = testDb();
  try {
    await db.booking.deleteMany({ where: { barbershopId: barbershop.id, date: { in: TIME_GRID.map((time) => atSaoPauloTime(saturday, time)) } } });
    await db.booking.createMany({
      data: TIME_GRID.map((time) => ({
        userId: E2E.clienteC.id,
        serviceId: service.id,
        barbershopId: barbershop.id,
        date: atSaoPauloTime(saturday, time),
      })),
    });
  } finally {
    await db.$disconnect();
  }

  // Home: o sábado lotado mostra o aviso e oferece a sexta (relógio do servidor numa quarta futura).
  await loginAs(context, clienteA.sessionToken);
  await gotoLoggedIn(page, "/", clienteA.id);
  await page.getByRole("button", { name: new RegExp(`^Sáb ${saturday.getUTCDate()}`) }).click();
  await expect(page.getByText("Todos os horários de sábado já foram reservados.")).toBeVisible();
  await expect(page.getByText("Que tal sexta?")).toBeVisible();

  await page.getByRole("button", { name: "Ver sexta" }).click();
  await expect(page.getByRole("button", { name: "19:30", exact: true })).toBeVisible();
});
