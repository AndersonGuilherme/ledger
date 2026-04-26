import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FaturasService } from './faturas.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { WalletMemberGuard } from '../wallets/guards/wallet-member.guard';
import { RequireWalletRole } from '../wallets/decorators/wallet-role.decorator';

@ApiTags('faturas')
@UseGuards(SessionGuard, WalletMemberGuard)
@Controller('wallets/:walletId/faturas')
export class WalletFaturasController {
  constructor(private readonly faturasService: FaturasService) {}

  @Get()
  @RequireWalletRole('viewer')
  @ApiOperation({
    summary: 'Listar faturas de TODOS os cartões da carteira (com filtro de mês)',
  })
  @ApiQuery({ name: 'month', required: false, description: 'YYYY-MM' })
  findAllForWallet(
    @Param('walletId') walletId: string,
    @Query('month') month?: string,
  ) {
    return this.faturasService.findAllForWallet(walletId, month);
  }
}
