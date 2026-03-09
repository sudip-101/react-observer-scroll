import { useMemo } from 'react';

interface CodeFile {
  name: string;
  content: string;
}

type TokenType =
  | 'keyword'
  | 'string'
  | 'comment'
  | 'function'
  | 'number'
  | 'type'
  | 'operator'
  | 'punctuation'
  | 'plain';

const TOKEN_COLORS: Record<TokenType, string> = {
  keyword: 'var(--color-code-keyword)',
  string: 'var(--color-code-string)',
  comment: 'var(--color-code-comment)',
  function: 'var(--color-code-function)',
  number: 'var(--color-code-number)',
  type: 'var(--color-code-type)',
  operator: 'var(--color-code-operator)',
  punctuation: 'var(--color-code-punctuation)',
  plain: 'var(--color-code-plain)',
};

// Single combined regex — first match wins, no stateful parsing needed.
// Order matters: comments/strings must come before operators to avoid
// '/' being consumed as division.
const TOKEN_RE = new RegExp(
  [
    // Comments: single-line and multi-line
    /\/\/.*|\/\*[\s\S]*?\*\//,
    // Strings: double-quoted, single-quoted, template literals (with ${} support)
    /"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|`(?:\\[\s\S]|[^`\\])*`/,
    // Numbers: decimal, hex, binary, octal, bigint, exponential
    /\b(?:0[xXbBoO][\da-fA-F_]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?n?)\b/,
    // Keywords
    /\b(?:import|export|from|const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|default|new|typeof|instanceof|in|of|await|async|yield|throw|try|catch|finally|class|extends|implements|interface|type|enum|as|true|false|null|undefined|void|this|super|static|readonly|declare|abstract|private|protected|public|keyof)\b/,
    // Identifiers (classified later as type/function/plain)
    /[a-zA-Z_$][\w$]*/,
    // Arrow + multi-char operators (must come before single-char)
    /=>|[!=<>]=?=?|&&|\|\||\?\?|\.{3}|\+\+|--|[+\-*/%&|^~!?:<>]=?/,
    // Punctuation
    /[{}()[\];,.]/,
    // Anything else (whitespace, unknown chars)
    /\s+|./,
  ]
    .map((r) => `(${r.source})`)
    .join('|'),
  'g',
);

const GROUP_TYPES: TokenType[] = [
  'comment',
  'string',
  'number',
  'keyword',
  'plain', // identifiers — reclassified below
  'operator',
  'punctuation',
  'plain',
];

const tokenize = (code: string): [TokenType, string][] => {
  const tokens: [TokenType, string][] = [];
  let match: RegExpExecArray | null;

  TOKEN_RE.lastIndex = 0;

  while ((match = TOKEN_RE.exec(code)) !== null) {
    const value = match[0];

    // Find which capture group matched
    let type: TokenType = 'plain';
    for (let g = 1; g <= GROUP_TYPES.length; g++) {
      if (match[g] !== undefined) {
        type = GROUP_TYPES[g - 1] as TokenType;
        break;
      }
    }

    // Reclassify identifiers
    if (type === 'plain' && /^[a-zA-Z_$]/.test(value)) {
      // PascalCase → type (components, interfaces, classes)
      if (/^[A-Z]/.test(value)) {
        // Check if followed by ( → function/component call
        const after = code.slice(TOKEN_RE.lastIndex);
        type = /^\s*[(<]/.test(after) ? 'function' : 'type';
      } else {
        // camelCase followed by ( → function call
        const after = code.slice(TOKEN_RE.lastIndex);
        if (/^\s*\(/.test(after)) {
          type = 'function';
        }
      }
    }

    tokens.push([type, value]);
  }

  return tokens;
};

const HighlightedCode = ({ code }: { code: string }) => {
  const tokens = useMemo(() => tokenize(code), [code]);

  return (
    <>
      {tokens.map(([type, value], i) => (
        <span key={i} style={{ color: TOKEN_COLORS[type] }}>
          {value}
        </span>
      ))}
    </>
  );
};

export const CodeBlock = ({
  files,
  activeFile,
  onFileChange,
}: {
  files: CodeFile[];
  activeFile: number;
  onFileChange: (index: number) => void;
}) => (
  <div className="rounded-lg border border-border overflow-hidden">
    <div className="flex border-b border-border bg-muted/50 overflow-x-auto">
      {files.map((file, i) => (
        <button
          key={file.name}
          onClick={() => onFileChange(i)}
          className={`px-4 py-2 text-xs font-mono whitespace-nowrap transition-colors border-b-2 ${
            activeFile === i
              ? 'border-primary text-foreground bg-card'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {file.name}
        </button>
      ))}
    </div>
    <pre
      className="p-4 overflow-auto text-sm leading-relaxed max-h-[600px]"
      style={{ backgroundColor: 'var(--color-code-bg)' }}
    >
      <code className="font-mono">
        <HighlightedCode code={files[activeFile]?.content ?? ''} />
      </code>
    </pre>
  </div>
);
