import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WalletMemberRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'Novo papel do membro',
    enum: WalletMemberRole,
    example: WalletMemberRole.editor,
  })
  @IsEnum(WalletMemberRole)
  role: WalletMemberRole;
}
