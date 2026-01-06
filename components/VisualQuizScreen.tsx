import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { VisualQuizData, AnalyzedVocabulary, WordStats, StatsUpdateHandler } from '../types';
import { generateVisualQuizItem } from '../services/geminiService';

interface VisualQuizScreenProps {
  apiKey: string;
  vocabulary: AnalyzedVocabulary;
  wordStats: WordStats;
  updateWordStats: StatsUpdateHandler;
  onBack: () => void;
}

export const VisualQuizScreen: React.FC<VisualQuizScreenProps> = ({ 
  apiKey,
  vocabulary, 
  wordStats,
  updateWordStats,
  onBack
}) => {
  const [currentQuiz, setCurrentQuiz] = useState<VisualQuizData | null>(null);
  const [userInput, setUserInput] = useState('');
  const [validationState, setValidationState] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bufferPromiseRef = useRef<Promise<VisualQuizData> | null>(null);
  const mountedRef = useRef(false);

  // Helper: Select suggested words (Prioritize Learning)
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

  const queueNextQuiz = () => {
    const suggestions = getSuggestedWords();
    bufferPromiseRef.current = generateVisualQuizItem(apiKey, vocabulary, suggestions);
  };

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const init = async () => {
      try {
        setIsInitialLoading(true);
        const suggestions = getSuggestedWords();
        const firstQuiz = await generateVisualQuizItem(apiKey, vocabulary, suggestions);
        setCurrentQuiz(firstQuiz);
        queueNextQuiz();
        setIsInitialLoading(false);
      } catch (err) {
        console.error(err);
        setError("Nie udało się pobrać zagadki. Sprawdź klucz API.");
        setIsInitialLoading(false);
      }
    };
    init();
  }, [apiKey, vocabulary]);

  const normalizeJapanese = (text: string) => text.replace(/[\s\u3000]/g, '').trim();

  const handleSubmit = () => {
    if (!currentQuiz) return;
    const isCorrect = normalizeJapanese(userInput) === normalizeJapanese(currentQuiz.targetWord);
    setValidationState(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      // Reward specifically the guessed word heavily, but also context words
      const stats: Record<string, number> = { [currentQuiz.targetWord]: 3 }; // High value for active recall
      updateWordStats(stats);
    }
  };

  const handleNext = async () => {
    setValidationState('idle');
    setUserInput('');
    setIsTransitioning(true);
    
    try {
      if (!bufferPromiseRef.current) queueNextQuiz();
      const nextQuiz = await bufferPromiseRef.current!;
      setCurrentQuiz(nextQuiz);
      queueNextQuiz();
    } catch (err) {
      setError("Błąd pobierania kolejnego pytania.");
      bufferPromiseRef.current = null;
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (validationState === 'idle') handleSubmit();
      else if (validationState !== 'incorrect') handleNext();
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full p-4 flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full flex justify-between items-center mb-6">
        <Button variant="outline" onClick={onBack} className="text-sm px-4 py-2">
          ← Edytuj słownik
        </Button>
        <span className="text-xs font-mono text-stone-400 uppercase tracking-widest">
          Skojarzenia
        </span>
      </div>

      <div className="w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-100 flex flex-col items-center min-h-[500px] transition-all duration-300">
        
        {/* Image Area */}
        <div className="w-full bg-stone-50 flex items-center justify-center min-h-[300px] p-8 border-b border-stone-100">
          {isInitialLoading ? (
             <div className="animate-pulse flex flex-col items-center text-stone-300">
                <span className="text-6xl mb-4">🖼️</span>
                <p>Rysuję zagadkę...</p>
             </div>
          ) : error ? (
             <div className="text-red-400">⚠️ {error}</div>
          ) : currentQuiz ? (
             <img 
               src={`data:image/png;base64,${currentQuiz.imageBase64}`} 
               alt="Visual Hint" 
               className="w-full max-w-sm h-auto object-contain drop-shadow-xl rounded-lg animate-fade-in"
             />
          ) : null}
        </div>

        {/* Interaction Area */}
        <div className="flex-grow w-full p-8 md:p-12 flex flex-col items-center justify-center bg-white">
           {!isInitialLoading && currentQuiz && (
             <>
               <div className="mb-8 w-full text-center">
                 <div className="inline-flex flex-wrap justify-center items-end gap-2 text-2xl md:text-4xl font-jp text-stone-800 leading-relaxed font-medium">
                    <span>{currentQuiz.maskedSentenceParts[0]}</span>
                    
                    {/* Input Field */}
                    <div className="relative">
                       <input 
                          type="text" 
                          value={userInput}
                          onChange={e => setUserInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          disabled={validationState === 'correct'}
                          className={`min-w-[120px] w-[5ch] max-w-[200px] border-b-4 border-stone-300 bg-stone-50 text-center focus:outline-none focus:border-indigo-500 focus:bg-indigo-50 px-2 py-1 transition-all rounded-t-lg
                            ${validationState === 'correct' ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : ''}
                            ${validationState === 'incorrect' ? 'border-red-400 bg-red-50 text-red-600' : ''}
                          `}
                          placeholder="?"
                          autoFocus
                       />
                       {validationState === 'incorrect' && (
                         <div className="absolute -bottom-6 left-0 w-full text-center text-[10px] text-red-500 font-bold uppercase tracking-wider animate-bounce">
                           Spróbuj jeszcze raz
                         </div>
                       )}
                    </div>
                    
                    <span>{currentQuiz.maskedSentenceParts[1]}</span>
                 </div>
               </div>

               {validationState === 'correct' && (
                 <div className="w-full mb-8 animate-fade-in text-center bg-emerald-50 p-6 rounded-xl border border-emerald-100">
                    <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-2">Poprawnie! 👏</p>
                    <p className="font-mono text-indigo-600 mb-2">{currentQuiz.romaji}</p>
                    <p className="text-emerald-900">{currentQuiz.polishTranslation}</p>
                 </div>
               )}

               <div className="w-full max-w-xs">
                 {validationState === 'idle' || validationState === 'incorrect' ? (
                   <Button 
                     onClick={handleSubmit} 
                     className="w-full"
                     disabled={userInput.length === 0}
                   >
                     Sprawdź
                   </Button>
                 ) : (
                   <Button 
                     onClick={handleNext} 
                     variant="primary" 
                     className="w-full"
                     isLoading={isTransitioning}
                     disabled={isTransitioning}
                   >
                     Następna zagadka ➔
                   </Button>
                 )}
               </div>
             </>
           )}
        </div>
      </div>
    </div>
  );
};