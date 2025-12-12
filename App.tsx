import React, { useState, useEffect, useCallback, useRef } from 'react';
import VibeDeck from './components/VibeDeck';
import EditorPanel from './components/EditorPanel';
import { INITIAL_RESEARCH_DB, DEFAULT_STYLE_PROFILE } from './services/mockData';
import { extractKeywords, ghostWrite, analyzeStyle, rewriteSection, continueSection, findCitationsForSelection } from './services/geminiService';
import { ResearchSnippet, StyleProfile, EditorMode } from './types';

function App() {
  // State
  const [content, setContent] = useState<string>("");
  const [mode, setMode] = useState<EditorMode>('markdown');
  const [researchData, setResearchData] = useState<ResearchSnippet[]>(INITIAL_RESEARCH_DB);
  const [liveSuggestions, setLiveSuggestions] = useState<ResearchSnippet[]>([]);
  const [styleProfile, setStyleProfile] = useState<StyleProfile>(DEFAULT_STYLE_PROFILE);
  const [isGhostWriting, setIsGhostWriting] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Debounced Logic for "Live Context" - 30 seconds pause trigger
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (content.length > 20) {
        const keywords = await extractKeywords(content);
        if (keywords.length > 0) {
          // Fuzzy match simulation
          const relevant = researchData.filter(item => 
            keywords.some(k => 
              item.content.toLowerCase().includes(k.toLowerCase()) || 
              item.tags.some(t => t.toLowerCase().includes(k.toLowerCase()))
            )
          );
          setLiveSuggestions(relevant.slice(0, 3));
        }
      }
    }, 30000); // 30s debounce (User paused for 30s)

    return () => clearTimeout(handler);
  }, [content, researchData]);

  // Actions
  const handleGhostWrite = async () => {
    if (isGhostWriting) return;
    setIsGhostWriting(true);

    // Remove trigger symbol if present
    const cleanContent = content.endsWith('+++') ? content.slice(0, -3) : content;
    
    try {
      const result = await ghostWrite(cleanContent, styleProfile, researchData, mode);
      
      // Update DB with new citations if any
      if (result.newReferences && result.newReferences.length > 0) {
        setResearchData(prev => [...result.newReferences, ...prev]);
        setLiveSuggestions(prev => [...result.newReferences, ...prev].slice(0, 3)); // Show the new ones immediately
      }

      // Append text
      setContent(cleanContent + "\n\n" + result.paragraph);
      
      // Scroll to bottom
      if (editorRef.current) {
        setTimeout(() => {
          editorRef.current?.scrollTo({ top: editorRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      console.error("Ghost write failed", error);
    } finally {
      setIsGhostWriting(false);
    }
  };

  const handleRewrite = async (selection: string) => {
    setIsGhostWriting(true);
    try {
      const rewritten = await rewriteSection(selection, styleProfile, mode);
      if (editorRef.current) {
        const start = editorRef.current.selectionStart;
        const end = editorRef.current.selectionEnd;
        const newContent = content.substring(0, start) + rewritten + content.substring(end);
        setContent(newContent);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGhostWriting(false);
    }
  };

  const handleContinue = async (selection: string) => {
    setIsGhostWriting(true);
    try {
      const continuation = await continueSection(selection, styleProfile, mode);
      if (editorRef.current) {
        // Append after selection
        const end = editorRef.current.selectionEnd;
        const newContent = content.substring(0, end) + " " + continuation + content.substring(end);
        setContent(newContent);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGhostWriting(false);
    }
  };
  
  const handleFindCitations = async (selection: string) => {
    // Show loading state implicitly by maybe setting ghostwriting true? 
    // Or just let the async flow happen.
    setIsGhostWriting(true);
    try {
        const citations = await findCitationsForSelection(selection, researchData);
        
        // Add new citations to library
        const newCitations = citations.filter(c => !researchData.some(existing => existing.id === c.id));
        
        if (newCitations.length > 0) {
            setResearchData(prev => [...newCitations, ...prev]);
        }
        
        // Show in live feed
        setLiveSuggestions(citations);
    } catch (e) {
        console.error(e);
    } finally {
        setIsGhostWriting(false);
    }
  };

  const handleInsertCitation = useCallback((citation: string) => {
    if (editorRef.current) {
      const textarea = editorRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + citation + text.substring(end);
      setContent(newText);
      setTimeout(() => textarea.focus(), 0);
    }
  }, []);

  const addResearchSnippet = (snippet: ResearchSnippet) => {
    setResearchData(prev => [snippet, ...prev]);
  };

  const handleCalibrateFromEditor = async () => {
    if (content.length < 50) {
      alert("Please write at least 50 characters before calibrating.");
      return;
    }
    setIsCalibrating(true);
    try {
      const newProfile = await analyzeStyle(content);
      setStyleProfile(newProfile);
    } catch (e) {
      console.error("Calibration failed", e);
    } finally {
      setIsCalibrating(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f3f4f6] font-sans text-gray-800">
      
      {/* Left Panel: The Vibe Deck (30%) */}
      <div className="w-[30%] min-w-[300px] max-w-[450px] h-full z-10 shadow-xl bg-white">
        <VibeDeck 
          researchData={researchData}
          liveSuggestions={liveSuggestions}
          styleProfile={styleProfile}
          setStyleProfile={setStyleProfile}
          onInsertCitation={handleInsertCitation}
          addResearchSnippet={addResearchSnippet}
          onCalibrateFromEditor={handleCalibrateFromEditor}
          isCalibrating={isCalibrating}
        />
      </div>

      {/* Right Panel: The Canvas (70%) */}
      <div className="flex-1 h-full relative">
        <EditorPanel 
          content={content} 
          onChange={setContent}
          isGhostWriting={isGhostWriting}
          onGhostWriteTrigger={handleGhostWrite}
          editorRef={editorRef}
          mode={mode}
          setMode={setMode}
          onRewrite={handleRewrite}
          onContinue={handleContinue}
          onFindCitations={handleFindCitations}
        />
      </div>
    </div>
  );
}

export default App;