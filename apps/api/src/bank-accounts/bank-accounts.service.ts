import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import {
  BankAccountResponseDto,
  BankAccountListResponseDto,
} from './dto/bank-account-response.dto';
import { BankAccount } from '@prisma/client';

@Injectable()
export class BankAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    walletId: string,
    includeArchived = false,
  ): Promise<BankAccountListResponseDto> {
    const accounts = await this.prisma.bankAccount.findMany({
      where: {
        walletId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: { name: 'asc' },
    });

    return {
      bankAccounts: accounts.map((a) => this.toListDto(a)),
      total: accounts.length,
    };
  }

  async findOne(walletId: string, id: string): Promise<BankAccountResponseDto> {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, walletId },
    });

    if (!account) {
      throw new NotFoundException('BANK_ACCOUNT_NOT_FOUND');
    }

    return this.toDto(account);
  }

  async create(
    walletId: string,
    dto: CreateBankAccountDto,
  ): Promise<BankAccountResponseDto> {
    const account = await this.prisma.bankAccount.create({
      data: {
        walletId,
        name: dto.name,
        type: dto.type,
        institution: dto.institution ?? null,
        accountNumber: dto.accountNumber ?? null,
      },
    });

    return this.toDto(account);
  }

  async update(
    walletId: string,
    id: string,
    dto: UpdateBankAccountDto,
  ): Promise<BankAccountResponseDto> {
    const existing = await this.prisma.bankAccount.findFirst({
      where: { id, walletId },
    });

    if (!existing) {
      throw new NotFoundException('BANK_ACCOUNT_NOT_FOUND');
    }

    const updated = await this.prisma.bankAccount.update({
      where: { id, walletId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.institution !== undefined && { institution: dto.institution }),
        ...(dto.isArchived !== undefined && { isArchived: dto.isArchived }),
      },
    });

    return this.toDto(updated);
  }

  async archive(walletId: string, id: string): Promise<void> {
    const existing = await this.prisma.bankAccount.findFirst({
      where: { id, walletId },
    });

    if (!existing) {
      throw new NotFoundException('BANK_ACCOUNT_NOT_FOUND');
    }

    if (existing.isArchived) {
      throw new UnprocessableEntityException('BANK_ACCOUNT_ALREADY_ARCHIVED');
    }

    // FIX QA-C2: Block archiving if active transactions reference this bank account (AC-8)
    const activeCount = await this.prisma.transaction.count({
      where: { bankAccountId: id, walletId, deletedAt: null },
    });
    if (activeCount > 0) {
      throw new UnprocessableEntityException('BANK_ACCOUNT_HAS_ACTIVE_TRANSACTIONS');
    }

    await this.prisma.bankAccount.update({
      where: { id, walletId },
      data: { isArchived: true },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private toDto(account: BankAccount): BankAccountResponseDto {
    return {
      id: account.id,
      walletId: account.walletId,
      name: account.name,
      type: account.type,
      institution: account.institution,
      accountNumber: account.accountNumber,
      isArchived: account.isArchived,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  private toListDto(account: BankAccount): BankAccountResponseDto {
    return {
      id: account.id,
      walletId: account.walletId,
      name: account.name,
      type: account.type,
      institution: account.institution,
      accountNumber: undefined, // not exposed in list for security
      isArchived: account.isArchived,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}
