import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Crown, Sparkles, Eye, Shield } from 'lucide-react';
import { Lucky9Card, Lucky9Suit } from '../../../types';

interface Lucky9CardViewProps {
  card: Lucky9Card;
  isRevealed?: boolean;
  dealIndex?: number;
  totalCardsInHand?: number;
  isInteractivePeek?: boolean;
  isWinningCard?: boolean;
  isNatural?: 'natural_9' | 'natural_8' | null;
  fromDealerShoe?: boolean;
  onPeek?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SUIT_DATA: Record<Lucky9Suit, { symbol: string; color: string; bgSoft: string }> = {
  spades: { symbol: '♠', color: 'text-slate-900 dark:text-slate-100', bgSoft: 'bg-slate-100 dark:bg-slate-800' },
  hearts: { symbol: '♥', color: 'text-rose-600', bgSoft: 'bg-rose-50 dark:bg-rose-950/40' },
  clubs: { symbol: '♣', color: 'text-slate-900 dark:text-slate-100', bgSoft: 'bg-slate-100 dark:bg-slate-800' },
  diamonds: { symbol: '♦', color: 'text-blue-600', bgSoft: 'bg-blue-50 dark:bg-blue-950/40' },
};

export const Lucky9CardView: React.FC<Lucky9CardViewProps> = ({
  card,
  isRevealed = true,
  dealIndex = 0,
  totalCardsInHand = 2,
  isInteractivePeek = false,
  isWinningCard = false,
  isNatural = null,
  fromDealerShoe = true,
  onPeek,
  size = 'md',
  className = '',
}) => {
  const [isPeeking, setIsPeeking] = useState(false);
  const suitInfo = SUIT_DATA[card.suit];

  // Natural fanning angle based on index and hand size (-5 to +5 deg)
  const rotationAngle = totalCardsInHand > 1
    ? (dealIndex - (totalCardsInHand - 1) / 2) * 5
    : 0;

  const sizeClasses = {
    sm: 'w-16 h-24 sm:w-20 sm:h-28',
    md: 'w-20 sm:w-24 md:w-28 h-28 sm:h-36 md:h-40',
    lg: 'w-24 sm:w-28 md:w-32 h-34 sm:h-42 md:h-48',
  }[size];

  const isFaceCard = ['10', 'J', 'Q', 'K'].includes(card.rank);
  const isAce = card.rank === 'A';

  return (
    <motion.div
      initial={
        fromDealerShoe
          ? {
              x: 160 - dealIndex * 30,
              y: -220,
              scale: 0.35,
              rotate: 35,
              opacity: 0,
            }
          : { scale: 0.8, opacity: 0, y: -20 }
      }
      animate={{
        x: 0,
        y: 0,
        scale: isWinningCard ? 1.05 : 1,
        rotate: isPeeking ? rotationAngle - 10 : rotationAngle,
        opacity: 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 280,
        damping: 22,
        delay: dealIndex * 0.12,
      }}
      className={`relative select-none perspective-[1000px] cursor-default ${sizeClasses} ${className}`}
    >
      {/* Golden Aura Glow for Natural 9 or Winning Hand */}
      {isNatural === 'natural_9' && (
        <motion.div
          animate={{
            opacity: [0.6, 1, 0.6],
            scale: [1, 1.06, 1],
          }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          className="absolute -inset-2 rounded-3xl bg-radial from-amber-400/50 via-yellow-500/20 to-transparent blur-md pointer-events-none -z-10"
        />
      )}

      {isNatural === 'natural_8' && (
        <motion.div
          animate={{
            opacity: [0.5, 0.9, 0.5],
            scale: [1, 1.05, 1],
          }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          className="absolute -inset-2 rounded-3xl bg-radial from-emerald-400/50 via-teal-500/20 to-transparent blur-md pointer-events-none -z-10"
        />
      )}

      {/* 3D Flippable Container */}
      <motion.div
        animate={{
          rotateY: isRevealed || isPeeking ? 0 : 180,
        }}
        transition={{
          type: 'spring',
          stiffness: 240,
          damping: 24,
        }}
        style={{ transformStyle: 'preserve-3d' }}
        className="w-full h-full relative"
      >
        {/* ================= CARD FRONT ================= */}
        <div
          style={{ backfaceVisibility: 'hidden' }}
          className={`absolute inset-0 rounded-2xl bg-gradient-to-b from-[#fdfcf9] to-[#f4efe6] dark:from-slate-900 dark:to-slate-950 border-2 ${
            isWinningCard
              ? 'border-amber-400 ring-2 ring-amber-300/80 shadow-2xl shadow-amber-400/30'
              : isNatural
              ? 'border-amber-400/90 shadow-xl'
              : 'border-slate-300/90 dark:border-slate-700 shadow-xl'
          } p-1.5 sm:p-2.5 flex flex-col justify-between overflow-hidden`}
        >
          {/* Subtle Linen Card Texture Lines */}
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none" />

          {/* Top-Left Corner Pip */}
          <div className="flex items-center gap-0.5 sm:gap-1 z-10">
            <div className={`font-black text-xs sm:text-base md:text-lg leading-none font-serif ${suitInfo.color}`}>
              {card.rank}
            </div>
            <span className={`text-xs sm:text-sm leading-none ${suitInfo.color}`}>
              {suitInfo.symbol}
            </span>
          </div>

          {/* Center Art / Pips */}
          <div className="flex-1 flex flex-col items-center justify-center relative my-0.5 z-10">
            {isFaceCard ? (
              // Royal / Face Card Layout (10, J, Q, K are worth 0 points in Lucky 9)
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-0.5 shadow-xs">
                  <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className={`text-xl sm:text-2xl font-black ${suitInfo.color} leading-none`}>
                  {suitInfo.symbol}
                </span>
                <span className="mt-1 px-1.5 py-0.2 rounded-full bg-slate-950/80 dark:bg-slate-800 text-[8px] sm:text-[9px] font-mono font-bold text-amber-400 border border-amber-400/30 shadow-xs">
                  0 PTS
                </span>
              </div>
            ) : isAce ? (
              // Ornate Ace Display
              <div className="flex flex-col items-center justify-center text-center">
                <span className={`text-3xl sm:text-4xl md:text-5xl font-black font-serif ${suitInfo.color} drop-shadow-xs`}>
                  {suitInfo.symbol}
                </span>
                <span className="mt-0.5 px-1.5 py-0.2 rounded-full bg-indigo-950/80 dark:bg-indigo-900 text-[8px] sm:text-[9px] font-mono font-bold text-indigo-300 border border-indigo-400/30">
                  1 PT
                </span>
              </div>
            ) : (
              // Number Cards (2-9)
              <div className="flex flex-col items-center justify-center text-center">
                <div className="relative">
                  <span className={`text-2xl sm:text-3xl md:text-4xl font-black ${suitInfo.color} drop-shadow-xs`}>
                    {suitInfo.symbol}
                  </span>
                  {card.value === 9 && (
                    <Sparkles className="w-3 h-3 text-amber-500 absolute -top-1 -right-2 animate-spin" />
                  )}
                </div>
                <span
                  className={`mt-0.5 px-1.5 py-0.2 rounded-full text-[8px] sm:text-[9px] font-mono font-black border ${
                    card.value === 9
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                      : card.value === 8
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                      : 'bg-slate-900 text-slate-200 dark:bg-slate-800 border-slate-700 font-medium'
                  }`}
                >
                  {card.value} {card.value === 1 ? 'PT' : 'PTS'}
                </span>
              </div>
            )}
          </div>

          {/* Bottom-Right Inverted Corner Pip */}
          <div className="flex items-center gap-0.5 sm:gap-1 z-10 self-end rotate-180">
            <div className={`font-black text-xs sm:text-base md:text-lg leading-none font-serif ${suitInfo.color}`}>
              {card.rank}
            </div>
            <span className={`text-xs sm:text-sm leading-none ${suitInfo.color}`}>
              {suitInfo.symbol}
            </span>
          </div>

          {/* Subtle Specular Sheen Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
        </div>

        {/* ================= CARD BACK ================= */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
          className={`absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-950 to-blue-950 border-2 border-amber-400/50 shadow-2xl p-2 flex items-center justify-center overflow-hidden ${
            isInteractivePeek ? 'cursor-pointer group' : ''
          }`}
          onClick={() => {
            if (isInteractivePeek && onPeek) {
              onPeek();
            }
          }}
          onMouseEnter={() => {
            if (isInteractivePeek) setIsPeeking(true);
          }}
          onMouseLeave={() => {
            if (isInteractivePeek) setIsPeeking(false);
          }}
        >
          {/* Realistic Royal Casino Filigree Pattern */}
          <div className="absolute inset-1.5 rounded-xl border border-amber-400/40 border-dashed pointer-events-none" />
          <div className="absolute inset-2 rounded-lg border border-indigo-400/20 pointer-events-none bg-[radial-gradient(#fbbf24_0.75px,transparent_0.75px)] [background-size:6px_6px] opacity-25" />

          {/* Center Royal Lucky 9 Medallion */}
          <div className="w-10 h-14 sm:w-12 sm:h-16 rounded-xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-700 p-0.5 shadow-lg flex items-center justify-center relative z-10">
            <div className="w-full h-full rounded-[10px] bg-slate-950 flex flex-col items-center justify-center p-1">
              <Crown className="w-3 h-3 text-amber-400 mb-0.5" />
              <span className="font-serif font-black text-amber-300 text-xs sm:text-sm tracking-wider leading-none">
                L9
              </span>
              <span className="text-[6px] font-mono text-amber-500 uppercase tracking-widest mt-0.5">
                ROYAL
              </span>
            </div>
          </div>

          {/* Interactive Peek Hint Pill for player */}
          {isInteractivePeek && (
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              className="absolute bottom-1 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[8px] flex items-center gap-1 shadow-md z-20 group-hover:scale-105"
            >
              <Eye className="w-2.5 h-2.5" />
              <span>PEEK</span>
            </motion.div>
          )}

          {/* Subtle Card Back Sheen */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-amber-400/10 to-transparent pointer-events-none" />
        </div>
      </motion.div>
    </motion.div>
  );
};
