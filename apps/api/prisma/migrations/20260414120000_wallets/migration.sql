-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('personal', 'home', 'business', 'family', 'project', 'custom');

-- CreateEnum
CREATE TYPE "WalletMemberRole" AS ENUM ('owner', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "WalletMemberStatus" AS ENUM ('invited', 'active', 'revoked');

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" "WalletType" NOT NULL DEFAULT 'personal',
    "currencyCode" VARCHAR(10) NOT NULL DEFAULT 'BRL',
    "initialBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_members" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT,
    "role" "WalletMemberRole" NOT NULL,
    "status" "WalletMemberStatus" NOT NULL DEFAULT 'invited',
    "invitedEmail" VARCHAR(255),
    "invitedByUserId" TEXT,
    "invitedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallets_ownerUserId_idx" ON "wallets"("ownerUserId");

-- CreateIndex
CREATE INDEX "wallets_isArchived_idx" ON "wallets"("isArchived");

-- CreateIndex
CREATE INDEX "wallet_members_walletId_idx" ON "wallet_members"("walletId");

-- CreateIndex
CREATE INDEX "wallet_members_userId_idx" ON "wallet_members"("userId");

-- CreateIndex
CREATE INDEX "wallet_members_status_idx" ON "wallet_members"("status");

-- CreateIndex
CREATE INDEX "wallet_members_invitedEmail_idx" ON "wallet_members"("invitedEmail");

-- CreateIndex
CREATE INDEX "wallet_members_walletId_userId_idx" ON "wallet_members"("walletId", "userId");

-- CreateIndex
CREATE INDEX "wallet_members_walletId_invitedEmail_idx" ON "wallet_members"("walletId", "invitedEmail");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_members" ADD CONSTRAINT "wallet_members_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_members" ADD CONSTRAINT "wallet_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_members" ADD CONSTRAINT "wallet_members_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PartialIndex: prevent duplicate active membership for the same user in the same wallet
CREATE UNIQUE INDEX "wallet_members_active_user_unique"
    ON "wallet_members"("walletId", "userId")
    WHERE status = 'active' AND "userId" IS NOT NULL;

-- PartialIndex: prevent duplicate pending invites for the same email in the same wallet
CREATE UNIQUE INDEX "wallet_members_pending_invite_unique"
    ON "wallet_members"("walletId", "invitedEmail")
    WHERE status = 'invited' AND "invitedEmail" IS NOT NULL;

-- CheckConstraint: state invariants
ALTER TABLE "wallet_members"
    ADD CONSTRAINT "wallet_members_state_invariant"
    CHECK (
        (status <> 'invited' OR ("invitedEmail" IS NOT NULL AND "userId" IS NULL))
        AND (status <> 'active'  OR "userId" IS NOT NULL)
        AND (status <> 'revoked' OR "revokedAt" IS NOT NULL)
    );

-- CheckConstraint: currency code format (3-10 uppercase letters)
ALTER TABLE "wallets"
    ADD CONSTRAINT "wallets_currency_code_format"
    CHECK ("currencyCode" ~ '^[A-Z]{3,10}$');
