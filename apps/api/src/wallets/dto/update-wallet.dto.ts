import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WalletType } from '@prisma/client';

export class UpdateWalletDto {
  @ApiPropertyOptional({
    description: 'Novo nome da carteira',
    example: 'Carteira Pessoal Atualizada',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'Nova descrição da carteira',
    example: 'Descrição atualizada',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Novo tipo da carteira',
    enum: WalletType,
    example: WalletType.business,
  })
  @IsOptional()
  @IsEnum(WalletType)
  type?: WalletType;
}
