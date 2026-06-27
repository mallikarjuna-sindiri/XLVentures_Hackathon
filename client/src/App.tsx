import { useEffect, useMemo, useState } from 'react';
import {
  analyzeAccount,
  createInteraction,
  getAccounts,
  getInteractions,
  getRecommendations,
  reviewRecommendation,
} from './lib/api';
import type { Account, Interaction, Recommendation } from './types';

const priorityStyles: Record<string, string> = {
  high: 'bg-[#f0e6d3] text-[#7a3e1d] ring-1 ring-[#d8c7a5]',
  medium: 'bg-[#edf3e1] text-[#52702f] ring-1 ring-[#c9d9ae]',
  low: 'bg-[#e7f0da] text-[#44652d] ring-1 ring-[#b7d08b]',
};

function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [source, setSource] = useState('meeting_note');
  const [text, setText] = useState('Customer mentioned slower adoption and asked for executive support.');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [livePulse, setLivePulse] = useState(0);
  const [error, setError] = useState('');

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId),
    [accounts, selectedAccountId],
  );

  const pendingRecommendations = recommendations.filter((item) => item.status === 'pending_review').length;
  const currentStep = recommendations.length > 0 ? 4 : interactions.length > 0 ? 3 : 2;

  const workflowSteps = [
    { step: '01', title: 'Select account', detail: 'Pick the customer workspace from the sidebar.' },
    { step: '02', title: 'Capture signal', detail: 'Add a note, email, transcript, or CRM update.' },
    { step: '03', title: 'Generate recommendation', detail: 'The backend creates the next best action.' },
    { step: '04', title: 'Human review', detail: 'Approve, edit, or reject the recommendation.' },
    { step: '05', title: 'Learn from outcome', detail: 'Store the result for the next turn.' },
  ];
  const activeStep = workflowSteps[Math.min(currentStep - 1, workflowSteps.length - 1)];

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

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const accountData = await getAccounts();
        setAccounts(accountData);
        if (accountData.length > 0) {
          const firstAccountId = accountData[0].id;
          setSelectedAccountId(firstAccountId);
          await refreshAccountData(firstAccountId);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load app data');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  useEffect(() => {
    if (!selectedAccountId) return;

    void refreshAccountData(selectedAccountId).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load account data');
    });
  }, [selectedAccountId]);

  useEffect(() => {
    if (!selectedAccountId || loading) return;

    const timer = window.setInterval(() => {
      void refreshAccountData(selectedAccountId).catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to refresh live data');
      });
    }, 12000);

    return () => window.clearInterval(timer);
  }, [selectedAccountId, loading]);

  async function handleAddInteraction() {
    if (!selectedAccountId || !text.trim()) return;

    try {
      setActionLoading(true);
      await createInteraction(selectedAccountId, { source, text });
      await refreshAccountData(selectedAccountId);
      setText('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to add interaction');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAnalyze() {
    if (!selectedAccountId) return;

    try {
      setActionLoading(true);
      await analyzeAccount(selectedAccountId);
      await refreshAccountData(selectedAccountId);
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : 'Failed to analyze account');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReview(recommendationId: string, status: 'approved' | 'rejected' | 'edited') {
    try {
      setActionLoading(true);
      await reviewRecommendation(recommendationId, {
        status,
        comments: status === 'rejected' ? 'Needs review by manager' : 'Reviewed in demo',
      });
      await refreshAccountData(selectedAccountId);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Failed to review recommendation');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f3ea] text-[#1a1f16]">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#102f1b]/96 text-white backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-[14px] border border-white/15 bg-white/10 text-lg font-semibold tracking-[0.18em] text-white">XL</div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.32em] text-[#acc86c]">XL Ventures</div>
              <div className="text-sm text-white/85">Next Best Action Platform</div>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <LiveBadge active={livePulse % 2 === 0} />
            <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs text-white/80">Auto-refresh every 12s</span>
          </div>

          <div className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/80">
            Demo workspace
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-4 py-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-6">
        <aside className="sticky top-24 h-[calc(100vh-7rem)] overflow-hidden rounded-[32px] border border-[#d9ccb4] bg-[#123b23] text-white shadow-[0_20px_70px_rgba(13,43,25,0.18)]">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-[14px] border border-white/15 bg-white/10 text-lg font-semibold tracking-[0.18em] text-white">XL</div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.34em] text-[#acc86c]">XL Ventures</div>
                <div className="text-sm text-white/85">User friendly workflow</div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-6 text-white/70">Choose an account on the left, follow the steps, and review the recommendation in the main area.</p>
          </div>

          <div className="h-[calc(100%-5.8rem)] overflow-y-auto px-5 py-5">
            <div className="space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-[#dbe6be]">Workflow</h2>
                  <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/80">Step {currentStep}/5</span>
                </div>

                <div className="space-y-2">
                  {workflowSteps.map((step, index) => {
                    const isActive = currentStep === index + 1;
                    return (
                      <div key={step.step} className={`rounded-[22px] border p-4 ${isActive ? 'border-white/20 bg-white/12' : 'border-white/10 bg-white/8'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="rounded-full bg-[#acc86c]/18 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-[#dbe6be]">{step.step}</span>
                            <div className="font-medium text-white">{step.title}</div>
                          </div>
                          <span className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-[#acc86c]' : 'bg-white/35'}`} />
                        </div>
                        <p className="mt-2 text-xs leading-6 text-white/70">{step.detail}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-[#dbe6be]">Accounts</h2>
                  <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/80">{accounts.length}</span>
                </div>

                <div className="space-y-2">
                  {loading ? (
                    <SkeletonList />
                  ) : (
                    accounts.map((account) => {
                      const isActive = account.id === selectedAccountId;
                      return (
                        <button
                          key={account.id}
                          className={`w-full rounded-[22px] border p-4 text-left transition ${isActive ? 'border-white/20 bg-white/12' : 'border-white/10 bg-white/8 hover:bg-white/12'}`}
                          onClick={() => setSelectedAccountId(account.id)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-white">{account.name}</div>
                              <div className="mt-1 text-xs text-white/65">Owner {account.owner}</div>
                            </div>
                            <span className="rounded-full bg-[#acc86c]/15 px-3 py-1 text-xs text-[#dbe6be]">{account.healthScore}</span>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-white/65">
                            <span>{account.stage}</span>
                            <span>{account.status}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                <div className="text-[11px] uppercase tracking-[0.26em] text-[#dbe6be]">Active account</div>
                <div className="mt-2 text-lg font-semibold text-white">{selectedAccount?.name || 'Select an account'}</div>
                <p className="mt-2 text-xs leading-6 text-white/70">{selectedAccount ? `Stage ${selectedAccount.stage} · Owner ${selectedAccount.owner}` : 'Nothing is selected yet.'}</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="space-y-6">
          {error ? <div className="rounded-2xl border border-[#d7c7a8] bg-[#fbf5e7] px-4 py-3 text-sm text-[#7a3e1d] shadow-sm">{error}</div> : null}

          <section className="rounded-[32px] border border-[#e2d8c2] bg-[#123b23] p-6 text-white shadow-sm lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-[11px] uppercase tracking-[0.38em] text-[#acc86c]">Guided workflow</p>
                <h1 className="mt-4 font-serif text-5xl leading-[0.95] text-white sm:text-6xl lg:text-[4.8rem]">
                  One simple path. <span className="italic text-[#acc86c]">One next action.</span>
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-white/78 sm:text-lg">
                  The screen now behaves like a guide: pick an account, add one signal, generate one recommendation, then review it. No extra decisions in the way.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Signals', value: interactions.length },
                    { label: 'Pending review', value: pendingRecommendations },
                    { label: 'Current step', value: currentStep },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-white/60">{item.label}</div>
                      <div className="mt-1 text-2xl font-semibold text-[#f6f3ea]">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/12 bg-white/8 p-5 backdrop-blur-md">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.28em] text-[#dbe6be]">Current step</div>
                    <div className="mt-1 text-2xl font-semibold text-white">{activeStep.title}</div>
                  </div>
                  <span className="rounded-full border border-[#acc86c]/30 bg-[#acc86c]/12 px-3 py-1 text-xs text-[#dbe6be]">Step {currentStep}/5</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-white/75">{activeStep.detail}</p>

                <div className="mt-5 rounded-[22px] border border-white/10 bg-black/10 p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/60">
                    <span>Selected account</span>
                    <span className="rounded-full bg-[#acc86c]/15 px-2 py-1 text-[#dbe6be]">{selectedAccount?.status || 'idle'}</span>
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">{selectedAccount?.name || 'Select an account on the left'}</div>
                  <p className="mt-2 text-xs leading-6 text-white/70">{selectedAccount ? `${selectedAccount.stage} · Owner ${selectedAccount.owner}` : 'Start by choosing the customer workspace.'}</p>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={handleAnalyze}
                    disabled={!selectedAccountId || actionLoading}
                    className="rounded-full bg-[#acc86c] px-4 py-2 text-sm font-medium text-[#123b23] transition hover:bg-[#c1d77e] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Generate recommendation
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
            <div className="rounded-[28px] border border-[#e2d8c2] bg-[#fbf7ef] p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[#123b23]">Step 1 and 2</h3>
                  <p className="mt-1 text-xs text-[#7a786f]">Select the account, then add a single signal.</p>
                </div>
                <span className="rounded-full bg-[#edf3e1] px-3 py-1 text-xs text-[#52702f]">Most common action</span>
              </div>

              <div className="mt-4 grid gap-3">
                <input
                  className="rounded-2xl border border-[#e1d8c7] bg-[#fbf7ef] px-4 py-3 text-sm text-[#1a1f16] outline-none placeholder:text-[#979287] focus:border-[#7ea84b]"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  placeholder="Signal source"
                />
                <textarea
                  className="min-h-36 rounded-2xl border border-[#e1d8c7] bg-[#fbf7ef] px-4 py-3 text-sm text-[#1a1f16] outline-none placeholder:text-[#979287] focus:border-[#7ea84b]"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Paste one customer note, email, transcript, or CRM update"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleAddInteraction}
                    disabled={!selectedAccountId || actionLoading}
                    className="rounded-full bg-[#123b23] px-4 py-2.5 text-sm font-medium text-[#f6f3ea] transition hover:bg-[#1d4c2b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save and continue
                  </button>
                  <p className="text-xs text-[#7a786f]">This moves the workflow forward with one click.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#e2d8c2] bg-[#fbf7ef] p-6 text-[#1a1f16] shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[#123b23]">Step 3 and 4</h3>
                  <p className="mt-1 text-xs text-[#6a685f]">Generate one recommendation, then review it.</p>
                </div>
                <span className="rounded-full bg-[#edf3e1] px-3 py-1 text-xs text-[#52702f]">{recommendations.length} items</span>
              </div>

              <div className="mt-4 space-y-4">
                {recommendations.length === 0 ? (
                  <div className="rounded-[22px] border border-[#e4d9c5] bg-white p-4 text-sm text-[#6a685f]">
                    No recommendation yet. Use the button above or add a signal to create one.
                  </div>
                ) : (
                  recommendations.map((recommendation) => (
                    <article key={recommendation.id} className="rounded-[24px] border border-[#e4d9c5] bg-white p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${priorityStyles[recommendation.priority] || 'bg-[#edf3e1] text-[#52702f]'}`}>{recommendation.priority}</span>
                        <span className="rounded-full bg-[#edf3e1] px-3 py-1 text-xs text-[#52702f]">Confidence {(recommendation.confidence * 100).toFixed(0)}%</span>
                        <span className="rounded-full bg-[#edf3e1] px-3 py-1 text-xs text-[#52702f]">{recommendation.status}</span>
                      </div>

                      <h4 className="mt-4 text-xl font-semibold text-[#123b23]">{recommendation.action}</h4>
                      <p className="mt-2 text-sm leading-7 text-[#6a685f]">{recommendation.reason}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {recommendation.evidence.map((item) => (
                          <span key={item} className="rounded-full border border-[#d9ccb4] bg-[#f8f3e8] px-3 py-1 text-xs text-[#6a685f]">{item}</span>
                        ))}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          onClick={() => handleReview(recommendation.id, 'approved')}
                          disabled={actionLoading}
                          className="rounded-full bg-[#123b23] px-4 py-2 text-sm font-medium text-[#f6f3ea] transition hover:bg-[#1d4c2b] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReview(recommendation.id, 'edited')}
                          disabled={actionLoading}
                          className="rounded-full border border-[#d9ccb4] bg-white px-4 py-2 text-sm font-medium text-[#1a1f16] transition hover:bg-[#f8f3e8] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleReview(recommendation.id, 'rejected')}
                          disabled={actionLoading}
                          className="rounded-full border border-[#d9ccb4] bg-transparent px-4 py-2 text-sm font-medium text-[#1a1f16] transition hover:bg-[#f8f3e8] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#e2d8c2] bg-[#fbf7ef] p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[#123b23]">Step 5</h3>
                <p className="mt-1 text-xs text-[#7a786f]">See what has happened already, without extra noise.</p>
              </div>
              <span className="rounded-full bg-[#edf3e1] px-3 py-1 text-xs text-[#52702f]">Learning loop</span>
            </div>

            <div className="mt-4 space-y-3">
              {interactions.length === 0 ? (
                <EmptyState title="No interactions yet" description="Once you add one signal, the learning loop appears here." />
              ) : (
                interactions.map((interaction) => (
                  <article key={interaction.id} className="rounded-[22px] border border-[#e4d9c5] bg-white p-4">
                    <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-[#7a786f]">
                      <span>{interaction.source}</span>
                      <span className={interaction.riskLevel === 'high' ? 'text-[#7a3e1d]' : 'text-[#52702f]'}>{interaction.riskLevel}</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[#123b23]">{interaction.summary}</p>
                    <p className="mt-2 text-xs leading-6 text-[#6a685f]">{interaction.text}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function LiveBadge({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs text-white/80">
      <span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-[#acc86c] shadow-[0_0_0_6px_rgba(172,200,108,0.14)]' : 'bg-white/50'}`} />
      {active ? 'Live sync enabled' : 'Syncing'}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/8 p-4 text-white">
      <div className="text-[11px] uppercase tracking-[0.22em] text-white/60">{label}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-24 animate-pulse rounded-[22px] bg-[#efe8da]" />
      ))}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[#d9ccb4] bg-white p-4 text-sm text-[#6a685f]">
      <div className="font-medium text-[#123b23]">{title}</div>
      <p className="mt-1 leading-6">{description}</p>
    </div>
  );
}

export default App;