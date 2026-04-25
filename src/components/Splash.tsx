import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { getTopScores, HighScoreEntry } from '../lib/gameService';
import { Trophy, Users, Palette } from 'lucide-react';
import { THEMES } from './GameCanvas';

interface SplashProps {
  onStart: () => void;
  themeId: string;
  onThemeChange: (id: string) => void;
}

export const Splash: React.FC<SplashProps> = ({ onStart, themeId, onThemeChange }) => {
  const [leaderboard, setLeaderboard] = useState<HighScoreEntry[]>([]);

  useEffect(() => {
    getTopScores(5).then(setLeaderboard);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-start py-20 overflow-y-auto px-4 transition-colors duration-500"
      style={{ backgroundColor: THEMES[themeId]?.bg || '#f4ece1' }}
    >
      <div className="flex flex-col items-center mb-12">
        <span className="text-4xl mb-4 transform rotate-12">🫖</span>
        <h1 className="font-sans font-black text-[#4a3424] text-5xl md:text-6xl tracking-tight uppercase leading-none text-center">
          Dim Sum<br/>
          <span className="text-[#d97706]">MAZE TIME</span>
        </h1>
      </div>
      
      <div className="flex flex-col md:flex-row gap-8 max-w-5xl w-full px-4 mb-12">
        <div className="glass-panel p-8 rounded-3xl flex-1 flex flex-col">
          <h2 className="text-[#d97706] font-black text-lg mb-6 uppercase flex items-center gap-2 border-b-2 border-[#4a3424] pb-2">
            <Users size={20} strokeWidth={3} /> MENU GUIDE
          </h2>
          <div className="space-y-6 text-[#4a3424] font-medium">
            <div className="flex items-center gap-4 bg-[#f4ece1]/50 p-3 rounded-2xl border-2 border-[#4a3424]">
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-[#4a3424] shadow-[2px_2px_0px_#4a3424]">
                <div className="w-4 h-4 bg-white rounded-full ml-4"></div>
              </div>
              <p className="text-sm uppercase font-bold tracking-tight">Swipe Arrow keys to move the chef</p>
            </div>
            
            <div className="flex items-center gap-4 bg-[#f4ece1]/50 p-3 rounded-2xl border-2 border-[#4a3424]">
              <div className="w-3 h-3 bg-[#d97706] rounded-full mx-3.5 shadow-[1px_1px_0px_#4a3424]"></div>
              <p className="text-sm uppercase font-bold tracking-tight">Gather all sesame seeds</p>
            </div>

            <div className="flex items-center gap-4 bg-[#f4ece1]/50 p-3 rounded-2xl border-2 border-[#4a3424]">
              <span className="text-3xl mx-1 animate-bounce">🥟</span>
              <p className="text-sm uppercase font-bold tracking-tight">Eat dumplings to scare ghosts!</p>
            </div>
            
            <div className="pt-4 border-t-2 border-[#4a3424] border-dashed">
              <p className="text-xs text-[#4a3424]/60 font-bold uppercase italic center text-center">5 Courses • Increasing Service Speed</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-3xl flex-1 flex flex-col bg-[#4a3424] text-[#f4ece1]">
          <h2 className="text-yellow-400 font-black text-lg mb-6 uppercase flex items-center gap-2 border-b-2 border-[#f4ece1]/20 pb-2">
            <Trophy size={20} strokeWidth={3} /> KITCHEN RANK
          </h2>
          {leaderboard.length > 0 ? (
            <div className="space-y-3 flex-grow">
              {leaderboard.map((entry, idx) => (
                <div key={idx} className="flex justify-between items-center bg-[#5c4431] p-3 rounded-xl border-2 border-[#f4ece1]/10 group hover:border-yellow-400/50 transition-colors shadow-lg">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black w-6 ${idx === 0 ? 'text-yellow-400' : 'text-[#f4ece1]/60'}`}>{idx + 1}.</span>
                    <span className="text-sm font-black tracking-tight text-[#f4ece1]">{entry.displayName}</span>
                  </div>
                  <div className="font-mono text-sm font-black text-yellow-400">{entry.score}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center gap-4 py-8">
              <span className="text-4xl opacity-50">🍵</span>
              <p className="text-xs font-black uppercase tracking-[0.2em] italic text-[#f4ece1]/40">Waiting for masters...</p>
            </div>
          )}
        </div>
      </div>

      {/* Theme Selector */}
      <div className="w-full max-w-5xl px-4 mb-12">
        <div className="glass-panel p-8 rounded-3xl border-2 border-[#4a3424] bg-white/40">
          <h2 className="text-[#d97706] font-black text-lg mb-6 uppercase flex items-center gap-2 border-b-2 border-[#4a3424] pb-2">
            <Palette size={20} strokeWidth={3} /> SELECT KITCHEN THEME
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.values(THEMES).map((t) => (
              <button
                key={t.id}
                onClick={() => onThemeChange(t.id)}
                className={`flex flex-col items-center p-4 rounded-2xl border-[3px] transition-all transform hover:scale-105 ${
                  themeId === t.id 
                    ? 'bg-[#4a3424] text-white border-yellow-400 shadow-[6px_6px_0px_#d97706]' 
                    : 'bg-[#f4ece1]/80 text-[#4a3424] border-[#4a3424] hover:bg-white'
                }`}
              >
                <span className="text-3xl mb-2">{t.powerEmoji}</span>
                <span className="font-black uppercase text-sm tracking-tight">{t.name}</span>
                <div className="flex gap-1 mt-2">
                  <div className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: t.bg }}></div>
                  <div className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: `#${t.wall.toString(16).padStart(6, '0')}` }}></div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <button 
          onClick={onStart}
          className="bg-[#d97706] text-white px-16 py-6 rounded-3xl font-black text-2xl uppercase tracking-tight border-[4px] border-[#4a3424] shadow-[8px_8px_0px_#4a3424] hover:bg-[#b45309] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_#4a3424] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#4a3424] transition-all transform"
        >
          OPEN KITCHEN
        </button>
        
        <p className="text-[#4a3424]/40 text-xs font-black uppercase tracking-[0.2em]">© 2024 AUTHENTIC DIM SUM MAZE</p>
      </div>
    </motion.div>
  );
};
