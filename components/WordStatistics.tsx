import React, { useMemo } from 'react';
import { WordStats, PracticeMode } from '../types';

interface WordStatisticsProps {
  wordStats: WordStats;
  knownWordsString: string;
  mode: PracticeMode;
}

export const WordStatistics: React.FC<WordStatisticsProps> = ({ wordStats, knownWordsString, mode }) => {
  const stats = useMemo(() => {
    // Parse unique words from input string to determine which stats to show
    const uniqueWords: string[] = Array.from(new Set<string>(
      knownWordsString.trim().split(/[\s\n]+/).filter(w => w.length > 0)
    ));

    // Cast Object.values to number[] to avoid 'unknown' type in reduce
    const totalViews = (Object.values(wordStats) as number[]).reduce((sum, count) => sum + count, 0);

    const data = uniqueWords.map(word => {
      const count = wordStats[word] || 0;
      // Calculate percentage relative to total views of all words
      const percentage = totalViews === 0 ? 0 : Math.round((count / totalViews) * 100);
      return { word, count, percentage };
    });

    // Sort: Most frequent first
    return data.sort((a, b) => b.count - a.count);
  }, [wordStats, knownWordsString]);

  if (stats.length === 0) return null;

  const getLabel = () => {
    switch(mode) {
      case PracticeMode.READING: return 'Czytanie';
      case PracticeMode.WRITING: return 'Pisanie';
      case PracticeMode.VISUAL: return 'Skojarzenia';
      default: return 'Statystyki';
    }
  }

  return (
    <div className="w-full bg-white border-t border-stone-100 p-6 md:p-8 animate-fade-in z-10 relative">
      <div className="max-w-4xl mx-auto">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6 text-center">
          Statystyki: {getLabel()}
        </h3>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {stats.map(({ word, count, percentage }) => (
            <div 
              key={word} 
              className="flex flex-col items-center justify-center p-3 bg-stone-50 rounded-xl border border-stone-100 hover:border-indigo-100 hover:bg-white transition-colors duration-200"
            >
              <span className="font-jp text-lg font-bold text-stone-700 mb-1">
                {word}
              </span>
              <div className="flex items-baseline gap-1.5 text-xs text-stone-500 font-mono">
                <span className="font-bold text-indigo-600">{count}</span>
                <span className="text-[10px] text-stone-300">|</span>
                <span className="text-[10px] text-stone-400">{percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};