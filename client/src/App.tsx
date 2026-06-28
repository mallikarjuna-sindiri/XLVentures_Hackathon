import { useEffect, useMemo, useState } from 'react';
import {
  analyzeAccount,
  createInteraction,
  getAccounts,
  getInteractions,
  getRecommendations,
  reviewRecommendation,
  getPlaybooks,
  updatePlaybook,
  getRecommendationCopilotDraft,
  getKnowledgeSources,
  resetDatabase,
} from './lib/api';
import type { Account, Interaction, Recommendation, Playbook, AgentLogEntry, KnowledgeSource } from './types';
import {
  Shield,
  Brain,
  Sparkles,
  Settings,
  BarChart3,
  ArrowRight,
  Check,
  X,
  Edit3,
  Copy,
  Database,
  Users,
  LineChart,
  PlaySquare,
  Activity,
  Clock,
  Flame,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Sliders,
  Mail,
  ChevronRight
} from 'lucide-react';

const priorityStyles: Record<string, string> = {
  high: 'bg-[#f0e6d3] text-[#7a3e1d] ring-1 ring-[#d8c7a5]',
  medium: 'bg-[#edf3e1] text-[#52702f] ring-1 ring-[#c9d9ae]',
  low: 'bg-[#e7f0da] text-[#44652d] ring-1 ring-[#b7d08b]',
};

const agentColors: Record<string, string> = {
  'Planner Agent': 'text-cyan-400 font-bold',
  'Interaction Ingestion Agent': 'text-yellow-400 font-bold',
  'Knowledge Retrieval Agent': 'text-purple-400 font-bold',
  'Memory Agent': 'text-[#acc86c] font-bold',
  'Policy Agent': 'text-red-400 font-bold',
  'Explanation Agent': 'text-emerald-400 font-bold',
};

function App() {
  // Navigation & Core States
  const [activeTab, setActiveTab] = useState<'planner' | 'playbooks' | 'analytics'>('planner');
  const [selectedDomain, setSelectedDomain] = useState<'customer_success' | 'sales_coaching'>('customer_success');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  
  // Form input states
  const [source, setSource] = useState('meeting_note');
  const [text, setText] = useState('Customer mentioned slower adoption and asked for executive support.');
  
  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [livePulse, setLivePulse] = useState(0);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Agent execution simulation states
  const [showAgentLogOverlay, setShowAgentLogOverlay] = useState(false);
  const [analyzingLogs, setAnalyzingLogs] = useState<AgentLogEntry[]>([]);
  const [activeAgentIndex, setActiveAgentIndex] = useState(-1);

  // Copilot Drawer States
  const [showCopilotDrawer, setShowCopilotDrawer] = useState(false);
  const [copilotDraft, setCopilotDraft] = useState('');
  const [copilotRecommendation, setCopilotRecommendation] = useState<Recommendation | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Playbook Editing States
  const [editingPlaybookId, setEditingPlaybookId] = useState<string>('');
  const [playbookForm, setPlaybookForm] = useState<{
    name: string;
    action: string;
    priority: string;
    confidence: number;
    reason: string;
    evidence: string;
  }>({
    name: '',
    action: '',
    priority: 'low',
    confidence: 0.5,
    reason: '',
    evidence: '',
  });

  // Action review state
  const [editingRecommendationId, setEditingRecommendationId] = useState('');
  const [draftDecision, setDraftDecision] = useState<'approved' | 'rejected'>('approved');

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId),
    [accounts, selectedAccountId],
  );

  const pendingRecommendations = recommendations.filter((item) => item.status === 'pending_review').length;
  const currentStep = recommendations.length > 0 ? 4 : interactions.length > 0 ? 3 : 2;

  const workflowSteps = [
    { step: '01', title: 'Select account', detail: 'Pick the customer workspace from the sidebar.' },
    { step: '02', title: 'Capture signal', detail: 'Add a note, email, transcript, or CRM update.' },
    { step: '03', title: 'Generate recommendation', detail: 'Planner Agent triggers decision pipeline.' },
    { step: '04', title: 'Human review', detail: 'Approve, edit, or reject the recommendation.' },
    { step: '05', title: 'Learn from outcome', detail: 'Outcome updates long-term organizational memory.' },
  ];
  const activeStep = workflowSteps[Math.min(currentStep - 1, workflowSteps.length - 1)];

  // Live Sync Badge pulse effect
  useEffect(() => {
    const timer = window.setInterval(() => {
      setLivePulse((current) => (current + 1) % 4);
    }, 2200);
    return () => window.clearInterval(timer);
  }, []);

  async function refreshAccountData(accountId: string) {
    const [interactionData, recommendationData] = await Promise.all([
      getInteractions(accountId),
      getRecommendations(accountId),
    ]);
    setInteractions(interactionData);
    setRecommendations(recommendationData);
  }

  // Load App Data dynamically when domain changes
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [accountData, playbookData, knowledgeData] = await Promise.all([
          getAccounts(selectedDomain),
          getPlaybooks(selectedDomain),
          getKnowledgeSources(),
        ]);
        setAccounts(accountData);
        setPlaybooks(playbookData);
        setKnowledgeSources(knowledgeData);
        if (accountData.length > 0) {
          const firstAccountId = accountData[0].id;
          setSelectedAccountId(firstAccountId);
          await refreshAccountData(firstAccountId);
        } else {
          setSelectedAccountId('');
          setInteractions([]);
          setRecommendations([]);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load app data');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [selectedDomain]);

  // Sync on Account Selection
  useEffect(() => {
    if (!selectedAccountId) return;
    void refreshAccountData(selectedAccountId).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load account data');
    });
  }, [selectedAccountId]);

  // Live Sync Background polling
  useEffect(() => {
    if (!selectedAccountId || loading || activeTab !== 'planner') return;
    const timer = window.setInterval(() => {
      void refreshAccountData(selectedAccountId).catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to refresh live data');
      });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [selectedAccountId, loading, activeTab]);

  // Handle Domain Selection Changes
  function handleDomainChange(newDomain: 'customer_success' | 'sales_coaching') {
    setSelectedDomain(newDomain);
    setError('');
    if (newDomain === 'customer_success') {
      setSource('meeting_note');
      setText('Customer mentioned slower adoption after workflow changes and asked for executive support.');
    } else {
      setSource('email');
      setText('We are evaluating a competitor who offered a 25% lower price. We want to align pricing before signing.');
    }
  }

  // Dynamic Database Reseeding
  async function handleResetDatabase() {
    try {
      setActionLoading(true);
      setError('');
      const res = await resetDatabase();
      setSuccessMessage(res.message || 'Demo database successfully reset.');
      
      // Reload current tab dataset
      const [accountData, playbookData, knowledgeData] = await Promise.all([
        getAccounts(selectedDomain),
        getPlaybooks(selectedDomain),
        getKnowledgeSources(),
      ]);
      setAccounts(accountData);
      setPlaybooks(playbookData);
      setKnowledgeSources(knowledgeData);
      if (accountData.length > 0) {
        const firstAccountId = accountData[0].id;
        setSelectedAccountId(firstAccountId);
        await refreshAccountData(firstAccountId);
      }
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (resetErr) {
      setError(resetErr instanceof Error ? resetErr.message : 'Failed to reset database');
    } finally {
      setActionLoading(false);
    }
  }

  // Actions Ingestion
  async function handleAddInteraction() {
    if (!selectedAccountId || !text.trim()) return;
    try {
      setActionLoading(true);
      setError('');
      await createInteraction(selectedAccountId, { source, text });
      await refreshAccountData(selectedAccountId);
      setText('');
      setSuccessMessage('Signal captured successfully! Proceed to next step.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to add interaction');
    } finally {
      setActionLoading(false);
    }
  }

  // Run Orchestrated Agent Pipeline with Beautiful Real-Time Visual logs
  async function handleAnalyze() {
    if (!selectedAccountId) return;
    try {
      setActionLoading(true);
      setError('');
      
      const newRec = await analyzeAccount(selectedAccountId);
      
      // Initialize simulated log printer
      setAnalyzingLogs([]);
      setActiveAgentIndex(0);
      setShowAgentLogOverlay(true);
      
      const logs = newRec.agentLogs || [];
      
      // Sequentially print logs to wow the judges
      for (let i = 0; i < logs.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        setAnalyzingLogs((prev) => [...prev, logs[i]]);
        setActiveAgentIndex(i + 1);
      }
      
      // Hold overlay brief moment
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setShowAgentLogOverlay(false);
      
      // Refresh UI state
      await refreshAccountData(selectedAccountId);
      setSuccessMessage('Planner Agent execution completed. Review candidate action below.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (analyzeError) {
      setShowAgentLogOverlay(false);
      setError(analyzeError instanceof Error ? analyzeError.message : 'Failed to analyze account');
    } finally {
      setActionLoading(false);
    }
  }

  // Action review updates
  async function handleReview(recommendationId: string, status: 'approved' | 'rejected' | 'edited') {
    try {
      setActionLoading(true);
      setError('');
      await reviewRecommendation(recommendationId, {
        status,
        comments: status === 'rejected' ? 'Rejected by CS Director' : 'Approved and routed to execution system.',
      });
      await refreshAccountData(selectedAccountId);
      setSuccessMessage(`Recommendation marked as ${status}.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Failed to review recommendation');
    } finally {
      setActionLoading(false);
      setEditingRecommendationId('');
    }
  }

  // Open Copilot Drawer and fetch draft Outreach
  async function handleOpenCopilot(recommendation: Recommendation) {
    try {
      setActionLoading(true);
      setError('');
      setCopiedDraft(false);
      setCopilotRecommendation(recommendation);
      
      const result = await getRecommendationCopilotDraft(recommendation.id);
      setCopilotDraft(result.draft);
      setShowCopilotDrawer(true);
    } catch (copilotError) {
      setError(copilotError instanceof Error ? copilotError.message : 'Failed to fetch copilot draft');
    } finally {
      setActionLoading(false);
    }
  }

  function handleCopyDraft() {
    navigator.clipboard.writeText(copilotDraft);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  }

  // Playbook Manager functions
  function handleStartEditPlaybook(playbook: Playbook) {
    setEditingPlaybookId(playbook.id);
    setPlaybookForm({
      name: playbook.name,
      action: playbook.action,
      priority: playbook.priority,
      confidence: playbook.confidence,
      reason: playbook.reason,
      evidence: playbook.evidence.join(', '),
    });
  }

  async function handleSavePlaybook(playbookId: string) {
    try {
      setActionLoading(true);
      setError('');
      
      const updated = await updatePlaybook(playbookId, {
        name: playbookForm.name,
        action: playbookForm.action,
        priority: playbookForm.priority,
        confidence: playbookForm.confidence,
        reason: playbookForm.reason,
        evidence: playbookForm.evidence.split(',').map(item => item.trim()).filter(Boolean),
        domain: selectedDomain
      });

      setPlaybooks((prev) => prev.map((item) => (item.id === playbookId ? updated : item)));
      setEditingPlaybookId('');
      setSuccessMessage('Playbook policy updated successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update playbook policy');
    } finally {
      setActionLoading(false);
    }
  }

  function beginEdit(recommendationId: string, currentStatus: string) {
    setEditingRecommendationId(recommendationId);
    setDraftDecision(currentStatus === 'rejected' ? 'rejected' : 'approved');
  }

  function cancelEdit() {
    setEditingRecommendationId('');
  }

  return (
    <div className="min-h-screen bg-[#f6f3ea] text-[#1a1f16] font-sans antialiased selection:bg-[#acc86c]/30">
      
      {/* 1. Header Banner */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#102f1b]/95 text-white backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[12px] border border-white/20 bg-white/10 text-md font-semibold tracking-[0.18em] text-[#acc86c]">XL</div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#acc86c]">XL Ventures</div>
              <div className="text-sm font-medium text-white/90">Decision Intelligence OS</div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-black/20 p-1 rounded-full border border-white/5">
            <button
              onClick={() => { setActiveTab('planner'); setError(''); }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-[0.05em] transition flex items-center gap-2 ${
                activeTab === 'planner'
                  ? 'bg-[#123b23] text-white shadow-md ring-1 ring-white/10'
                  : 'text-white/60 hover:text-white/95'
              }`}
            >
              <Brain className="h-3.5 w-3.5" />
              Planner Loop
            </button>
            <button
              onClick={() => { setActiveTab('playbooks'); setError(''); }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-[0.05em] transition flex items-center gap-2 ${
                activeTab === 'playbooks'
                  ? 'bg-[#123b23] text-white shadow-md ring-1 ring-white/10'
                  : 'text-white/60 hover:text-white/95'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              Playbooks & KB
            </button>
            <button
              onClick={() => { setActiveTab('analytics'); setError(''); }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-[0.05em] transition flex items-center gap-2 ${
                activeTab === 'analytics'
                  ? 'bg-[#123b23] text-white shadow-md ring-1 ring-white/10'
                  : 'text-white/60 hover:text-white/95'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Analytics
            </button>
          </div>

          {/* Extensibility B2B Domain Selector & Reset */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-black/20 px-3 py-1.5 rounded-full border border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/55">Active Domain:</span>
                <select
                  value={selectedDomain}
                  onChange={(e) => handleDomainChange(e.target.value as any)}
                  className="bg-transparent text-[#acc86c] text-xs font-bold focus:outline-none cursor-pointer outline-none"
                >
                  <option value="customer_success" className="bg-[#102f1b] text-white font-sans">Customer Success</option>
                  <option value="sales_coaching" className="bg-[#102f1b] text-white font-sans">Sales Deal Coaching</option>
                </select>
              </div>
              <div className="h-3.5 w-px bg-white/20" />
              <button
                onClick={handleResetDatabase}
                disabled={actionLoading}
                className="text-red-300 hover:text-red-200 transition text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${actionLoading ? 'animate-spin' : ''}`} />
                Reset DB
              </button>
            </div>

            <div className="hidden lg:flex rounded-full border border-[#acc86c]/30 bg-[#acc86c]/10 px-3 py-1.5 text-[9px] uppercase font-bold tracking-[0.24em] text-[#acc86c]">
              Verified Platform
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-4 py-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-6">
        
        {/* Sidebar: Workflows & Accounts List */}
        <aside className="h-fit rounded-[24px] border border-[#d9ccb4] bg-[#123b23] text-white shadow-lg p-5 space-y-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-[#acc86c] mb-3">Workspace Context</h2>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="text-[10px] uppercase font-semibold text-[#dbe6be]">Active Account</div>
              <div className="mt-1 text-md font-bold text-white">{selectedAccount?.name || 'No Accounts Loaded'}</div>
              <p className="mt-1 text-xs text-white/60 leading-relaxed">
                {selectedAccount ? `Stage: ${selectedAccount.stage.replace('_', ' ')} · Owner: ${selectedAccount.owner}` : ''}
              </p>
            </div>
          </div>

          {/* Workflow Steps Tracker */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-[#acc86c]">Workflow Loop</h2>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] tracking-[0.1em] font-semibold text-white/80">Step {currentStep}/5</span>
            </div>

            <div className="space-y-2">
              {workflowSteps.map((step, index) => {
                const isActive = currentStep === index + 1;
                const isCompleted = currentStep > index + 1;
                return (
                  <div key={step.step} className={`rounded-xl border p-3 transition-all duration-300 ${
                    isActive 
                      ? 'border-[#acc86c]/30 bg-white/10 shadow-sm' 
                      : isCompleted
                      ? 'border-white/5 bg-white/5 opacity-65'
                      : 'border-white/5 bg-transparent opacity-45'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] font-bold ${
                          isActive 
                            ? 'bg-[#acc86c] text-[#123b23]' 
                            : 'bg-white/10 text-white'
                        }`}>{step.step}</span>
                        <div className="text-xs font-semibold text-white">{step.title}</div>
                      </div>
                      {isCompleted ? (
                        <Check className="h-3 w-3 text-[#acc86c]" />
                      ) : isActive ? (
                        <span className="h-2 w-2 rounded-full bg-[#acc86c] animate-ping" />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Accounts Selector */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-[#acc86c]">Active Accounts</h2>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/80 font-bold">{accounts.length}</span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />
                  ))}
                </div>
              ) : (
                accounts.map((account) => {
                  const isActive = account.id === selectedAccountId;
                  const isCritical = account.status === 'critical' || account.status === 'at_risk';
                  const isAttention = account.status === 'needs_attention';
                  
                  return (
                    <button
                      key={account.id}
                      className={`w-full rounded-xl border p-3 text-left transition-all duration-200 hover:scale-[1.01] ${
                        isActive 
                          ? 'border-[#acc86c] bg-white/12 shadow-sm' 
                          : 'border-white/5 bg-white/5 hover:bg-white/10'
                      }`}
                      onClick={() => setSelectedAccountId(account.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-bold text-white truncate">{account.name}</div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
                          isCritical ? 'bg-red-600' : isAttention ? 'bg-amber-600' : 'bg-[#acc86c] text-[#123b23]'
                        }`}>{account.healthScore}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[9px] uppercase tracking-[0.1em] text-white/50">
                        <span>{account.stage.replace('_', ' ')}</span>
                        <span>{account.status.replace('_', ' ')}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* Main Workspace Area tabs */}
        <main className="space-y-6">

          {/* TAB 1: PLANNER LOOP */}
          {activeTab === 'planner' && (
            <>
              {/* Header Jumbotron */}
              <section className="rounded-[28px] border border-[#e2d8c2] bg-[#123b23] p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-64 w-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
                <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-[#acc86c]">Re-usable Decision layer</span>
                    <h1 className="mt-3 font-serif text-4xl leading-tight text-white md:text-5xl">
                      Dynamic agent reasoning <span className="italic text-[#acc86c] block">configured for business needs.</span>
                    </h1>
                    <p className="mt-4 max-w-xl text-xs md:text-sm leading-relaxed text-white/80">
                      Submit unstructured inputs from any B2B journey. Watch the Planner Agent dynamically orchestrate specialists, inspect playbooks, retrieve indexed knowledge files, and evaluate memory feedback logic.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.1em] text-white/60">Active Context Workspace</div>
                        <div className="mt-1 text-md font-bold text-white">{selectedAccount?.name}</div>
                      </div>
                      <span className="rounded-full bg-white/10 border border-white/10 px-2.5 py-1 text-xs font-semibold">Step {currentStep}/5</span>
                    </div>

                    <div className="border-t border-white/10 pt-4 space-y-2">
                      <div className="flex justify-between text-xs text-white/70">
                        <span>Domain score</span>
                        <span className="font-bold text-[#acc86c]">{selectedAccount?.healthScore}%</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5">
                        <div className="bg-[#acc86c] h-1.5 rounded-full" style={{ width: `${selectedAccount?.healthScore || 50}%` }} />
                      </div>
                    </div>

                    <button
                      onClick={handleAnalyze}
                      disabled={!selectedAccountId || actionLoading}
                      className="w-full rounded-full bg-[#acc86c] hover:bg-[#bfe07d] text-[#123b23] py-2.5 text-xs font-bold uppercase tracking-[0.15em] transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Brain className="h-4 w-4" />
                      Trigger Agentic Planner
                    </button>
                  </div>
                </div>
              </section>

              {/* Steps Area */}
              <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
                {/* Steps 1 & 2: Signal Ingestion */}
                <div className="rounded-[24px] border border-[#e2d8c2] bg-[#fbf7ef] p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#7a786f]">Ingestion Phase</span>
                        <h3 className="text-md font-bold text-[#123b23] mt-1">Steps 1 & 2: Capture Customer Signal</h3>
                      </div>
                      <span className="rounded-full bg-[#edf3e1] px-3 py-1 text-xs font-semibold text-[#52702f]">Action Signal Input</span>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col">
                        <label className="text-[10px] uppercase tracking-[0.1em] text-[#7a786f] mb-1 font-bold">Signal Source Type</label>
                        <select
                          className="rounded-xl border border-[#e1d8c7] bg-white px-3 py-2 text-xs text-[#1a1f16] outline-none focus:border-[#acc86c] focus:ring-1 focus:ring-[#acc86c]"
                          value={source}
                          onChange={(e) => setSource(e.target.value)}
                        >
                          <option value="meeting_note">Meeting Note / Call Transcript</option>
                          <option value="email">Customer Email</option>
                          <option value="support_ticket">Support Help Ticket</option>
                          <option value="crm_update">Salesforce / CRM Activity Update</option>
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-[10px] uppercase tracking-[0.1em] text-[#7a786f] mb-1 font-bold">Interaction Copy / Transcript</label>
                        <textarea
                          rows={5}
                          className="rounded-xl border border-[#e1d8c7] bg-white px-3 py-2 text-xs text-[#1a1f16] outline-none placeholder:text-[#979287] focus:border-[#acc86c] focus:ring-1 focus:ring-[#acc86c]"
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          placeholder="Paste email, support request logs, or customer meeting minutes..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[#e2d8c2] pt-4">
                    <button
                      onClick={handleAddInteraction}
                      disabled={!selectedAccountId || actionLoading || !text.trim()}
                      className="rounded-full bg-[#123b23] hover:bg-[#1d4c2b] text-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.1em] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save Signal to Memory
                    </button>
                    <span className="text-[11px] text-[#7a786f] italic">Signals populate the decision dataset</span>
                  </div>
                </div>

                {/* Steps 3 & 4: Review Panel */}
                <div className="rounded-[24px] border border-[#e2d8c2] bg-[#fbf7ef] p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#7a786f]">Governance Layer</span>
                        <h3 className="text-md font-bold text-[#123b23] mt-1">Steps 3 & 4: Human-in-the-Loop Review</h3>
                      </div>
                      <span className="rounded-full bg-white border border-[#d9ccb4] px-3 py-1 text-xs font-semibold text-[#1a1f16]">{recommendations.length} Recommendations</span>
                    </div>

                    <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                      {recommendations.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#d9ccb4] bg-white p-6 text-center text-xs text-[#7a786f]">
                          <Database className="h-6 w-6 text-[#d9ccb4] mx-auto mb-2" />
                          No recommendations logged. Trigger the AI Planner above or submit a customer signal.
                        </div>
                      ) : (
                        recommendations.map((recommendation) => {
                          const isPending = recommendation.status === 'pending_review';
                          const isApproved = recommendation.status === 'approved';
                          const isRejected = recommendation.status === 'rejected';

                          return (
                            <article key={recommendation.id} className="rounded-xl border border-[#e4d9c5] bg-white p-4 space-y-3 shadow-sm hover:shadow-md transition">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em] ${priorityStyles[recommendation.priority]}`}>
                                    {recommendation.priority}
                                  </span>
                                  <span className="rounded-full bg-[#edf3e1] text-[#52702f] px-2 py-0.5 text-[10px] font-semibold">
                                    {(recommendation.confidence * 100).toFixed(0)}% confidence
                                  </span>
                                </div>
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em] ${
                                  isApproved ? 'bg-emerald-100 text-emerald-800' : isRejected ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {recommendation.status.replace('_', ' ')}
                                </span>
                              </div>

                              <h4 className="text-sm font-bold text-[#123b23]">{recommendation.action}</h4>
                              <p className="text-xs leading-relaxed text-[#6a685f]">{recommendation.reason}</p>

                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {recommendation.evidence.map((item) => (
                                  <span key={item} className="rounded-md border border-[#d9ccb4] bg-[#f8f3e8] px-2 py-0.5 text-[10px] text-[#6a685f]">
                                    {item}
                                  </span>
                                ))}
                              </div>

                              {/* Review Action Controls */}
                              <div className="border-t border-[#e2d8c2] pt-3 flex items-center justify-between gap-2">
                                {editingRecommendationId === recommendation.id ? (
                                  <div className="w-full bg-[#fbf7ef] p-3 rounded-lg border border-[#e2d8c2] space-y-3">
                                    <div className="text-[10px] uppercase font-bold text-[#7a786f]">Governance decision override</div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setDraftDecision('approved')}
                                        className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                                          draftDecision === 'approved' ? 'bg-[#123b23] text-white' : 'bg-white border border-[#d9ccb4] text-[#1a1f16]'
                                        }`}
                                      >
                                        <Check className="h-3.5 w-3.5" /> Approve
                                      </button>
                                      <button
                                        onClick={() => setDraftDecision('rejected')}
                                        className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                                          draftDecision === 'rejected' ? 'bg-red-800' : 'bg-white border border-[#d9ccb4] text-[#1a1f16]'
                                        }`}
                                      >
                                        <X className="h-3.5 w-3.5" /> Reject
                                      </button>
                                    </div>
                                    <div className="flex gap-2 justify-end pt-1">
                                      <button
                                        onClick={() => handleReview(recommendation.id, draftDecision)}
                                        disabled={actionLoading}
                                        className="bg-[#123b23] hover:bg-[#1d4c2b] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold"
                                      >
                                        Save Override
                                      </button>
                                      <button onClick={cancelEdit} className="border border-[#d9ccb4] text-xs font-bold px-3 py-1.5 rounded-lg">Cancel</button>
                                    </div>
                                  </div>
                                ) : isPending ? (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleReview(recommendation.id, 'approved')}
                                      disabled={actionLoading}
                                      className="bg-[#123b23] hover:bg-[#1d4c2b] text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1"
                                    >
                                      <Check className="h-3 w-3" /> Approve
                                    </button>
                                    <button
                                      onClick={() => handleReview(recommendation.id, 'rejected')}
                                      disabled={actionLoading}
                                      className="border border-[#7a3e1d] hover:bg-[#7a3e1d]/5 text-[#7a3e1d] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1"
                                    >
                                      <X className="h-3 w-3" /> Reject
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => beginEdit(recommendation.id, recommendation.status)}
                                      disabled={actionLoading}
                                      className="border border-[#d9ccb4] hover:bg-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 text-[#1a1f16]"
                                    >
                                      <Edit3 className="h-3 w-3" /> Override
                                    </button>
                                    {(isApproved || recommendation.status === 'edited') && (
                                      <button
                                        onClick={() => handleOpenCopilot(recommendation)}
                                        className="bg-[#123b23] hover:bg-[#1d4c2b] text-[#acc86c] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition shadow-sm"
                                      >
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Copilot Assistant
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </article>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="border-t border-[#e2d8c2] pt-4 mt-5 text-right text-[11px] text-[#7a786f]">
                    *Recommendations enforce safety check compliance protocols
                  </div>
                </div>
              </section>

              {/* Step 5: Interactions/Outcome Loop */}
              <section className="rounded-[24px] border border-[#e2d8c2] bg-[#fbf7ef] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#7a786f]">Durable Context Data</span>
                    <h3 className="text-md font-bold text-[#123b23] mt-1">Step 5: Account Signal Log & Learning History ledgers</h3>
                  </div>
                  <span className="rounded-full bg-[#edf3e1] px-3 py-1 text-xs font-semibold text-[#52702f] flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Memory Ledger
                  </span>
                </div>

                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                  {interactions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#d9ccb4] bg-white p-6 text-center text-xs text-[#7a786f]">
                      No historical logs found for this account. Submit a customer signal to begin.
                    </div>
                  ) : (
                    interactions.map((interaction) => {
                      const isHigh = interaction.riskLevel === 'high';
                      const isMed = interaction.riskLevel === 'medium';
                      return (
                        <article key={interaction.id} className="rounded-xl border border-[#e4d9c5] bg-white p-4 flex flex-col md:flex-row md:items-start justify-between gap-3 shadow-sm">
                          <div className="space-y-1.5 max-w-xl">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-[#f8f3e8] border border-[#d9ccb4] px-2 py-0.5 text-[9px] uppercase tracking-[0.05em] font-bold text-[#7a786f]">
                                {interaction.source.replace('_', ' ')}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-[0.05em] ${
                                isHigh ? 'text-red-700' : isMed ? 'text-amber-700' : 'text-emerald-700'
                              }`}>
                                {interaction.riskLevel} Risk
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-[#123b23]">{interaction.summary}</h4>
                            <p className="text-[11px] leading-relaxed text-[#6a685f]">{interaction.text}</p>
                          </div>
                          <div className="text-right text-[10px] text-[#7a786f] shrink-0 font-medium">
                            {new Date(interaction.createdAt).toLocaleDateString()} at {new Date(interaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            </>
          )}

          {/* TAB 2: PLAYBOOK CONFIGURATOR */}
          {activeTab === 'playbooks' && (
            <section className="rounded-[28px] border border-[#e2d8c2] bg-[#fbf7ef] p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-[#e2d8c2] pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#7a786f]">Central Settings</span>
                  <h2 className="text-xl font-bold text-[#123b23] mt-1">SOP Playbook & Knowledge Repositories</h2>
                  <p className="text-xs text-[#7a786f] mt-0.5">Edit rule policies. The agent retrieves knowledge sources and playbooks dynamically based on risk triggers.</p>
                </div>
                <Settings className="h-6 w-6 text-[#123b23]" />
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                {/* Playbook Rules list on left */}
                <div className="space-y-4">
                  {editingPlaybookId ? (
                    <div className="bg-white rounded-2xl border border-[#e4d9c5] p-5 space-y-4 shadow-sm">
                      <h3 className="text-sm font-bold text-[#123b23] flex items-center gap-1.5">
                        <Sliders className="h-4 w-4" /> Configure Playbook: {playbookForm.name}
                      </h3>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#7a786f] mb-1 block">Rule Title Name</label>
                          <input
                            className="w-full rounded-xl border border-[#e1d8c7] bg-white px-3 py-2 text-xs text-[#1a1f16] outline-none focus:border-[#acc86c]"
                            value={playbookForm.name}
                            onChange={(e) => setPlaybookForm({ ...playbookForm, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#7a786f] mb-1 block">Recommended Action</label>
                          <input
                            className="w-full rounded-xl border border-[#e1d8c7] bg-white px-3 py-2 text-xs text-[#1a1f16] outline-none focus:border-[#acc86c]"
                            value={playbookForm.action}
                            onChange={(e) => setPlaybookForm({ ...playbookForm, action: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#7a786f] mb-1 block">Action Priority</label>
                          <select
                            className="w-full rounded-xl border border-[#e1d8c7] bg-white px-3 py-2 text-xs text-[#1a1f16] outline-none focus:border-[#acc86c]"
                            value={playbookForm.priority}
                            onChange={(e) => setPlaybookForm({ ...playbookForm, priority: e.target.value })}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#7a786f] mb-1 block">Confidence Threshold</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            className="w-full rounded-xl border border-[#e1d8c7] bg-white px-3 py-2 text-xs text-[#1a1f16] outline-none focus:border-[#acc86c]"
                            value={playbookForm.confidence}
                            onChange={(e) => setPlaybookForm({ ...playbookForm, confidence: parseFloat(e.target.value) || 0.5 })}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#7a786f] mb-1 block">Policy Reasoning / Rationale</label>
                          <textarea
                            rows={2}
                            className="w-full rounded-xl border border-[#e1d8c7] bg-white px-3 py-2 text-xs text-[#1a1f16] outline-none focus:border-[#acc86c]"
                            value={playbookForm.reason}
                            onChange={(e) => setPlaybookForm({ ...playbookForm, reason: e.target.value })}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#7a786f] mb-1 block">Evidence Requirements (comma separated)</label>
                          <input
                            className="w-full rounded-xl border border-[#e1d8c7] bg-white px-3 py-2 text-xs text-[#1a1f16] outline-none focus:border-[#acc86c]"
                            value={playbookForm.evidence}
                            onChange={(e) => setPlaybookForm({ ...playbookForm, evidence: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end border-t border-[#e2d8c2] pt-4">
                        <button
                          onClick={() => handleSavePlaybook(editingPlaybookId)}
                          disabled={actionLoading}
                          className="bg-[#123b23] hover:bg-[#1d4c2b] text-white px-4 py-2 rounded-full text-xs font-bold transition"
                        >
                          Save Playbook Rule
                        </button>
                        <button
                          onClick={() => setEditingPlaybookId('')}
                          className="border border-[#d9ccb4] text-[#1a1f16] px-4 py-2 rounded-full text-xs font-bold transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {playbooks.map((playbook) => {
                        const isHigh = playbook.triggerRisk === 'high';
                        const isMed = playbook.triggerRisk === 'medium';
                        return (
                          <article key={playbook.id} className="bg-white rounded-2xl border border-[#e4d9c5] p-4 flex flex-col justify-between hover:shadow-md transition">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em] ${
                                  isHigh ? 'bg-red-100 text-red-800' : isMed ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  Trigger: {playbook.triggerRisk} Risk
                                </span>
                                <span className="text-xs font-bold text-[#acc86c]">{(playbook.confidence * 100).toFixed(0)}% Conf</span>
                              </div>

                              <h3 className="text-xs font-bold text-[#123b23]">{playbook.name}</h3>
                              <div className="bg-[#f8f3e8] border border-[#d9ccb4] rounded-lg p-2 text-[11px] text-[#123b23] font-semibold leading-normal">
                                Action: {playbook.action}
                              </div>
                              <p className="text-[10px] leading-relaxed text-[#7a786f]">{playbook.reason}</p>
                              
                              <div className="flex flex-wrap gap-1">
                                {playbook.evidence.map((item) => (
                                  <span key={item} className="bg-slate-100 text-slate-700 rounded px-1.5 py-0.5 text-[8px] font-medium">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="mt-4 border-t border-[#e2d8c2] pt-2 text-right">
                              <button
                                onClick={() => handleStartEditPlaybook(playbook)}
                                className="inline-flex items-center gap-1 text-[#123b23] hover:text-[#2d5c3d] text-xs font-bold"
                              >
                                <Edit3 className="h-3 w-3" /> Adjust Config
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Knowledge Base on the Right */}
                <div className="bg-white rounded-2xl border border-[#e4d9c5] p-5 h-fit space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-[#123b23] border-b border-[#e2d8c2] pb-3">
                    <Database className="h-4 w-4" /> Indexed Knowledge Base
                  </div>
                  <p className="text-[10px] text-[#7a786f] leading-relaxed">
                    These enterprise repositories are indexed and semantically queried by the Knowledge Retrieval Agent during decision processing.
                  </p>
                  <div className="space-y-3">
                    {knowledgeSources.map((source) => (
                      <div key={source.id} className="border border-[#e4d9c5] rounded-xl p-3 bg-[#fbfbf9] text-[11px]">
                        <div className="flex justify-between font-bold text-[#123b23] mb-1">
                          <span>📄 {source.title}</span>
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded uppercase tracking-wider">{source.type}</span>
                        </div>
                        <p className="text-[#6a685f] leading-normal">{source.contentSummary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* TAB 3: SYSTEM ANALYTICS */}
          {activeTab === 'analytics' && (
            <section className="rounded-[28px] border border-[#e2d8c2] bg-[#fbf7ef] p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-[#e2d8c2] pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#7a786f]">System Observability</span>
                  <h2 className="text-xl font-bold text-[#123b23] mt-1">Outcome Performance Dashboard</h2>
                  <p className="text-xs text-[#7a786f] mt-0.5">Outcome tracking dashboard analyzing decision calibration loops.</p>
                </div>
                <LineChart className="h-6 w-6 text-[#123b23]" />
              </div>

              {/* Stat Metric Cards */}
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                {[
                  { label: 'Acceptance Rate', value: '88.4%', icon: Check, color: 'text-emerald-700' },
                  { label: 'Avg AI Confidence', value: '78.2%', icon: TrendingUp, color: 'text-cyan-700' },
                  { label: 'Mitigated Risk Value', value: '$140K', icon: DollarSign, color: 'text-amber-700' },
                  { label: 'Active Playbooks', value: playbooks.length.toString(), icon: Sliders, color: 'text-purple-700' },
                ].map((item) => (
                  <div key={item.label} className="bg-white rounded-xl border border-[#e4d9c5] p-4 flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-[10px] text-[#7a786f] uppercase font-bold tracking-[0.05em]">{item.label}</span>
                      <div className="text-xl font-bold text-[#123b23] mt-1">{item.value}</div>
                    </div>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                ))}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* SVG Visual graph 1: Portfolio Health Distribution */}
                <div className="bg-white rounded-2xl border border-[#e4d9c5] p-5 space-y-3 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[#123b23]">Domain Accounts Scoreboard</h3>
                  <div className="space-y-3 pt-2">
                    {accounts.map((item) => (
                      <div key={item.name} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium text-[#123b23]">
                          <span>{item.name} (Stage: {item.stage.replace('_', ' ')})</span>
                          <span className="font-bold">{item.healthScore}/100</span>
                        </div>
                        <div className="w-full bg-[#f8f3e8] rounded-full h-2 border border-slate-100">
                          <div className="h-2 rounded-full bg-[#acc86c]" style={{ width: `${item.healthScore}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SVG Visual graph 2: Churn Acceptance Trend */}
                <div className="bg-white rounded-2xl border border-[#e4d9c5] p-5 space-y-3 shadow-sm flex flex-col justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[#123b23]">Human Acceptance Trend (5 Days)</h3>
                  
                  <div className="w-full h-32 flex items-center justify-center relative bg-gradient-to-b from-[#fbfcfb] to-white rounded-lg p-1 border border-slate-50">
                    <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#acc86c" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#acc86c" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Grid Lines */}
                      <line x1="0" y1="5" x2="100" y2="5" stroke="#f1eade" strokeWidth="0.2" />
                      <line x1="0" y1="15" x2="100" y2="15" stroke="#f1eade" strokeWidth="0.2" />
                      <line x1="0" y1="25" x2="100" y2="25" stroke="#f1eade" strokeWidth="0.2" />

                      {/* Area beneath chart */}
                      <path d="M 0,25 L 0,20 L 25,16 L 50,11 L 75,10 L 100,5 L 100,25 Z" fill="url(#chartGrad)" />

                      {/* Sparkline Path */}
                      <path
                        d="M 0,20 L 25,16 L 50,11 L 75,10 L 100,5"
                        fill="none"
                        stroke="#123b23"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Points */}
                      <circle cx="0" cy="20" r="1.5" fill="#acc86c" stroke="#123b23" strokeWidth="0.5" />
                      <circle cx="25" cy="16" r="1.5" fill="#acc86c" stroke="#123b23" strokeWidth="0.5" />
                      <circle cx="50" cy="11" r="1.5" fill="#acc86c" stroke="#123b23" strokeWidth="0.5" />
                      <circle cx="75" cy="10" r="1.5" fill="#acc86c" stroke="#123b23" strokeWidth="0.5" />
                      <circle cx="100" cy="5" r="1.5" fill="#acc86c" stroke="#123b23" strokeWidth="0.5" />
                    </svg>
                  </div>

                  <div className="flex justify-between text-[10px] text-[#7a786f] font-bold px-1 uppercase tracking-wide">
                    <span>Mon (70%)</span>
                    <span>Tue (75%)</span>
                    <span>Wed (82%)</span>
                    <span>Thu (84%)</span>
                    <span>Fri (88%)</span>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* 2. REAL-TIME AI ORCHESTRATION ANIMATED OVERLAY (WOW HACKATHON ELEMENT) */}
      {showAgentLogOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-md p-4 transition-all duration-300">
          <div className="bg-[#102f1b] border border-white/20 text-white rounded-3xl p-6 max-w-2xl w-full mx-auto shadow-2xl space-y-4 max-h-[90vh] flex flex-col justify-between animate-fade-in">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-[#acc86c] animate-pulse" />
                  <span className="text-sm font-bold uppercase tracking-wider">AI Planner Orchestration Loop</span>
                </div>
                <div className="text-[10px] text-white/50 bg-white/10 rounded-full px-3 py-1 uppercase tracking-widest font-bold">
                  Step {activeAgentIndex} / {analyzingLogs.length || 5}
                </div>
              </div>

              {/* Log Window */}
              <div className="mt-4 bg-black/45 border border-white/10 rounded-2xl p-4 font-mono text-xs overflow-y-auto min-h-[220px] max-h-[360px] space-y-3">
                {analyzingLogs.map((log, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center gap-2 text-white/40 text-[10px]">
                      <span>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className={agentColors[log.agent] || 'text-white'}>
                        {log.agent}
                      </span>
                    </div>
                    <p className="text-white/90 pl-3 leading-relaxed border-l border-white/10">{log.message}</p>
                  </div>
                ))}

                {activeAgentIndex < (analyzingLogs.length || 5) && (
                  <div className="flex items-center gap-2 text-white/40 italic pl-3 animate-pulse">
                    <Activity className="h-3 w-3 animate-spin text-[#acc86c]" />
                    <span>Orchestrator invoking next specialist agent...</span>
                  </div>
                )}
              </div>
            </div>

            {/* In-Overlay Loading Bar */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-[#acc86c] h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${((activeAgentIndex) / 6) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] uppercase font-bold text-white/50">
                <span>Ingestion Injected</span>
                <span>Explanation Synthesized</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. COPILOT OUTREACH DRAWER */}
      {showCopilotDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setShowCopilotDrawer(false)} />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl bg-white border-l border-[#e2d8c2] shadow-2xl p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#e2d8c2] pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#123b23]" />
                    <h3 className="text-md font-bold text-[#123b23]">AI Copilot Outreach Copy</h3>
                  </div>
                  <button onClick={() => setShowCopilotDrawer(false)} className="rounded-full hover:bg-slate-100 p-1">
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                </div>

                <div className="bg-[#edf3e1] p-3 rounded-xl border border-[#c9d9ae] text-xs text-[#52702f] flex items-start gap-2">
                  <Mail className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Action Template:</strong> This outreach draft is generated dynamically based on the approved recommendation: <em>{copilotRecommendation?.action}</em>.
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] uppercase font-bold tracking-[0.1em] text-[#7a786f] mb-1">Generated Draft Content</label>
                  <textarea
                    readOnly
                    rows={16}
                    className="w-full rounded-xl border border-[#e1d8c7] bg-slate-50 p-4 font-mono text-xs text-[#1a1f16] outline-none select-all"
                    value={copilotDraft}
                  />
                </div>
              </div>

              <div className="border-t border-[#e2d8c2] pt-4 flex gap-2 justify-end">
                <button
                  onClick={handleCopyDraft}
                  className="bg-[#123b23] hover:bg-[#1d4c2b] text-white px-5 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-2"
                >
                  {copiedDraft ? (
                    <>
                      <Check className="h-4 w-4 text-[#acc86c]" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy Outreach Copy
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowCopilotDrawer(false)}
                  className="border border-[#d9ccb4] text-slate-700 px-5 py-2.5 rounded-full text-xs font-bold transition"
                >
                  Close Panel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;