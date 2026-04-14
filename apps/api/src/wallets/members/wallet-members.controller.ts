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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SessionGuard } from '../../auth/guards/session.guard';
import { WalletMemberGuard } from '../guards/wallet-member.guard';
import { RequireWalletRole } from '../decorators/wallet-role.decorator';
import { ActiveMember, ActiveMemberPayload } from '../decorators/active-member.decorator';
import { WalletMembersService } from './wallet-members.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { MemberResponseDto, MemberListResponseDto } from './dto/member-response.dto';

@ApiTags('wallet-members')
@ApiBearerAuth('session-token')
@UseGuards(SessionGuard, WalletMemberGuard)
@Controller('wallets/:walletId/members')
export class WalletMembersController {
  constructor(private readonly membersService: WalletMembersService) {}

  @Post()
  @RequireWalletRole('owner')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Convidar membro para a carteira (somente owner)' })
  @ApiResponse({ status: 201, description: 'Membro convidado.', type: MemberResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 403, description: 'Sem permissão de owner.' })
  @ApiResponse({ status: 409, description: 'Membro já existe na carteira.' })
  async invite(
    @Param('walletId') walletId: string,
    @ActiveMember() member: ActiveMemberPayload,
    @Body() dto: InviteMemberDto,
  ): Promise<MemberResponseDto> {
    return this.membersService.invite(walletId, member.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar membros da carteira' })
  @ApiResponse({ status: 200, description: 'Lista de membros.', type: MemberListResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 403, description: 'Sem acesso à carteira.' })
  async findAll(
    @Param('walletId') walletId: string,
  ): Promise<MemberListResponseDto> {
    return this.membersService.findAllByWallet(walletId);
  }

  @Patch(':memberId')
  @RequireWalletRole('owner')
  @ApiOperation({ summary: 'Alterar papel de um membro (somente owner)' })
  @ApiResponse({ status: 200, description: 'Papel alterado.', type: MemberResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 403, description: 'Sem permissão de owner.' })
  @ApiResponse({ status: 404, description: 'Membro não encontrado.' })
  @ApiResponse({ status: 422, description: 'Não é possível alterar o papel do último owner.' })
  async changeRole(
    @Param('walletId') walletId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<MemberResponseDto> {
    return this.membersService.changeRole(walletId, memberId, dto);
  }

  @Delete(':memberId')
  @RequireWalletRole('owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revogar acesso de um membro (somente owner)' })
  @ApiResponse({ status: 204, description: 'Acesso revogado.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 403, description: 'Sem permissão de owner.' })
  @ApiResponse({ status: 404, description: 'Membro não encontrado.' })
  @ApiResponse({ status: 422, description: 'Não é possível revogar o último owner.' })
  async revoke(
    @Param('walletId') walletId: string,
    @Param('memberId') memberId: string,
  ): Promise<void> {
    return this.membersService.revoke(walletId, memberId);
  }
}
