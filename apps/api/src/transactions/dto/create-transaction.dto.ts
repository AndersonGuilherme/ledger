import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TransactionType } from '@prisma/client';

export { TransactionType };

export class CreateTransactionDto {
  @ApiProperty({ enum: TransactionType, description: 'Tipo da transação' })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ description: 'Valor da transação (positivo, máximo 2 casas decimais)', example: 100.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999999999.99)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ description: 'Descrição da transação', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @ApiPropertyOptional({ description: 'Notas adicionais', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiProperty({ description: 'Data de vencimento (ISO 8601)', example: '2025-04-15' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({
    description: 'Status inicial da transação',
    enum: ['pending', 'paid'],
    default: 'pending',
  })
  @IsOptional()
  @IsIn(['pending', 'paid'])
  status?: 'pending' | 'paid';

  @ApiPropertyOptional({ description: 'UUID da categoria', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'UUID da conta bancária', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @ApiPropertyOptional({ description: 'Data de pagamento (ISO 8601), obrigatório se status=paid', example: '2025-04-15T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({
    description: 'UUID da conta bancária de destino — obrigatório quando type=transfer_out',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  counterpartBankAccountId?: string;
}
