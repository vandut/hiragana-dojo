import React, { useState } from 'react';
import { Button } from './Button';

interface ConfigScreenProps {
  onSave: (key: string) => void;
}

export const ConfigScreen: React.FC<ConfigScreenProps> = ({ onSave }) => {
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    const key = inputKey.trim();
    if (!key) {
      setError('Klucz API nie może być pusty.');
      return;
    }
    if (!key.startsWith('AIza')) {
      setError('To nie wygląda jak poprawny klucz Gemini API (zaczyna się od "AIza").');
      return;
    }
    onSave(key);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-lg w-full border border-stone-100 text-center">
        <div className="mb-8">
          <span className="text-4xl mb-4 block">🔑</span>
          <h1 className="text-2xl font-bold text-stone-800 mb-2 font-jp">Konfiguracja API</h1>
          <p className="text-stone-500 text-sm">
            Ta aplikacja działa w 100% w Twojej przeglądarce. Aby korzystać z modelu Gemini AI, musisz podać własny klucz API.
          </p>
        </div>

        <div className="mb-8 text-left bg-indigo-50 p-6 rounded-xl border border-indigo-100">
          <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">Jak uzyskać klucz?</h3>
          <ol className="list-decimal list-inside text-sm text-stone-700 space-y-2">
            <li>
              Wejdź na stronę{' '}
              <a 
                href="https://aistudio.google.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-600 underline font-semibold hover:text-indigo-800"
              >
                Google AI Studio
              </a>.
            </li>
            <li>Zaloguj się swoim kontem Google.</li>
            <li>Kliknij przycisk <strong>"Create API key"</strong>.</li>
            <li>Skopiuj klucz i wklej go poniżej.</li>
          </ol>
        </div>

        <div className="mb-6">
          <input
            type="password"
            value={inputKey}
            onChange={(e) => {
              setInputKey(e.target.value);
              setError('');
            }}
            placeholder="Wklej tutaj swój klucz API..."
            className="w-full p-4 border-2 border-stone-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 bg-stone-50 text-stone-800 transition-all outline-none font-mono text-sm"
          />
          {error && <p className="text-red-500 text-xs mt-2 text-left">{error}</p>}
        </div>

        <Button onClick={handleSave} className="w-full shadow-xl">
          Zapisz i Rozpocznij ➔
        </Button>
        
        <p className="mt-6 text-[10px] text-stone-400">
          Twój klucz jest zapisywany wyłącznie w pamięci Twojej przeglądarki (LocalStorage). Nigdy nie jest wysyłany na żaden pośredniczący serwer.
        </p>
      </div>
    </div>
  );
};