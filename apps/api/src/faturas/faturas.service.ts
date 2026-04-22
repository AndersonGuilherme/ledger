import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PayFaturaDto } from './dto/pay-fatura.dto';
import { UpdateFaturaCategoryDto } from './dto/update-fatura-category.dto';
import {
  FaturaResponseDto,
  FaturaListResponseDto,
  FaturaPayResponseDto,
  FaturaStatus,
  FaturaInstallmentDto,
} from './dto/fatura-response.dto';
import { Prisma, PrismaClient, TransactionStatus, TransactionType } from '@prisma/client';

// ---------------------------------------------------------------------------
// Fatura status — computed at read time from stored dates (BRT, UTC-normalized)
// ---------------------------------------------------------------------------
function computeFaturaStatus(
  closingDate: Date,
  dueDate: Date,
  invoicePaymentTxId: string | null,
  todayUTC: Date,
): FaturaStatus {
  // Prisma returns @db.Date as Date objects at midnight UTC — compare as-is
  if (invoicePaymentTxId !== null) return 'paid';
  if (dueDate < todayUTC) return 'overdue';
  if (closingDate <= todayUTC) return 'closed'; // on closing day itself → closed
  return 'open';
}

function todayUTC(): Date {
  const now = new Date();
  // Normalize to midnight UTC of the BRT date
  const brtDateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  return new Date(brtDateStr + 'T00:00:00Z');
}

function isPrismaUniqueError(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code: string }).code === 'P2002'
  );
}

// ---------------------------------------------------------------------------
// Type alias for Prisma interactive transaction client.
// Prisma.$transaction(async (tx) => ...) provides a PrismaClient instance
// stripped of the top-level transaction/lifecycle methods.
// ---------------------------------------------------------------------------
type PrismaTxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// ---------------------------------------------------------------------------

@Injectable()
export class FaturasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    walletId: string,
    cardId: string,
    status?: string,
  ): Promise<FaturaListResponseDto> {
    await this.assertCardExists(walletId, cardId);

    const faturas = await this.prisma.fatura.findMany({
      where: { cardId, walletId },
      orderBy: { closingDate: 'desc' },
    });

    // Compute totals in bulk (one query for all faturas)
    const faturaIds = faturas.map((f) => f.id);
    const totals = await this.prisma.installment.groupBy({
      by: ['faturaId'],
      where: {
        faturaId: { in: faturaIds },
        status: { not: 'canceled' },
      },
      _sum: { amountCents: true },
    });
    const totalMap = new Map(totals.map((t) => [t.faturaId, t._sum.amountCents ?? 0]));

    const today = todayUTC();

    const result = faturas.map((f) => ({
      id: f.id,
      cardId: f.cardId,
      walletId: f.walletId,
      categoryId: f.categoryId,
      referenceMonth: f.referenceMonth,
      closingDate: f.closingDate,
      dueDate: f.dueDate,
      status: computeFaturaStatus(f.closingDate, f.dueDate, f.invoicePaymentTxId, today),
      totalCents: totalMap.get(f.id) ?? 0,
      paidAt: f.paidAt,
      invoicePaymentTxId: f.invoicePaymentTxId,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    // Status filter is applied in memory (status is computed at read time, not persisted)
    const filtered = status
      ? result.filter((f) => f.status === status)
      : result;

    return { faturas: filtered, total: filtered.length };
  }

  async findOne(walletId: string, cardId: string, id: string): Promise<FaturaResponseDto> {
    await this.assertCardExists(walletId, cardId);

    const fatura = await this.prisma.fatura.findFirst({
      where: { id, cardId, walletId },
      include: {
        installments: {
          where: { status: { not: 'canceled' } },
          include: {
            purchase: {
              select: { description: true, installmentCount: true, categoryId: true },
            },
          },
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!fatura) throw new NotFoundException('FATURA_NOT_FOUND');

    const totalCents = fatura.installments.reduce((sum, i) => sum + i.amountCents, 0);
    const today = todayUTC();

    const installmentDtos: FaturaInstallmentDto[] = fatura.installments.map((i) => ({
      id: i.id,
      purchaseId: i.purchaseId,
      purchaseDescription: i.purchase.description,
      installmentNumber: i.installmentNumber,
      totalInstallments: i.purchase.installmentCount,
      amountCents: i.amountCents,
      dueDate: i.dueDate,
      status: i.status,
      categoryId: i.purchase.categoryId,
    }));

    return {
      id: fatura.id,
      cardId: fatura.cardId,
      walletId: fatura.walletId,
      categoryId: fatura.categoryId,
      referenceMonth: fatura.referenceMonth,
      closingDate: fatura.closingDate,
      dueDate: fatura.dueDate,
      status: computeFaturaStatus(fatura.closingDate, fatura.dueDate, fatura.invoicePaymentTxId, today),
      totalCents,
      paidAt: fatura.paidAt,
      invoicePaymentTxId: fatura.invoicePaymentTxId,
      installments: installmentDtos,
      createdAt: fatura.createdAt,
      updatedAt: fatura.updatedAt,
    };
  }

  async pay(
    walletId: string,
    cardId: string,
    faturaId: string,
    dto: PayFaturaDto,
  ): Promise<FaturaPayResponseDto> {
    // assertCard checks the card is active (not archived) before allowing payment
    await this.assertCardActive(walletId, cardId);

    // Validate paidAt is not in the future (defense in depth — DTO validator also checks)
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    if (paidAt > new Date()) {
      throw new UnprocessableEntityException('PAID_AT_CANNOT_BE_FUTURE');
    }

    // Validate bankAccountId belongs to this wallet
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: { id: dto.bankAccountId, walletId, isArchived: false },
    });
    if (!bankAccount) {
      throw new UnprocessableEntityException('NO_BANK_ACCOUNT_FOR_PAYMENT');
    }

    let transactionId: string;

    try {
      await this.prisma.$transaction(async (tx) => {
        // Lock the fatura row — serialization point for concurrent pay() calls
        const [lockedFatura] = await tx.$queryRaw<Array<{
          id: string;
          invoicePaymentTxId: string | null;
          projectedTxId: string | null;
          closingDate: Date;
          dueDate: Date;
          categoryId: string | null;
        }>>(
          Prisma.sql`SELECT id, "invoicePaymentTxId", "projectedTxId", "closingDate", "dueDate", "categoryId" FROM faturas WHERE id = ${faturaId} AND "cardId" = ${cardId} AND "walletId" = ${walletId} FOR UPDATE`,
        );

        if (!lockedFatura) throw new NotFoundException('FATURA_NOT_FOUND');
        if (lockedFatura.invoicePaymentTxId !== null) {
          throw new UnprocessableEntityException('FATURA_ALREADY_PAID');
        }

        // Compute total inside the lock — consistent with installment state
        const agg = await tx.installment.aggregate({
          where: { faturaId, status: { not: 'canceled' } },
          _sum: { amountCents: true },
        });
        const totalCents = agg._sum.amountCents ?? 0;

        if (totalCents === 0) {
          throw new UnprocessableEntityException('FATURA_NOTHING_TO_PAY');
        }

        // Cancel the projected transaction (if any) before creating the real payment tx.
        // The real paid invoice_payment transaction replaces the projected obligation.
        if (lockedFatura.projectedTxId !== null) {
          await tx.transaction.update({
            where: { id: lockedFatura.projectedTxId },
            data: { status: TransactionStatus.canceled },
          });
          await tx.fatura.update({
            where: { id: faturaId },
            data: { projectedTxId: null },
          });
        }

        const amountDecimal = totalCents / 100;

        // Create invoice_payment transaction record atomically.
        // NOTE: Bypasses TransactionsService.create() to maintain transaction atomicity.
        // Invariants enforced here: type=invoice_payment, sign=-1, walletId matches card's wallet.
        const txRecord = await tx.transaction.create({
          data: {
            walletId,
            type: TransactionType.invoice_payment,
            status: TransactionStatus.paid,
            amount: amountDecimal,
            sign: -1,
            description: `Fatura ${lockedFatura.id}`,
            dueDate: lockedFatura.dueDate,
            paidAt,
            bankAccountId: dto.bankAccountId,
            ...(lockedFatura.categoryId !== null && { categoryId: lockedFatura.categoryId }),
          },
        });

        transactionId = txRecord.id;

        await tx.fatura.update({
          where: { id: faturaId },
          data: { invoicePaymentTxId: txRecord.id, paidAt },
        });

        await tx.installment.updateMany({
          where: { faturaId, status: 'pending' },
          data: { status: 'paid', paidAt },
        });

        // Return total for the response (captured from inside the tx)
        return totalCents;
      });
    } catch (e: unknown) {
      if (isPrismaUniqueError(e)) {
        // Concurrent payment — the unique constraint on invoicePaymentTxId caught it
        throw new UnprocessableEntityException('FATURA_ALREADY_PAID');
      }
      throw e;
    }

    // Re-fetch totalCents for the response (outside tx is fine — fatura is now locked/paid)
    const agg = await this.prisma.installment.aggregate({
      where: { faturaId, status: { not: 'canceled' } },
      _sum: { amountCents: true },
    });

    return {
      faturaId,
      transactionId: transactionId!,
      amountCents: agg._sum.amountCents ?? 0,
      bankAccountId: dto.bankAccountId,
      paidAt,
    };
  }

  // ---------------------------------------------------------------------------
  // Domain helper: upsert or cancel the projected transaction for a fatura.
  //
  // Must be called inside an active Prisma interactive transaction (tx) so that
  // the projected tx mutation is atomic with the installment mutation that triggered it.
  //
  // Rules:
  //   - If fatura is already paid (invoicePaymentTxId set) → skip (no-op)
  //   - If sum of non-canceled installments == 0 → cancel existing projected tx (if any)
  //   - If sum > 0 and projected tx exists → update amount + dueDate
  //   - If sum > 0 and no projected tx → create a new pending invoice_payment transaction
  // ---------------------------------------------------------------------------
  async upsertProjectedTransaction(faturaId: string, tx: PrismaTxClient): Promise<void> {
    // Fetch fatura with card name (for description) inside the tx context
    const fatura = await tx.fatura.findUnique({
      where: { id: faturaId },
      include: { card: { select: { name: true } } },
    });

    if (!fatura) return; // defensive: fatura should exist at call site

    // If already paid, the projected tx was already canceled in pay() — nothing to do
    if (fatura.invoicePaymentTxId !== null) return;

    // Compute current non-canceled installment total
    const agg = await tx.installment.aggregate({
      where: { faturaId, status: { not: 'canceled' } },
      _sum: { amountCents: true },
    });
    const totalCents = agg._sum.amountCents ?? 0;

    if (totalCents === 0) {
      // No obligation — cancel and unlink any existing projected transaction
      if (fatura.projectedTxId !== null) {
        await tx.transaction.update({
          where: { id: fatura.projectedTxId },
          data: { status: TransactionStatus.canceled },
        });
        await tx.fatura.update({
          where: { id: faturaId },
          data: { projectedTxId: null },
        });
      }
      return;
    }

    const amountDecimal = totalCents / 100;
    const description = `Fatura ${fatura.card.name} ${fatura.referenceMonth}`;

    if (fatura.projectedTxId !== null) {
      // Projected tx already exists — update the amount, dueDate, description, and categoryId
      await tx.transaction.update({
        where: { id: fatura.projectedTxId },
        data: {
          amount: amountDecimal,
          dueDate: fatura.dueDate,
          description,
          categoryId: fatura.categoryId ?? null,
          // Ensure status is pending in case it was previously canceled then a purchase re-added
          status: TransactionStatus.pending,
        },
      });
    } else {
      // No projected tx yet — create one and link it to the fatura
      const projectedTx = await tx.transaction.create({
        data: {
          walletId: fatura.walletId,
          type: TransactionType.invoice_payment,
          status: TransactionStatus.pending,
          amount: amountDecimal,
          sign: -1,
          description,
          dueDate: fatura.dueDate,
          ...(fatura.categoryId !== null && { categoryId: fatura.categoryId }),
        },
      });

      await tx.fatura.update({
        where: { id: faturaId },
        data: { projectedTxId: projectedTx.id },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Update the category assigned to a fatura.
  // Also propagates the change to the projected transaction and (if paid) to
  // the actual payment transaction so the dashboard breakdown stays consistent.
  // ---------------------------------------------------------------------------
  async updateCategory(
    walletId: string,
    cardId: string,
    faturaId: string,
    dto: UpdateFaturaCategoryDto,
  ): Promise<FaturaResponseDto> {
    await this.assertCardExists(walletId, cardId);

    const fatura = await this.prisma.fatura.findFirst({
      where: { id: faturaId, cardId, walletId },
    });
    if (!fatura) throw new NotFoundException('FATURA_NOT_FOUND');

    // Validate that the category (when provided) belongs to this wallet
    if (dto.categoryId !== null) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, walletId },
      });
      if (!category) throw new NotFoundException('CATEGORY_NOT_FOUND');
    }

    const categoryId = dto.categoryId ?? null;

    await this.prisma.$transaction(async (tx) => {
      // Update the fatura itself
      await tx.fatura.update({
        where: { id: faturaId },
        data: { categoryId },
      });

      // Sync the projected transaction (pending obligation)
      if (fatura.projectedTxId !== null) {
        await tx.transaction.update({
          where: { id: fatura.projectedTxId },
          data: { categoryId },
        });
      }

      // Sync the real payment transaction (already paid faturas — retroactive consistency)
      if (fatura.invoicePaymentTxId !== null) {
        await tx.transaction.update({
          where: { id: fatura.invoicePaymentTxId },
          data: { categoryId },
        });
      }
    });

    // Re-fetch fresh state to build response
    return this.findOne(walletId, cardId, faturaId);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Validates card exists in wallet (allows archived — for reads). */
  private async assertCardExists(walletId: string, cardId: string): Promise<void> {
    const card = await this.prisma.creditCard.findFirst({
      where: { id: cardId, walletId },
    });
    if (!card) throw new NotFoundException('CARD_NOT_FOUND');
  }

  /** Validates card is active (not archived — for payment). */
  private async assertCardActive(walletId: string, cardId: string): Promise<void> {
    const card = await this.prisma.creditCard.findFirst({
      where: { id: cardId, walletId, isArchived: false },
    });
    if (!card) throw new NotFoundException('CARD_NOT_FOUND');
  }
}
