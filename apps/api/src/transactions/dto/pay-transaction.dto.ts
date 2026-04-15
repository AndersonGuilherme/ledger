import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PayTransactionDto {
  @ApiPropertyOptional({
    description: 'Data de pagamento (ISO 8601). Padrão: now() se omitido.',
    example: '2025-04-15T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
