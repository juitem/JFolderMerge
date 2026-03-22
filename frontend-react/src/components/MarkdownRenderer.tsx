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

/**
 * Resolve an image src to an API URL.
 * - Already absolute URL → unchanged
 * - Relative path → /api/serve?path=BASEDIR/src
 */
function resolveImageSrc(src: string, basePath: string): string {
    if (!src) return src;
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) return src;
    if (src.startsWith('/api/')) return src;
    // relative path: resolve against basePath (directory of the current file)
    const dir = basePath.replace(/\/[^/]*$/, ''); // strip filename if basePath includes it
    // If src already contains a path separator, use as-is relative to dir
    // Otherwise, prepend attachment folder if provided
    const resolved = dir ? `${dir}/${src}` : src;
    return `/api/serve?path=${encodeURIComponent(resolved)}`;
}

/**
 * Build image src: try attachmentFolder first, then fallback to same dir.
 * attachmentFolder e.g. "_rsrc_" means look in dir/_rsrc_/filename
 */
function resolveObsidianImageSrc(src: string, basePath: string, attachmentFolder: string): string {
    if (!src) return src;
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) return src;
    if (src.startsWith('/api/')) return src;
    const dir = basePath.replace(/\/[^/]*$/, '');
    // If src already has a slash, treat as relative path directly
    if (src.includes('/')) {
        return `/api/serve?path=${encodeURIComponent(dir ? `${dir}/${src}` : src)}`;
    }
    // Use attachment folder if set, otherwise same directory
    const resolved = attachmentFolder ? `${dir}/${attachmentFolder}/${src}` : `${dir}/${src}`;
    return `/api/serve?path=${encodeURIComponent(resolved)}`;
}

interface MarkdownRendererProps {
    content: string;
    obsidianMode?: boolean;
    /** Absolute path to the directory (or file) containing the markdown, for resolving relative images */
    basePath?: string;
    /** Obsidian attachment subfolder name, e.g. "_rsrc_" */
    attachmentFolder?: string;
    style?: React.CSSProperties;
    className?: string;
    innerRef?: React.Ref<HTMLDivElement>;
    onScroll?: React.UIEventHandler<HTMLDivElement>;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
    content,
    obsidianMode = false,
    basePath = '',
    attachmentFolder = '',
    style,
    className = 'markdown-preview custom-scroll',
    innerRef,
    onScroll,
}) => {
    const rendered = obsidianMode ? convertObsidianSyntax(content) : content;

    const components = {
        img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => {
            const resolved = basePath
                ? (obsidianMode
                    ? resolveObsidianImageSrc(src || '', basePath, attachmentFolder)
                    : resolveImageSrc(src || '', basePath))
                : src;
            return <img src={resolved} alt={alt} style={{ maxWidth: '100%', borderRadius: '4px' }} {...props} />;
        }
    };

    return (
        <div
            ref={innerRef}
            onScroll={onScroll}
            className={className}
            style={{ flex: 1, padding: '20px', overflow: 'auto', background: '#0f172a', color: '#e2e8f0', ...style }}
        >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{rendered}</ReactMarkdown>
        </div>
    );
};
