import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WalletMemberRole, WalletType } from '@prisma/client';

export class WalletListItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Carteira Pessoal' })
  name: string;

  @ApiProperty({ enum: WalletType, example: WalletType.personal })
  type: WalletType;

  @ApiProperty({ example: 'BRL' })
  currencyCode: string;

  @ApiProperty({ example: false })
  isArchived: boolean;

  @ApiProperty({ enum: WalletMemberRole, example: WalletMemberRole.owner })
  role: WalletMemberRole;

  @ApiProperty({ example: 1500.0 })
  settledBalance: number;

  @ApiProperty({ example: 1500.0 })
  projectedBalance: number;

  @ApiProperty({ example: 2 })
  memberCount: number;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  createdAt: Date;
}

export class WalletListResponseDto {
  @ApiProperty({ type: [WalletListItemDto] })
  wallets: WalletListItemDto[];

  @ApiProperty({ example: 3 })
  total: number;
}

export class WalletDetailDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'user-uuid-here' })
  ownerUserId: string;

  @ApiProperty({ example: 'Carteira Pessoal' })
  name: string;

  @ApiProperty({ enum: WalletType, example: WalletType.personal })
  type: WalletType;

  @ApiProperty({ example: 'BRL' })
  currencyCode: string;

  @ApiProperty({ example: 1000.0 })
  initialBalance: number;

  @ApiPropertyOptional({ example: 'Carteira para despesas do dia a dia' })
  description: string | null;

  @ApiProperty({ example: false })
  isArchived: boolean;

  @ApiPropertyOptional({ example: null })
  archivedAt: Date | null;

  @ApiProperty({ enum: WalletMemberRole, example: WalletMemberRole.owner })
  role: WalletMemberRole;

  @ApiProperty({ example: 1500.0 })
  settledBalance: number;

  @ApiProperty({ example: 1500.0 })
  projectedBalance: number;

  @ApiProperty({ example: 2 })
  memberCount: number;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  updatedAt: Date;
}

export class ArchiveWalletResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: true })
  isArchived: boolean;
}
