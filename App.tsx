import React, { useState, useEffect } from 'react';
import { AppState, AnalyzedVocabulary, WordStats, PracticeMode, StatsUpdateHandler } from './types';
import { InputScreen } from './components/InputScreen';
import { PracticeScreen } from './components/PracticeScreen';
import { WritingPracticeScreen } from './components/WritingPracticeScreen';
import { VisualQuizScreen } from './components/VisualQuizScreen';
import { WordStatistics } from './components/WordStatistics';
import { ConfigScreen } from './components/ConfigScreen';

const App: React.FC = () => {
  const [view, setView] = useState<AppState>(AppState.INPUT_WORDS);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(PracticeMode.READING);
  const [apiKey, setApiKey] = useState<string | null>(null);
  
  // Lazy loading tracking
  const [visitedModes, setVisitedModes] = useState<Set<PracticeMode>>(new Set([PracticeMode.READING]));

  // Inputs
  const [knownWords, setKnownWords] = useState<string>('');
  const [learningWords, setLearningWords] = useState<string>('');

  const [analyzedData, setAnalyzedData] = useState<AnalyzedVocabulary | null>(null);
  
  // Stats
  const [readingStats, setReadingStats] = useState<WordStats>({});
  const [writingStats, setWritingStats] = useState<WordStats>({});
  const [visualStats, setVisualStats] = useState<WordStats>({});
  
  const [isInitialized, setIsInitialized] = useState(false);

  // --- Persistence & Initialization ---
  useEffect(() => {
    // 1. Check API Key
    // Priority: Env Var -> LocalStorage -> User Input
    const envKey = process.env.API_KEY;
    const storedKey = localStorage.getItem('hiragana_dojo_api_key');

    if (envKey) {
      setApiKey(envKey);
      // View defaults to INPUT_WORDS, no need to change view
    } else if (storedKey) {
      setApiKey(storedKey);
    } else {
      setView(AppState.CONFIG);
    }

    // 2. Load Words
    const savedKnown = localStorage.getItem('hiragana_practice_known_words');
    const savedLearning = localStorage.getItem('hiragana_practice_learning_words');
    const legacyWords = localStorage.getItem('hiragana_practice_words');

    if (savedKnown !== null) setKnownWords(savedKnown);
    else if (legacyWords) setKnownWords(legacyWords);

    if (savedLearning !== null) setLearningWords(savedLearning);

    // 3. Load Stats
    const savedReadingStats = localStorage.getItem('hiragana_practice_reading_stats');
    const savedWritingStats = localStorage.getItem('hiragana_practice_writing_stats');
    const savedVisualStats = localStorage.getItem('hiragana_practice_visual_stats');
    
    if (savedReadingStats) { try { setReadingStats(JSON.parse(savedReadingStats)); } catch (e) { } }
    if (savedWritingStats) { try { setWritingStats(JSON.parse(savedWritingStats)); } catch (e) { } }
    if (savedVisualStats) { try { setVisualStats(JSON.parse(savedVisualStats)); } catch (e) { } }

    setIsInitialized(true);
  }, []);

  // --- Save Logic ---
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('hiragana_practice_known_words', knownWords);
      localStorage.setItem('hiragana_practice_learning_words', learningWords);
    }
  }, [knownWords, learningWords, isInitialized]);

  useEffect(() => { if (isInitialized) localStorage.setItem('hiragana_practice_reading_stats', JSON.stringify(readingStats)); }, [readingStats, isInitialized]);
  useEffect(() => { if (isInitialized) localStorage.setItem('hiragana_practice_writing_stats', JSON.stringify(writingStats)); }, [writingStats, isInitialized]);
  useEffect(() => { if (isInitialized) localStorage.setItem('hiragana_practice_visual_stats', JSON.stringify(visualStats)); }, [visualStats, isInitialized]);


  // --- Handlers ---

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem('hiragana_dojo_api_key', key);
    setApiKey(key);
    setView(AppState.INPUT_WORDS);
  };

  const createStatsUpdater = (setter: React.Dispatch<React.SetStateAction<WordStats>>): StatsUpdateHandler => {
    return (wordCounts: Record<string, number>) => {
      setter(prevStats => {
        const newStats = { ...prevStats };
        Object.entries(wordCounts).forEach(([word, count]) => {
          newStats[word] = (newStats[word] || 0) + count;
        });
        return newStats;
      });
    };
  };

  const handleStartPractice = () => {
    const parseWords = (text: string) => Array.from(new Set<string>(text.trim().split(/[\s\n]+/).filter(w => w.length > 0)));
    
    const validKnown = parseWords(knownWords);
    const validLearning = parseWords(learningWords);
    
    const allValidWords = Array.from(new Set([...validKnown, ...validLearning]));
    
    const chars = new Set<string>();
    allValidWords.forEach(w => {
      for (const char of w) {
        if (char.match(/[\u3040-\u309F]/)) {
          chars.add(char);
        }
      }
    });

    setAnalyzedData({
      validHiraganaWords: allValidWords,
      learningWords: validLearning,
      allowedCharacters: Array.from(chars)
    });
    
    setView(AppState.PRACTICE);
    setPracticeMode(PracticeMode.READING);
    setVisitedModes(new Set([PracticeMode.READING]));
  };

  const handleBackToInput = () => {
    setView(AppState.INPUT_WORDS);
    setAnalyzedData(null);
  };

  const switchTab = (mode: PracticeMode) => {
    setPracticeMode(mode);
    setVisitedModes(prev => new Set(prev).add(mode));
  };

  const getCurrentStats = () => {
    switch (practiceMode) {
      case PracticeMode.WRITING: return writingStats;
      case PracticeMode.VISUAL: return visualStats;
      default: return readingStats;
    }
  };

  const activeWordsString = `${knownWords}\n${learningWords}`;

  if (!isInitialized) return null;

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <main className="flex-grow flex flex-col items-center p-4 w-full">
        
        {view === AppState.CONFIG && (
          <ConfigScreen onSave={handleSaveApiKey} />
        )}

        {view === AppState.INPUT_WORDS && apiKey && (
          <InputScreen 
            knownWords={knownWords}
            setKnownWords={setKnownWords}
            learningWords={learningWords}
            setLearningWords={setLearningWords}
            onStart={handleStartPractice} 
          />
        )}

        {view === AppState.PRACTICE && analyzedData && apiKey && (
          <div className="w-full max-w-4xl flex flex-col items-center">
            
            <div className="flex bg-stone-200 p-1 rounded-xl mb-6 shadow-inner z-10 overflow-x-auto max-w-full">
               <button onClick={() => switchTab(PracticeMode.READING)} className={`px-4 md:px-6 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${practiceMode === PracticeMode.READING ? 'bg-white text-indigo-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>📖 Czytanie</button>
               <button onClick={() => switchTab(PracticeMode.WRITING)} className={`px-4 md:px-6 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${practiceMode === PracticeMode.WRITING ? 'bg-white text-indigo-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>✍️ Pisanie</button>
               <button onClick={() => switchTab(PracticeMode.VISUAL)} className={`px-4 md:px-6 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${practiceMode === PracticeMode.VISUAL ? 'bg-white text-indigo-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>🖼️ Skojarzenia</button>
            </div>
            
            <div className={practiceMode === PracticeMode.READING ? 'block w-full' : 'hidden'}>
              {visitedModes.has(PracticeMode.READING) && (
                <PracticeScreen apiKey={apiKey} vocabulary={analyzedData} wordStats={readingStats} updateWordStats={createStatsUpdater(setReadingStats)} onBack={handleBackToInput} />
              )}
            </div>

            <div className={practiceMode === PracticeMode.WRITING ? 'block w-full' : 'hidden'}>
              {visitedModes.has(PracticeMode.WRITING) && (
                <WritingPracticeScreen apiKey={apiKey} vocabulary={analyzedData} wordStats={writingStats} updateWordStats={createStatsUpdater(setWritingStats)} onBack={handleBackToInput} />
              )}
            </div>

            <div className={practiceMode === PracticeMode.VISUAL ? 'block w-full' : 'hidden'}>
              {visitedModes.has(PracticeMode.VISUAL) && (
                <VisualQuizScreen apiKey={apiKey} vocabulary={analyzedData} wordStats={visualStats} updateWordStats={createStatsUpdater(setVisualStats)} onBack={handleBackToInput} />
              )}
            </div>

          </div>
        )}
      </main>
      
      {view !== AppState.CONFIG && (
        <WordStatistics 
          wordStats={getCurrentStats()} 
          knownWordsString={activeWordsString} 
          mode={practiceMode}
        />
      )}

      <footer className="py-4 text-center text-stone-400 text-[10px] uppercase tracking-widest bg-stone-100">
        Hiragana Dojo AI • Powered by Gemini 3 Flash
      </footer>
    </div>
  );
};

export default App;