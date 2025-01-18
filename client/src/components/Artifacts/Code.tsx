import React, { memo, useEffect, useRef, useState } from 'react';
import rehypeKatex from 'rehype-katex';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import copy from 'copy-to-clipboard';
import { handleDoubleClick, langSubset } from '~/utils';
import Clipboard from '~/components/svg/Clipboard';
import CheckMark from '~/components/svg/CheckMark';
import useLocalize from '~/hooks/useLocalize';
import MonacoEditor from './MonacoEditor';

type TCodeProps = {
  inline: boolean;
  className?: string;
  children: React.ReactNode;
  filename?: string;
};

export const code: React.ElementType = memo(({ inline, className, children, filename }: TCodeProps) => {
  console.log('Code.tsx - received filename:', filename);
  const match = /language-(\w+)/.exec(className ?? '');
  const lang = match?.[1] ?? undefined;

  if (inline) {
    return (
      <code onDoubleClick={handleDoubleClick} className={className}>
        {children}
      </code>
    );
  }

  const processContent = (children: React.ReactNode): string => {
    if (Array.isArray(children)) {
      return children.map(child => processContent(child)).join('');
    }
    
    if (React.isValidElement(children)) {
      return processContent(children.props.children);
    }
    
    if (typeof children === 'object' && children !== null) {
      if ('value' in children) {
        return String(children.value);
      }
      if ('raw' in children) {
        return String(children.raw);
      }
      if ('props' in children && 'children' in (children as any).props) {
        return processContent((children as any).props.children);
      }
    }
    
    return String(children ?? '');
  };

  const content = processContent(children);
  const displayFilename = filename || `untitled${lang ? `.${lang}` : ''}`;
  
  return (
    <div className="relative w-full">
      <MonacoEditor
        content={content}
        language={lang}
        readOnly={true}
        className="!bg-gray-900"
        filename={displayFilename}
      />
    </div>
  );
});

export const CodeMarkdown = memo(
  ({ content = '', isSubmitting, filename }: { content: string; isSubmitting: boolean; filename?: string }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [currentContent, setCurrentContent] = useState(content);
    const localize = useLocalize();

    useEffect(() => {
      if (content !== currentContent) {
        setCurrentContent(content);
      }
    }, [content, currentContent]);

    useEffect(() => {
      if (scrollRef.current && !isSubmitting) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [currentContent, isSubmitting]);

    const rehypePlugins = [
      [rehypeKatex, { output: 'mathml' }],
      [rehypeHighlight, { detect: true, ignoreMissing: true }],
    ];

    return (
      <div ref={scrollRef} className="max-h-full overflow-y-auto">
        <div className="min-h-full bg-gray-900 p-4">
          <ReactMarkdown
            /* @ts-ignore */
            rehypePlugins={rehypePlugins}
            components={{
              code: (props: any) => {
                const { node, ...rest } = props;
                return <code {...rest} />;
              },
            }}
          >
            {currentContent}
          </ReactMarkdown>
        </div>
      </div>
    );
  }
);

export const CopyCodeButton: React.FC<{ content: string }> = ({ content }) => {
  const localize = useLocalize();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    copy(content, { format: 'text/plain' });
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  return (
    <button
      className="mr-2 text-text-secondary"
      onClick={handleCopy}
      aria-label={isCopied ? localize('com_ui_copied') : localize('com_ui_copy_code')}
    >
      {isCopied ? <CheckMark className="h-[18px] w-[18px]" /> : <Clipboard />}
    </button>
  );
};