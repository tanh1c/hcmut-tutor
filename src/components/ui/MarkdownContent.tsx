import React from 'react';

function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={key} className="rounded bg-slate-200 px-1 py-0.5 text-[0.9em] text-slate-900">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

const MarkdownContent: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }
    const joined = paragraph.join(' ');
    blocks.push(
      <p key={`p-${blocks.length}`} className="leading-7">
        {renderInline(joined, `p-${blocks.length}`)}
      </p>
    );
    paragraph = [];
  };

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc space-y-2 pl-5">
        {listItems.map((item, index) => (
          <li key={`li-${blocks.length}-${index}`}>{renderInline(item, `li-${blocks.length}-${index}`)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushParagraph();
      flushList();
      blocks.push(
        <h3 key={`h3-${blocks.length}`} className="text-lg font-semibold text-slate-900">
          {renderInline(trimmed.slice(4), `h3-${blocks.length}`)}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push(
        <h2 key={`h2-${blocks.length}`} className="text-xl font-semibold text-slate-900">
          {renderInline(trimmed.slice(3), `h2-${blocks.length}`)}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith('# ')) {
      flushParagraph();
      flushList();
      blocks.push(
        <h1 key={`h1-${blocks.length}`} className="text-2xl font-semibold text-slate-900">
          {renderInline(trimmed.slice(2), `h1-${blocks.length}`)}
        </h1>
      );
      return;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      flushParagraph();
      listItems.push(trimmed.slice(2));
      return;
    }

    if (trimmed.startsWith('> ')) {
      flushParagraph();
      flushList();
      blocks.push(
        <blockquote
          key={`quote-${blocks.length}`}
          className="border-l-4 border-emerald-300 bg-emerald-50 px-4 py-2 text-slate-700"
        >
          {renderInline(trimmed.slice(2), `quote-${blocks.length}`)}
        </blockquote>
      );
      return;
    }

    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();

  return <div className={`space-y-3 ${className || ''}`}>{blocks}</div>;
};

export default MarkdownContent;
