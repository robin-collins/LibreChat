import React, { useEffect, useRef, useState } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '~/utils';
import type * as monacoEditor from 'monaco-editor';

interface MonacoEditorProps {
  content: string;
  language?: string;
  readOnly?: boolean;
  className?: string;
  filename?: string;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  content,
  language = 'plaintext',
  readOnly = true,
  className,
  filename = 'untitled',
}) => {
  console.log('MonacoEditor.tsx - using filename:', filename);
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState('200px');
  const [currentLanguage, setCurrentLanguage] = useState(language);
  const [showLanguages, setShowLanguages] = useState(false);

  // Common programming languages
  const languages = [
    'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
    'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala', 'html',
    'css', 'json', 'xml', 'yaml', 'markdown', 'sql', 'shell', 'plaintext'
  ];

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const lineHeight = 20;
        const lines = content.split('\n').length;
        const calculatedHeight = Math.min(Math.max(lines * lineHeight + 50, 200), 600);
        setHeight(`${calculatedHeight}px`);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [content]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.updateOptions({
      readOnly,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        useShadows: true,
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
      },
      overviewRulerLanes: 0,
      wordWrap: 'on',
      padding: { top: 8, bottom: 8 },
      lineNumbers: 'on',
      renderLineHighlight: 'all',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
      folding: true,
      foldingHighlight: true,
      showFoldingControls: 'always',
    });
  };

  const handleLanguageChange = (lang: string) => {
    setCurrentLanguage(lang);
    setShowLanguages(false);
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, lang);
      }
    }
  };

  return (
    <div className={cn('flex w-full flex-col rounded-md border border-border-light', className)}>
      {/* Tab bar */}
      <div className="flex h-8 items-center bg-[#252526] px-3 text-sm text-white">
        <div className="flex items-center">
          {filename}
        </div>
      </div>

      {/* Editor */}
      <div ref={containerRef}>
        <Editor
          height={height}
          defaultLanguage={currentLanguage}
          defaultValue={content}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            automaticLayout: true,
            contextmenu: true,
            lineNumbers: 'on',
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'always',
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 14,
          }}
        />
      </div>

      {/* Status bar */}
      <div className="flex h-6 items-center justify-between bg-[#007ACC] px-2 text-xs text-white">
        <div>{readOnly ? 'Read Only' : 'Editing'}</div>
        <div className="relative">
          <button
            className="flex items-center gap-1 hover:bg-[#1F8AD2] px-2 py-1 rounded"
            onClick={() => setShowLanguages(!showLanguages)}
          >
            {currentLanguage}
            <ChevronDown className="h-3 w-3" />
          </button>
          
          {/* Language selector dropdown */}
          {showLanguages && (
            <div className="absolute bottom-full right-0 mb-1 w-48 rounded-md border border-border-light bg-[#252526] py-1 shadow-lg">
              <div className="">
                {languages.map((lang) => (
                  <button
                    key={lang}
                    className="w-full px-4 py-1 text-left text-sm hover:bg-[#2A2D2E] text-white"
                    onClick={() => handleLanguageChange(lang)}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonacoEditor; 