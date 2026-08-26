import React, { useState, useEffect, useMemo, useRef } from 'react';

export interface FlowStep {
  stepNumber: number;
  title: string;
  sender: string;
  receiver: string;
  action: string;
  explanation: string;
  codeSnippet?: string;
  status?: string | number;
  phase?: string;
  category?: 'request' | 'response' | 'internal' | 'security';
}

export interface FlowExplorerProps {
  id?: string;
  title?: string;
  steps: FlowStep[];
  autoPlayInterval?: number; // in milliseconds, default 3200
  allowFullscreen?: boolean;
  className?: string;
}

const getParticipantIcon = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('user') || lower.includes('actor') || lower.includes('human') || lower.includes('attacker')) return '👤';
  if (lower.includes('browser') || lower.includes('client') || lower.includes('app') || lower.includes('frontend')) return '💻';
  if (lower.includes('idp') || lower.includes('auth') || lower.includes('identity') || lower.includes('oauth')) return '🔐';
  if (lower.includes('guardrail') || lower.includes('shield') || lower.includes('security')) return '🛡️';
  if (lower.includes('server') || lower.includes('api') || lower.includes('backend') || lower.includes('worker')) return '⚙️';
  if (lower.includes('db') || lower.includes('database') || lower.includes('kv') || lower.includes('store')) return '🗄️';
  if (lower.includes('edge') || lower.includes('cloudflare') || lower.includes('cdn')) return '☁️';
  return '📦';
};

export const FlowExplorer: React.FC<FlowExplorerProps> = ({
  id = `flow-${Math.random().toString(36).substring(2, 9)}`,
  title = 'Interactive Sequence Flow',
  steps = [],
  autoPlayInterval = 3200,
  allowFullscreen = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);
  const [copiedMermaid, setCopiedMermaid] = useState<boolean>(false);

  // Compute unique participants preserving appearance order
  const participants = useMemo(() => {
    const list: string[] = [];
    steps.forEach((s) => {
      if (s.sender && !list.includes(s.sender)) list.push(s.sender);
      if (s.receiver && !list.includes(s.receiver)) list.push(s.receiver);
    });
    return list;
  }, [steps]);

  const totalSteps = steps.length;
  const currentStep = steps[currentStepIndex] || {
    stepNumber: 1,
    title: '',
    sender: '',
    receiver: '',
    action: '',
    explanation: '',
  };

  // Auto-play interval
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying && totalSteps > 1) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => (prev >= totalSteps - 1 ? 0 : prev + 1));
      }, autoPlayInterval / speed);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, totalSteps, autoPlayInterval, speed]);

  const getParticipantPercent = (name: string): number => {
    const idx = participants.indexOf(name);
    if (idx === -1) return 50;
    if (participants.length <= 1) return 50;
    return ((idx + 0.5) / participants.length) * 100;
  };

  const senderPct = getParticipantPercent(currentStep.sender);
  const receiverPct = getParticipantPercent(currentStep.receiver);
  const isSelfLoop = currentStep.sender === currentStep.receiver;
  const progressPct = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;

  const handleCopySnippet = () => {
    if (currentStep.codeSnippet) {
      navigator.clipboard.writeText(currentStep.codeSnippet).then(() => {
        setCopiedSnippet(true);
        setTimeout(() => setCopiedSnippet(false), 1800);
      });
    }
  };

  const handleExportMermaid = () => {
    let mermaidStr = 'sequenceDiagram\n';
    participants.forEach((p) => {
      const safeId = p.replace(/[^a-zA-Z0-9]/g, '_');
      mermaidStr += `    participant ${safeId} as ${p}\n`;
    });
    steps.forEach((s) => {
      const sId = s.sender.replace(/[^a-zA-Z0-9]/g, '_');
      const rId = s.receiver.replace(/[^a-zA-Z0-9]/g, '_');
      mermaidStr += `    ${sId}->>${rId}: ${s.action}\n`;
    });

    navigator.clipboard.writeText(mermaidStr).then(() => {
      setCopiedMermaid(true);
      setTimeout(() => setCopiedMermaid(false), 1800);
    });
  };

  const toggleSpeed = () => {
    if (speed === 1) setSpeed(1.5);
    else if (speed === 1.5) setSpeed(2);
    else if (speed === 2) setSpeed(0.5);
    else setSpeed(1);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleParticipantClick = (pName: string) => {
    const nextIdx = steps.findIndex(
      (s, i) => i > currentStepIndex && (s.sender === pName || s.receiver === pName)
    );
    if (nextIdx !== -1) {
      setIsPlaying(false);
      setCurrentStepIndex(nextIdx);
    } else {
      const firstIdx = steps.findIndex((s) => s.sender === pName || s.receiver === pName);
      if (firstIdx !== -1) {
        setIsPlaying(false);
        setCurrentStepIndex(firstIdx);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setIsPlaying(false);
      setCurrentStepIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === 'ArrowRight') {
      setIsPlaying(false);
      setCurrentStepIndex((prev) => Math.min(totalSteps - 1, prev + 1));
    } else if (e.key === ' ') {
      e.preventDefault();
      setIsPlaying((prev) => !prev);
    }
  };

  return (
    <div
      ref={containerRef}
      id={id}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label={title}
      className={`flow-explorer my-8 w-full select-none overflow-hidden rounded-2xl border border-[var(--border,#334155)] bg-[var(--surface,#0f172a)] text-[var(--text,#f8fafc)] shadow-2xl transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent,#6366f1)] ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border,#334155)] bg-[var(--surface-muted,#1e293b)]/70 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent,#6366f1)]/15 text-[var(--accent,#6366f1)] ring-1 ring-[var(--accent,#6366f1)]/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--text,#f8fafc)] sm:text-base">{title}</h3>
              {currentStep.status && (
                <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                  {currentStep.status}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-[var(--accent,#6366f1)]">
              Step <span>{currentStepIndex + 1}</span> of <span>{totalSteps}</span>:
              <span className="ml-1 font-normal text-[var(--muted,#94a3b8)] truncate">{currentStep.title}</span>
            </p>
          </div>
        </div>

        {/* Stepper Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Speed */}
          <button
            type="button"
            onClick={toggleSpeed}
            className="hidden sm:flex h-9 items-center gap-1 rounded-lg border border-[var(--border,#334155)] bg-[var(--surface,#0f172a)] px-2.5 text-xs font-bold text-[var(--accent,#6366f1)] hover:bg-[var(--surface-muted,#1e293b)] cursor-pointer"
            title="Cycle playback speed"
          >
            {speed}x
          </button>

          {/* Mermaid Export */}
          <button
            type="button"
            onClick={handleExportMermaid}
            className="hidden sm:flex h-9 items-center gap-1 rounded-lg border border-[var(--border,#334155)] bg-[var(--surface,#0f172a)] px-2.5 text-xs font-medium text-[var(--muted,#94a3b8)] hover:bg-[var(--surface-muted,#1e293b)] hover:text-[var(--text,#f8fafc)] cursor-pointer"
            title="Copy as Mermaid sequence format"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span>{copiedMermaid ? 'Copied!' : 'Mermaid'}</span>
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex(0);
            }}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border,#334155)] bg-[var(--surface,#0f172a)] px-2.5 sm:px-3 text-xs font-medium text-[var(--muted,#94a3b8)] hover:bg-[var(--surface-muted,#1e293b)] hover:text-[var(--text,#f8fafc)] active:scale-95 cursor-pointer"
            title="Reset flow to Step 1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Prev */}
          <button
            type="button"
            disabled={currentStepIndex === 0}
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex((prev) => Math.max(0, prev - 1));
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border,#334155)] bg-[var(--surface,#0f172a)] text-[var(--text,#f8fafc)] hover:bg-[var(--surface-muted,#1e293b)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
            title="Previous Step"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Auto-Play */}
          <button
            type="button"
            onClick={() => setIsPlaying((prev) => !prev)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent,#6366f1)] px-3 text-xs font-bold text-white shadow-sm hover:opacity-90 active:scale-95 cursor-pointer"
          >
            {isPlaying ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                <span>Pause</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>Auto-play</span>
              </>
            )}
          </button>

          {/* Next */}
          <button
            type="button"
            disabled={currentStepIndex === totalSteps - 1}
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex((prev) => Math.min(totalSteps - 1, prev + 1));
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border,#334155)] bg-[var(--surface,#0f172a)] text-[var(--text,#f8fafc)] hover:bg-[var(--surface-muted,#1e293b)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
            title="Next Step"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Fullscreen */}
          {allowFullscreen && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border,#334155)] bg-[var(--surface,#0f172a)] text-[var(--muted,#94a3b8)] hover:text-[var(--text,#f8fafc)] hover:bg-[var(--surface-muted,#1e293b)] cursor-pointer"
              title="Toggle Fullscreen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress Track */}
      <div
        className="relative h-1.5 w-full bg-[var(--surface-muted,#1e293b)] cursor-pointer overflow-hidden"
        onClick={(e) => {
          setIsPlaying(false);
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          setCurrentStepIndex(Math.min(totalSteps - 1, Math.floor(ratio * totalSteps)));
        }}
      >
        <div
          className="h-full bg-gradient-to-r from-[var(--accent,#6366f1)] via-indigo-500 to-[var(--accent-hover,#818cf8)] transition-all duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Participant Columns & Sequence Diagram Canvas */}
      <div className="relative px-3 py-6 sm:px-8">
        {/* Participant Headers */}
        <div
          className="grid w-full gap-2 text-center"
          style={{ gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))` }}
        >
          {participants.map((p) => {
            const isActive = p === currentStep.sender || p === currentStep.receiver;
            return (
              <div
                key={p}
                className="flex flex-col items-center gap-2 cursor-pointer group/node"
                onClick={() => handleParticipantClick(p)}
                title={`Filter steps for ${p}`}
              >
                <div
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm transition-all duration-300 group-hover/node:border-[var(--accent,#6366f1)] sm:px-4 sm:py-1.5 sm:text-sm ${
                    isActive
                      ? 'bg-[var(--accent,#6366f1)] text-white border-[var(--accent,#6366f1)] scale-105 shadow-lg'
                      : 'border-[var(--border,#334155)] bg-[var(--surface-muted,#1e293b)] text-[var(--text,#f8fafc)]'
                  }`}
                >
                  <span className="text-sm sm:text-base">{getParticipantIcon(p)}</span>
                  <span className="truncate max-w-[70px] sm:max-w-[140px]">{p}</span>
                </div>
                <div className="h-4 w-0.5 border-r-2 border-dashed border-[var(--border,#334155)]" />
              </div>
            );
          })}
        </div>

        {/* Dynamic SVG Sequence Canvas */}
        <div className="relative my-3 flex min-h-[150px] sm:min-h-[175px] w-full items-center justify-center overflow-hidden rounded-2xl border border-[var(--border,#334155)]/70 bg-[var(--surface-muted,#1e293b)]/20 px-2 py-4">
          {/* Lifelines */}
          <div
            className="absolute inset-0 grid w-full pointer-events-none"
            style={{ gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))` }}
          >
            {participants.map((p) => (
              <div key={p} className="flex justify-center h-full">
                <div className="h-full w-0.5 border-r border-dashed border-[var(--border,#334155)]/60" />
              </div>
            ))}
          </div>

          {/* SVG Arrow */}
          <svg className="absolute inset-0 h-full w-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <marker id={`${id}-arrow-head`} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--accent,#6366f1)" />
              </marker>
            </defs>

            {isSelfLoop ? (
              <path
                d={`M ${senderPct - 2}% 40% C ${senderPct + 8}% 10%, ${senderPct + 8}% 90%, ${senderPct + 1}% 60%`}
                fill="none"
                stroke="var(--accent,#6366f1)"
                strokeWidth="3"
                markerEnd={`url(#${id}-arrow-head)`}
                strokeDasharray="6,6"
              >
                <animate attributeName="stroke-dashoffset" values="24;0" dur="0.8s" repeatCount="indefinite" />
              </path>
            ) : (
              <line
                x1={`${senderPct}%`}
                y1="50%"
                x2={`${receiverPct}%`}
                y2="50%"
                stroke="var(--accent,#6366f1)"
                strokeWidth="3"
                markerEnd={`url(#${id}-arrow-head)`}
                strokeDasharray="6,6"
              >
                <animate attributeName="stroke-dashoffset" values="24;0" dur="0.8s" repeatCount="indefinite" />
              </line>
            )}
          </svg>

          {/* Active Action Badge */}
          <div className="z-10 max-w-[94%] sm:max-w-[82%] text-center">
            <div className="inline-flex flex-col items-center gap-1 rounded-xl border border-[var(--accent,#6366f1)]/30 bg-[var(--surface,#0f172a)]/95 px-4 py-2.5 shadow-2xl backdrop-blur-md transition-all duration-200">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wide uppercase text-[var(--accent,#6366f1)]">
                  {currentStep.sender} &rarr; {currentStep.receiver}
                </span>
                {currentStep.phase && (
                  <span className="rounded bg-[var(--surface-muted,#1e293b)] px-1.5 py-0.2 text-[9px] font-semibold text-[var(--muted,#94a3b8)]">
                    {currentStep.phase}
                  </span>
                )}
              </div>
              <code className="font-mono text-xs sm:text-sm font-bold text-[var(--text,#f8fafc)] break-all max-w-xs sm:max-w-md">
                {currentStep.action}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Code Drawer */}
      <div className="border-t border-[var(--border,#334155)] bg-[var(--surface-muted,#1e293b)]/20 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-lg bg-[var(--accent,#6366f1)]/15 px-2.5 py-0.5 text-xs font-bold text-[var(--accent,#6366f1)]">
                Step {currentStep.stepNumber || currentStepIndex + 1}
              </span>
              <h4 className="text-base sm:text-lg font-bold text-[var(--text,#f8fafc)]">{currentStep.title}</h4>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-[var(--muted,#94a3b8)]">
              {currentStep.explanation}
            </p>
          </div>

          {currentStep.codeSnippet && (
            <div className="w-full lg:max-w-md">
              <div className="overflow-hidden rounded-xl border border-[var(--border,#334155)] bg-[var(--surface,#0f172a)] shadow-md">
                <div className="flex items-center justify-between border-b border-[var(--border,#334155)] bg-[var(--surface-muted,#1e293b)]/70 px-3.5 py-2 text-xs">
                  <div className="flex items-center gap-1.5 font-mono font-bold text-[var(--accent,#6366f1)]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    <span>Payload / Wire Format</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySnippet}
                    className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-[var(--muted,#94a3b8)] hover:bg-[var(--surface-muted,#1e293b)] hover:text-[var(--text,#f8fafc)] transition-colors cursor-pointer"
                  >
                    {copiedSnippet ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="max-h-52 overflow-x-auto p-3.5 text-xs font-mono leading-relaxed text-[var(--text,#f8fafc)]">
                  {currentStep.codeSnippet}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Stepper Dots */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {steps.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex(idx);
              }}
              className={`h-2.5 w-2.5 rounded-full transition-all focus:outline-none cursor-pointer ${
                idx === currentStepIndex
                  ? 'bg-[var(--accent,#6366f1)] scale-125 ring-2 ring-[var(--accent,#6366f1)]/30'
                  : 'bg-[var(--border,#334155)] hover:bg-[var(--accent,#6366f1)]/60'
              }`}
              aria-label={`Jump to step ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FlowExplorer;
