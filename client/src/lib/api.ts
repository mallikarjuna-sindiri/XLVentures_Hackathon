import type { Account, Interaction, Recommendation, Playbook, KnowledgeSource, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('xl_auth_token');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (response.status === 401) {
    localStorage.removeItem('xl_auth_token');
    localStorage.removeItem('xl_auth_user');
    window.location.reload();
    throw new Error('Unauthorized');
  }

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

export function createAccount(payload: Omit<Account, 'id'>) {
  return request<Account>('/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteAccount(accountId: string) {
  return request<{ status: string; message: string }>(`/accounts/${accountId}`, {
    method: 'DELETE',
  });
}

export function chatWithAccount(
  accountId: string,
  payload: { message: string; history: Array<{ sender: 'user' | 'assistant'; text: string }> }
) {
  return request<{ response: string }>(`/accounts/${accountId}/chat`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
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

export function createKnowledgeSource(payload: Omit<KnowledgeSource, 'id'>) {
  return request<KnowledgeSource>('/knowledge-sources', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createPlaybook(payload: Omit<Playbook, 'id'>) {
  return request<Playbook>('/playbooks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getAllRecommendations() {
  return request<Recommendation[]>('/recommendations');
}

export function resetDatabase() {
  return request<{ status: string; message: string }>('/reset-db', {
    method: 'POST',
  });
}

export function loginWithGoogle(credential: string) {
  return request<{ token: string; user: User }>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
}
