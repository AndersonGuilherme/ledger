import { Module } from '@nestjs/common';
import { FaturasController } from './faturas.controller';
import { FaturasService } from './faturas.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [PrismaModule, AuthModule, WalletsModule],
  controllers: [FaturasController],
  providers: [FaturasService],
  exports: [FaturasService],
})
export class FaturasModule {}
