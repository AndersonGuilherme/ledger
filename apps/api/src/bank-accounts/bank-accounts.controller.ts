import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SessionGuard } from '../auth/guards/session.guard';
import { WalletMemberGuard } from '../wallets/guards/wallet-member.guard';
import { RequireWalletRole } from '../wallets/decorators/wallet-role.decorator';
import { BankAccountsService } from './bank-accounts.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import {
  BankAccountResponseDto,
  BankAccountListResponseDto,
} from './dto/bank-account-response.dto';

@ApiTags('bank-accounts')
@ApiBearerAuth('session-token')
@UseGuards(SessionGuard, WalletMemberGuard)
@Controller('wallets/:walletId/bank-accounts')
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar contas bancárias da carteira' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Lista de contas.', type: BankAccountListResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 403, description: 'Sem acesso à carteira.' })
  async findAll(
    @Param('walletId') walletId: string,
    @Query('includeArchived') includeArchived?: string,
  ): Promise<BankAccountListResponseDto> {
    return this.bankAccountsService.findAll(walletId, includeArchived === 'true');
  }

  @Get(':bankAccountId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter detalhes de uma conta bancária' })
  @ApiResponse({ status: 200, description: 'Detalhes da conta.', type: BankAccountResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 403, description: 'Sem acesso à carteira.' })
  @ApiResponse({ status: 404, description: 'Conta não encontrada.' })
  async findOne(
    @Param('walletId') walletId: string,
    @Param('bankAccountId') bankAccountId: string,
  ): Promise<BankAccountResponseDto> {
    return this.bankAccountsService.findOne(walletId, bankAccountId);
  }

  @Post()
  @RequireWalletRole('editor')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar conta bancária (editor ou owner)' })
  @ApiResponse({ status: 201, description: 'Conta criada.', type: BankAccountResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 403, description: 'Sem permissão de editor.' })
  async create(
    @Param('walletId') walletId: string,
    @Body() dto: CreateBankAccountDto,
  ): Promise<BankAccountResponseDto> {
    return this.bankAccountsService.create(walletId, dto);
  }

  @Patch(':bankAccountId')
  @RequireWalletRole('editor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar conta bancária (editor ou owner)' })
  @ApiResponse({ status: 200, description: 'Conta atualizada.', type: BankAccountResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 403, description: 'Sem permissão de editor.' })
  @ApiResponse({ status: 404, description: 'Conta não encontrada.' })
  async update(
    @Param('walletId') walletId: string,
    @Param('bankAccountId') bankAccountId: string,
    @Body() dto: UpdateBankAccountDto,
  ): Promise<BankAccountResponseDto> {
    return this.bankAccountsService.update(walletId, bankAccountId, dto);
  }

  @Delete(':bankAccountId')
  @RequireWalletRole('owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Arquivar conta bancária (somente owner)' })
  @ApiResponse({ status: 204, description: 'Conta arquivada.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 403, description: 'Sem permissão de owner.' })
  @ApiResponse({ status: 404, description: 'Conta não encontrada.' })
  @ApiResponse({ status: 422, description: 'Conta já arquivada.' })
  async archive(
    @Param('walletId') walletId: string,
    @Param('bankAccountId') bankAccountId: string,
  ): Promise<void> {
    return this.bankAccountsService.archive(walletId, bankAccountId);
  }
}
