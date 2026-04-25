/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { GameCanvas } from './components/GameCanvas';
import { Splash } from './components/Splash';
import { Overlay } from './components/Overlay';
import { GameStatus } from './types';
import { useFirebase } from './lib/FirebaseProvider';
import { loginWithGoogle, logout, auth } from './lib/firebase';
import { saveHighScore, syncUserProfile, getUserProfile } from './lib/gameService';
import { LogIn, LogOut, Trophy } from 'lucide-react';

export default function App() {
  const { user } = useFirebase();
  const [status, setStatus] = useState<GameStatus>('SPLASH');
  const [stage, setStage] = useState(1);
  const [score, setScore] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      getUserProfile(user.uid).then(setUserProfile);
    } else {
      setUserProfile(null);
    }
  }, [user]);

  const handleStart = useCallback(() => {
    setStatus('PLAYING');
    setScore(0);
    setStage(1);
  }, []);

  const handleGameOver = useCallback(async (finalScore: number) => {
    setScore(finalScore);
    setStatus('GAMEOVER');

    if (user) {
      // Save global high score
      await saveHighScore({
        userId: user.uid,
        displayName: user.displayName || 'Anonymous',
        score: finalScore,
        stage: stage
      });

      // Update personal best if applicable
      if (!userProfile || finalScore > userProfile.highScore) {
        await syncUserProfile(user.uid, {
          displayName: user.displayName || 'Anonymous',
          photoURL: user.photoURL || '',
          highScore: Math.max(userProfile?.highScore || 0, finalScore)
        });
        // Refresh local profile
        const updated = await getUserProfile(user.uid);
        setUserProfile(updated);
      }
    }
  }, [user, userProfile, stage]);

  const handleVictory = useCallback(async (finalScore: number) => {
    setScore(finalScore);
    if (stage < 5) {
      setStatus('STAGE_TRANSITION');
    } else {
      setStatus('VICTORY');
      if (user) {
        await saveHighScore({
          userId: user.uid,
          displayName: user.displayName || 'Anonymous',
          score: finalScore,
          stage: stage
        });
        
        if (!userProfile || finalScore > userProfile.highScore) {
          await syncUserProfile(user.uid, {
            displayName: user.displayName || 'Anonymous',
            photoURL: user.photoURL || '',
            highScore: Math.max(userProfile?.highScore || 0, finalScore)
          });
          const updated = await getUserProfile(user.uid);
          setUserProfile(updated);
        }
      }
    }
  }, [stage, user, userProfile]);

  const nextStage = useCallback(() => {
    setStage(prev => prev + 1);
    setStatus('PLAYING');
  }, []);

  const resetGame = useCallback(() => {
    setStatus('SPLASH');
    setScore(0);
    setStage(1);
  }, []);

  const handleScoreUpdate = useCallback((newScore: number) => {
    setScore(newScore);
  }, []);

  return (
    <div className="w-full h-screen bg-[#020617] text-white font-sans overflow-hidden relative flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="bg-[#0f172a]/90 backdrop-blur-md border-b border-white/10 px-6 py-4 flex justify-between items-center fixed top-0 w-full z-[100]">
        <div className="flex items-center gap-4">
          <div className="font-pixel text-yellow-400 text-xs tracking-tighter">NEON DIM SUM</div>
          <div className="h-6 w-[1px] bg-slate-700"></div>
          <div id="status-tag" className={`text-[10px] font-bold uppercase tracking-widest ${status === 'PLAYING' ? 'text-emerald-400' : 'text-yellow-400'}`}>
            Status: {status === 'PLAYING' ? 'Active' : status}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-white leading-none">{user.displayName}</span>
                {userProfile && (
                  <span className="text-[8px] text-yellow-400 flex items-center gap-1 font-pixel mt-1">
                    <Trophy size={8} /> BEST: {userProfile.highScore}
                  </span>
                )}
              </div>
              <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-yellow-400/50" />
              <button 
                onClick={() => logout()}
                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => loginWithGoogle()}
              className="flex items-center gap-2 bg-yellow-400 text-black px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase hover:bg-yellow-300 transition-all active:scale-95"
            >
              <LogIn size={12} /> Login to Save Progress
            </button>
          )}

          <div className="bg-[#0f172a]/90 border border-yellow-400/30 px-4 py-2 rounded-lg backdrop-blur-md">
            <div className="text-[10px] text-slate-400 uppercase font-bold font-pixel">Score: <span className="text-white ml-2">{score}</span></div>
          </div>
        </div>
      </nav>

      {/* Main Game Area */}
      <main className="flex-grow flex items-center justify-center p-8 pt-24 bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.1)_0%,_transparent_70%)] relative">
        <AnimatePresence>
          {status === 'SPLASH' && (
            <Splash onStart={handleStart} />
          )}
        </AnimatePresence>

        {(status === 'PLAYING' || status === 'PAUSED' || status === 'STAGE_TRANSITION') && (
          <GameCanvas 
            stage={stage} 
            onGameOver={handleGameOver} 
            onVictory={handleVictory}
            onScoreUpdate={handleScoreUpdate}
            status={status}
          />
        )}

        <AnimatePresence>
          {status === 'STAGE_TRANSITION' && (
            <Overlay 
              type="STAGE" 
              stage={stage} 
              score={score} 
              onAction={nextStage} 
            />
          )}
          {status === 'GAMEOVER' && (
            <Overlay 
              type="GAMEOVER" 
              score={score} 
              onAction={resetGame} 
            />
          )}
          {status === 'VICTORY' && (
            <Overlay 
              type="VICTORY" 
              score={score} 
              onAction={resetGame} 
            />
          )}
        </AnimatePresence>
      </main>

      {/* CRT Flicker Overlay */}
      <div className="absolute inset-0 pointer-events-none z-[200] opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,105,0.06))] bg-[length:100%_2px,3px_100%] animate-flicker"></div>
    </div>
  );
}


