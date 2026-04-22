import { Module } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { WalletsModule } from '../wallets/wallets.module';
import { FaturasModule } from '../faturas/faturas.module';

@Module({
  imports: [PrismaModule, AuthModule, WalletsModule, FaturasModule],
  controllers: [CardsController, PurchasesController],
  providers: [CardsService, PurchasesService],
  exports: [CardsService],
})
export class CardsModule {}
