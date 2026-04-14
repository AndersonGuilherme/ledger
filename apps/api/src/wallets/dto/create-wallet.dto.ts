import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WalletType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateWalletDto {
  @ApiProperty({
    description: 'Nome da carteira',
    example: 'Carteira Pessoal',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Tipo da carteira',
    enum: WalletType,
    example: WalletType.personal,
  })
  @IsEnum(WalletType)
  type: WalletType;

  @ApiPropertyOptional({
    description: 'Código da moeda (ISO 4217)',
    example: 'BRL',
    default: 'BRL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currencyCode?: string;

  @ApiPropertyOptional({
    description: 'Saldo inicial da carteira',
    example: 1000.0,
    default: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  initialBalance?: number;

  @ApiPropertyOptional({
    description: 'Descrição opcional da carteira',
    example: 'Carteira para despesas pessoais do dia a dia',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
