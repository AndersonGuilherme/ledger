import api from "@/lib/api";
import type {
  Transaction,
  TransactionListResponse,
  CreateTransactionDto,
  UpdateTransactionDto,
} from "@/types/api";

export async function listTransactions(
  walletId: string,
  params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<TransactionListResponse> {
  const response = await api.get<TransactionListResponse>(
    `/wallets/${walletId}/transactions`,
    { params }
  );
  return response.data;
}

export async function createTransaction(
  walletId: string,
  dto: CreateTransactionDto
): Promise<Transaction> {
  const response = await api.post<Transaction>(
    `/wallets/${walletId}/transactions`,
    dto
  );
  return response.data;
}

export async function updateTransaction(
  walletId: string,
  id: string,
  dto: UpdateTransactionDto
): Promise<Transaction> {
  const response = await api.patch<Transaction>(
    `/wallets/${walletId}/transactions/${id}`,
    dto
  );
  return response.data;
}

export async function deleteTransaction(
  walletId: string,
  id: string
): Promise<void> {
  await api.delete(`/wallets/${walletId}/transactions/${id}`);
}
