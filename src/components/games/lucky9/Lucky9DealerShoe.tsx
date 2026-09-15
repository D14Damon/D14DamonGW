import React from 'react';
import { motion } from 'motion/react';
import { Layers, ShieldCheck } from 'lucide-react';

interface Lucky9DealerShoeProps {
  isDealing: boolean;
  cardsRemaining?: number;
  className?: string;
}

export const Lucky9DealerShoe: React.FC<Lucky9DealerShoeProps> = ({
  isDealing,
  cardsRemaining = 48,
  className = '',
}) => {
  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* 3D Dealer Shoe Box */}
      <div className="relative w-24 sm:w-28 h-18 sm:h-22 rounded-xl bg-gradient-to-br from-amber-950 via-stone-900 to-slate-950 border-2 border-amber-600/50 shadow-2xl p-1.5 flex flex-col justify-between overflow-hidden">
        {/* Brass Bevel Trim */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-700" />
        <div className="absolute inset-1 rounded-lg border border-amber-500/20 pointer-events-none" />

        {/* Stacked Cards Representation */}
        <div className="relative w-full h-10 flex items-center justify-center">
          {/* Card layer thickness lines */}
          <div className="w-16 h-8 rounded-md bg-indigo-950 border border-amber-400/40 shadow-inner flex items-center justify-center rotate-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#fbbf24_0.75px,transparent_0.75px)] [background-size:4px_4px] opacity-20" />
            <span className="font-serif font-black text-amber-400 text-[10px] tracking-wider">L9</span>
          </div>

          {/* Animated Card Ejecting during Deal */}
          {isDealing && (
            <motion.div
              initial={{ x: 0, y: 0, rotate: 6, opacity: 1, scale: 1 }}
              animate={{ x: -30, y: 25, rotate: -15, opacity: 0, scale: 0.8 }}
              transition={{ repeat: Infinity, duration: 0.45, ease: 'easeOut' }}
              className="absolute w-14 h-7 rounded-sm bg-gradient-to-r from-amber-400 via-indigo-900 to-slate-950 border border-amber-300 shadow-xl pointer-events-none"
            />
          )}
        </div>

        {/* Bottom Shoe Label & Deck Stats */}
        <div className="flex items-center justify-between px-1 text-[8px] sm:text-[9px] font-mono text-amber-300/80 border-t border-amber-500/30 pt-0.5">
          <div className="flex items-center gap-1">
            <Layers className="w-2.5 h-2.5 text-amber-400" />
            <span>DECK SHOE</span>
          </div>
          <span className="font-bold text-amber-400">{cardsRemaining} left</span>
        </div>
      </div>

      {/* Fair Play Certified Tag */}
      <div className="mt-1 flex items-center gap-1 text-[8px] font-mono text-emerald-400/80 bg-slate-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30 shadow-xs">
        <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
        <span>RNG Fair Shoe</span>
      </div>
    </div>
  );
};
