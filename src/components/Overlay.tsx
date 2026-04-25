import React from 'react';
import { motion } from 'motion/react';
import { useFirebase } from '../lib/FirebaseProvider';
import { LogIn } from 'lucide-react';
import { loginWithGoogle } from '../lib/firebase';

interface OverlayProps {
  type: 'STAGE' | 'GAMEOVER' | 'VICTORY';
  stage?: number;
  score: number;
  onAction: () => void;
}

export const Overlay: React.FC<OverlayProps> = ({ type, stage, score, onAction }) => {
  const { user } = useFirebase();

  const config = {
    STAGE: {
      title: `STAGE ${stage} CLEAR`,
      color: 'text-indigo-400',
      buttonText: 'NEXT LEVEL',
      borderColor: 'border-indigo-500/50',
      glow: 'shadow-[0_0_50px_rgba(99,102,241,0.2)]'
    },
    GAMEOVER: {
      title: 'WASTED',
      color: 'text-red-500',
      buttonText: 'REVIVE',
      borderColor: 'border-red-500/50',
      glow: 'shadow-[0_0_50px_rgba(239,68,68,0.2)]'
    },
    VICTORY: {
      title: 'MAX POWER',
      color: 'text-yellow-400',
      buttonText: 'REPLAY',
      borderColor: 'border-yellow-500/50',
      glow: 'shadow-[0_0_50px_rgba(234,179,8,0.2)]'
    }
  }[type];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`bg-[#0f172a] border-2 ${config.borderColor} p-10 text-center rounded-2xl ${config.glow} w-full max-w-md`}
      >
        <h2 
          className={`font-pixel text-2xl mb-4 ${config.color}`}
        >
          {config.title}
        </h2>

        {!user && (type === 'GAMEOVER' || type === 'VICTORY') && (
          <div className="mb-6 p-4 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex flex-col items-center gap-3">
            <p className="text-[10px] uppercase font-bold tracking-tight">Login to save this score!</p>
            <button 
              onClick={() => loginWithGoogle()}
              className="flex items-center gap-2 bg-yellow-400 text-black px-4 py-2 rounded font-pixel text-[8px] hover:bg-yellow-300 transition-all"
            >
              <LogIn size={10} /> GOOGLE LOGIN
            </button>
          </div>
        )}

        {user && (type === 'GAMEOVER' || type === 'VICTORY') && (
          <div className="mb-6 text-[10px] text-emerald-400 font-pixel uppercase animate-pulse">
            Score Saved to Leaderboard
          </div>
        )}
        
        <div className="flex flex-col gap-2 mb-10 bg-black/40 p-6 rounded-xl border border-white/5">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-pixel">Total Score</span>
          <span className="text-4xl font-bold tracking-tight text-white">{score}</span>
        </div>

        <button 
          onClick={onAction}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-pixel py-5 text-sm rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20"
        >
          {config.buttonText}
        </button>
      </motion.div>
    </div>
  );
};
