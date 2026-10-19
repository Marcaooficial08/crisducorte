-- Fase 3 (MEL-019, MEL-025): só aditiva. Nenhuma coluna removida ou alterada, nenhum dado modificado.
-- Reservas existentes ficam com source = CLIENT pelo DEFAULT (PG 11+: sem reescrever a tabela).
-- Não toca em Booking_barbershopId_date_key nem em Booking_backup_duplicates (produção).

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('CLIENT', 'MANUAL', 'MENSALISTA');

-- CreateEnum
CREATE TYPE "MensalistaStatus" AS ENUM ('ATIVO', 'PAUSADO', 'EXCLUIDO');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "cycleId" TEXT,
ADD COLUMN     "mensalistaId" TEXT,
ADD COLUMN     "source" "BookingSource" NOT NULL DEFAULT 'CLIENT';

-- CreateTable
CREATE TABLE "BookingCancellation" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "date" TIMESTAMP NOT NULL,
    "cancelledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "byAdmin" BOOLEAN NOT NULL,
    "source" "BookingSource" NOT NULL,

    CONSTRAINT "BookingCancellation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotBlock" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensalista" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "fixedDay" INTEGER,
    "fixedTime" TEXT,
    "status" "MensalistaStatus" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mensalista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensalistaCycle" (
    "id" TEXT NOT NULL,
    "mensalistaId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "weekends" TIMESTAMP(3)[],
    "endsAt" TIMESTAMP(3) NOT NULL,
    "renewedAt" TIMESTAMP(3),

    CONSTRAINT "MensalistaCycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingCancellation_date_idx" ON "BookingCancellation"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SlotBlock_date_key" ON "SlotBlock"("date");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_mensalistaId_fkey" FOREIGN KEY ("mensalistaId") REFERENCES "Mensalista"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "MensalistaCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensalistaCycle" ADD CONSTRAINT "MensalistaCycle_mensalistaId_fkey" FOREIGN KEY ("mensalistaId") REFERENCES "Mensalista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

