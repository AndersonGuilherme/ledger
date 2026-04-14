import { Module } from '@nestjs/common';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { WalletMembersController } from './members/wallet-members.controller';
import { WalletMembersService } from './members/wallet-members.service';
import { WalletMemberGuard } from './guards/wallet-member.guard';
import { BalanceStubService } from './balance/balance.stub.service';
import { BALANCE_SERVICE } from './balance/balance.interface';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WalletsController, WalletMembersController],
  providers: [
    WalletsService,
    WalletMembersService,
    WalletMemberGuard,
    {
      provide: BALANCE_SERVICE,
      useClass: BalanceStubService,
    },
  ],
  exports: [WalletMembersService],
})
export class WalletsModule {}
