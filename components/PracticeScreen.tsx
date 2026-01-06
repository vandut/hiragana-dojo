import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { SentenceData, AnalyzedVocabulary, WordStats, StatsUpdateHandler } from '../types';
import { generateSentence } from '../services/geminiService';

interface PracticeScreenProps {
  apiKey: string;
  vocabulary: AnalyzedVocabulary;
  wordStats: WordStats;
  updateWordStats: StatsUpdateHandler;
  onBack: () => void;
}

export const PracticeScreen: React.FC<PracticeScreenProps> = ({ 
  apiKey,
  vocabulary, 
  wordStats,
  updateWordStats,
  onBack
}) => {
  const [currentData, setCurrentData] = useState<SentenceData | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRomaji, setShowRomaji] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const bufferPromiseRef = useRef<Promise<SentenceData> | null>(null);
  const mountedRef = useRef(false);

  // Smart suggestion algorithm
  const getSuggestedWords = (): string[] => {
    // 1. Identify pools
    const learningPool = vocabulary.learningWords;
    // Known pool is everything else
    const knownPool = vocabulary.validHiraganaWords.filter(w => !learningPool.includes(w));

    // 2. Sort both by usage (ascending - least used first)
    const sortByUsage = (a: string, b: string) => {
      const countA = wordStats[a] || 0;
      const countB = wordStats[b] || 0;
      if (countA === countB) return Math.random() - 0.5;
      return countA - countB;
    };

    const sortedLearning = [...learningPool].sort(sortByUsage);
    const sortedKnown = [...knownPool].sort(sortByUsage);

    // 3. Select mix
    // Prioritize learning words: Take up to 3 from learning
    const learningCount = Math.min(3, sortedLearning.length);
    const selectedLearning = sortedLearning.slice(0, learningCount);

    // Fill the rest with known words (up to 5 total suggestions)
    const needed = 5 - selectedLearning.length;
    const selectedKnown = sortedKnown.slice(0, Math.max(0, needed));

    return [...selectedLearning, ...selectedKnown];
  };

  const countUsedWords = (text: string): Record<string, number> => {
    const counts: Record<string, number> = {};
    vocabulary.validHiraganaWords.forEach(word => {
      // Find all occurrences
      let count = 0;
      let pos = text.indexOf(word);
      while (pos !== -1) {
        count++;
        pos = text.indexOf(word, pos + 1);
      }
      if (count > 0) {
        counts[word] = count;
      }
    });
    return counts;
  };

  const queueNextSentence = () => {
    const suggestions = getSuggestedWords();
    bufferPromiseRef.current = generateSentence(apiKey, vocabulary, suggestions);
  };

  const processNewSentence = (data: SentenceData) => {
    setCurrentData(data);
    const usedCounts = countUsedWords(data.hiragana);
    updateWordStats(usedCounts);
  };

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const init = async () => {
      try {
        setIsInitialLoading(true);
        const suggestions = getSuggestedWords();
        const firstSentence = await generateSentence(apiKey, vocabulary, suggestions);
        processNewSentence(firstSentence);
        queueNextSentence();
        setIsInitialLoading(false);
      } catch (err) {
        console.error(err);
        setError("Nie udało się wygenerować opowieści. Sprawdź swój klucz API.");
        setIsInitialLoading(false);
      }
    };
    init();
  }, [apiKey, vocabulary]);

  const handleNextSentence = async () => {
    setError(null);
    setIsTransitioning(true);
    try {
      if (!bufferPromiseRef.current) queueNextSentence();
      const nextSentence = await bufferPromiseRef.current!;
      setShowRomaji(false);
      setShowTranslation(false);
      processNewSentence(nextSentence);
      queueNextSentence();
    } catch (err) {
      console.error(err);
      setError("Wystąpił błąd. Spróbuj ponownie.");
      bufferPromiseRef.current = null;
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full p-4 flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full flex justify-between items-center mb-8">
        <Button variant="outline" onClick={onBack} className="text-sm px-4 py-2">
          ← Edytuj słownik
        </Button>
        <span className="text-xs font-mono text-stone-400 uppercase tracking-widest">
          Hiragana Story Mode
        </span>
      </div>

      <div className="relative w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-stone-100 flex flex-col items-center text-center min-h-[450px] justify-center transition-all duration-300">
        {isInitialLoading ? (
          <div className="flex flex-col items-center animate-pulse w-full">
            <div className="h-8 bg-stone-100 rounded-full w-3/4 mb-12"></div>
            <div className="space-y-4 w-full">
               <div className="h-4 bg-stone-50 rounded w-full"></div>
               <div className="h-4 bg-stone-50 rounded w-5/6 mx-auto"></div>
               <div className="h-4 bg-stone-50 rounded w-4/6 mx-auto"></div>
            </div>
            <p className="mt-12 text-stone-400 text-sm">Układam historię z Twoich słów...</p>
          </div>
        ) : error ? (
          <div className="text-red-500">
            <p className="mb-4 text-lg">⚠️ {error}</p>
            <Button onClick={handleNextSentence} variant="outline">Spróbuj ponownie</Button>
          </div>
        ) : currentData ? (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <div className="mb-12 w-full text-left">
              {/* Force text flow like a standard paragraph, strip newlines to prevent artificial breaks */}
              <h2 className="font-jp text-2xl md:text-3xl leading-relaxed md:leading-loose font-medium text-stone-800 break-words w-full">
                {currentData.hiragana.replace(/\n/g, '')}
              </h2>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => setShowRomaji(!showRomaji)}
                className={`rounded-xl p-4 transition-all duration-300 border-2 cursor-pointer select-none group ${
                  showRomaji ? 'bg-indigo-50 border-indigo-100' : 'bg-transparent border-dashed border-stone-100 opacity-60'
                }`}
              >
                <p className="text-[10px] uppercase text-stone-400 font-bold mb-1 tracking-wider text-left">Romaji</p>
                {showRomaji ? (
                  <p className="text-md font-mono text-indigo-600 whitespace-pre-wrap text-left break-words">{currentData.romaji}</p>
                ) : (
                  <p className="text-stone-300 text-sm italic py-2">Kliknij, aby sprawdzić wymowę</p>
                )}
              </div>

              <div 
                onClick={() => setShowTranslation(!showTranslation)}
                className={`rounded-xl p-4 transition-all duration-300 border-2 cursor-pointer select-none group ${
                  showTranslation ? 'bg-emerald-50 border-emerald-100' : 'bg-transparent border-dashed border-stone-100 opacity-60'
                }`}
              >
                <p className="text-[10px] uppercase text-stone-400 font-bold mb-1 tracking-wider text-left">Polski</p>
                {showTranslation ? (
                  <p className="text-md text-emerald-800 whitespace-pre-wrap text-left break-words">{currentData.polishTranslation}</p>
                ) : (
                  <p className="text-stone-300 text-sm italic py-2">Kliknij, aby zobaczyć tłumaczenie</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-10 w-full max-w-sm">
        <Button 
          onClick={handleNextSentence} 
          variant="primary" 
          className="w-full text-lg shadow-xl py-4"
          isLoading={isTransitioning}
          disabled={isTransitioning || isInitialLoading}
        >
          {isTransitioning ? 'Piszę nową historię...' : 'Nowa opowieść ➔'}
        </Button>
      </div>
    </div>
  );
};