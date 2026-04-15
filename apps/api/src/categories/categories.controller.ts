import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SessionGuard } from '../auth/guards/session.guard';
import { WalletMemberGuard } from '../wallets/guards/wallet-member.guard';
import { RequireWalletRole } from '../wallets/decorators/wallet-role.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto, CategoryListResponseDto } from './dto/category-response.dto';

@ApiTags('categories')
@ApiBearerAuth('session-token')
@UseGuards(SessionGuard, WalletMemberGuard)
@Controller('wallets/:walletId/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar categorias da carteira' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Lista de categorias.', type: CategoryListResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 403, description: 'Sem acesso à carteira.' })
  async findAll(
    @Param('walletId') walletId: string,
    @Query('includeArchived') includeArchived?: string,
  ): Promise<CategoryListResponseDto> {
    return this.categoriesService.findAll(walletId, includeArchived === 'true');
  }

  @Post()
  @RequireWalletRole('editor')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar categoria na carteira (editor ou owner)' })
  @ApiResponse({ status: 201, description: 'Categoria criada.', type: CategoryResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 403, description: 'Sem permissão de editor.' })
  @ApiResponse({ status: 409, description: 'Categoria com esse nome já existe na carteira.' })
  async create(
    @Param('walletId') walletId: string,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.create(walletId, dto);
  }

  @Patch(':categoryId')
  @RequireWalletRole('editor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar categoria (editor ou owner)' })
  @ApiResponse({ status: 200, description: 'Categoria atualizada.', type: CategoryResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 403, description: 'Sem permissão de editor.' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada.' })
  @ApiResponse({ status: 409, description: 'Categoria com esse nome já existe na carteira.' })
  async update(
    @Param('walletId') walletId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(walletId, categoryId, dto);
  }

  @Delete(':categoryId')
  @RequireWalletRole('owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Arquivar categoria (somente owner)' })
  @ApiResponse({ status: 204, description: 'Categoria arquivada.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 403, description: 'Sem permissão de owner.' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada.' })
  async remove(
    @Param('walletId') walletId: string,
    @Param('categoryId') categoryId: string,
  ): Promise<void> {
    return this.categoriesService.remove(walletId, categoryId);
  }
}
