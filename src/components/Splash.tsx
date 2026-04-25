import React from 'react';
import { motion } from 'motion/react';

interface SplashProps {
  onStart: () => void;
}

export const Splash: React.FC<SplashProps> = ({ onStart }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#020617]/95 z-[1000] flex flex-col items-center justify-center"
    >
      <h1 className="font-pixel text-yellow-400 text-3xl mb-12 animate-bounce tracking-tighter">NEON DIM SUM</h1>
      
      <div className="glass-panel p-8 rounded-xl border border-white/10 mb-12 max-w-md w-full bg-[#0f172a]/80 backdrop-blur-sm">
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

      <button 
        onClick={onStart}
        className="font-pixel bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-6 rounded-xl transition-all transform hover:scale-105 shadow-[0_0_30px_rgba(79,70,229,0.4)]"
      >
        CLICK TO START
      </button>
      
      <p className="mt-8 text-slate-500 text-xs italic font-sans">© 2024 Neon Maze Enterprise</p>
    </motion.div>
  );
};
