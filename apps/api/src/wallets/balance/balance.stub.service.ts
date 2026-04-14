import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IBalanceService, WalletBalance } from './balance.interface';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BalanceStubService implements IBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getBatchBalances(
    walletIds: string[],
  ): Promise<Map<string, WalletBalance>> {
    if (walletIds.length === 0) {
      return new Map();
    }

    const wallets = await this.prisma.wallet.findMany({
      where: { id: { in: walletIds } },
      select: { id: true, initialBalance: true },
    });

    const result = new Map<string, WalletBalance>();

    for (const wallet of wallets) {
      const balance = new Decimal(wallet.initialBalance.toString());
      result.set(wallet.id, { settled: balance, projected: balance });
    }

    // Wallets not found in DB get zero balances
    for (const id of walletIds) {
      if (!result.has(id)) {
        const zero = new Decimal(0);
        result.set(id, { settled: zero, projected: zero });
      }
    }

    return result;
  }
}
