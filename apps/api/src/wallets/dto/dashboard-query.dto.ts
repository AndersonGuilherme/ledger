import { IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const YYYY_MM_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export class DashboardQueryDto {
  @ApiPropertyOptional({
    description: 'Start month in YYYY-MM format (e.g. "2025-01")',
    example: '2025-01',
  })
  @IsOptional()
  @Matches(YYYY_MM_REGEX, { message: 'from must be in YYYY-MM format' })
  from?: string;

  @ApiPropertyOptional({
    description: 'End month in YYYY-MM format (e.g. "2025-12")',
    example: '2025-12',
  })
  @IsOptional()
  @Matches(YYYY_MM_REGEX, { message: 'to must be in YYYY-MM format' })
  to?: string;
}
