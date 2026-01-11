import { Highlight, themes } from 'prism-react-renderer';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

// Map common language aliases to Prism language names
const languageMap: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  tsx: 'tsx',
  jsx: 'jsx',
  py: 'python',
  rb: 'ruby',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  md: 'markdown',
  dockerfile: 'docker',
  plaintext: 'plain',
  text: 'plain',
  '': 'plain',
};

function normalizeLanguage(lang: string | undefined): string {
  if (!lang) return 'plain';
  const lower = lang.toLowerCase();
  return languageMap[lower] || lower;
}

export function CodeBlock({ code, language, className = '' }: CodeBlockProps) {
  const normalizedLang = normalizeLanguage(language);

  return (
    <Highlight theme={themes.oneDark} code={code.trim()} language={normalizedLang}>
      {({ className: highlightClassName, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={`${highlightClassName} ${className} text-sm p-3 rounded overflow-x-auto`}
          style={{ ...style, margin: 0 }}
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}

// Inline code styling (for `code` in text)
export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600 dark:text-pink-400">
      {children}
    </code>
  );
}
