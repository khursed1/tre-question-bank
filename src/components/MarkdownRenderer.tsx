import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { memo } from 'react';

function MarkdownRenderer({ content, className = "" }: { content: string; className?: string }) {
  if (!content) return null;
  return (
    <div className={`prose prose-sm max-w-none prose-gray prose-p:leading-relaxed prose-pre:bg-gray-100 prose-pre:text-gray-800 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MarkdownRenderer);
