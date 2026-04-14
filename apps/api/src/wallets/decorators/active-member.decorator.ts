import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { WalletMemberRole } from '@prisma/client';

export interface ActiveMemberPayload {
  id: string;
  walletId: string;
  userId: string;
  role: WalletMemberRole;
}

export const ActiveMember = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActiveMemberPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.walletMember as ActiveMemberPayload;
  },
);
