import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { WritingBatch, AnalyzedVocabulary, WordStats, StatsUpdateHandler } from '../types';
import { generateWritingBatch } from '../services/geminiService';

interface WritingPracticeScreenProps {
  apiKey: string;
  vocabulary: AnalyzedVocabulary;
  wordStats: WordStats;
  updateWordStats: StatsUpdateHandler;
  onBack: () => void;
}

export const WritingPracticeScreen: React.FC<WritingPracticeScreenProps> = ({
  apiKey,
  vocabulary,
  wordStats,
  updateWordStats,
  onBack
}) => {
  // Logic state
  const [currentBatch, setCurrentBatch] = useState<WritingBatch | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // UI State
  const [userDraft, setUserDraft] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [validationResult, setValidationResult] = useState<'correct' | 'incorrect' | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Background Buffer
  const bufferPromiseRef = useRef<Promise<WritingBatch> | null>(null);
  const mountedRef = useRef(false);

  // Helper: Select suggested words
  const getSuggestedWords = (): string[] => {
    // 1. Identify pools
    const learningPool = vocabulary.learningWords;
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
    const learningCount = Math.min(3, sortedLearning.length);
    const selectedLearning = sortedLearning.slice(0, learningCount);
    
    const needed = 5 - selectedLearning.length;
    const selectedKnown = sortedKnown.slice(0, Math.max(0, needed));

    return [...selectedLearning, ...selectedKnown];
  };

  const countUsedWords = (text: string): Record<string, number> => {
    const counts: Record<string, number> = {};
    vocabulary.validHiraganaWords.forEach(word => {
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

  const queueNextBatch = () => {
    const suggestions = getSuggestedWords();
    bufferPromiseRef.current = generateWritingBatch(apiKey, vocabulary, suggestions);
  };

  // Initial Load
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const init = async () => {
      try {
        setIsInitialLoading(true);
        const suggestions = getSuggestedWords();
        const firstBatch = await generateWritingBatch(apiKey, vocabulary, suggestions);
        setCurrentBatch(firstBatch);
        setCurrentIndex(0);
        
        queueNextBatch(); // Start fetching next
        setIsInitialLoading(false);
      } catch (err) {
        console.error(err);
        setError("Nie udało się pobrać zdań do pisania. Sprawdź klucz API.");
        setIsInitialLoading(false);
      }
    };
    init();
  }, [apiKey, vocabulary]);

  // Normalize string: Remove all whitespaces, punctuation (Japanese and English)
  const normalizeJapanese = (text: string) => {
    return text
      .replace(/[\s\u3000]/g, '') // remove spaces
      .replace(/[、。！？.,!?]/g, '') // remove punctuation
      .trim();
  };

  const handleReveal = () => {
    if (!currentBatch) return;
    
    const currentChallenge = currentBatch.challenges[currentIndex];
    
    // Validation
    const normalizedInput = normalizeJapanese(userDraft);
    const normalizedAnswer = normalizeJapanese(currentChallenge.hiragana);
    const isCorrect = normalizedInput === normalizedAnswer;

    setValidationResult(isCorrect ? 'correct' : 'incorrect');
    setIsRevealed(true);
    
    // Update stats only when user reveals/checks the answer
    const usedCounts = countUsedWords(currentChallenge.hiragana);
    updateWordStats(usedCounts);
  };

  const handleNext = async () => {
    if (!currentBatch) return;

    // Clear UI
    setUserDraft('');
    setIsRevealed(false);
    setValidationResult(null);

    // Logic to move to next sentence or next batch
    if (currentIndex < currentBatch.challenges.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // End of batch, load next
      setIsTransitioning(true);
      try {
        if (!bufferPromiseRef.current) queueNextBatch();
        const nextBatch = await bufferPromiseRef.current!;
        setCurrentBatch(nextBatch);
        setCurrentIndex(0);
        queueNextBatch(); // Queue subsequent
      } catch (err) {
        setError("Błąd pobierania kolejnego zestawu.");
        bufferPromiseRef.current = null;
      } finally {
        setIsTransitioning(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!isRevealed) {
        handleReveal();
      } else {
        handleNext();
      }
    }
  };

  if (isInitialLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[50vh] animate-pulse">
        <div className="h-8 bg-stone-200 rounded w-1/2 mb-8"></div>
        <div className="h-32 bg-stone-100 rounded-xl w-full max-w-xl"></div>
        <p className="mt-8 text-stone-400 text-sm">Przygotowuję test pamięci...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={onBack}>Wróć</Button>
      </div>
    );
  }

  const challenge = currentBatch?.challenges[currentIndex];

  return (
    <div className="max-w-2xl mx-auto w-full p-4 flex flex-col items-center min-h-[60vh]">
      
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-6">
        <Button variant="outline" onClick={onBack} className="text-xs px-3 py-1.5 h-auto">
          ← Edycja
        </Button>
        <div className="text-xs font-mono text-stone-400">
          Zestaw {currentIndex + 1} / {currentBatch?.challenges.length}
        </div>
      </div>

      {challenge && (
        <div className="w-full bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden flex flex-col">
          
          {/* Question Section (Polish) */}
          <div className="p-8 md:p-12 bg-stone-50 border-b border-stone-100 text-center">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Przetłumacz na Hiraganę</h3>
            <p className="text-2xl md:text-3xl font-medium text-stone-800 leading-relaxed">
              {challenge.polish}
            </p>
          </div>

          {/* User Input Section */}
          <div className="p-6 md:p-8 flex flex-col items-center">
            <textarea
              className={`w-full p-4 text-xl font-jp border-2 rounded-xl focus:ring-0 transition-colors bg-white resize-none mb-6 text-center placeholder-stone-300 ${
                isRevealed 
                  ? validationResult === 'correct' 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900' 
                    : 'border-red-300 bg-red-50 text-red-900'
                  : 'border-stone-200 focus:border-indigo-500'
              }`}
              rows={2}
              placeholder="Wpisz odpowiedź tutaj..."
              value={userDraft}
              onChange={(e) => setUserDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              readOnly={isRevealed}
            />

            {!isRevealed ? (
              <Button 
                onClick={handleReveal} 
                className="w-full md:w-2/3 shadow-lg"
              >
                Sprawdź (Enter)
              </Button>
            ) : (
              <div className="w-full animate-fade-in flex flex-col items-center">
                {/* Feedback Message */}
                <div className={`mb-4 font-bold text-sm tracking-widest uppercase ${validationResult === 'correct' ? 'text-emerald-600' : 'text-red-500'}`}>
                   {validationResult === 'correct' ? 'DOBRZE! 👏' : 'BŁĄD ❌'}
                </div>

                {/* Answer Reveal (Only show prominent correct answer if user was wrong, otherwise subtle) */}
                <div className={`w-full rounded-xl p-6 border mb-6 text-center transition-colors ${
                  validationResult === 'correct' 
                    ? 'bg-emerald-50 border-emerald-100' 
                    : 'bg-red-50 border-red-100'
                }`}>
                   <p className="text-xs font-bold opacity-60 uppercase tracking-widest mb-2">
                     {validationResult === 'correct' ? 'Twoja odpowiedź' : 'Poprawna odpowiedź'}
                   </p>
                   <p className="text-3xl font-jp font-bold mb-2 text-stone-800">{challenge.hiragana}</p>
                   <p className="text-sm font-mono opacity-60">{challenge.romaji}</p>
                </div>
                
                <Button 
                  onClick={handleNext} 
                  variant="primary" 
                  className="w-full md:w-2/3"
                  isLoading={isTransitioning}
                  disabled={isTransitioning}
                >
                  {currentIndex < (currentBatch?.challenges.length || 0) - 1 ? 'Następne Zdanie ➔' : 'Kolejna Seria ➔'}
                </Button>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};