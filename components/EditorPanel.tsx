import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { EditorMode } from '../types';

interface EditorPanelProps {
  content: string;
  onChange: (newContent: string) => void;
  isGhostWriting: boolean;
  onGhostWriteTrigger: () => void;
  editorRef: React.RefObject<HTMLTextAreaElement>;
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  onRewrite?: (selection: string) => void;
  onContinue?: (selection: string) => void;
  onFindCitations?: (selection: string) => void;
}

const EditorPanel: React.FC<EditorPanelProps> = ({ 
  content, 
  onChange, 
  isGhostWriting,
  onGhostWriteTrigger,
  editorRef,
  mode,
  setMode,
  onRewrite,
  onContinue,
  onFindCitations
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, selection: string} | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    // Trigger Ghost Write on "+++"
    if (val.endsWith('+++') && !isGhostWriting) {
      onGhostWriteTrigger();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const val = e.currentTarget.value;
      const newVal = val.substring(0, start) + "    " + val.substring(end);
      onChange(newVal);
    }
    
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      onGhostWriteTrigger();
    }
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
     // Don't show if typing or ghost writing
     if (isGhostWriting) return;

     const textarea = e.currentTarget;
     const start = textarea.selectionStart;
     const end = textarea.selectionEnd;
     
     if (start !== end) {
       const selection = textarea.value.substring(start, end);
       if (selection.trim().length > 5) {
         // Crude calculation for popup position near mouse/caret
         // Since textarea doesn't give XY of caret easily, we use mouseup event generally
         // but onSelect triggers on keyup too. 
         // We will update state here but rely on mouseUp for coordinates if possible
         // Or just center it for now if keyboard select.
       }
     } else {
       setContextMenu(null);
     }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start !== end) {
      const selection = textarea.value.substring(start, end);
      if (selection.trim().length > 5) {
        // Position menu near cursor
        setContextMenu({
          x: e.clientX,
          y: e.clientY - 40, // Above cursor
          selection
        });
        return;
      }
    }
    setContextMenu(null);
  };

  const insertText = (text: string) => {
    if (editorRef.current) {
      const textarea = editorRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      const newVal = val.substring(0, start) + text + val.substring(end);
      onChange(newVal);
      setTimeout(() => textarea.focus(), 0);
    }
  };

  const handleCompile = () => {
    // Force split view if not open to render the content for printing
    if (!showPreview) setShowPreview(true);
    
    // Wait for render then print
    setTimeout(() => {
       window.print();
    }, 500);
  };
  
  const handleMenuAction = (action: 'rewrite' | 'continue' | 'cite') => {
    if (!contextMenu) return;
    
    if (action === 'rewrite' && onRewrite) onRewrite(contextMenu.selection);
    if (action === 'continue' && onContinue) onContinue(contextMenu.selection);
    if (action === 'cite' && onFindCitations) onFindCitations(contextMenu.selection);
    
    setContextMenu(null);
  };

  // Helper to "simulate" rendering LaTeX structure for preview without full engine
  // Enhanced to catch more LaTeX commands
  const latexToMarkdown = (latex: string) => {
    let md = latex;
    md = md.replace(/\\section\{(.*?)\}/g, '# $1');
    md = md.replace(/\\subsection\{(.*?)\}/g, '## $1');
    md = md.replace(/\\subsubsection\{(.*?)\}/g, '### $1');
    md = md.replace(/\\textbf\{(.*?)\}/g, '**$1**');
    md = md.replace(/\\textit\{(.*?)\}/g, '*$1*');
    md = md.replace(/\\emph\{(.*?)\}/g, '*$1*');
    md = md.replace(/\\item\s*/g, '- ');
    md = md.replace(/\\begin\{itemize\}/g, '');
    md = md.replace(/\\end\{itemize\}/g, '');
    md = md.replace(/\\begin\{enumerate\}/g, '');
    md = md.replace(/\\end\{enumerate\}/g, '');
    // Keep math as is, handled by remark-math
    return md;
  };

  return (
    <div className="relative h-full w-full bg-[#f3f4f6] flex flex-col items-center">
       {/* Print Styles for Compilation */}
       <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .markdown-preview, .markdown-preview * {
              visibility: visible;
            }
            .markdown-preview {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 20px;
              background: white;
              border: none;
              box-shadow: none;
              overflow: visible;
            }
          }
        `}
      </style>

      {/* Floating Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-gray-900 text-white shadow-xl rounded-lg flex items-center gap-1 p-1 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 300), top: contextMenu.y }}
        >
          <button onClick={() => handleMenuAction('continue')} className="px-3 py-1.5 hover:bg-gray-700 rounded text-xs font-medium flex items-center gap-1">
            <span>✨</span> Continue
          </button>
          <div className="w-px h-4 bg-gray-700"></div>
           <button onClick={() => handleMenuAction('rewrite')} className="px-3 py-1.5 hover:bg-gray-700 rounded text-xs font-medium flex items-center gap-1">
            <span>↺</span> Rewrite
          </button>
          <div className="w-px h-4 bg-gray-700"></div>
          <button onClick={() => handleMenuAction('cite')} className="px-3 py-1.5 hover:bg-gray-700 rounded text-xs font-medium flex items-center gap-1">
            <span>❝</span> Find Citations
          </button>
        </div>
      )}

      {/* Document Toolbar */}
      <div className="w-full bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm z-10 sticky top-0">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <input 
              type="text" 
              defaultValue={mode === 'latex' ? "paper.tex" : (mode === 'docx' ? "document.docx" : "paper.md")}
              className="text-lg font-serif font-bold text-gray-800 bg-transparent border-none focus:ring-0 p-0 placeholder-gray-400 focus:outline-none" 
            />
            <div className="flex gap-2 text-xs text-gray-500 mt-1">
              <button 
                onClick={() => setMode('markdown')}
                className={`px-2 py-0.5 rounded transition-colors ${mode === 'markdown' ? 'bg-gray-800 text-white' : 'hover:bg-gray-100'}`}
              >
                Markdown
              </button>
              <button 
                onClick={() => setMode('latex')}
                className={`px-2 py-0.5 rounded transition-colors ${mode === 'latex' ? 'bg-gray-800 text-white' : 'hover:bg-gray-100'}`}
              >
                LaTeX
              </button>
              <button 
                onClick={() => setMode('docx')}
                className={`px-2 py-0.5 rounded transition-colors ${mode === 'docx' ? 'bg-blue-800 text-white' : 'hover:bg-gray-100'}`}
              >
                DOCX
              </button>
            </div>
          </div>
        </div>

        {/* Formatting Tools (Context Aware) */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg shadow-inner">
          {mode === 'markdown' && (
            <>
              <button onClick={() => insertText('**bold**')} className="p-2 hover:bg-white rounded text-gray-700 font-serif text-sm font-bold">B</button>
              <button onClick={() => insertText('*italic*')} className="p-2 hover:bg-white rounded text-gray-700 font-serif text-sm italic">I</button>
              <div className="w-px h-5 bg-gray-300 mx-1"></div>
              <button onClick={() => insertText('# ')} className="p-2 hover:bg-white rounded text-gray-700 text-sm font-bold">H1</button>
              <button onClick={() => insertText('## ')} className="p-2 hover:bg-white rounded text-gray-700 text-sm font-bold">H2</button>
            </>
          )} 
          {mode === 'latex' && (
            <>
              <button onClick={() => insertText('\\textbf{bold}')} className="p-2 hover:bg-white rounded text-gray-700 font-serif text-sm font-bold">B</button>
              <button onClick={() => insertText('\\textit{italic}')} className="p-2 hover:bg-white rounded text-gray-700 font-serif text-sm italic">I</button>
              <div className="w-px h-5 bg-gray-300 mx-1"></div>
              <button onClick={() => insertText('\\section{}')} className="p-2 hover:bg-white rounded text-gray-700 text-sm font-bold">Sec</button>
              <button onClick={() => insertText('\\subsection{}')} className="p-2 hover:bg-white rounded text-gray-700 text-sm font-bold">Sub</button>
            </>
          )}
           {mode === 'docx' && (
            <span className="text-xs text-gray-400 px-2">Plain Text Mode</span>
          )}
          
          <div className="w-px h-5 bg-gray-300 mx-1"></div>
          
          <button onClick={() => insertText('$x$')} className="p-2 hover:bg-white rounded text-gray-700 font-mono text-sm" title="Math">$</button>
          <button onClick={() => insertText('\\cite{}')} className="p-2 hover:bg-white rounded text-gray-700 font-mono text-xs" title="Citation">@cite</button>
        </div>

        {/* View Controls & Status */}
        <div className="flex items-center gap-4">
           {isGhostWriting && (
            <div className="flex items-center gap-2 text-blue-600 text-xs font-medium bg-blue-50 px-3 py-1.5 rounded-full animate-pulse">
               <svg className="animate-spin h-3 w-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              Thinking...
            </div>
          )}
          
          <button 
             onClick={handleCompile}
             className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-black transition-colors"
          >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Compile PDF
          </button>

          <button 
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showPreview ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            {showPreview ? "Split View" : "Editor Only"}
          </button>
        </div>
      </div>

      {/* The Workspace */}
      <div className="flex-1 w-full overflow-hidden flex justify-center bg-[#f3f4f6]">
        <div className={`transition-all duration-300 ease-in-out h-full flex ${showPreview ? 'w-[95%]' : 'w-full max-w-[850px]'} pt-8 pb-8 gap-4`}>
          
          {/* EDITOR SIDE */}
          <div className={`bg-white shadow-lg border border-gray-200 h-full flex flex-col relative ${showPreview ? 'w-1/2 rounded-l-lg' : 'w-full rounded-none shadow-xl min-h-[1100px]'}`}>
             <div className="absolute top-0 right-0 p-2 text-xs text-gray-300 font-mono pointer-events-none uppercase tracking-widest">{mode} SOURCE</div>
             <textarea
              ref={editorRef}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onMouseUp={handleMouseUp}
              spellCheck={mode !== 'latex'}
              className="w-full h-full p-8 resize-none focus:outline-none text-gray-800 text-base leading-[1.6] font-mono placeholder-gray-300 bg-transparent"
              placeholder={mode === 'latex' ? "\\documentclass{article}\n\\begin{document}\n..." : (mode === 'docx' ? "Start typing your document..." : "# Introduction\nStart writing...")}
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            />
            
            {/* FAB */}
             {!showPreview && (
                <button
                  onClick={onGhostWriteTrigger}
                  disabled={isGhostWriting}
                  className={`absolute -right-16 bottom-16 w-12 h-12 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center hover:bg-blue-500 transition-all z-20 ${isGhostWriting ? 'opacity-50 cursor-not-allowed' : 'opacity-100 hover:scale-110'}`}
                  title="Ghost Write (Ctrl+Enter)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </button>
             )}
          </div>

          {/* PREVIEW SIDE */}
          {showPreview && (
            <div className="w-1/2 h-full bg-white shadow-lg border border-gray-200 rounded-r-lg overflow-y-auto p-8 markdown-preview">
               <div className="mb-4 pb-2 border-b border-gray-100 flex justify-between items-center text-gray-400">
                  <span className="text-xs uppercase tracking-wider font-bold">
                    {mode === 'latex' ? 'PDF Preview' : 'Compiled Preview'}
                  </span>
                  <span className="text-xs font-mono">KaTeX Enabled</span>
               </div>
               <div className="prose prose-sm max-w-none">
                 <ReactMarkdown 
                    remarkPlugins={[remarkMath, remarkGfm]}
                    rehypePlugins={[rehypeKatex]}
                 >
                   {mode === 'latex' ? latexToMarkdown(content) : content}
                 </ReactMarkdown>
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default EditorPanel;