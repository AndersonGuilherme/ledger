import { Module } from '@nestjs/common';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { WalletMembersController } from './members/wallet-members.controller';
import { WalletMembersService } from './members/wallet-members.service';
import { WalletMemberGuard } from './guards/wallet-member.guard';
import { BALANCE_SERVICE } from './balance/balance.interface';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BalanceModule } from '../balance/balance.module';
import { BalanceService } from '../balance/balance.service';

@Module({
  imports: [PrismaModule, AuthModule, BalanceModule],
  controllers: [WalletsController, WalletMembersController],
  providers: [
    WalletsService,
    WalletMembersService,
    WalletMemberGuard,
    {
      provide: BALANCE_SERVICE,
      useClass: BalanceService,
    },
  ],
  exports: [WalletMembersService, WalletMemberGuard],
})
export class WalletsModule {}
