import api from "@/lib/api";
import type {
  WalletListItem,
  WalletDetail,
  WalletListResponse,
  WalletMember,
  MemberListResponse,
  CreateWalletDto,
  UpdateWalletDto,
  InviteMemberDto,
  DashboardResponse,
  DashboardQueryParams,
} from "@/types/api";

export async function listWallets(): Promise<WalletListItem[]> {
  const response = await api.get<WalletListResponse>("/wallets");
  return response.data.wallets;
}

export async function getWallet(id: string): Promise<WalletDetail> {
  const response = await api.get<WalletDetail>(`/wallets/${id}`);
  return response.data;
}

export async function createWallet(dto: CreateWalletDto): Promise<WalletDetail> {
  const response = await api.post<WalletDetail>("/wallets", dto);
  return response.data;
}

export async function updateWallet(
  id: string,
  dto: UpdateWalletDto
): Promise<WalletDetail> {
  const response = await api.patch<WalletDetail>(`/wallets/${id}`, dto);
  return response.data;
}

export async function archiveWallet(id: string): Promise<void> {
  await api.post(`/wallets/${id}/archive`);
}

export async function listMembers(walletId: string): Promise<WalletMember[]> {
  const response = await api.get<MemberListResponse>(
    `/wallets/${walletId}/members`
  );
  return response.data.members;
}

export async function inviteMember(
  walletId: string,
  dto: InviteMemberDto
): Promise<WalletMember> {
  const response = await api.post<WalletMember>(
    `/wallets/${walletId}/members`,
    dto
  );
  return response.data;
}

export async function changeMemberRole(
  walletId: string,
  memberId: string,
  role: "editor" | "viewer" | "owner"
): Promise<WalletMember> {
  const response = await api.patch<WalletMember>(
    `/wallets/${walletId}/members/${memberId}`,
    { role }
  );
  return response.data;
}

export async function revokeMember(
  walletId: string,
  memberId: string
): Promise<void> {
  await api.delete(`/wallets/${walletId}/members/${memberId}`);
}

export interface CanDeleteWalletResponse {
  allowed: boolean;
  blockers: string[];
  warnings: string[];
  meta: {
    settledBalance: number;
    projectedBalance: number;
    pendingInstallmentsCount: number;
    openFaturasCount: number;
    transferPairsCount: number;
  };
}

export async function canDeleteWallet(
  walletId: string
): Promise<CanDeleteWalletResponse> {
  const response = await api.get<CanDeleteWalletResponse>(
    `/wallets/${walletId}/can-delete`
  );
  return response.data;
}

export async function deleteWallet(
  walletId: string,
  confirm: boolean
): Promise<{ id: string; deleted: boolean }> {
  const response = await api.delete<{ id: string; deleted: boolean }>(
    `/wallets/${walletId}`,
    { data: { confirm } }
  );
  return response.data;
}

export async function getWalletDashboard(
  walletId: string,
  params?: DashboardQueryParams,
): Promise<DashboardResponse> {
  const response = await api.get<DashboardResponse>(
    `/wallets/${walletId}/dashboard`,
    { params },
  );
  return response.data;
}
