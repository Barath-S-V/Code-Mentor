// Simple markdown-like formatter for hint output
export function formatHint(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeBlockIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${codeBlockIndex++}`} style={codeBlockStyle}>
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith('###') || line.startsWith('##') || line.startsWith('#')) {
      const level = line.match(/^#+/)?.[0].length || 1;
      const content = line.replace(/^#+\s*/, '');
      const sizes = ['20px', '18px', '16px'];
      elements.push(
        <div key={`h-${i}`} style={{
          fontSize: sizes[Math.min(level - 1, 2)],
          fontWeight: 700,
          marginTop: '16px',
          marginBottom: '8px',
          color: '#e0e0e0',
        }}>
          {content}
        </div>
      );
      continue;
    }

    if (line.includes('**') && line.trim().length > 0) {
      const parts = line.split(/\*\*(.+?)\*\*/g);
      elements.push(
        <p key={`p-${i}`} style={paragraphStyle}>
          {parts.map((part, j) =>
            j % 2 === 1
              ? <strong key={j} style={{ color: '#ffd166', fontWeight: 600 }}>{part}</strong>
              : <span key={j}>{part}</span>
          )}
        </p>
      );
      continue;
    }

    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const content = line.trim().replace(/^[-*]\s+/, '');
      elements.push(
        <div key={`li-${i}`} style={{
          paddingLeft: '16px',
          position: 'relative',
          lineHeight: '1.7',
          margin: '3px 0',
          fontSize: '14px',
          color: '#d0d0d0',
        }}>
          <span style={{ position: 'absolute', left: '4px', color: '#7ec8e3' }}>•</span>
          {content}
        </div>
      );
      continue;
    }

    const numberedMatch = line.match(/^\d+\.\s+(.*)/);
    if (numberedMatch) {
      const num = numberedMatch[0].match(/^\d+\./)?.[0];
      elements.push(
        <div key={`nl-${i}`} style={{
          paddingLeft: '20px',
          lineHeight: '1.7',
          margin: '3px 0',
          fontSize: '14px',
          color: '#d0d0d0',
        }}>
          <span style={{ color: '#7ec8e3', fontWeight: 600 }}>{num} </span>
          {numberedMatch[1]}
        </div>
      );
      continue;
    }

    if (line.trim() === '') {
      elements.push(<div key={`sp-${i}`} style={{ height: '8px' }} />);
      continue;
    }

    elements.push(
      <p key={`t-${i}`} style={paragraphStyle}>
        {line}
      </p>
    );
  }

  return elements;
}

const codeBlockStyle: React.CSSProperties = {
  background: '#1a1a2e',
  padding: '12px 16px',
  borderRadius: '6px',
  overflowX: 'auto',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '10px 0',
  fontFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", Consolas, monospace',
};

const paragraphStyle: React.CSSProperties = {
  lineHeight: '1.7',
  margin: '6px 0',
  fontSize: '14px',
  color: '#d0d0d0',
};
