import api from "@/lib/api";
import type {
  BankAccount,
  BankAccountListResponse,
  CreateBankAccountDto,
} from "@/types/api";

export async function listBankAccounts(walletId: string): Promise<BankAccount[]> {
  const response = await api.get<BankAccountListResponse>(
    `/wallets/${walletId}/bank-accounts`
  );
  return response.data.bankAccounts;
}

export async function createBankAccount(
  walletId: string,
  dto: CreateBankAccountDto
): Promise<BankAccount> {
  const response = await api.post<BankAccount>(
    `/wallets/${walletId}/bank-accounts`,
    dto
  );
  return response.data;
}

export async function updateBankAccount(
  walletId: string,
  id: string,
  dto: Partial<CreateBankAccountDto>
): Promise<BankAccount> {
  const response = await api.patch<BankAccount>(
    `/wallets/${walletId}/bank-accounts/${id}`,
    dto
  );
  return response.data;
}

export async function deleteBankAccount(
  walletId: string,
  id: string
): Promise<void> {
  await api.delete(`/wallets/${walletId}/bank-accounts/${id}`);
}
