import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BalanceService } from './balance.service';

@Module({
  imports: [PrismaModule],
  providers: [BalanceService],
  exports: [BalanceService],
})
export class BalanceModule {}
