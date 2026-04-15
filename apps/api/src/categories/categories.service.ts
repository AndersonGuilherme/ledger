import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto, CategoryListResponseDto } from './dto/category-response.dto';
import { Category } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    walletId: string,
    includeArchived = false,
  ): Promise<CategoryListResponseDto> {
    const categories = await this.prisma.category.findMany({
      where: {
        walletId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: { name: 'asc' },
    });

    return {
      categories: categories.map((c) => this.toDto(c)),
      total: categories.length,
    };
  }

  async findOne(walletId: string, id: string): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findFirst({
      where: { id, walletId },
    });

    if (!category) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }

    return this.toDto(category);
  }

  async create(
    walletId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    try {
      const category = await this.prisma.category.create({
        data: {
          walletId,
          name: dto.name,
          color: dto.color ?? null,
          icon: dto.icon ?? null,
          type: dto.type,
        },
      });

      return this.toDto(category);
    } catch (error: unknown) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException('CATEGORY_NAME_CONFLICT');
      }
      throw error;
    }
  }

  async update(
    walletId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const existing = await this.prisma.category.findFirst({
      where: { id, walletId },
    });

    if (!existing) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }

    try {
      const updated = await this.prisma.category.update({
        where: { id, walletId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.color !== undefined && { color: dto.color }),
          ...(dto.icon !== undefined && { icon: dto.icon }),
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.isArchived !== undefined && { isArchived: dto.isArchived }),
        },
      });

      return this.toDto(updated);
    } catch (error: unknown) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException('CATEGORY_NAME_CONFLICT');
      }
      throw error;
    }
  }

  async remove(walletId: string, id: string): Promise<void> {
    const existing = await this.prisma.category.findFirst({
      where: { id, walletId },
    });

    if (!existing) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }

    // FIX QA-C1: Block archiving if active transactions reference this category (AC-4)
    const activeCount = await this.prisma.transaction.count({
      where: { categoryId: id, walletId, deletedAt: null },
    });
    if (activeCount > 0) {
      throw new UnprocessableEntityException('CATEGORY_HAS_ACTIVE_TRANSACTIONS');
    }

    await this.prisma.category.update({
      where: { id, walletId },
      data: { isArchived: true },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private toDto(category: Category): CategoryResponseDto {
    return {
      id: category.id,
      walletId: category.walletId,
      name: category.name,
      color: category.color,
      icon: category.icon,
      type: category.type,
      isArchived: category.isArchived,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === code
  );
}
