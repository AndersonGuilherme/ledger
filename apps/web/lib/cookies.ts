const TOKEN_KEY = "access_token";

export function setAuthToken(token: string, ttlDays = 30): void {
  const expires = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${TOKEN_KEY}=${token}; expires=${expires}; path=/; SameSite=Lax`;
}

export function getAuthToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function clearAuthToken(): void {
  document.cookie = `${TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}
