import { ResearchSnippet } from '../types';

export const INITIAL_RESEARCH_DB: ResearchSnippet[] = [
  {
    id: '1',
    source: 'Solar Cell Efficiency Limits',
    year: 2024,
    author: 'Smith et al.',
    content: 'The Shockley-Queisser limit places a maximum theoretical efficiency of 33.7% for single-junction solar cells. Recent perovskite developments suggest pathways to bypass this via tandem structures.',
    tags: ['solar', 'efficiency', 'quantum', 'energy']
  },
  {
    id: '2',
    source: 'Quantum Decoherence in Warm Systems',
    year: 2023,
    author: 'Rodriguez & Chen',
    content: 'Observing quantum effects at room temperature remains a challenge due to rapid decoherence. Our table 3 shows that biological systems may utilize vibronic coupling to sustain coherence longer than expected.',
    tags: ['quantum', 'decoherence', 'physics']
  },
  {
    id: '3',
    source: 'Narrative Structures in Modern AI',
    year: 2025,
    author: 'Doe, J.',
    content: 'Large Language Models tend to converge on "mean" prose. To counteract this, injection of specific stylistic tokens is required during the inference pass.',
    tags: ['ai', 'llm', 'writing']
  },
  {
    id: '4',
    source: 'The Future of Interface Design',
    year: 2022,
    author: 'Nielsen',
    content: 'Split-brain interfaces allowing simultaneous creation and consumption reduce cognitive load by 15% compared to tab-switching workflows.',
    tags: ['ux', 'interface', 'productivity']
  }
];

export const DEFAULT_STYLE_PROFILE = {
  tone: "Objective",
  avgSentenceLength: "Medium-Long",
  jargonLevel: "High",
  transitionWords: [],
  rawSummary: "Scientific academic profile.",
  
  formalityLevel: 85,
  sentenceVariance: 40,
  activeVoice: 60, // Scientific writing often allows more passive voice
  
  dialect: 'American' as const,
  sentenceStructure: 'Balanced' as const,
  sentenceLengthBias: 'Varied' as const,
  vocabularyStyle: 'Literal' as const,
  modifierFrequency: 'Low' as const,
  connectiveFrequency: 'Low' as const,
  
  writingDomain: 'Scientific' as const,
  structuralBias: 'Coupling (2s)' as const,
  
  // Rhetoric
  useMetaphors: false,
  useAnalogies: true, // Often useful in science
  useAnecdotes: false,
  
  // Pedantry
  allowContractions: false,
  allowSplitInfinitives: false,
  allowEndingPrepositions: false,
  
  useIdioms: false,
  useRhetoricalDevices: false,
  preferConcreteNouns: true,
  
  allowedPunctuation: [";", ":", "—", "()", "!", ",", "."],
  bannedWords: [
    "delve", "tapestry", "landscape", "testament", "underscore", 
    "seamless", "game-changer", "transformative", "leverage", 
    "unleash", "realm", "foster", "robust", "revolutionize", "cutting-edge"
  ]
};