import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { getTopScores, HighScoreEntry } from '../lib/gameService';
import { Trophy, Users } from 'lucide-react';

interface SplashProps {
  onStart: () => void;
}

export const Splash: React.FC<SplashProps> = ({ onStart }) => {
  const [leaderboard, setLeaderboard] = useState<HighScoreEntry[]>([]);

  useEffect(() => {
    getTopScores(5).then(setLeaderboard);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#020617]/95 z-[1000] flex flex-col items-center justify-start py-20 overflow-y-auto"
    >
      <h1 className="font-pixel text-yellow-400 text-3xl mb-12 animate-bounce tracking-tighter">NEON DIM SUM</h1>
      
      <div className="flex flex-col md:flex-row gap-8 max-w-4xl w-full px-8 mb-12">
        <div className="glass-panel p-8 rounded-xl border border-white/10 flex-1 bg-[#0f172a]/80 backdrop-blur-sm">
          <h2 className="text-yellow-400 font-pixel text-xs mb-6 uppercase flex items-center gap-2">
            <Users size={14} /> Instructions
          </h2>
          <div className="space-y-4 text-slate-300">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-[#020617] rounded-full ml-4"></div>
              </div>
              <p className="text-sm uppercase tracking-tight">Navigate using <span className="text-indigo-400 font-bold">Arrow Keys</span></p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mx-3"></div>
              <p className="text-sm uppercase tracking-tight">Collect all dots to finish</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-5 h-5 bg-white rounded-full mx-1.5 shadow-[0_0_8px_white]"></div>
              <p className="text-sm uppercase tracking-tight">Power pellets scare ghosts</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-xl border border-white/10 flex-1 bg-[#0f172a]/80 backdrop-blur-sm">
          <h2 className="text-indigo-400 font-pixel text-xs mb-6 uppercase flex items-center gap-2">
            <Trophy size={14} /> Global Leaderboard
          </h2>
          {leaderboard.length > 0 ? (
            <div className="space-y-3">
              {leaderboard.map((entry, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold ${idx === 0 ? 'text-yellow-400' : 'text-slate-500'}`}>#{idx + 1}</span>
                    <span className="text-xs font-medium text-slate-200">{entry.displayName}</span>
                  </div>
                  <div className="font-pixel text-[10px] text-indigo-400">{entry.score}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No scores yet. Be the first!</p>
          )}
        </div>
      </div>

      <button 
        onClick={onStart}
        className="font-pixel bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-6 rounded-xl transition-all transform hover:scale-105 shadow-[0_0_30px_rgba(79,70,229,0.4)]"
      >
        CLICK TO START
      </button>
      
      <p className="mt-8 text-slate-500 text-xs italic font-sans pb-10">© 2024 Neon Maze Enterprise</p>
    </motion.div>
  );
};
