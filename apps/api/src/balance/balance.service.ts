import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IBalanceService, WalletBalance } from '../wallets/balance/balance.interface';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';

interface BalanceRow {
  wallet_id: string;
  initial_balance: string;
  settled_sum: string | null;
  projected_sum: string | null;
}

@Injectable()
export class BalanceService implements IBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getBatchBalances(
    walletIds: string[],
  ): Promise<Map<string, WalletBalance>> {
    if (walletIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.$queryRaw<BalanceRow[]>(Prisma.sql`
      SELECT
        w.id                                                        AS wallet_id,
        w."initialBalance"::text                                    AS initial_balance,
        SUM(
          CASE WHEN t.status = 'paid'
               THEN t.signed_amount
          END
        )::text                                                     AS settled_sum,
        SUM(
          CASE WHEN t.status IN ('paid', 'pending')
               THEN t.signed_amount
          END
        )::text                                                     AS projected_sum
      FROM wallets w
      LEFT JOIN transactions t
        ON t."walletId" = w.id
       AND t.deleted_at IS NULL
      WHERE w.id = ANY(${walletIds}::uuid[])
      GROUP BY w.id, w."initialBalance"
    `);

    const result = new Map<string, WalletBalance>();

    for (const row of rows) {
      const initial = new Decimal(row.initial_balance);
      const settled = initial.plus(row.settled_sum != null ? new Decimal(row.settled_sum) : new Decimal(0));
      const projected = initial.plus(row.projected_sum != null ? new Decimal(row.projected_sum) : new Decimal(0));

      result.set(row.wallet_id, { settled, projected });
    }

    // Wallets requested but not found in DB: return zero for both values
    for (const id of walletIds) {
      if (!result.has(id)) {
        const zero = new Decimal(0);
        result.set(id, { settled: zero, projected: zero });
      }
    }

    return result;
  }
}
