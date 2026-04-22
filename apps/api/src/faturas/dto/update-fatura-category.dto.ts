import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, ValidateIf } from 'class-validator';

export class UpdateFaturaCategoryDto {
  /**
   * UUID of the category to assign to this fatura.
   * Pass null to remove the category.
   */
  @ApiPropertyOptional({
    description: 'Category UUID to assign. Pass null to remove.',
    nullable: true,
    format: 'uuid',
  })
  @ValidateIf((o) => o.categoryId !== null)
  @IsOptional()
  @IsUUID()
  categoryId: string | null;
}
