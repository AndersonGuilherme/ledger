import { SetMetadata } from '@nestjs/common';
import { WalletMemberRole } from '@prisma/client';

export const WALLET_ROLE_KEY = 'walletRole';

export const RequireWalletRole = (role: WalletMemberRole) =>
  SetMetadata(WALLET_ROLE_KEY, role);
