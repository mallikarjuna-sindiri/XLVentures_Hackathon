export type Account = {
  id: string;
  name: string;
  stage: string;
  healthScore: number;
  owner: string;
  status: string;
  domain: string;
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

export type AgentLogEntry = {
  agent: string;
  message: string;
  timestamp: string;
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
  agentLogs?: AgentLogEntry[];
};

export type Playbook = {
  id: string;
  name: string;
  triggerRisk: string;
  action: string;
  priority: string;
  confidence: number;
  reason: string;
  evidence: string[];
  domain: string;
};

export type KnowledgeSource = {
  id: string;
  title: string;
  type: string;
  contentSummary: string;
};
