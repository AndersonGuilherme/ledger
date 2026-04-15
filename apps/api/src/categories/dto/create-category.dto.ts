import { IsString, IsNotEmpty, MaxLength, IsOptional, IsEnum, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryType } from '@prisma/client';

export { CategoryType };

export class CreateCategoryDto {
  @ApiProperty({ description: 'Nome da categoria', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Cor em hex (#RRGGBB)', example: '#FF5733' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color (#RRGGBB)' })
  color?: string;

  @ApiPropertyOptional({ description: 'Ícone da categoria', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiProperty({ enum: CategoryType, default: CategoryType.any, description: 'Tipo da categoria' })
  @IsEnum(CategoryType)
  type: CategoryType = CategoryType.any;
}
