import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Crown, Sparkles, AlertCircle, RotateCcw, Coins } from 'lucide-react';
import { soundManager } from '../../../utils/soundEffects';

interface Lucky9ResultBannerProps {
  roundWinner: 'player' | 'opponent' | 'tie';
  verdictReason: string;
  payoutAmount: number;
  isNatural9?: boolean;
  isNatural8?: boolean;
  opponentName: string;
  onNextHand: () => void;
}

export const Lucky9ResultBanner: React.FC<Lucky9ResultBannerProps> = ({
  roundWinner,
  verdictReason,
  payoutAmount,
  isNatural9 = false,
  isNatural8 = false,
  opponentName,
  onNextHand,
}) => {
  const isPlayerWin = roundWinner === 'player';
  const isTie = roundWinner === 'tie';

  return (
    <motion.div
      initial={{ scale: 0.6, y: -20, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.7, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 22 }}
      className="relative z-30 w-full max-w-lg mx-auto my-1 select-none"
    >
      {/* Background Glow */}
      <div
        className={`absolute -inset-1 rounded-3xl blur-xl opacity-60 pointer-events-none ${
          isPlayerWin
            ? isNatural9
              ? 'bg-amber-400'
              : 'bg-emerald-500'
            : isTie
            ? 'bg-blue-500'
            : 'bg-rose-600'
        }`}
      />

      <div
        className={`relative rounded-3xl p-4 sm:p-5 border-2 shadow-2xl backdrop-blur-md text-center flex flex-col items-center gap-2 ${
          isPlayerWin
            ? isNatural9
              ? 'bg-gradient-to-b from-amber-500/95 via-yellow-600/95 to-slate-950 text-slate-950 border-amber-300'
              : 'bg-gradient-to-b from-emerald-600/95 via-teal-700/95 to-slate-950 text-white border-emerald-300'
            : isTie
            ? 'bg-gradient-to-b from-blue-600/95 via-indigo-800/95 to-slate-950 text-white border-blue-300'
            : 'bg-gradient-to-b from-rose-700/95 via-slate-900/95 to-slate-950 text-white border-rose-400'
        }`}
      >
        {/* Top Header Badge */}
        <div className="flex items-center gap-2">
          {isNatural9 ? (
            <div className="px-3 py-1 rounded-full bg-slate-950 text-amber-300 font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-1.5 shadow-lg border border-amber-400">
              <Crown className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>★ NATURAL 9 - LUCKY 9! ★</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
          ) : isNatural8 ? (
            <div className="px-3 py-1 rounded-full bg-slate-950 text-emerald-300 font-black text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-lg border border-emerald-400">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span>★ NATURAL 8 VICTORY ★</span>
            </div>
          ) : isPlayerWin ? (
            <div className="px-3 py-1 rounded-full bg-slate-950 text-emerald-400 font-black text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-lg border border-emerald-500/40">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span>★ PLAYER VICTORY ★</span>
            </div>
          ) : isTie ? (
            <div className="px-3 py-1 rounded-full bg-slate-950 text-blue-300 font-black text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-lg border border-blue-400/40">
              <AlertCircle className="w-4 h-4 text-blue-400" />
              <span>★ PUSH / STANDOFF ★</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full bg-slate-950 text-rose-300 font-black text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-lg border border-rose-500/40">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{opponentName.toUpperCase()} TAKES THE HAND</span>
            </div>
          )}
        </div>

        {/* Big Proclamation Title */}
        <h2
          className={`font-black text-lg sm:text-2xl tracking-tight leading-tight ${
            isPlayerWin && isNatural9 ? 'text-slate-950' : 'text-white'
          }`}
        >
          {isPlayerWin
            ? isNatural9
              ? 'Unstoppable! You Hit Lucky 9!'
              : 'You Won The Hand!'
            : isTie
            ? 'Standoff! Bets Refunded'
            : `${opponentName} Won This Round`}
        </h2>

        {/* Verdict Explanation Reason */}
        <p
          className={`text-xs sm:text-sm font-medium max-w-md ${
            isPlayerWin && isNatural9
              ? 'text-slate-900 bg-amber-400/50'
              : 'text-slate-200 bg-slate-950/60'
          } px-3 py-1 rounded-xl border border-white/20`}
        >
          {verdictReason}
        </p>

        {/* Payout & Coin Transfer Indicator */}
        {isPlayerWin && payoutAmount > 0 && (
          <motion.div
            initial={{ scale: 0.8, y: 5 }}
            animate={{ scale: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-slate-950 border border-amber-400/60 text-amber-400 font-mono font-black text-sm sm:text-base shadow-xl"
          >
            <Coins className="w-4 h-4 text-amber-400 animate-spin" />
            <span>+{payoutAmount.toLocaleString()} COINS ADDED</span>
          </motion.div>
        )}

        {isTie && (
          <div className="text-xs text-blue-200 font-mono">
            Stakes of {payoutAmount.toLocaleString()} coins returned to each player
          </div>
        )}

        {/* Quick Deal Next Hand Button */}
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundManager.playTick();
              onNextHand();
            }}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-xs sm:text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-amber-300"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Deal Next Hand</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
