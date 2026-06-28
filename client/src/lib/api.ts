import type { Account, Interaction, Recommendation, Playbook, KnowledgeSource } from '../types';

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

export function getAccounts(domain?: string) {
  const query = domain ? `?domain=${domain}` : '';
  return request<Account[]>(`/accounts${query}`);
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

export function getPlaybooks(domain?: string) {
  const query = domain ? `?domain=${domain}` : '';
  return request<Playbook[]>(`/playbooks${query}`);
}

export function updatePlaybook(playbookId: string, payload: Partial<Playbook>) {
  return request<Playbook>(`/playbooks/${playbookId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function getRecommendationCopilotDraft(recommendationId: string) {
  return request<{ draft: string }>(`/recommendations/${recommendationId}/copilot-draft`, {
    method: 'POST',
  });
}

export function getKnowledgeSources() {
  return request<KnowledgeSource[]>('/knowledge-sources');
}

export function resetDatabase() {
  return request<{ status: string; message: string }>('/reset-db', {
    method: 'POST',
  });
}
