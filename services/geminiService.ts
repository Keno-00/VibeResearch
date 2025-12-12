import { GoogleGenAI, Type } from "@google/genai";
import { ResearchSnippet, StyleProfile, EditorMode } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to sanitize output if needed
const cleanText = (text: string) => text.trim();

export const analyzeStyle = async (sampleText: string): Promise<StyleProfile> => {
  if (!apiKey) throw new Error("API Key missing");
  
  const prompt = `
    Analyze the writing style of the following text with high linguistic precision.
    
    Return a JSON object with these keys: 
    - tone (string)
    - avgSentenceLength (string)
    - jargonLevel (string)
    - transitionWords (array of strings)
    - rawSummary (string, 2 sentences)
    - formalityLevel (number 0-100)
    - sentenceVariance (number 0-100)
    - activeVoice (number 0-100)
    - dialect (string enum: "American", "British", or "International")
    - sentenceStructure (string enum: "Natural", "Periodic", "Loose", or "Balanced")
    - sentenceLengthBias (string enum: "Short", "Varied", "Long")
    - vocabularyStyle (string enum: "Literal", "Descriptive", or "Complex")
    - modifierFrequency (string enum: "Low", "Medium", "High")
    - connectiveFrequency (string enum: "Low", "Medium", "High")
    - writingDomain (string enum: "General", "Academic", "Scientific", "Expository", "Creative")
    - structuralBias (string enum: "Default", "Coupling (2s)", "Triplets (3s)", "Quadruplets (4s)")
    - useMetaphors (boolean)
    - useAnalogies (boolean)
    - useAnecdotes (boolean)
    - allowContractions (boolean)
    - allowSplitInfinitives (boolean)
    - allowEndingPrepositions (boolean)
    - preferConcreteNouns (boolean)
    - allowedPunctuation (array of strings)
    - bannedWords (array of strings - detect overuse of clichés)

    Text Sample:
    "${sampleText.slice(0, 3000)}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    
    if (response.text) {
      const parsed = JSON.parse(response.text);
      return {
        ...parsed,
        // Fallbacks
        dialect: parsed.dialect || 'American',
        sentenceStructure: parsed.sentenceStructure || 'Natural',
        sentenceLengthBias: parsed.sentenceLengthBias || 'Varied',
        vocabularyStyle: parsed.vocabularyStyle || 'Literal',
        modifierFrequency: parsed.modifierFrequency || 'Medium',
        connectiveFrequency: parsed.connectiveFrequency || 'Medium',
        writingDomain: parsed.writingDomain || 'General',
        structuralBias: parsed.structuralBias || 'Default',
        useMetaphors: parsed.useMetaphors ?? false,
        useAnalogies: parsed.useAnalogies ?? false,
        useAnecdotes: parsed.useAnecdotes ?? false,
        allowContractions: parsed.allowContractions ?? true,
        allowSplitInfinitives: parsed.allowSplitInfinitives ?? true,
        allowEndingPrepositions: parsed.allowEndingPrepositions ?? true,
        preferConcreteNouns: parsed.preferConcreteNouns ?? true,
        allowedPunctuation: parsed.allowedPunctuation || [",", "."],
        bannedWords: parsed.bannedWords || []
      } as StyleProfile;
    }
    throw new Error("No data returned");
  } catch (error) {
    console.error("Style Analysis Failed", error);
    // Return safe default on error
    return {
      tone: "Error",
      avgSentenceLength: "Error",
      jargonLevel: "Error",
      transitionWords: [],
      rawSummary: "Failed to analyze style.",
      formalityLevel: 50,
      sentenceVariance: 50,
      activeVoice: 50,
      dialect: 'American',
      sentenceStructure: 'Natural',
      sentenceLengthBias: 'Varied',
      vocabularyStyle: 'Literal',
      modifierFrequency: 'Medium',
      connectiveFrequency: 'Medium',
      writingDomain: 'General',
      structuralBias: 'Default',
      useMetaphors: false,
      useAnalogies: false,
      useAnecdotes: false,
      allowContractions: true,
      allowSplitInfinitives: true,
      allowEndingPrepositions: true,
      preferConcreteNouns: true,
      useIdioms: false,
      useRhetoricalDevices: false,
      allowedPunctuation: [],
      bannedWords: []
    };
  }
};

export interface GhostWriteResponse {
  paragraph: string;
  newReferences: ResearchSnippet[];
}

const constructSystemPrompt = (styleProfile: StyleProfile, mode: EditorMode, contextString: string) => {
  return `
    ROLE: You are an expert ${styleProfile.writingDomain} writer and specialized linguist.
    
    EDITOR MODE: ${mode.toUpperCase()}
    If LATEX: Use \\section{}, \\textbf{}, etc.
    If MARKDOWN: Use #, **, etc.
    If DOCX: Plain text only.

    INPUT DATA:
    1. Research Context: 
    ${contextString}
    
    2. LINGUISTIC PROFILE (STRICTLY ENFORCE):
    - Domain: ${styleProfile.writingDomain}
    - Structural Bias: ${styleProfile.structuralBias}
    - Dialect: ${styleProfile.dialect} (Use strictly ${styleProfile.dialect} spelling/grammar).
    
    SENTENCE ARCHITECTURE:
    - Structure: ${styleProfile.sentenceStructure}
       * "Periodic": Main clause at the end.
       * "Loose": Main clause at start.
       * "Balanced": Parallel structures.
    - Length Bias: ${styleProfile.sentenceLengthBias} (Force this length trend).
    - Variance: ${styleProfile.sentenceVariance}% (Lower = more uniform length).
    
    VOCABULARY & TONE:
    - Style: ${styleProfile.vocabularyStyle} (Literal = Direct/Precise).
    - Modifier Frequency: ${styleProfile.modifierFrequency} (Low = Minimal adjectives).
    - Connective Frequency: ${styleProfile.connectiveFrequency} (Low = Minimal transition words).
    - Concrete Nouns: ${styleProfile.preferConcreteNouns}
    - Formality: ${styleProfile.formalityLevel}%
    - Active Voice: ${styleProfile.activeVoice}%
    
    GRAMMAR PEDANTRY (STRICT RULES):
    - Contractions Allowed: ${styleProfile.allowContractions} ${!styleProfile.allowContractions ? "(Do NOT use 'can't', 'won't', etc.)" : ""}
    - Split Infinitives Allowed: ${styleProfile.allowSplitInfinitives} ${!styleProfile.allowSplitInfinitives ? "(NEVER split infinitives. e.g. 'to boldly go' -> 'to go boldly')" : ""}
    - Ending Prepositions Allowed: ${styleProfile.allowEndingPrepositions} ${!styleProfile.allowEndingPrepositions ? "(NEVER end sentence with preposition. e.g. 'tool I work with' -> 'tool with which I work')" : ""}
    
    RHETORICAL FLOURISHES:
    - Metaphors: ${styleProfile.useMetaphors ? "ENCOURAGED" : "BANNED"}
    - Analogies: ${styleProfile.useAnalogies ? "ENCOURAGED" : "BANNED"}
    - Anecdotes: ${styleProfile.useAnecdotes ? "ENCOURAGED" : "BANNED"}
    
    ANTI-HYPE KILL LIST (DO NOT USE THESE WORDS):
    ${styleProfile.bannedWords.join(', ')}

    PUNCTUATION RULES:
    - Allowed Set: [${styleProfile.allowedPunctuation.join(', ')}]
    - CRITICAL: Do NOT use semicolons (;) unless allowed.
    - Use the Oxford Comma? ${styleProfile.dialect === 'American' ? 'Yes' : 'No'}.

    CITATION RULES:
    1. If a fact is not in Context, hallucinate a plausible citation.
    2. Use \\cite{AuthorYear} format.
  `;
};

export const ghostWrite = async (
  currentText: string, 
  styleProfile: StyleProfile, 
  researchContext: ResearchSnippet[],
  mode: EditorMode
): Promise<GhostWriteResponse> => {
  if (!apiKey) throw new Error("API Key missing");

  const recentContext = currentText.split(' ').slice(-300).join(' ');
  const contextString = researchContext.map(r => 
    `[Existing Source ID: ${r.id}] ${r.author} (${r.year}): ${r.content}`
  ).join('\n');

  const systemInstruction = constructSystemPrompt(styleProfile, mode, contextString) + `
    TASK: Continue the draft. Write the next paragraph.
    OUTPUT: Return JSON.
  `;

  const prompt = `Current Draft (End of text):\n...${recentContext}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', 
    contents: prompt,
    config: { 
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          paragraph: { type: Type.STRING },
          newReferences: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                source: { type: Type.STRING },
                year: { type: Type.INTEGER },
                author: { type: Type.STRING },
                content: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["id", "source", "year", "author", "content", "tags"]
            }
          }
        },
        required: ["paragraph", "newReferences"]
      }
    }
  });

  if (response.text) {
    const data = JSON.parse(response.text) as GhostWriteResponse;
    data.newReferences = data.newReferences.map(ref => ({
      ...ref,
      id: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }));
    return data;
  }
  
  throw new Error("Failed to generate content");
};

// Rewrite a specific section
export const rewriteSection = async (
  selection: string,
  styleProfile: StyleProfile,
  mode: EditorMode
): Promise<string> => {
  if (!apiKey) throw new Error("API Key missing");

  const systemInstruction = constructSystemPrompt(styleProfile, mode, "") + `
    TASK: Rewrite the following text to perfectly match the Style Profile.
    Maintain the original meaning but change the structure, vocabulary, and tone.
    Output ONLY the rewritten text.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Text to Rewrite:\n${selection}`,
    config: { systemInstruction }
  });

  return response.text || selection;
};

// Continue text based on selection
export const continueSection = async (
  selection: string,
  styleProfile: StyleProfile,
  mode: EditorMode
): Promise<string> => {
  if (!apiKey) throw new Error("API Key missing");
  
  const systemInstruction = constructSystemPrompt(styleProfile, mode, "") + `
    TASK: Write the immediate next sentence or two that follows logically from the selection.
    Output ONLY the continuation text.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Context:\n${selection}`,
    config: { systemInstruction }
  });

  return response.text || "";
};

// Find citations for specific selection (Local + AI Generation)
export const findCitationsForSelection = async (
  selection: string,
  researchDB: ResearchSnippet[]
): Promise<ResearchSnippet[]> => {
  if (!apiKey) throw new Error("API Key missing");
  
  // 1. Extract Keywords & Local Search
  const keywords = await extractKeywords(selection);
  
  const localMatches = researchDB.filter(item => 
    keywords.some(k => 
      item.content.toLowerCase().includes(k.toLowerCase()) || 
      item.tags.some(t => t.toLowerCase().includes(k.toLowerCase()))
    )
  );

  // If we have enough local matches, just return them
  if (localMatches.length >= 3) {
      return localMatches.slice(0, 3);
  }

  // 2. AI Generation/Hallucination for more sources
  // We need to fill the gap
  const needed = 3 - localMatches.length;

  const prompt = `
    Based on the text below, generate ${needed} relevant academic citations that would support the claims.
    These should look like real research papers.

    Text Context: "${selection.slice(0, 1000)}"

    Output strictly a JSON array of objects with this schema:
    [{
      "source": "Title of paper",
      "year": 2024,
      "author": "Author Name",
      "content": "One sentence summary of relevance.",
      "tags": ["tag1", "tag2"]
    }]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    if (response.text) {
        const generated = JSON.parse(response.text);
        const newSnippets: ResearchSnippet[] = generated.map((g: any) => ({
            ...g,
            id: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }));
        return [...localMatches, ...newSnippets];
    }
  } catch (e) {
      console.error("Citation generation failed", e);
  }

  return localMatches;
};

export const generateStyleSample = async (styleProfile: StyleProfile): Promise<string> => {
  if (!apiKey) throw new Error("API Key missing");

  const prompt = `
    Generate a 400-word text about "The impact of synthetic biology on future manufacturing".
    
    STRICTLY FOLLOW THESE LINGUISTIC RULES:
    - Domain: ${styleProfile.writingDomain}
    - Structural Bias: ${styleProfile.structuralBias}
    - Dialect: ${styleProfile.dialect}
    - Sentence Structure: ${styleProfile.sentenceStructure}
    - Vocabulary: ${styleProfile.vocabularyStyle}
    - Modifier Frequency: ${styleProfile.modifierFrequency}
    - Connective Frequency: ${styleProfile.connectiveFrequency}
    - Grammar Pedantry: Contractions=${styleProfile.allowContractions}, SplitInfinitives=${styleProfile.allowSplitInfinitives}, EndPrepositions=${styleProfile.allowEndingPrepositions}
    - Rhetoric: Metaphor=${styleProfile.useMetaphors}, Analogy=${styleProfile.useAnalogies}
    - Avoid Banned Words: ${styleProfile.bannedWords.join(', ')}
    - Active Voice (0-100): ${styleProfile.activeVoice}
    - Allowed Punctuation: [${styleProfile.allowedPunctuation.join(', ')}]
    
    Output purely the text. No JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Failed to generate sample.";
  } catch (e) {
    return "Error generating sample.";
  }
};

export const extractKeywords = async (text: string): Promise<string[]> => {
  if (!apiKey || text.length < 50) return [];

  const prompt = `
    Extract 3-5 main search keywords. Return JSON array of strings.
    Text: "${text.slice(-500)}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [];
  }
};