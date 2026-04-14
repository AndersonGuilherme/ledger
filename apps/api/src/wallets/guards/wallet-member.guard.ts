import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { WALLET_ROLE_KEY } from '../decorators/wallet-role.decorator';
import { WalletMemberRole } from '@prisma/client';

const roleRank: Record<WalletMemberRole, number> = {
  owner: 3,
  editor: 2,
  viewer: 1,
};

@Injectable()
export class WalletMemberGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string = request.userId;
    const walletId: string = request.params?.walletId;

    if (!walletId) {
      throw new NotFoundException('WALLET_NOT_FOUND');
    }

    const membership = await this.prisma.walletMember.findFirst({
      where: {
        walletId,
        userId,
        status: 'active',
      },
      select: {
        id: true,
        walletId: true,
        userId: true,
        role: true,
      },
    });

    if (!membership || !membership.userId) {
      throw new ForbiddenException('WALLET_ACCESS_DENIED');
    }

    const requiredRole = this.reflector.getAllAndOverride<WalletMemberRole | undefined>(
      WALLET_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRole) {
      const requiredRank = roleRank[requiredRole];
      const memberRank = roleRank[membership.role];

      if (memberRank < requiredRank) {
        throw new ForbiddenException('WALLET_INSUFFICIENT_ROLE');
      }
    }

    request.walletMember = {
      id: membership.id,
      walletId: membership.walletId,
      userId: membership.userId,
      role: membership.role,
    };

    return true;
  }
}
