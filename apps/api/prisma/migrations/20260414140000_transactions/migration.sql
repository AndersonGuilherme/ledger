-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('income', 'expense', 'transfer_in', 'transfer_out', 'credit_card_purchase', 'invoice_payment', 'credit_card_refund');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'paid', 'canceled');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('income', 'expense', 'any');

-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('checking', 'savings', 'credit_card', 'cash', 'investment', 'other');

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(7),
    "icon" VARCHAR(50),
    "type" "CategoryType" NOT NULL DEFAULT 'any',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" "BankAccountType" NOT NULL DEFAULT 'checking',
    "institution" VARCHAR(100),
    "accountNumber" VARCHAR(50),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "categoryId" TEXT,
    "bankAccountId" TEXT,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(14,2) NOT NULL,
    "sign" INTEGER NOT NULL,
    "description" VARCHAR(255),
    "notes" TEXT,
    "dueDate" DATE NOT NULL,
    "paidAt" TIMESTAMP(3),
    "transferGroupId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categories_walletId_idx" ON "categories"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_walletId_name_key" ON "categories"("walletId", "name");

-- CreateIndex
CREATE INDEX "bank_accounts_walletId_idx" ON "bank_accounts"("walletId");

-- CreateIndex
CREATE INDEX "transactions_walletId_status_idx" ON "transactions"("walletId", "status");

-- CreateIndex
CREATE INDEX "transactions_walletId_dueDate_idx" ON "transactions"("walletId", "dueDate");

-- CreateIndex
CREATE INDEX "transactions_walletId_type_idx" ON "transactions"("walletId", "type");

-- CreateIndex
CREATE INDEX "transactions_transferGroupId_idx" ON "transactions"("transferGroupId");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Raw SQL additions: generated column, CHECK constraints, partial indexes
-- ---------------------------------------------------------------------------

-- signed_amount: stored generated column
ALTER TABLE "transactions"
  ADD COLUMN "signed_amount" DECIMAL(14, 2)
  GENERATED ALWAYS AS (amount * sign) STORED;

-- amount must be positive
ALTER TABLE "transactions"
  ADD CONSTRAINT "chk_transactions_amount_positive"
  CHECK (amount > 0);

-- sign must be valid
ALTER TABLE "transactions"
  ADD CONSTRAINT "chk_transactions_sign_valid"
  CHECK (sign IN (-1, 0, 1));

-- sign must match type (business invariant)
ALTER TABLE "transactions"
  ADD CONSTRAINT "chk_transactions_sign_type_match"
  CHECK (
    (type = 'income'               AND sign = 1)  OR
    (type = 'expense'              AND sign = -1) OR
    (type = 'transfer_in'          AND sign = 1)  OR
    (type = 'transfer_out'         AND sign = -1) OR
    (type = 'credit_card_purchase' AND sign = 0)  OR
    (type = 'invoice_payment'      AND sign = -1)
  );

-- paidAt required when status = paid
ALTER TABLE "transactions"
  ADD CONSTRAINT "chk_transactions_paid_at_consistency"
  CHECK (
    (status = 'paid' AND "paidAt" IS NOT NULL) OR
    (status != 'paid')
  );

-- Transfer pair: no duplicate type in same group
CREATE UNIQUE INDEX "uq_transfer_group_type"
  ON "transactions" ("transferGroupId", type)
  WHERE "transferGroupId" IS NOT NULL AND "deletedAt" IS NULL;

-- Partial indexes for active (non-deleted) transactions
CREATE INDEX "idx_transactions_wallet_status_active"
  ON "transactions" ("walletId", status)
  WHERE "deletedAt" IS NULL;

CREATE INDEX "idx_transactions_wallet_duedate_active"
  ON "transactions" ("walletId", "dueDate")
  WHERE "deletedAt" IS NULL;
