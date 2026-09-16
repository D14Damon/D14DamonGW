import React, { useState } from 'react';
import {
  Bot,
  Swords,
  Layers,
  Bomb,
  Eye,
  Brain,
  SpellCheck,
  Puzzle,
  Theater,
  Keyboard,
  Calculator,
  Zap,
  ShieldCheck,
  Flame,
  CheckCircle2,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { ArcadeGameMode, CurrencyType } from '../types';
import { soundManager } from '../utils/soundEffects';

export type AiDifficulty = 'easy' | 'moderate' | 'hard' | 'extreme';

export interface AiGameConfig {
  mode: ArcadeGameMode;
  difficulty: AiDifficulty;
  withBet: boolean;
  currency: CurrencyType;
  betAmount: string;
  multiplier: number;
}

interface VsAiArenaProps {
  onLaunchGame: (config: AiGameConfig) => void;
}

interface AiGameOption {
  id: ArcadeGameMode;
  name: string;
  tagline: string;
  icon: React.ElementType;
  accentColor: string;
  badge: string;
  category: string;
}

const AI_GAMES: AiGameOption[] = [
  {
    id: 'uno_party',
    name: 'UNO Party Showdown',
    tagline: 'Official UNO card rules with skips, reverse & smart bot AI',
    icon: Layers,
    accentColor: 'from-rose-600 to-pink-600',
    badge: 'Card Battle',
    category: 'Card Strategy',
  },
  {
    id: 'lucky_9',
    name: 'Lucky 9 (1v1 Card Battle)',
    tagline: 'Authentic 1v1 Lucky 9 showdown vs Smart AI with side banker & free 25k coins bet',
    icon: Layers,
    accentColor: 'from-emerald-600 to-teal-600',
    badge: '1v1 High Stakes',
    category: 'Card Strategy',
  },
  {
    id: 'bomb_chain',
    name: 'Word Bomb Chain',
    tagline: 'Type syllable words before the bomb explodes vs AI defusers',
    icon: Bomb,
    accentColor: 'from-amber-600 to-orange-600',
    badge: 'Syllable Rush',
    category: 'Word Action',
  },
  {
    id: 'trivia_dash',
    name: 'Trivia Dash Royale',
    tagline: 'Fast multiple-choice quiz sprints with live AI bot racers',
    icon: Brain,
    accentColor: 'from-emerald-600 to-teal-600',
    badge: 'Brain Battle',
    category: 'Knowledge Sprint',
  },
  {
    id: 'bugtong_bugtong',
    name: 'Bugtong-Bugtong',
    tagline: 'Classic Filipino riddles with typed A, B, C, D answers against adaptive AI',
    icon: Brain,
    accentColor: 'from-amber-500 to-rose-600',
    badge: 'Riddle Battle',
    category: 'Filipino Classics',
  },
  {
    id: 'anagram_rush',
    name: 'Word Anagram Rush',
    tagline: 'Unscramble letters at hyper speed vs AI lexicon solver',
    icon: SpellCheck,
    accentColor: 'from-yellow-600 to-amber-600',
    badge: 'Word Scramble',
    category: 'Word Logic',
  },
  {
    id: 'spelling_bee',
    name: 'Spelling Bee',
    tagline: 'Build valid words from a shared letter hive against the AI buzzer',
    icon: Sparkles,
    accentColor: 'from-amber-500 to-yellow-500',
    badge: 'Word Battle',
    category: 'Word Logic',
  },
  {
    id: 'cyber_typing',
    name: 'Cyber Velocity Typing',
    tagline: 'High-speed WPM velocity rush against AI typing challenger',
    icon: Keyboard,
    accentColor: 'from-indigo-600 to-cyan-600',
    badge: 'WPM Rush',
    category: 'Velocity Typing',
  },
  {
    id: 'chess_game',
    name: 'Chess',
    tagline: 'Think ahead and outmaneuver the AI with pace, traps, and classic strategic play',
    icon: ShieldCheck,
    accentColor: 'from-violet-600 to-purple-600',
    badge: 'Strategy',
    category: 'Board Game',
  },
];

const DIFFICULTY_CONFIG: Record<
  AiDifficulty,
  {
    label: string;
    multiplier: number;
    multiplierText: string;
    description: string;
    badgeBg: string;
    textColor: string;
    borderColor: string;
    icon: string;
  }
> = {
  easy: {
    label: 'EASY',
    multiplier: 1.0,
    multiplierText: '1.0x Payout',
    description: 'Relaxed AI pace, generous timers, and forgiving accuracy.',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-300 dark:border-emerald-800',
    icon: '🟢',
  },
  moderate: {
    label: 'MODERATE',
    multiplier: 1.5,
    multiplierText: '1.5x Payout',
    description: 'Balanced AI reaction speed, standard competitive timers.',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-300 dark:border-amber-800',
    icon: '🟡',
  },
  hard: {
    label: 'HARD',
    multiplier: 2.0,
    multiplierText: '2.0x Payout',
    description: 'Sharp AI accuracy, quick guesses, and demanding streak combos.',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/60',
    textColor: 'text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-300 dark:border-rose-800',
    icon: '🔴',
  },
  extreme: {
    label: 'EXTREME',
    multiplier: 3.0,
    multiplierText: '3.0x Payout',
    description: 'Lightning superhuman AI speed, zero hesitation, maximum thrill!',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/60',
    textColor: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-400 dark:border-purple-700',
    icon: '🔥',
  },
};

export const VsAiArena: React.FC<VsAiArenaProps> = ({ onLaunchGame }) => {
  const [selectedGame, setSelectedGame] = useState<ArcadeGameMode>('uno_party');
  const [selectedDifficulty, setSelectedDifficulty] = useState<AiDifficulty>('moderate');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentDiffMeta = DIFFICULTY_CONFIG[selectedDifficulty];

  const handleLaunch = () => {
    setErrorMessage(null);
    soundManager.playStartGame();
    onLaunchGame({
      mode: selectedGame,
      difficulty: selectedDifficulty,
      withBet: false,
      currency: 'diamond',
      betAmount: '0',
      multiplier: currentDiffMeta.multiplier,
    });
  };

  const activeGameObj = AI_GAMES.find((g) => g.id === selectedGame) || AI_GAMES[0];
  const ActiveGameIcon = activeGameObj.icon;

  return (
    <section className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-purple-900/50 shadow-xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 transition-all hover:border-purple-500/50">
      {/* Professional Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 shrink-0">
            <Bot className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                AI Challenge Arena
              </h2>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                Solo Training
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Practice tactics against intelligent simulated AI opponents without risking rank
            </p>
          </div>
        </div>
        <div className="self-start sm:self-auto px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl shrink-0">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
            <span className="font-extrabold text-xs sm:text-sm">Instant Ready (No Queue)</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left: Game Selection */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Choose Practice Game
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Select from {AI_GAMES.length} games • Active: <span className="font-bold text-indigo-600 dark:text-indigo-400">{activeGameObj.name}</span>
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              {AI_GAMES.length} Modes
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 max-h-[380px] sm:max-h-[440px] overflow-y-auto pr-1 sm:pr-2">
            {AI_GAMES.map((game) => {
              const Icon = game.icon;
              const isSelected = selectedGame === game.id;
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => {
                    soundManager.playTick();
                    setSelectedGame(game.id);
                  }}
                  className={`relative p-3 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center text-center group active:scale-95 ${
                    isSelected
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/50'
                      : 'bg-white/80 dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-purple-500 hover:shadow-md'
                  }`}
                >
                  <div
                    className={`text-2xl sm:text-3xl mb-1.5 sm:mb-2 transition-transform group-hover:scale-110 ${
                      isSelected ? 'scale-110' : ''
                    }`}
                  >
                    <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${
                      isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-300'
                    }`} />
                  </div>
                  <h4 className={`text-xs font-black leading-tight truncate w-full ${
                    isSelected
                      ? 'text-white'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {game.name}
                  </h4>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Difficulty & Launch */}
        <div className="lg:col-span-1 flex flex-col gap-5 justify-between">
          {/* Difficulty Selection */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Difficulty Level
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {currentDiffMeta.label}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
              {(['easy', 'moderate', 'hard', 'extreme'] as AiDifficulty[]).map((diff) => {
                const meta = DIFFICULTY_CONFIG[diff];
                const isSelected = selectedDifficulty === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => {
                      soundManager.playTick();
                      setSelectedDifficulty(diff);
                    }}
                    className={`p-2.5 sm:p-3 rounded-2xl border-2 transition-all cursor-pointer text-center active:scale-95 ${
                      isSelected
                        ? `${meta.badgeBg} ${meta.borderColor} shadow-md ring-1 ring-purple-400/40`
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="text-base sm:text-lg mb-0.5">{meta.icon}</div>
                    <div className={`text-xs font-black ${
                      isSelected
                        ? `${meta.textColor}`
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {meta.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info Card */}
          <div className="p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/60 space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="font-extrabold text-xs">{currentDiffMeta.label} Engine</span>
            </div>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 leading-relaxed">
              {currentDiffMeta.description}
            </p>
          </div>

          {/* Error message */}
          {errorMessage && (
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
              {errorMessage}
            </p>
          )}

          {/* Launch Button */}
          <button
            type="button"
            onClick={handleLaunch}
            className="w-full py-3.5 sm:py-4 px-4 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-700 hover:via-indigo-700 hover:to-pink-700 shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 group"
          >
            <ActiveGameIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span>Launch Challenge</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
};
