import React, { useState, useRef } from 'react';
import { ResearchSnippet, StyleProfile, Dialect, SentenceStructure, VocabularyStyle, Frequency, WritingDomain, StructuralBias, SentenceLengthBias } from '../types';
import { analyzeStyle, generateStyleSample } from '../services/geminiService';

interface VibeDeckProps {
  researchData: ResearchSnippet[];
  liveSuggestions: ResearchSnippet[];
  styleProfile: StyleProfile;
  setStyleProfile: (profile: StyleProfile) => void;
  onInsertCitation: (citation: string) => void;
  addResearchSnippet: (snippet: ResearchSnippet) => void;
  onCalibrateFromEditor: () => Promise<void>;
  isCalibrating: boolean;
}

const PUNCTUATION_OPTIONS = [";", ":", "—", "()", "!", "?", "...", "–"];

// Tooltip Helper Component
const InfoTooltip: React.FC<{ title: string, content: React.ReactNode }> = ({ title, content }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center ml-1 group">
      <div 
        className="cursor-help text-gray-400 hover:text-blue-500 transition-colors"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
        </svg>
      </div>
      {isVisible && (
        <div className="absolute left-full top-0 ml-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="font-bold mb-1 text-blue-200 uppercase tracking-wider">{title}</div>
          <div className="leading-relaxed opacity-90">{content}</div>
        </div>
      )}
    </div>
  );
};

const VibeDeck: React.FC<VibeDeckProps> = ({ 
  researchData, 
  liveSuggestions, 
  styleProfile, 
  setStyleProfile,
  onInsertCitation,
  addResearchSnippet,
  onCalibrateFromEditor,
  isCalibrating
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'research' | 'style'>('live');
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showTestSample, setShowTestSample] = useState(false);
  const [testSampleText, setTestSampleText] = useState("");
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const researchInputRef = useRef<HTMLInputElement>(null);

  // Local state for editing settings before save
  const [editingProfile, setEditingProfile] = useState<StyleProfile>(styleProfile);
  const [bannedWordInput, setBannedWordInput] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingFile(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const newProfile = await analyzeStyle(text);
      setStyleProfile(newProfile);
      setEditingProfile(newProfile);
      setIsAnalyzingFile(false);
    };
    reader.readAsText(file);
  };

  const handleResearchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const snippet: ResearchSnippet = {
        id: Date.now().toString(),
        author: "Uploaded Doc",
        year: new Date().getFullYear(),
        source: file.name,
        content: text.slice(0, 200) + "...", 
        tags: ["user-upload"]
      };
      addResearchSnippet(snippet);
    };
    reader.readAsText(file);
  };

  const openSettings = () => {
    setEditingProfile({ ...styleProfile });
    setBannedWordInput(styleProfile.bannedWords ? styleProfile.bannedWords.join(", ") : "");
    setShowAdvancedSettings(true);
  };

  const saveSettings = () => {
    const bannedArray = bannedWordInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
    setStyleProfile({ ...editingProfile, bannedWords: bannedArray });
    setShowAdvancedSettings(false);
  };

  const applyScientificPreset = () => {
    setEditingProfile(prev => ({
      ...prev,
      writingDomain: 'Scientific',
      structuralBias: 'Coupling (2s)',
      vocabularyStyle: 'Literal',
      modifierFrequency: 'Low',
      connectiveFrequency: 'Low',
      formalityLevel: 90,
      activeVoice: 60, // Balance for scientific passive conventions
      useMetaphors: false,
      useAnalogies: true,
      useAnecdotes: false,
      allowContractions: false,
      allowSplitInfinitives: false,
      allowEndingPrepositions: false,
      preferConcreteNouns: true,
      sentenceStructure: 'Balanced'
    }));
  };

  const togglePunctuation = (mark: string) => {
    const current = editingProfile.allowedPunctuation || [];
    if (current.includes(mark)) {
      setEditingProfile({ ...editingProfile, allowedPunctuation: current.filter(m => m !== mark) });
    } else {
      setEditingProfile({ ...editingProfile, allowedPunctuation: [...current, mark] });
    }
  };

  const handleGenerateSample = async () => {
    setIsGeneratingSample(true);
    const bannedArray = bannedWordInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const tempProfile = { ...editingProfile, bannedWords: bannedArray };
    const text = await generateStyleSample(tempProfile);
    setTestSampleText(text);
    setIsGeneratingSample(false);
    setShowTestSample(true);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200 relative">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        <button 
          onClick={() => setActiveTab('live')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'live' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          Live Context
        </button>
        <button 
          onClick={() => setActiveTab('research')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'research' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          Library
        </button>
        <button 
          onClick={() => setActiveTab('style')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'style' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          Vibe
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
        
        {/* LIVE CONTEXT TAB */}
        {activeTab === 'live' && (
          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-4">
              Contextual Feed
            </h3>
            {liveSuggestions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm italic">Stop typing for 30s to trigger AI lookups...</p>
              </div>
            ) : (
              liveSuggestions.map((snippet) => (
                <div key={snippet.id} className="bg-white border border-gray-200 shadow-sm rounded-lg p-4 hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-blue-700 text-xs font-bold font-sans">{snippet.author} ({snippet.year})</span>
                    <button 
                      onClick={() => onInsertCitation(`\\cite{${snippet.author.split(' ')[0]}${snippet.year}}`)}
                      className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity font-medium"
                    >
                      Cite
                    </button>
                  </div>
                  <h4 className="text-xs font-semibold text-gray-800 mb-1">{snippet.source}</h4>
                  <p className="text-gray-600 text-sm leading-relaxed mb-3">
                    {snippet.content}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {snippet.tags.map(tag => (
                      <span key={tag} className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">#{tag}</span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* RESEARCH TAB */}
        {activeTab === 'research' && (
          <div className="space-y-6">
             <div className="p-6 border-2 border-dashed border-gray-200 hover:border-blue-200 bg-white rounded-xl text-center transition-colors">
              <input 
                type="file" 
                ref={researchInputRef}
                onChange={handleResearchUpload}
                className="hidden" 
                accept=".txt,.md,.pdf" 
              />
              <button 
                onClick={() => researchInputRef.current?.click()}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                + Add Source (PDF/Txt)
              </button>
              <p className="text-xs text-gray-400 mt-2">Parsed and added to local citation index</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs uppercase tracking-wider text-gray-500 font-bold">Bibliography ({researchData.length})</h3>
              </div>
              <div className="space-y-3">
                {researchData.map(snippet => (
                  <div key={snippet.id} className="bg-white p-3 rounded-lg text-sm border border-gray-200 shadow-sm">
                    <div className="font-bold text-gray-800">{snippet.source}</div>
                    <div className="text-gray-500 text-xs mt-1">{snippet.author} ({snippet.year})</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STYLE TAB */}
        {activeTab === 'style' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-sm font-bold text-gray-900">Writing Profile</h3>
                <button 
                  onClick={openSettings}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded"
                >
                  Fine-Tune
                </button>
              </div>
              <div className="space-y-3 text-sm">
                 <div className="flex justify-between items-center">
                  <span className="text-gray-500">Domain</span>
                  <span className="text-gray-800 font-medium">{styleProfile.writingDomain}</span>
                </div>
                 <div className="flex justify-between items-center">
                  <span className="text-gray-500">Structure</span>
                  <span className="text-gray-800 font-medium">{styleProfile.structuralBias}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Dialect</span>
                  <span className="text-gray-800 font-medium">{styleProfile.dialect}</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">AI Summary</p>
                <p className="text-sm text-gray-600 italic">
                  "{styleProfile.rawSummary}"
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
               <button 
                onClick={onCalibrateFromEditor}
                disabled={isCalibrating}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {isCalibrating ? (
                   <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Reading Draft...</span>
                   </>
                ) : (
                  "Calibrate from Draft"
                )}
              </button>

              <div className="p-6 border-2 border-dashed border-gray-200 hover:border-blue-200 bg-white rounded-xl text-center transition-colors">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden" 
                  accept=".txt,.md"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzingFile}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold disabled:text-gray-400"
                >
                  {isAnalyzingFile ? "Analyzing File..." : "Calibrate from Upload"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Settings Modal Overlay */}
      {showAdvancedSettings && (
        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm p-6 flex flex-col overflow-y-auto animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Fine-Tune Linguistics</h2>
            <button onClick={() => setShowAdvancedSettings(false)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <div className="space-y-8 flex-1">

            {/* QUICK PRESETS */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
               <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Quick Presets</h3>
               <button 
                onClick={applyScientificPreset}
                className="px-4 py-2 bg-white border border-blue-200 text-blue-700 font-medium rounded shadow-sm hover:shadow-md transition-all text-sm"
               >
                 Apply "Scientific & Academic" Standard
               </button>
            </div>
            
            {/* 1. Domain & Structure */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-2">Writing Domain</h3>
              <div className="grid grid-cols-1 gap-4">
                <label className="flex flex-col gap-1">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700">Style/Domain</span>
                    <InfoTooltip 
                      title="Writing Domain" 
                      content="Sets the overall expectation for the AI. 'Scientific' enforces objectivity and data-first assertions. 'Academic' focuses on structure and citations." 
                    />
                  </div>
                  <select 
                    value={editingProfile.writingDomain}
                    onChange={(e) => setEditingProfile({...editingProfile, writingDomain: e.target.value as WritingDomain})}
                    className="p-2 border rounded-md bg-white text-sm"
                  >
                    <option value="General">General / Blog</option>
                    <option value="Academic">Academic</option>
                    <option value="Scientific">Scientific (Plain, Data-driven)</option>
                    <option value="Expository">Expository</option>
                    <option value="Creative">Creative</option>
                  </select>
                </label>

                 <label className="flex flex-col gap-1">
                  <div className="flex items-center">
                     <span className="text-sm font-medium text-gray-700">Structural Bias</span>
                     <InfoTooltip 
                      title="Structural Bias" 
                      content={
                        <div>
                          <p className="mb-1"><strong>Coupling (2s):</strong> "Research and development." (Balanced)</p>
                          <p><strong>Triplets (3s):</strong> "Research, development, and innovation." (Rhetorical)</p>
                        </div>
                      } 
                    />
                  </div>
                  <select 
                    value={editingProfile.structuralBias}
                    onChange={(e) => setEditingProfile({...editingProfile, structuralBias: e.target.value as StructuralBias})}
                    className="p-2 border rounded-md bg-white text-sm"
                  >
                    <option value="Default">Default / Mixed</option>
                    <option value="Coupling (2s)">Coupling (Groups of 2)</option>
                    <option value="Triplets (3s)">Rule of 3 (Standard Rhetoric)</option>
                    <option value="Quadruplets (4s)">Quadruplets (Groups of 4)</option>
                  </select>
                </label>
              </div>
            </div>

            {/* 2. Sentence Architecture */}
             <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-2">Sentence Architecture</h3>
              <div className="grid grid-cols-1 gap-4">
                 <label className="flex flex-col gap-1">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700">Ordering Preference</span>
                    <InfoTooltip 
                      title="Sentence Structure" 
                      content={
                        <div>
                          <p className="mb-2"><strong>Periodic:</strong> Main idea at end. <br/><em>"Despite the rain, the game continued."</em></p>
                          <p><strong>Loose:</strong> Main idea at start. <br/><em>"The game continued, despite the rain."</em></p>
                        </div>
                      } 
                    />
                  </div>
                  <select 
                    value={editingProfile.sentenceStructure}
                    onChange={(e) => setEditingProfile({...editingProfile, sentenceStructure: e.target.value as SentenceStructure})}
                    className="p-2 border rounded-md bg-white text-sm"
                  >
                    <option value="Natural">Natural / Mixed</option>
                    <option value="Periodic">Periodic (Suspenseful)</option>
                    <option value="Loose">Loose (Cumulative)</option>
                    <option value="Balanced">Balanced (Parallel)</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700">Length Bias</span>
                  </div>
                  <select 
                    value={editingProfile.sentenceLengthBias}
                    onChange={(e) => setEditingProfile({...editingProfile, sentenceLengthBias: e.target.value as SentenceLengthBias})}
                    className="p-2 border rounded-md bg-white text-sm"
                  >
                    <option value="Varied">Varied (Natural)</option>
                    <option value="Short">Short & Punchy (Hemingway)</option>
                    <option value="Long">Long & Complex (Academic)</option>
                  </select>
                </label>
                
                 <div>
                    <div className="flex justify-between text-sm mb-1">
                      <label className="text-sm font-medium text-gray-700">Variance / Rhythm</label>
                      <span className="text-orange-600">{editingProfile.sentenceVariance}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={editingProfile.sentenceVariance}
                      onChange={(e) => setEditingProfile({...editingProfile, sentenceVariance: parseInt(e.target.value)})}
                      className="w-full accent-orange-600"
                    />
                     <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Robotic</span>
                      <span>Chaotic</span>
                    </div>
                  </div>
              </div>
            </div>

            {/* 3. Grammar Pedantry */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-2">Grammar Pedantry</h3>
              <div className="grid grid-cols-1 gap-3">
                 <label className="flex items-center justify-between p-3 border rounded bg-white hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-medium text-gray-700">Allow Contractions</span>
                       <InfoTooltip title="Contractions" content="Allows 'can't', 'won't', 'it's'. Disable for strict formal writing." />
                    </div>
                    <input 
                      type="checkbox" 
                      checked={editingProfile.allowContractions}
                      onChange={(e) => setEditingProfile({...editingProfile, allowContractions: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                 </label>

                 <label className="flex items-center justify-between p-3 border rounded bg-white hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-medium text-gray-700">Allow Split Infinitives</span>
                       <InfoTooltip title="Split Infinitives" content="Allowed: 'To boldly go'. Forbidden: 'To go boldly'. Traditionalists dislike splitting 'to' from the verb." />
                    </div>
                    <input 
                      type="checkbox" 
                      checked={editingProfile.allowSplitInfinitives}
                      onChange={(e) => setEditingProfile({...editingProfile, allowSplitInfinitives: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                 </label>

                 <label className="flex items-center justify-between p-3 border rounded bg-white hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-medium text-gray-700">Allow Ending Prepositions</span>
                       <InfoTooltip title="Ending Prepositions" content="Allowed: 'The tool I work with'. Forbidden: 'The tool with which I work'. Strict grammar rules forbid ending sentences with 'with', 'at', 'on', etc." />
                    </div>
                    <input 
                      type="checkbox" 
                      checked={editingProfile.allowEndingPrepositions}
                      onChange={(e) => setEditingProfile({...editingProfile, allowEndingPrepositions: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                 </label>
              </div>
            </div>

            {/* 4. Rhetorical Flourishes */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-2">Rhetorical Flourishes</h3>
              <div className="grid grid-cols-3 gap-3">
                 <label className="flex flex-col items-center justify-center p-3 border rounded bg-white hover:bg-gray-50 transition-colors cursor-pointer text-center">
                    <span className="text-sm font-medium text-gray-700 mb-2">Metaphors</span>
                    <input 
                      type="checkbox" 
                      checked={editingProfile.useMetaphors}
                      onChange={(e) => setEditingProfile({...editingProfile, useMetaphors: e.target.checked})}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                 </label>
                 <label className="flex flex-col items-center justify-center p-3 border rounded bg-white hover:bg-gray-50 transition-colors cursor-pointer text-center">
                    <span className="text-sm font-medium text-gray-700 mb-2">Analogies</span>
                    <input 
                      type="checkbox" 
                      checked={editingProfile.useAnalogies}
                      onChange={(e) => setEditingProfile({...editingProfile, useAnalogies: e.target.checked})}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                 </label>
                 <label className="flex flex-col items-center justify-center p-3 border rounded bg-white hover:bg-gray-50 transition-colors cursor-pointer text-center">
                    <span className="text-sm font-medium text-gray-700 mb-2">Anecdotes</span>
                    <input 
                      type="checkbox" 
                      checked={editingProfile.useAnecdotes}
                      onChange={(e) => setEditingProfile({...editingProfile, useAnecdotes: e.target.checked})}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                 </label>
              </div>
            </div>

            {/* 5. Vocabulary & Hype Control */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-2">Vocabulary & Hype Control</h3>
              <div className="grid grid-cols-1 gap-4">
                 <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-700">Vocabulary Style</span>
                  <select 
                    value={editingProfile.vocabularyStyle}
                    onChange={(e) => setEditingProfile({...editingProfile, vocabularyStyle: e.target.value as VocabularyStyle})}
                    className="p-2 border rounded-md bg-white text-sm"
                  >
                    <option value="Literal">Literal (Strict, Direct, No Synonyms)</option>
                    <option value="Descriptive">Descriptive (Varied, Adjectives)</option>
                    <option value="Complex">Complex (Thesaurus-Heavy)</option>
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-4">
                   <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">Modifier Frequency</span>
                    <select 
                      value={editingProfile.modifierFrequency}
                      onChange={(e) => setEditingProfile({...editingProfile, modifierFrequency: e.target.value as Frequency})}
                      className="p-2 border rounded-md bg-white text-sm"
                    >
                      <option value="Low">Low (Direct/Dry)</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High (Flowery)</option>
                    </select>
                  </label>

                   <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">Connective Frequency</span>
                    <select 
                      value={editingProfile.connectiveFrequency}
                      onChange={(e) => setEditingProfile({...editingProfile, connectiveFrequency: e.target.value as Frequency})}
                      className="p-2 border rounded-md bg-white text-sm"
                    >
                      <option value="Low">Low (Avoids 'However')</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High (Academic fluff)</option>
                    </select>
                  </label>
                </div>
                
                 <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input 
                        type="checkbox" 
                        checked={editingProfile.preferConcreteNouns}
                        onChange={(e) => setEditingProfile({...editingProfile, preferConcreteNouns: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Prefer Concrete Nouns (Grounding)
                    </label>
                 </div>
              </div>
            </div>

            {/* 6. Tone Sliders */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-2">Tone</h3>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <label className="font-medium text-gray-700">Formality</label>
                  <span className="text-blue-600">{editingProfile.formalityLevel}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={editingProfile.formalityLevel}
                  onChange={(e) => setEditingProfile({...editingProfile, formalityLevel: parseInt(e.target.value)})}
                  className="w-full accent-blue-600"
                />
              </div>

               <div>
                <div className="flex justify-between text-sm mb-1">
                  <label className="font-medium text-gray-700">Active Voice</label>
                  <span className="text-teal-600">{editingProfile.activeVoice}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={editingProfile.activeVoice}
                  onChange={(e) => setEditingProfile({...editingProfile, activeVoice: parseInt(e.target.value)})}
                  className="w-full accent-teal-600"
                />
              </div>
            </div>

             {/* Banned Words List */}
            <div>
               <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Banned "Hype" Words</label>
               <textarea 
                  value={bannedWordInput}
                  onChange={(e) => setBannedWordInput(e.target.value)}
                  className="w-full h-20 p-2 border rounded text-sm text-red-600 font-mono"
                  placeholder="delve, tapestry, game-changer..."
               />
               <p className="text-xs text-gray-400 mt-1">Comma separated list of words the AI is forbidden to use.</p>
            </div>

            {/* Punctuation Checklist */}
            <div>
              <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Allowed Punctuation (Strict)</label>
              <div className="grid grid-cols-4 gap-3">
                {PUNCTUATION_OPTIONS.map(mark => (
                  <button
                    key={mark}
                    onClick={() => togglePunctuation(mark)}
                    className={`h-10 border rounded flex items-center justify-center font-mono text-lg transition-all ${
                      editingProfile.allowedPunctuation.includes(mark)
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {mark}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="border-t border-gray-100 pt-6">
                <button 
                  onClick={handleGenerateSample}
                  disabled={isGeneratingSample}
                  className="w-full py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isGeneratingSample ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : "Generate Style Sample"}
                </button>
            </div>
          </div>

          <button 
            onClick={saveSettings}
            className="mt-6 w-full py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-black transition-colors"
          >
            Save Configuration
          </button>
        </div>
      )}

      {/* Test Sample Modal */}
      {showTestSample && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm p-8 flex items-center justify-center animate-in fade-in duration-200">
           <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
              <div className="p-4 border-b flex justify-between items-center">
                 <h3 className="font-bold text-gray-900">Style Check Sample</h3>
                 <button onClick={() => setShowTestSample(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                 <p className="text-sm font-mono whitespace-pre-wrap text-gray-700 leading-relaxed bg-gray-50 p-4 rounded border">
                    {testSampleText}
                 </p>
              </div>
              <div className="p-4 border-t bg-gray-50 flex justify-end">
                 <button 
                  onClick={() => navigator.clipboard.writeText(testSampleText)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                 >
                    Copy to Clipboard
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default VibeDeck;