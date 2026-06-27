import type { Account, Interaction, Recommendation } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'Request failed');
  }

  return response.json() as Promise<T>;
}

export function getAccounts() {
  return request<Account[]>('/accounts');
}

export function getInteractions(accountId: string) {
  return request<Interaction[]>(`/accounts/${accountId}/interactions`);
}

export function getRecommendations(accountId: string) {
  return request<Recommendation[]>(`/accounts/${accountId}/recommendations`);
}

export function createInteraction(accountId: string, payload: { source: string; text: string }) {
  return request<Interaction>(`/accounts/${accountId}/interactions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function analyzeAccount(accountId: string) {
  return request<Recommendation>(`/accounts/${accountId}/analyze`, {
    method: 'POST',
  });
}

export function reviewRecommendation(
  recommendationId: string,
  payload: { status: 'approved' | 'rejected' | 'edited'; comments?: string },
) {
  return request<Recommendation>(`/recommendations/${recommendationId}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
