interface CodeFile {
  name: string;
  content: string;
}

export const CodeBlock = ({
  files,
  activeFile,
  onFileChange,
}: {
  files: CodeFile[];
  activeFile: number;
  onFileChange: (index: number) => void;
}) => (
  <div className="rounded-lg border border-border bg-card overflow-hidden">
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
    <pre className="p-4 overflow-auto text-sm leading-relaxed max-h-[600px]">
      <code className="font-mono text-foreground">{files[activeFile]?.content}</code>
    </pre>
  </div>
);
