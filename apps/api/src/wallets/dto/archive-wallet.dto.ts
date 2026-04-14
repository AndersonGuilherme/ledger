import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ArchiveWalletDto {
  @ApiProperty({
    description: 'Deve ser true para confirmar o arquivamento',
    example: true,
  })
  @IsBoolean()
  confirm: boolean;
}
