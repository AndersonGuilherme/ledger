import { IsEmail, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WalletMemberRole } from '@prisma/client';

const INVITABLE_ROLES = [WalletMemberRole.editor, WalletMemberRole.viewer] as const;
type InvitableRole = (typeof INVITABLE_ROLES)[number];

export class InviteMemberDto {
  @ApiProperty({
    description: 'Email do usuário a ser convidado',
    example: 'colaborador@exemplo.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Papel do membro na carteira',
    enum: ['editor', 'viewer'],
    example: 'editor',
  })
  @IsEnum(['editor', 'viewer'] as const)
  role: InvitableRole;
}
