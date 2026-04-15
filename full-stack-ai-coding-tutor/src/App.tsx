import { useState, useCallback, useRef, useEffect } from 'react';
import { buildSystemPrompt } from './prompts';
import { formatHint } from './formatter';

interface SessionContext {
  previousCode: string;
  hintCount: number;
  detectedErrorType: string | null;
}

const INITIAL_CONTEXT: SessionContext = {
  previousCode: '',
  hintCount: 0,
  detectedErrorType: null,
};

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('tutor_api_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [code, setCode] = useState('');
  const [hintOutput, setHintOutput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionContext, setSessionContext] = useState<SessionContext>(INITIAL_CONTEXT);
  const [history, setHistory] = useState<Array<{ role: string; content: string }>>([]);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (apiKey) localStorage.setItem('tutor_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [hintOutput]);

  const handleGetHint = useCallback(async () => {
    if (!code.trim()) {
      setError('Please paste some code to get hints.');
      return;
    }
    if (!apiKey.trim()) {
      setError('Please enter your Anthropic API key.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const newHintCount = sessionContext.hintCount + 1;
    let detectedErrorType = sessionContext.detectedErrorType;
    if (sessionContext.previousCode && sessionContext.previousCode.trim() === code.trim()) {
      detectedErrorType = detectedErrorType || 'Repeated attempt — same code';
    }

    const ctx: SessionContext = {
      previousCode: sessionContext.previousCode,
      hintCount: newHintCount,
      detectedErrorType,
    };

    const messages = [
      ...history,
      { role: 'user', content: 'Here is my code:\n\n```\n' + code + '\n```' },
    ];

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey.trim(),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: buildSystemPrompt(ctx),
          messages,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 401) throw new Error('Invalid API key. Check your Anthropic API key.');
        if (response.status === 429) throw new Error('Rate limited. Please wait and try again.');
        throw new Error(errData.error?.message || 'API error: ' + response.status);
      }

      const data = await response.json();
      const hintText = data.content?.[0]?.text || 'No hint received.';

      setHintOutput(hintText);
      setSessionContext({
        previousCode: code,
        hintCount: newHintCount,
        detectedErrorType,
      });
      setHistory(prev => {
        const updated = [
          ...prev,
          { role: 'user', content: 'Here is my code:\n\n```\n' + code + '\n```' },
          { role: 'assistant', content: hintText },
        ];
        return updated.slice(-10);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [code, apiKey, sessionContext, history]);

  const handleReset = useCallback(() => {
    setSessionContext(INITIAL_CONTEXT);
    setHistory([]);
    setHintOutput(null);
    setCode('');
    setError(null);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGetHint();
    }
  }, [handleGetHint]);

  const depthLabel = sessionContext.hintCount >= 3 ? 'Deep' : sessionContext.hintCount >= 2 ? 'Medium' : 'Light';
  const depthDesc = sessionContext.hintCount >= 3
    ? 'Deep hint — you\'re being nudged harder!'
    : sessionContext.hintCount >= 2
      ? 'Medium hint — a bit more specific'
      : 'Gentle nudge — look carefully at your logic';

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={{ fontSize: '28px' }}>🎓</span>
          <div>
            <h1 style={styles.headerTitle}>AI Coding Tutor</h1>
            <p style={styles.headerSub}>Context-aware hints — Never gives away the answer</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.badge}>
            <span style={styles.badgeDot} />
            Hint #{sessionContext.hintCount}
          </div>
          <button onClick={handleReset} style={styles.resetBtn}>Reset</button>
        </div>
      </header>

      <main style={styles.main}>
        {/* LEFT PANEL */}
        <div style={styles.leftPanel}>
          <div style={styles.apiRow}>
            <span style={styles.apiLabel}>🔑 API Key:</span>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                style={styles.apiInput}
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                style={styles.eyeBtn}
              >
                {showApiKey ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div style={styles.codeHeader}>
            <span style={styles.codeLabel}>Your Code</span>
            <span style={styles.shortcut}>Ctrl+Enter to submit</span>
          </div>

          <div style={styles.codeBody}>
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={"Paste your code here...\n\nExample:\nfor i in range(10):\n    print(i)\n\nThen click \"Get Hint\" for guidance!"}
              style={styles.textarea}
            />
            <button
              onClick={handleGetHint}
              disabled={isLoading || !code.trim() || !apiKey.trim()}
              style={{
                ...styles.getHintBtn,
                opacity: (isLoading || !code.trim() || !apiKey.trim()) ? 0.5 : 1,
              }}
            >
              {isLoading ? (
                <>
                  <span style={styles.spinner} />
                  Thinking...
                </>
              ) : (
                '💡 Get Hint'
              )}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={styles.rightPanel}>
          <div style={styles.outputHeader}>
            <span style={styles.outputLabel}>Hint Output</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {sessionContext.detectedErrorType && (
                <span style={styles.warnBadge}>⚠️ {sessionContext.detectedErrorType}</span>
              )}
              {sessionContext.hintCount > 0 && (
                <span style={styles.depthBadge}>Depth: {depthLabel}</span>
              )}
            </div>
          </div>

          <div ref={outputRef} style={styles.outputBody}>
            {error && (
              <div style={styles.errorBox}>
                <strong>Error:</strong> {error}
              </div>
            )}

            {isLoading && !hintOutput && (
              <div style={styles.loadingBox}>
                <span style={styles.bigSpinner} />
                <span style={{ fontSize: '14px' }}>Analyzing your code...</span>
              </div>
            )}

            {!hintOutput && !isLoading && !error && (
              <div style={styles.emptyBox}>
                <span style={{ fontSize: '48px', opacity: 0.3 }}>🤔</span>
                <p style={styles.emptyTitle}>No hints yet</p>
                <p style={styles.emptySub}>
                  Paste your code on the left and click <strong style={{ color: '#7ec8e3' }}>&quot;Get Hint&quot;</strong> to start learning.
                </p>
                <p style={styles.emptyNote}>
                  I'll guide you to find mistakes yourself — never giving away the answer! ✨
                </p>
              </div>
            )}

            {hintOutput && (
              <div>
                <div style={styles.hintInfo}>
                  <span>💡</span>
                  <span>
                    Hint #{sessionContext.hintCount} — {depthDesc}
                  </span>
                </div>
                <div style={styles.hintContent}>
                  {formatHint(hintOutput)}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{globalCSS}</style>
    </div>
  );
}

const globalCSS = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  textarea::placeholder, input::placeholder {
    color: #4b5563;
  }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2d2d5e; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #3d3d7e; }
  @media (max-width: 768px) {
    main { grid-template-columns: 1fr !important; }
  }
`;

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: '#0f0f23',
    color: '#e0e0e0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    borderBottom: '1px solid #1a1a3e',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#0a0a1a',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: 700,
    margin: 0,
    color: '#ffffff',
    letterSpacing: '-0.5px',
  },
  headerSub: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '2px 0 0',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '12px',
    background: '#1a1a3e',
    fontSize: '12px',
    color: '#9ca3af',
  },
  badgeDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    display: 'inline-block',
    background: '#4ade80',
  },
  resetBtn: {
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid #2d2d5e',
    background: 'transparent',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '12px',
  },
  main: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    height: 'calc(100vh - 61px)',
  },
  leftPanel: {
    borderRight: '1px solid #1a1a3e',
    display: 'flex',
    flexDirection: 'column',
  },
  apiRow: {
    padding: '12px 16px',
    borderBottom: '1px solid #1a1a3e',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  apiLabel: {
    fontSize: '12px',
    color: '#6b7280',
    whiteSpace: 'nowrap',
  },
  apiInput: {
    width: '100%',
    padding: '6px 32px 6px 10px',
    borderRadius: '4px',
    border: '1px solid #2d2d5e',
    background: '#12122a',
    color: '#e0e0e0',
    fontSize: '12px',
    fontFamily: 'monospace',
    outline: 'none',
    boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute',
    right: '6px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    fontSize: '14px',
    padding: '2px',
  },
  codeHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid #1a1a3e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#9ca3af',
  },
  shortcut: {
    fontSize: '11px',
    color: '#4b5563',
  },
  codeBody: {
    flex: 1,
    padding: '0 16px 16px',
    display: 'flex',
    flexDirection: 'column',
  },
  textarea: {
    flex: 1,
    width: '100%',
    padding: '14px',
    borderRadius: '8px',
    border: '1px solid #2d2d5e',
    background: '#0d0d20',
    color: '#e0e0e0',
    fontSize: '13px',
    fontFamily: '"Fira Code", "JetBrains Mono", Consolas, monospace',
    lineHeight: '1.6',
    resize: 'none',
    outline: 'none',
    boxSizing: 'border-box',
  },
  getHintBtn: {
    marginTop: '12px',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  outputHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid #1a1a3e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  outputLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#9ca3af',
  },
  warnBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    background: 'rgba(251, 191, 36, 0.15)',
    color: '#fbbf24',
    fontSize: '11px',
    fontWeight: 500,
  },
  depthBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    background: 'rgba(126, 200, 227, 0.15)',
    color: '#7ec8e3',
    fontSize: '11px',
    fontWeight: 500,
  },
  outputBody: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
  },
  errorBox: {
    padding: '12px 16px',
    borderRadius: '8px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    marginBottom: '16px',
    fontSize: '13px',
    color: '#fca5a5',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '16px',
    color: '#6b7280',
  },
  bigSpinner: {
    display: 'inline-block',
    width: '32px',
    height: '32px',
    border: '3px solid rgba(99, 102, 241, 0.2)',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  emptyBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
    color: '#4b5563',
    gap: '12px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#6b7280',
    margin: '0 0 4px',
  },
  emptySub: {
    fontSize: '13px',
    margin: 0,
    lineHeight: '1.5',
  },
  emptyNote: {
    fontSize: '12px',
    margin: '12px 0 0',
    color: '#4b5563',
  },
  hintInfo: {
    padding: '8px 12px',
    borderRadius: '6px',
    background: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    marginBottom: '16px',
    fontSize: '12px',
    color: '#a5b4fc',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  hintContent: {
    background: '#12122a',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #1a1a3e',
  },
};
