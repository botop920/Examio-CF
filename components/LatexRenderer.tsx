import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export function LatexRenderer({ content }: { content: string }) {
  // Pre-process Gemini's LaTeX delimiters to standard markdown math delimiters
  const processedContent = content
    .replace(/\\\((.*?)\\\)/g, '$$$1$$') // Replace \( ... \) with $ ... $
    .replace(/\\\[(.*?)\\\]/gs, '$$$$$1$$$$'); // Replace \[ ... \] with $$ ... $$

  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[[rehypeKatex, { strict: false }]]}
      components={{
        p: ({children}) => <p className="mb-2 leading-relaxed">{children}</p>,
        strong: ({children}) => <mark className="bg-yellow-200 dark:bg-yellow-500/30 text-gray-900 dark:text-white px-1 rounded font-bold">{children}</mark>,
        code: ({children}) => <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-sm">{children}</code>
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
}
