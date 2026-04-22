import { ApiProperty } from '@nestjs/swagger';

export class CanDeleteWalletMetaDto {
  @ApiProperty({ example: 0 })
  settledBalance: number;

  @ApiProperty({ example: 0 })
  projectedBalance: number;

  @ApiProperty({ example: 0 })
  pendingInstallmentsCount: number;

  @ApiProperty({ example: 0 })
  openFaturasCount: number;

  @ApiProperty({ example: 0 })
  transferPairsCount: number;
}

export class CanDeleteWalletResponseDto {
  @ApiProperty({ example: true })
  allowed: boolean;

  @ApiProperty({ type: [String], example: [] })
  blockers: string[];

  @ApiProperty({ type: [String], example: [] })
  warnings: string[];

  @ApiProperty({ type: CanDeleteWalletMetaDto })
  meta: CanDeleteWalletMetaDto;
}

export class DeleteWalletResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: true })
  deleted: boolean;
}
