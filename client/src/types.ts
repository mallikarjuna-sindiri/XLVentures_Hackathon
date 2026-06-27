export type Account = {
  id: string;
  name: string;
  stage: string;
  healthScore: number;
  owner: string;
  status: string;
};

export type Interaction = {
  id: string;
  accountId: string;
  source: string;
  text: string;
  summary: string;
  riskLevel: string;
  createdAt: string;
};

export type Recommendation = {
  id: string;
  accountId: string;
  action: string;
  priority: string;
  confidence: number;
  reason: string;
  evidence: string[];
  status: string;
  createdAt: string;
};
