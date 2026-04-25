/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { GameCanvas, THEMES } from './components/GameCanvas';
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
  const [lives, setLives] = useState(3);
  const [themeId, setThemeId] = useState('teahouse');
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
    setLives(3);
    setStage(1);
  }, []);

  const handleLoseLife = useCallback(() => {
    setLives(prev => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        // Game Over handled by GameCanvas calling handleGameOver
      }
      return newLives;
    });
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
    <div 
      className="w-full h-screen font-sans overflow-hidden relative flex flex-col transition-colors duration-500"
      style={{ backgroundColor: THEMES[themeId]?.bg || '#f4ece1', color: THEMES[themeId]?.accent || '#4a3424' }}
    >
      {/* Top Navigation Bar */}
      <nav 
        className="border-b-[4px] px-6 py-4 flex justify-between items-center fixed top-0 w-full z-[100] shadow-[0_4px_0px_#4a3424] transition-colors duration-500"
        style={{ 
          backgroundColor: THEMES[themeId]?.wall || '#d97706', 
          borderColor: THEMES[themeId]?.accent || '#4a3424',
          boxShadow: `0 4px 0px ${THEMES[themeId]?.accent || '#4a3424'}`
        }}
      >
        <div className="flex items-center gap-4">
          <div className="font-sans font-black text-[#fef3c7] text-xl tracking-tight uppercase">DIM SUM MAZE</div>
          <div className="h-6 w-[2px] bg-[#4a3424]"></div>
          <div id="status-tag" className={`text-[10px] font-bold uppercase tracking-widest ${status === 'PLAYING' ? 'text-[#fef3c7]' : 'text-orange-200'}`}>
            {status === 'PLAYING' ? 'In Service' : status}
          </div>
          <div className="flex gap-1 ml-4">
            {Array.from({ length: lives }).map((_, i) => (
              <div key={i} className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-[#4a3424] shadow-[2px_2px_0px_#4a3424]"></div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-white leading-none">{user.displayName}</span>
                {userProfile && (
                  <span className="text-[10px] text-yellow-300 flex items-center gap-1 font-bold mt-1">
                    <Trophy size={10} /> BEST: {userProfile.highScore}
                  </span>
                )}
              </div>
              <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border-2 border-[#4a3424] shadow-sm" />
              <button 
                onClick={() => logout()}
                className="p-2 text-orange-200 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => loginWithGoogle()}
              className="flex items-center gap-2 bg-[#f4ece1] text-[#4a3424] px-4 py-1.5 rounded-full border-2 border-[#4a3424] font-bold text-[11px] uppercase hover:bg-white transition-all shadow-[2px_2px_0px_#4a3424] active:translate-y-1 active:shadow-none"
            >
              <LogIn size={12} /> Login
            </button>
          )}

          <div className="bg-[#4a3424] border-2 border-[#fef3c7] px-4 py-2 rounded-xl">
            <div className="text-xs text-[#fef3c7] uppercase font-black">Points: <span className="text-white ml-2">{score}</span></div>
          </div>
        </div>
      </nav>

      {/* Main Game Area */}
      <main className="flex-grow flex items-center justify-center p-8 pt-24 relative transition-colors duration-500" style={{ backgroundColor: THEMES[themeId]?.bg || '#f4ece1' }}>
        <AnimatePresence>
          {status === 'SPLASH' && (
            <Splash onStart={handleStart} themeId={themeId} onThemeChange={setThemeId} />
          )}
        </AnimatePresence>

        {(status === 'PLAYING' || status === 'PAUSED' || status === 'STAGE_TRANSITION') && (
          <GameCanvas 
            stage={stage} 
            themeId={themeId}
            onGameOver={handleGameOver} 
            onVictory={handleVictory}
            onScoreUpdate={handleScoreUpdate}
            onLoseLife={handleLoseLife}
            lives={lives}
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
    </div>
  );
}


