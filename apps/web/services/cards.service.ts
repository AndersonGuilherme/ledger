import api from "@/lib/api";
import type {
  CreditCard,
  CardListResponse,
  CreateCardDto,
  UpdateCardDto,
} from "@/types/api";

export async function listCards(walletId: string): Promise<CreditCard[]> {
  const response = await api.get<CardListResponse>(
    `/wallets/${walletId}/cards`
  );
  return response.data.cards;
}

export async function createCard(
  walletId: string,
  dto: CreateCardDto
): Promise<CreditCard> {
  const response = await api.post<CreditCard>(
    `/wallets/${walletId}/cards`,
    dto
  );
  return response.data;
}

export async function updateCard(
  walletId: string,
  cardId: string,
  dto: UpdateCardDto
): Promise<CreditCard> {
  const response = await api.patch<CreditCard>(
    `/wallets/${walletId}/cards/${cardId}`,
    dto
  );
  return response.data;
}

export async function archiveCard(
  walletId: string,
  cardId: string
): Promise<CreditCard> {
  const response = await api.patch<CreditCard>(
    `/wallets/${walletId}/cards/${cardId}`,
    { isArchived: true }
  );
  return response.data;
}

export async function deleteCard(
  walletId: string,
  cardId: string
): Promise<void> {
  await api.delete(`/wallets/${walletId}/cards/${cardId}`);
}
