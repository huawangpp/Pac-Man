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
      title: `COURSE ${stage} COMPLETE`,
      color: 'text-[#d97706]',
      buttonText: 'NEXT COURSE',
      borderColor: 'border-[#4a3424]',
      bg: 'bg-white'
    },
    GAMEOVER: {
      title: 'MEAL FINISHED',
      color: 'text-red-700',
      buttonText: 'NEW ORDER',
      borderColor: 'border-[#4a3424]',
      bg: 'bg-[#fff7ed]'
    },
    VICTORY: {
      title: 'DIM SUM MASTER',
      color: 'text-[#d97706]',
      buttonText: 'VISIT AGAIN',
      borderColor: 'border-[#4a3424]',
      bg: 'bg-[#fef3c7]'
    }
  }[type];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#4a3424]/80 backdrop-blur-sm">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`${config.bg} border-[6px] ${config.borderColor} p-10 text-center rounded-[3rem] w-full max-w-md shadow-[12px_12px_0px_#4a3424] relative overflow-hidden`}
      >
        <div className="absolute top-4 right-8 transform rotate-12 opacity-20 text-6xl">🥢</div>
        
        <h2 
          className={`font-sans font-black text-3xl mb-6 ${config.color} leading-none uppercase tracking-tighter`}
        >
          {config.title}
        </h2>

        {!user && (type === 'GAMEOVER' || type === 'VICTORY') && (
          <div className="mb-6 p-4 rounded-2xl bg-white border-2 border-[#4a3424] text-[#4a3424] flex flex-col items-center gap-3 shadow-[4px_4px_0px_#4a3424]">
            <p className="text-[10px] uppercase font-black tracking-widest">Register your rank!</p>
            <button 
              onClick={() => loginWithGoogle()}
              className="flex items-center gap-2 bg-yellow-400 text-[#4a3424] px-5 py-2 rounded-full border-2 border-[#4a3424] font-bold text-[10px] hover:bg-yellow-300 transition-all active:translate-y-0.5"
            >
              <LogIn size={12} strokeWidth={3} /> GOOGLE LOGIN
            </button>
          </div>
        )}

        {user && (type === 'GAMEOVER' || type === 'VICTORY') && (
          <div className="mb-6 text-[10px] text-emerald-700 font-bold uppercase tracking-widest bg-emerald-50 py-2 rounded-full border-2 border-emerald-200">
            ✓ Logged to Kitchen Hall of Fame
          </div>
        )}
        
        <div className="flex flex-col gap-1 mb-10 bg-white border-4 border-[#4a3424] p-8 rounded-3xl shadow-inner relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4a3424] text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">GUEST CHECK</div>
          <span className="text-xs uppercase tracking-widest text-[#4a3424]/60 font-black">Points Served</span>
          <span className="text-6xl font-black tracking-tighter text-[#4a3424]">{score}</span>
        </div>

        <button 
          onClick={onAction}
          className="w-full bg-[#d97706] text-white font-black py-5 text-xl rounded-2xl border-4 border-[#4a3424] shadow-[4px_4px_0px_#4a3424] hover:bg-[#b45309] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#4a3424] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#4a3424] transition-all uppercase tracking-tight"
        >
          {config.buttonText}
        </button>
      </motion.div>
    </div>
  );
};
