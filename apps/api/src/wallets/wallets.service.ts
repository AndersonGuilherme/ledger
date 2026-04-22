import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import {
  WalletDetailDto,
  WalletListItemDto,
  WalletListResponseDto,
  ArchiveWalletResponseDto,
} from './dto/wallet-response.dto';
import {
  CanDeleteWalletResponseDto,
  DeleteWalletResponseDto,
} from './dto/can-delete-wallet-response.dto';
import {
  DashboardResponseDto,
  DashboardCategoryBreakdownItemDto,
  DashboardMonthlyTrendItemDto,
} from './dto/dashboard-response.dto';
import { IBalanceService, BALANCE_SERVICE } from './balance/balance.interface';
import { WalletMemberRole, WalletType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { DEFAULT_WALLET_CATEGORIES } from './wallets.constants';

export interface CanArchiveResult {
  allowed: boolean;
  warnings: string[];
}

@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BALANCE_SERVICE) private readonly balanceService: IBalanceService,
  ) {}

  async create(
    userId: string,
    dto: CreateWalletDto,
  ): Promise<WalletDetailDto> {
    const wallet = await this.prisma.$transaction(async (tx) => {
      const created = await tx.wallet.create({
        data: {
          ownerUserId: userId,
          name: dto.name,
          type: dto.type,
          currencyCode: dto.currencyCode ?? 'BRL',
          initialBalance: dto.initialBalance ?? 0,
          description: dto.description ?? null,
        },
      });

      await tx.walletMember.create({
        data: {
          walletId: created.id,
          userId,
          role: 'owner',
          status: 'active',
        },
      });

      await tx.category.createMany({
        data: DEFAULT_WALLET_CATEGORIES.map((cat) => ({
          walletId: created.id,
          name: cat.name,
          type: cat.type,
        })),
      });

      return created;
    });

    const balances = await this.balanceService.getBatchBalances([wallet.id]);
    const balance = balances.get(wallet.id);

    return this.toDetailDto(
      wallet,
      'owner',
      balance?.settled ?? new Decimal(0),
      balance?.projected ?? new Decimal(0),
      1,
    );
  }

  async findAll(
    userId: string,
    includeArchived: boolean,
  ): Promise<WalletListResponseDto> {
    const memberships = await this.prisma.walletMember.findMany({
      where: {
        userId,
        status: 'active',
        wallet: includeArchived ? undefined : { isArchived: false },
      },
      include: {
        wallet: {
          include: {
            _count: { select: { members: { where: { status: 'active' } } } },
          },
        },
      },
    });

    if (memberships.length === 0) {
      return { wallets: [], total: 0 };
    }

    const walletIds = memberships.map((m) => m.walletId);
    const balances = await this.balanceService.getBatchBalances(walletIds);

    const wallets: WalletListItemDto[] = memberships.map((membership) => {
      const wallet = membership.wallet;
      const balance = balances.get(wallet.id);

      return {
        id: wallet.id,
        name: wallet.name,
        type: wallet.type,
        currencyCode: wallet.currencyCode,
        isArchived: wallet.isArchived,
        role: membership.role,
        settledBalance: balance?.settled.toNumber() ?? 0,
        projectedBalance: balance?.projected.toNumber() ?? 0,
        memberCount: wallet._count.members,
        createdAt: wallet.createdAt,
      };
    });

    return { wallets, total: wallets.length };
  }

  async findOne(
    walletId: string,
    memberRole: WalletMemberRole,
  ): Promise<WalletDetailDto> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      include: {
        _count: { select: { members: { where: { status: 'active' } } } },
      },
    });

    if (!wallet) {
      throw new NotFoundException('WALLET_NOT_FOUND');
    }

    const balances = await this.balanceService.getBatchBalances([walletId]);
    const balance = balances.get(walletId);

    return this.toDetailDto(
      wallet,
      memberRole,
      balance?.settled ?? new Decimal(0),
      balance?.projected ?? new Decimal(0),
      wallet._count.members,
    );
  }

  async update(
    walletId: string,
    dto: UpdateWalletDto,
    callerRole: WalletMemberRole = 'owner',
  ): Promise<WalletDetailDto> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      include: {
        _count: { select: { members: { where: { status: 'active' } } } },
      },
    });

    if (!wallet) {
      throw new NotFoundException('WALLET_NOT_FOUND');
    }

    const updated = await this.prisma.wallet.update({
      where: { id: walletId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type }),
      },
      include: {
        _count: { select: { members: { where: { status: 'active' } } } },
      },
    });

    const balances = await this.balanceService.getBatchBalances([walletId]);
    const balance = balances.get(walletId);

    // FIX H3: use actual caller role, not hardcoded 'owner'
    return this.toDetailDto(
      updated,
      callerRole,
      balance?.settled ?? new Decimal(0),
      balance?.projected ?? new Decimal(0),
      updated._count.members,
    );
  }

  async canArchive(walletId: string): Promise<CanArchiveResult> {
    return { allowed: true, warnings: [] };
  }

  async archive(walletId: string, confirm: boolean): Promise<ArchiveWalletResponseDto> {
    if (!confirm) {
      throw new BadRequestException('ARCHIVE_CONFIRMATION_REQUIRED');
    }

    const canArchiveResult = await this.canArchive(walletId);
    if (!canArchiveResult.allowed) {
      throw new UnprocessableEntityException('WALLET_CANNOT_BE_ARCHIVED');
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('WALLET_NOT_FOUND');
    }

    // FIX M1: prevent silent timestamp overwrite on already-archived wallet
    if (wallet.isArchived) {
      throw new UnprocessableEntityException('WALLET_ALREADY_ARCHIVED');
    }

    const updated = await this.prisma.wallet.update({
      where: { id: walletId },
      data: { isArchived: true, archivedAt: new Date() },
    });

    return { id: updated.id, isArchived: updated.isArchived };
  }

  async canDelete(walletId: string): Promise<CanDeleteWalletResponseDto> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      select: { ownerUserId: true },
    });

    if (!wallet) {
      throw new NotFoundException('WALLET_NOT_FOUND');
    }

    const [ownerWalletCount, pendingInstallmentsCount, openFaturasCount, transferPairsResult, balances] =
      await Promise.all([
        this.prisma.walletMember.count({
          where: { userId: wallet.ownerUserId, role: 'owner', status: 'active' },
        }),
        this.prisma.installment.count({
          where: { walletId, status: 'pending' },
        }),
        this.prisma.fatura.count({
          where: { walletId, invoicePaymentTxId: null },
        }),
        // FIX H-6: Count distinct transferGroupId values — each transfer creates 2 rows
        // so counting rows would double the actual number of transfers.
        this.prisma.transaction.findMany({
          where: { walletId, transferGroupId: { not: null } },
          select: { transferGroupId: true },
          distinct: ['transferGroupId'],
        }),
        this.balanceService.getBatchBalances([walletId]),
      ]);

    const transferPairsCount = transferPairsResult.length;

    const balance = balances.get(walletId);
    const settledBalance = balance?.settled.toNumber() ?? 0;
    const projectedBalance = balance?.projected.toNumber() ?? 0;

    const blockers: string[] = [];
    const warnings: string[] = [];

    if (ownerWalletCount <= 1) {
      blockers.push('WALLET_IS_LAST_WALLET');
    }

    if (settledBalance !== 0) {
      warnings.push('WALLET_HAS_NONZERO_BALANCE');
    }
    if (pendingInstallmentsCount > 0) {
      warnings.push('WALLET_HAS_PENDING_INSTALLMENTS');
    }
    if (openFaturasCount > 0) {
      warnings.push('WALLET_HAS_OPEN_FATURAS');
    }
    if (transferPairsCount > 0) {
      warnings.push('WALLET_HAS_TRANSFERS');
    }

    return {
      allowed: blockers.length === 0,
      blockers,
      warnings,
      meta: {
        settledBalance,
        projectedBalance,
        pendingInstallmentsCount,
        openFaturasCount,
        transferPairsCount,
      },
    };
  }

  async deleteWallet(walletId: string, confirm: boolean): Promise<DeleteWalletResponseDto> {
    if (!confirm) {
      throw new BadRequestException('DELETE_CONFIRMATION_REQUIRED');
    }

    const result = await this.canDelete(walletId);
    if (!result.allowed) {
      throw new UnprocessableEntityException(result.blockers[0]);
    }

    await this.prisma.$transaction(async (tx) => {
      // Nullify FK cycle: Fatura → Transaction
      await tx.fatura.updateMany({
        where: { walletId },
        data: { invoicePaymentTxId: null },
      });

      await tx.installment.deleteMany({ where: { walletId } });
      await tx.creditCardPurchase.deleteMany({ where: { walletId } });
      await tx.fatura.deleteMany({ where: { walletId } });
      await tx.transaction.deleteMany({ where: { walletId } });
      await tx.creditCard.deleteMany({ where: { walletId } });
      await tx.bankAccount.deleteMany({ where: { walletId } });
      await tx.category.deleteMany({ where: { walletId } });
      await tx.walletMember.deleteMany({ where: { walletId } });
      await tx.wallet.delete({ where: { id: walletId } });
    });

    return { id: walletId, deleted: true };
  }

  async unarchive(walletId: string): Promise<ArchiveWalletResponseDto> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('WALLET_NOT_FOUND');
    }

    // FIX M2: prevent silent no-op on non-archived wallet
    if (!wallet.isArchived) {
      throw new UnprocessableEntityException('WALLET_NOT_ARCHIVED');
    }

    const updated = await this.prisma.wallet.update({
      where: { id: walletId },
      data: { isArchived: false, archivedAt: null },
    });

    return { id: updated.id, isArchived: updated.isArchived };
  }

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------

  async getDashboard(
    walletId: string,
    from?: string,
    to?: string,
  ): Promise<DashboardResponseDto> {
    // ── Resolve date range ────────────────────────────────────────────────────
    // When from/to are provided, use the custom range.
    // Otherwise fall back to the rolling 12-month window ending last month.
    let rangeFromYear: number;
    let rangeFromMonth: number; // 1-based
    let rangeToYear: number;
    let rangeToMonth: number; // 1-based

    if (from || to) {
      // Both params are required when a custom range is requested
      if (!from || !to) {
        throw new BadRequestException('Both from and to params are required when specifying a date range');
      }

      const [fy, fm] = from.split('-').map(Number);
      const [ty, tm] = to.split('-').map(Number);

      // from must be <= to
      if (fy > ty || (fy === ty && fm > tm)) {
        throw new BadRequestException('from must be less than or equal to to');
      }

      // Count months in range (inclusive)
      const monthCount = (ty - fy) * 12 + (tm - fm) + 1;
      if (monthCount > 24) {
        throw new BadRequestException('Date range cannot exceed 24 months');
      }

      rangeFromYear = fy;
      rangeFromMonth = fm;
      rangeToYear = ty;
      rangeToMonth = tm;
    } else {
      // Default: rolling 12 months ending last month
      const now = new Date();
      const currentYear = now.getUTCFullYear();
      const currentMonth = now.getUTCMonth() + 1; // 1-based
      const lastMonthDate = new Date(Date.UTC(currentYear, currentMonth - 2, 1));
      rangeToYear = lastMonthDate.getUTCFullYear();
      rangeToMonth = lastMonthDate.getUTCMonth() + 1;
      // 12 months back from last month
      const fromDate = new Date(Date.UTC(rangeToYear, rangeToMonth - 12, 1));
      rangeFromYear = fromDate.getUTCFullYear();
      rangeFromMonth = fromDate.getUTCMonth() + 1;
    }

    const rangeStart = new Date(Date.UTC(rangeFromYear, rangeFromMonth - 1, 1));
    const rangeEnd = new Date(Date.UTC(rangeToYear, rangeToMonth, 1)); // exclusive upper bound

    // ── Summary month: first month of range ──────────────────────────────────
    const summaryMonthStart = new Date(Date.UTC(rangeFromYear, rangeFromMonth - 1, 1));
    const summaryMonthEnd = new Date(Date.UTC(rangeFromYear, rangeFromMonth, 1)); // exclusive

    const [monthIncomeTxs, monthExpenseTxs] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          walletId,
          deletedAt: null,
          status: 'paid',
          sign: 1,
          type: { in: ['income', 'transfer_in', 'credit_card_refund'] },
          paidAt: { gte: summaryMonthStart, lt: summaryMonthEnd },
        },
        select: { amount: true },
      }),
      this.prisma.transaction.findMany({
        where: {
          walletId,
          deletedAt: null,
          status: { not: 'canceled' },
          sign: -1,
          type: { in: ['expense', 'invoice_payment', 'transfer_out'] },
          dueDate: { gte: summaryMonthStart, lt: summaryMonthEnd },
        },
        select: { amount: true },
      }),
    ]);

    const monthIncome = monthIncomeTxs.reduce((s, t) => s + Number(t.amount), 0);
    const monthExpenses = monthExpenseTxs.reduce((s, t) => s + Number(t.amount), 0);

    // ── Year summary: full calendar year of the from month ───────────────────
    const yearStart = new Date(Date.UTC(rangeFromYear, 0, 1));
    const yearEnd = new Date(Date.UTC(rangeFromYear + 1, 0, 1)); // exclusive

    const [yearIncomeTxs, yearExpenseTxs] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          walletId,
          deletedAt: null,
          status: 'paid',
          sign: 1,
          type: { in: ['income', 'transfer_in', 'credit_card_refund'] },
          paidAt: { gte: yearStart, lt: yearEnd },
        },
        select: { amount: true },
      }),
      this.prisma.transaction.findMany({
        where: {
          walletId,
          deletedAt: null,
          status: { not: 'canceled' },
          sign: -1,
          type: { in: ['expense', 'invoice_payment', 'transfer_out'] },
          dueDate: { gte: yearStart, lt: yearEnd },
        },
        select: { amount: true },
      }),
    ]);

    const yearIncome = yearIncomeTxs.reduce((s, t) => s + Number(t.amount), 0);
    const yearExpenses = yearExpenseTxs.reduce((s, t) => s + Number(t.amount), 0);

    // ── Category breakdown (full range, expenses only, by dueDate) ───────────
    const expenseTxs = await this.prisma.transaction.findMany({
      where: {
        walletId,
        deletedAt: null,
        status: { not: 'canceled' },
        sign: -1,
        dueDate: { gte: rangeStart, lt: rangeEnd },
        type: { in: ['expense', 'transfer_out', 'invoice_payment'] },
      },
      select: { amount: true, categoryId: true },
    });

    const catMap = new Map<string | null, { total: number; count: number }>();
    for (const tx of expenseTxs) {
      const key = tx.categoryId ?? null;
      const existing = catMap.get(key) ?? { total: 0, count: 0 };
      catMap.set(key, { total: existing.total + Number(tx.amount), count: existing.count + 1 });
    }

    const categoryIds = [...catMap.keys()].filter((k): k is string => k !== null);
    const categories = categoryIds.length > 0
      ? await this.prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : [];
    const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));

    const categoryBreakdown: DashboardCategoryBreakdownItemDto[] = [...catMap.entries()]
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: categoryId ? (categoryNameMap.get(categoryId) ?? null) : null,
        totalExpenses: data.total,
        transactionCount: data.count,
      }))
      .sort((a, b) => b.totalExpenses - a.totalExpenses)
      .slice(0, 8);

    // ── Monthly trend (all months in range, oldest → newest) ─────────────────
    const monthCount = (rangeToYear - rangeFromYear) * 12 + (rangeToMonth - rangeFromMonth) + 1;
    const trendMonths: DashboardMonthlyTrendItemDto[] = [];

    for (let i = 0; i < monthCount; i++) {
      const date = new Date(Date.UTC(rangeFromYear, rangeFromMonth - 1 + i, 1));
      const mYear = date.getUTCFullYear();
      const mMonth = date.getUTCMonth() + 1;
      const mStart = new Date(Date.UTC(mYear, mMonth - 1, 1));
      const mEnd = new Date(Date.UTC(mYear, mMonth, 1));

      const [mIncomeTxs, mExpenseTxs] = await Promise.all([
        this.prisma.transaction.findMany({
          where: {
            walletId,
            deletedAt: null,
            status: 'paid',
            sign: 1,
            type: { in: ['income', 'transfer_in', 'credit_card_refund'] },
            paidAt: { gte: mStart, lt: mEnd },
          },
          select: { amount: true },
        }),
        this.prisma.transaction.findMany({
          where: {
            walletId,
            deletedAt: null,
            status: { not: 'canceled' },
            sign: -1,
            type: { in: ['expense', 'invoice_payment', 'transfer_out'] },
            dueDate: { gte: mStart, lt: mEnd },
          },
          select: { amount: true },
        }),
      ]);

      const mIncome = mIncomeTxs.reduce((s, t) => s + Number(t.amount), 0);
      const mExpenses = mExpenseTxs.reduce((s, t) => s + Number(t.amount), 0);

      trendMonths.push({ month: mMonth, year: mYear, income: mIncome, expenses: mExpenses });
    }

    return {
      currentMonth: {
        month: rangeFromMonth,
        year: rangeFromYear,
        income: monthIncome,
        expenses: monthExpenses,
        net: monthIncome - monthExpenses,
      },
      currentYear: {
        year: rangeFromYear,
        income: yearIncome,
        expenses: yearExpenses,
        net: yearIncome - yearExpenses,
      },
      categoryBreakdown,
      monthlyTrend: trendMonths,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private toDetailDto(
    wallet: {
      id: string;
      ownerUserId: string;
      name: string;
      type: import('@prisma/client').WalletType;
      currencyCode: string;
      initialBalance: Decimal;
      description: string | null;
      isArchived: boolean;
      archivedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    role: WalletMemberRole,
    settled: Decimal,
    projected: Decimal,
    memberCount: number,
  ): WalletDetailDto {
    return {
      id: wallet.id,
      ownerUserId: wallet.ownerUserId,
      name: wallet.name,
      type: wallet.type,
      currencyCode: wallet.currencyCode,
      initialBalance: wallet.initialBalance.toNumber(),
      description: wallet.description,
      isArchived: wallet.isArchived,
      archivedAt: wallet.archivedAt,
      role,
      settledBalance: settled.toNumber(),
      projectedBalance: projected.toNumber(),
      memberCount,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}
