import React from 'react';
import { motion } from 'motion/react';

interface OverlayProps {
  type: 'STAGE' | 'GAMEOVER' | 'VICTORY';
  stage?: number;
  score: number;
  onAction: () => void;
}

export const Overlay: React.FC<OverlayProps> = ({ type, stage, score, onAction }) => {
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
          className={`font-pixel text-2xl mb-8 ${config.color}`}
        >
          {config.title}
        </h2>
        
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
