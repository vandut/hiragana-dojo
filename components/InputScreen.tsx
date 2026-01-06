import React from 'react';
import { Button } from './Button';

interface InputScreenProps {
  knownWords: string;
  setKnownWords: (words: string) => void;
  learningWords: string;
  setLearningWords: (words: string) => void;
  onStart: () => void;
}

export const InputScreen: React.FC<InputScreenProps> = ({ 
  knownWords, 
  setKnownWords, 
  learningWords, 
  setLearningWords, 
  onStart 
}) => {
  
  const handleStart = () => {
    if (knownWords.trim().length > 0 || learningWords.trim().length > 0) {
      onStart();
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full p-4 md:p-6 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-stone-100">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-stone-800 mb-2 font-jp">Hiragana Dojo</h1>
          <p className="text-stone-500 max-w-lg mx-auto">
            AI generuje ćwiczenia na podstawie Twojego słownictwa.
            Rozdzieliliśmy słowa na dwie grupy dla lepszej efektywności.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Learning Words (Priority) */}
          <div className="flex flex-col h-full">
            <label htmlFor="learningWords" className="flex items-center gap-2 text-sm font-bold text-indigo-600 uppercase tracking-wide mb-2">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
              Słowa do nauki (Priorytet)
            </label>
            <div className="relative flex-grow">
              <textarea
                id="learningWords"
                className="w-full h-64 md:h-80 p-4 border-2 border-indigo-100 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 bg-indigo-50/30 text-stone-800 placeholder-indigo-300/50 resize-none font-jp text-lg leading-relaxed transition-all"
                placeholder={`Nowe słowa, które\nchcesz wyćwiczyć\nnp. さかな\nとり\nみず`}
                value={learningWords}
                onChange={(e) => setLearningWords(e.target.value)}
              />
              <div className="absolute top-2 right-2 text-[10px] text-indigo-300 bg-white px-2 py-1 rounded-full shadow-sm">
                Często losowane
              </div>
            </div>
          </div>

          {/* Known Words (Context) */}
          <div className="flex flex-col h-full">
            <label htmlFor="knownWords" className="flex items-center gap-2 text-sm font-bold text-stone-500 uppercase tracking-wide mb-2">
              <span className="flex h-2 w-2 rounded-full bg-stone-300"></span>
              Słowa znane (Baza)
            </label>
            <div className="relative flex-grow">
              <textarea
                id="knownWords"
                className="w-full h-64 md:h-80 p-4 border border-stone-200 rounded-xl focus:ring-4 focus:ring-stone-100 focus:border-stone-400 bg-stone-50 text-stone-600 placeholder-stone-300 resize-none font-jp text-lg leading-relaxed transition-all"
                placeholder={`Słowa, które już znasz\ni mogą służyć do budowy zdań\nnp. わたし\nねこ\nたべる`}
                value={knownWords}
                onChange={(e) => setKnownWords(e.target.value)}
              />
               <div className="absolute top-2 right-2 text-[10px] text-stone-400 bg-white px-2 py-1 rounded-full shadow-sm border border-stone-100">
                Kontekst
              </div>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleStart} 
          className="w-full text-lg py-4 shadow-xl shadow-indigo-100" 
          disabled={!knownWords.trim() && !learningWords.trim()}
        >
          Rozpocznij Trening ➔
        </Button>
      </div>
    </div>
  );
};