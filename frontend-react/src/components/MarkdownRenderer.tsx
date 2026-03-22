import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Convert Obsidian non-standard syntax to standard Markdown.
 * - ![[image.png]]  →  ![image.png](image.png)
 * - [[Note|Alias]]  →  [Alias](Note)
 * - [[Note]]        →  [Note](Note)
 * Does NOT modify the source file.
 */
export function convertObsidianSyntax(content: string): string {
    return content
        // ![[image.ext]] → ![image.ext](image.ext)
        .replace(/!\[\[([^\]|]+?)(\|[^\]]*?)?\]\]/g, (_match, file) => `![${file}](${file})`)
        // [[Note|Alias]] → [Alias](Note)
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_match, note, alias) => `[${alias}](${note})`)
        // [[Note]] → [Note](Note)
        .replace(/\[\[([^\]|]+)\]\]/g, (_match, note) => `[${note}](${note})`);
}

interface MarkdownRendererProps {
    content: string;
    obsidianMode?: boolean;
    style?: React.CSSProperties;
    className?: string;
    innerRef?: React.Ref<HTMLDivElement>;
    onScroll?: React.UIEventHandler<HTMLDivElement>;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
    content,
    obsidianMode = false,
    style,
    className = 'markdown-preview custom-scroll',
    innerRef,
    onScroll,
}) => {
    const rendered = obsidianMode ? convertObsidianSyntax(content) : content;

    return (
        <div
            ref={innerRef}
            onScroll={onScroll}
            className={className}
            style={{ flex: 1, padding: '20px', overflow: 'auto', background: '#0f172a', color: '#e2e8f0', ...style }}
        >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{rendered}</ReactMarkdown>
        </div>
    );
};
