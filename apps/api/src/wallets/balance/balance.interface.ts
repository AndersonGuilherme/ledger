import { Decimal } from '@prisma/client/runtime/library';

export interface WalletBalance {
  settled: Decimal;
  projected: Decimal;
}

export interface IBalanceService {
  getBatchBalances(
    walletIds: string[],
  ): Promise<Map<string, WalletBalance>>;
}

export const BALANCE_SERVICE = 'BALANCE_SERVICE';
