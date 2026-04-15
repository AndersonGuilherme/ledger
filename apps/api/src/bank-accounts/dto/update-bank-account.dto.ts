import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBankAccountDto {
  @ApiPropertyOptional({
    description: 'Novo nome da conta bancária',
    example: 'Conta Corrente Itaú Atualizada',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

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
    description: 'Arquivar ou desarquivar a conta',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
