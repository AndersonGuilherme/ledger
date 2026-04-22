import api from "@/lib/api";
import type {
  Category,
  CategoryListResponse,
  CreateCategoryDto,
} from "@/types/api";

export async function listCategories(walletId: string): Promise<Category[]> {
  const response = await api.get<CategoryListResponse>(
    `/wallets/${walletId}/categories`
  );
  return response.data.categories;
}

export async function createCategory(
  walletId: string,
  dto: CreateCategoryDto
): Promise<Category> {
  const response = await api.post<Category>(
    `/wallets/${walletId}/categories`,
    dto
  );
  return response.data;
}

export async function archiveCategory(
  walletId: string,
  categoryId: string
): Promise<void> {
  await api.delete(`/wallets/${walletId}/categories/${categoryId}`);
}
