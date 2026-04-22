import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteWalletDto {
  @ApiProperty({
    description: 'Deve ser true para confirmar a deleção permanente',
    example: true,
  })
  @IsBoolean()
  confirm: boolean;
}
