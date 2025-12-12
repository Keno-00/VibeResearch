export interface ResearchSnippet {
  id: string;
  source: string;
  year: number;
  author: string;
  content: string;
  tags: string[];
}

export type Dialect = 'American' | 'British' | 'International';
export type SentenceStructure = 'Natural' | 'Periodic' | 'Loose' | 'Balanced';
export type VocabularyStyle = 'Literal' | 'Descriptive' | 'Complex';
export type Frequency = 'Low' | 'Medium' | 'High';
export type WritingDomain = 'General' | 'Academic' | 'Scientific' | 'Expository' | 'Creative';
export type StructuralBias = 'Default' | 'Coupling (2s)' | 'Triplets (3s)' | 'Quadruplets (4s)';
export type SentenceLengthBias = 'Short' | 'Varied' | 'Long';

export interface StyleProfile {
  tone: string; 
  avgSentenceLength: string; 
  jargonLevel: string; 
  transitionWords: string[];
  rawSummary: string;
  
  // Numeric Sliders
  formalityLevel: number; // 0-100
  sentenceVariance: number; // 0-100
  activeVoice: number; // 0-100
  
  // Specific Linguistics
  dialect: Dialect;
  sentenceStructure: SentenceStructure;
  sentenceLengthBias: SentenceLengthBias;
  vocabularyStyle: VocabularyStyle;
  modifierFrequency: Frequency; // Adjectives/Adverbs density
  connectiveFrequency: Frequency; // Transition words density
  
  // New Linguistics
  writingDomain: WritingDomain;
  structuralBias: StructuralBias;
  
  // Rhetorical Flourishes
  useMetaphors: boolean;
  useAnalogies: boolean;
  useAnecdotes: boolean;
  
  // Grammar Pedantry
  allowContractions: boolean;
  allowSplitInfinitives: boolean;
  allowEndingPrepositions: boolean;
  
  // Legacy general toggles (mapped to above or kept for compatibility)
  useIdioms: boolean;
  useRhetoricalDevices: boolean; // General flag
  preferConcreteNouns: boolean; 
  
  allowedPunctuation: string[]; 
  bannedWords: string[]; 
}

export type EditorMode = 'markdown' | 'latex' | 'docx';

export interface EditorStats {
  words: number;
  chars: number;
}