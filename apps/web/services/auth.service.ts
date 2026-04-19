import api from "@/lib/api";
import type { User } from "@/types/api";

export async function requestOtp(email: string): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>("/auth/request-otp", {
    email,
  });
  return response.data;
}

export async function verifyOtp(
  email: string,
  token: string
): Promise<{ user: User }> {
  const response = await api.post<{ user: User }>("/auth/verify-otp", {
    email,
    token,
  });
  return response.data;
}

export async function getMe(): Promise<User> {
  const response = await api.get<User>("/auth/me");
  return response.data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}
