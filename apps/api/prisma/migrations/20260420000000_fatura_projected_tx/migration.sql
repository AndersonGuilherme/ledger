-- AddColumn: projectedTxId on faturas
-- This column stores a reference to a pending invoice_payment Transaction
-- that represents the projected (not yet paid) obligation for this fatura.
-- It is distinct from invoicePaymentTxId, which tracks the actual payment.
ALTER TABLE "faturas" ADD COLUMN "projectedTxId" TEXT;

-- Unique constraint: each fatura has at most one projected transaction
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_projectedTxId_key" UNIQUE ("projectedTxId");

-- Foreign key: projectedTxId references transactions(id)
-- ON DELETE SET NULL: if the transaction is hard-deleted (edge case), the reference is cleared
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_projectedTxId_fkey"
  FOREIGN KEY ("projectedTxId") REFERENCES "transactions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
