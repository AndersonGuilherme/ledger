import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BankAccountType } from '@prisma/client';

export class CreateBankAccountDto {
  @ApiProperty({
    description: 'Nome da conta bancária',
    example: 'Conta Corrente Itaú',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Tipo da conta bancária',
    enum: BankAccountType,
    example: BankAccountType.checking,
  })
  @IsEnum(BankAccountType)
  type: BankAccountType;

  @ApiPropertyOptional({
    description: 'Nome da instituição financeira',
    example: 'Itaú Unibanco',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  institution?: string;

  @ApiPropertyOptional({
    description: 'Número da conta (últimos dígitos)',
    example: '****-5',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountNumber?: string;
}
