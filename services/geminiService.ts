
import { GoogleGenAI, Type } from "@google/genai";
import { SentenceData, AnalyzedVocabulary, WritingBatch, VisualQuizData } from "../types";

// --- KONFIGURACJA GENEROWANIA ZDAŃ ---
const GENERATION_SYSTEM_INSTRUCTION = `
Jesteś rygorystycznym asystentem do nauki czytania Hiragany.
Otrzymasz od systemu:
1. LISTĘ SŁÓW (validHiraganaWords) - to są jedyne rzeczowniki/czasowniki/przymiotniki, jakich wolno Ci użyć.
2. LISTĘ ZNAKÓW (allowedCharacters) - to są jedyne znaki, jakie mogą pojawić się w zdaniu.

Zasady Tworzenia Tekstu:
- Wygeneruj tekst składający się z DOKŁADNIE SZEŚCIU (6) zdań.
- Zdania MUSZĄ tworzyć spójną, logiczną historię (ciąg narracyjny).
- Używaj słów GŁÓWNYCH (rdzeni) WYŁĄCZNIE z listy 'validHiraganaWords'. Nie wymyślaj nowych słów.

Zasady Gramatyki i Ortografii (BARDZO WAŻNE):
- Partykuła tematu "wa" musi być zapisywana znakiem 'は' (ha). Jeśli na liście 'allowedCharacters' nie ma znaku 'は', POMIŃ partykułę. POD ŻADNYM POZOREM nie zapisuj jej jako 'わ' (wa).
- Partykuła dopełnienia "o" musi być zapisywana znakiem 'を' (wo). Jeśli brak 'を', pomiń ją.
- Partykuła kierunku "e" musi być zapisywana znakiem 'へ' (he). Jeśli brak 'へ', pomiń ją.
- Gramatyka (końcówki: desu, masu) jest dozwolona TYLKO WTEDY, gdy WSZYSTKIE znaki potrzebne do jej zapisu znajdują się na liście 'allowedCharacters'.
- Japońska interpunkcja (。, 、) jest dozwolona i pożądana.

Zasady Tłumaczenia (Polski):
- Tłumaczenie musi być GRAMATYCZNIE PRECYZYNE dla wszystkich 6 zdań.
- Nie zgaduj kontekstu, tłumacz to, co jest napisane w całości jako opowieść.
- KLUCZOWE DLA ZAIMKÓW WSKAZUJĄCYCH: Jeśli używasz słów typu "kore", "sore", "are" (lub kono/sono/ano), w polskim tłumaczeniu MUSISZ dodać w nawiasie wskazówkę przestrzenną.
  * Dla "kore"/"kono" napisz: "to (tutaj/blisko mnie)"
  * Dla "sore"/"sono" napisz: "to (tam/u ciebie)"
  * Dla "are"/"ano" napisz: "tamto (daleko)"
  Jest to niezbędne, aby użytkownik wiedział, którego japońskiego słowa użyć w ćwiczeniu pisania.

Format wyjściowy: JSON.
`;

export const generateSentence = async (apiKey: string, vocabulary: AnalyzedVocabulary, suggestedWords: string[] = []): Promise<SentenceData> => {
  const ai = new GoogleGenAI({ apiKey });

  const promptText = `
  DOZWOLONE SŁOWA (Vocab): ${JSON.stringify(vocabulary.validHiraganaWords)}
  DOZWOLONE ZNAKI (Chars): ${JSON.stringify(vocabulary.allowedCharacters)}
  
  Zadanie: Ułóż spójną historię z 6 zdań do CZYTANIA (jeden blok tekstu).
  PRIORYTET (Ważne): Te słowa muszą pojawić się w tekście: ${suggestedWords.join(', ')}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: promptText,
    config: {
      systemInstruction: GENERATION_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hiragana: { type: Type.STRING, description: "Full story in Hiragana." },
          romaji: { type: Type.STRING, description: "Romaji reading." },
          polishTranslation: { type: Type.STRING, description: "Polish translation." },
        },
        required: ["hiragana", "romaji", "polishTranslation"],
      },
      temperature: 0.8, 
    },
  });

  const jsonStr = response.text?.trim();
  if (!jsonStr) throw new Error("Empty generation response");
  return JSON.parse(jsonStr) as SentenceData;
};

export const generateWritingBatch = async (apiKey: string, vocabulary: AnalyzedVocabulary, suggestedWords: string[] = []): Promise<WritingBatch> => {
  const ai = new GoogleGenAI({ apiKey });

  const promptText = `
  DOZWOLONE SŁOWA (Vocab): ${JSON.stringify(vocabulary.validHiraganaWords)}
  DOZWOLONE ZNAKI (Chars): ${JSON.stringify(vocabulary.allowedCharacters)}
  
  Zadanie: Ułóż spójną historię z 6 zdań do pisania (trening PAMIĘCI).
  Zwróć jako tablicę par: Zdanie po Polsku -> Oczekiwane zdanie w Hiraganie.
  PRIORYTET (Ważne): Te słowa muszą pojawić się w tekście: ${suggestedWords.join(', ')}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: promptText,
    config: {
      systemInstruction: GENERATION_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          challenges: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                polish: { type: Type.STRING },
                hiragana: { type: Type.STRING },
                romaji: { type: Type.STRING }
              },
              required: ["polish", "hiragana", "romaji"]
            }
          }
        },
        required: ["challenges"],
      },
      temperature: 0.8, 
    },
  });

  const jsonStr = response.text?.trim();
  if (!jsonStr) throw new Error("Empty generation response");
  return JSON.parse(jsonStr) as WritingBatch;
};

// --- VISUAL QUIZ GENERATION ---

export const generateVisualQuizItem = async (apiKey: string, vocabulary: AnalyzedVocabulary, suggestedWords: string[] = []): Promise<VisualQuizData> => {
  const ai = new GoogleGenAI({ apiKey });

  // 1. Generate text and identify target
  const textPrompt = `
  DOZWOLONE SŁOWA (Vocab): ${JSON.stringify(vocabulary.validHiraganaWords)}
  DOZWOLONE ZNAKI (Chars): ${JSON.stringify(vocabulary.allowedCharacters)}
  PRIORYTET (Ważne): Te słowa muszą pojawić się w tekście: ${suggestedWords.join(', ')}

  Zadanie: 
  1. Wybierz JEDNO konkretne słowo z listy 'Vocab', które łatwo przedstawić na obrazku (rzeczownik lub czasownik). To będzie 'targetWord'.
  2. Ułóż JEDNO proste zdanie w Hiraganie używając tego słowa.
  3. Podziel to zdanie na dwie części: przed słowem docelowym i po nim (sentencePartBefore, sentencePartAfter).
  4. Przygotuj prompt do obrazka (imagePrompt) po ANGIELSKU. 
     - Prompt musi skupiać się na wizualizacji 'targetWord'.
     - Styl: "Flat design illustration, minimalistic, colorful, educational".
     - Obrazek ma być podpowiedzią, co wpisać w lukę.
  `;

  const textResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: textPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          originalSentence: { type: Type.STRING, description: "Full sentence in Hiragana" },
          targetWord: { type: Type.STRING, description: "The word to guess (Hiragana)" },
          sentencePartBefore: { type: Type.STRING, description: "Hiragana text before the target word" },
          sentencePartAfter: { type: Type.STRING, description: "Hiragana text after the target word" },
          romaji: { type: Type.STRING, description: "Full sentence Romaji reading" },
          polishTranslation: { type: Type.STRING, description: "Polish translation" },
          imagePrompt: { type: Type.STRING, description: "Prompt for image generation" }
        },
        required: ["originalSentence", "targetWord", "sentencePartBefore", "sentencePartAfter", "romaji", "polishTranslation", "imagePrompt"],
      },
    }
  });

  const textJson = JSON.parse(textResponse.text?.trim() || "{}");
  if (!textJson.imagePrompt) throw new Error("Failed to generate quiz data");

  // 2. Generate the Image
  const imageResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: `Simple, clear flat design illustration for language learning. Subject: ${textJson.imagePrompt}. White background. No text in the image.` }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1", 
      }
    }
  });

  let imageBase64 = '';
  for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      imageBase64 = part.inlineData.data;
      break;
    }
  }

  if (!imageBase64) throw new Error("Failed to generate quiz image");

  return {
    originalSentence: textJson.originalSentence,
    maskedSentenceParts: [textJson.sentencePartBefore, textJson.sentencePartAfter],
    targetWord: textJson.targetWord,
    romaji: textJson.romaji,
    polishTranslation: textJson.polishTranslation,
    imageBase64: imageBase64
  };
};