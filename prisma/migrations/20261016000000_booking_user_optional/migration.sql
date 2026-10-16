-- LGPD (MEL-016): reserva passada de conta excluída fica sem usuário (userId = null).
-- Só remove a obrigatoriedade; nenhuma linha é alterada. A chave estrangeira continua igual.
ALTER TABLE "Booking" ALTER COLUMN "userId" DROP NOT NULL;
