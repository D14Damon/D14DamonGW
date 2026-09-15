import React from 'react';
import { motion } from 'motion/react';

export interface ChipConfig {
  value: number;
  label: string;
  bgGradient: string;
  borderColor: string;
  accentColor: string;
  stripeColor: string;
  textColor: string;
}

export const CHIP_CONFIGS: Record<number, ChipConfig> = {
  100: {
    value: 100,
    label: '100',
    bgGradient: 'from-slate-100 via-slate-200 to-slate-300',
    borderColor: 'border-slate-400',
    accentColor: 'border-blue-600',
    stripeColor: 'bg-blue-600',
    textColor: 'text-slate-900',
  },
  500: {
    value: 500,
    label: '500',
    bgGradient: 'from-rose-500 via-red-600 to-rose-700',
    borderColor: 'border-rose-400',
    accentColor: 'border-white',
    stripeColor: 'bg-white',
    textColor: 'text-white',
  },
  1000: {
    value: 1000,
    label: '1K',
    bgGradient: 'from-amber-400 via-amber-500 to-yellow-600',
    borderColor: 'border-amber-300',
    accentColor: 'border-slate-900',
    stripeColor: 'bg-slate-950',
    textColor: 'text-slate-950',
  },
  2500: {
    value: 2500,
    label: '2.5K',
    bgGradient: 'from-emerald-500 via-emerald-600 to-teal-700',
    borderColor: 'border-emerald-300',
    accentColor: 'border-white',
    stripeColor: 'bg-white',
    textColor: 'text-white',
  },
  5000: {
    value: 5000,
    label: '5K',
    bgGradient: 'from-blue-600 via-indigo-700 to-slate-900',
    borderColor: 'border-blue-400',
    accentColor: 'border-amber-400',
    stripeColor: 'bg-amber-400',
    textColor: 'text-white',
  },
  10000: {
    value: 10000,
    label: '10K',
    bgGradient: 'from-purple-600 via-violet-700 to-slate-950',
    borderColor: 'border-purple-300',
    accentColor: 'border-amber-300',
    stripeColor: 'bg-amber-300',
    textColor: 'text-amber-200',
  },
  25000: {
    value: 25000,
    label: '25K',
    bgGradient: 'from-amber-500 via-rose-600 to-indigo-900',
    borderColor: 'border-amber-300',
    accentColor: 'border-cyan-300',
    stripeColor: 'bg-cyan-300',
    textColor: 'text-white',
  },
};

interface Lucky9ChipProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  isSelected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  stackCount?: number;
  className?: string;
  animateDrop?: boolean;
}

export const Lucky9Chip: React.FC<Lucky9ChipProps> = ({
  value,
  size = 'md',
  isSelected = false,
  disabled = false,
  onClick,
  stackCount = 1,
  className = '',
  animateDrop = false,
}) => {
  const config = CHIP_CONFIGS[value] || CHIP_CONFIGS[1000];

  const sizeClasses = {
    sm: 'w-8 h-8 text-[9px]',
    md: 'w-11 h-11 sm:w-12 sm:h-12 text-[11px] sm:text-xs',
    lg: 'w-14 h-14 sm:w-16 sm:h-16 text-xs sm:text-sm',
  }[size];

  const innerSizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7 sm:w-8 sm:h-8',
    lg: 'w-9 h-9 sm:w-10 sm:h-10',
  }[size];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      initial={animateDrop ? { y: -25, scale: 0.8, opacity: 0 } : false}
      animate={{ y: 0, scale: isSelected ? 1.08 : 1, opacity: 1 }}
      whileHover={!disabled ? { scale: 1.1, y: -3 } : undefined}
      whileTap={!disabled ? { scale: 0.94 } : undefined}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      className={`relative rounded-full select-none cursor-pointer group focus:outline-none transition-shadow ${sizeClasses} ${
        isSelected ? 'ring-3 ring-amber-400 ring-offset-2 ring-offset-slate-900 shadow-xl shadow-amber-400/40' : 'shadow-lg'
      } ${disabled ? 'opacity-35 cursor-not-allowed grayscale-[40%]' : ''} ${className}`}
      title={`${value.toLocaleString()} Coins`}
    >
      {/* 3D Chip Thickness Edge (Simulates clay thickness) */}
      <div className="absolute inset-0 rounded-full bg-black/40 translate-y-1 -z-10 blur-[1px]" />

      {/* Main Chip Body */}
      <div
        className={`w-full h-full rounded-full bg-gradient-to-br ${config.bgGradient} border-2 ${config.borderColor} flex items-center justify-center relative overflow-hidden shadow-inner`}
      >
        {/* Clay Chip Edge Stripes (Casino Rim Pattern) */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 ${config.stripeColor} rounded-xs`} />
          <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 ${config.stripeColor} rounded-xs`} />
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 ${config.stripeColor} rounded-xs`} />
          <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 ${config.stripeColor} rounded-xs`} />
          {/* Diagonal stripes */}
          <div className={`absolute top-1.5 left-1.5 w-1 h-1 ${config.stripeColor} rounded-xs rotate-45`} />
          <div className={`absolute top-1.5 right-1.5 w-1 h-1 ${config.stripeColor} rounded-xs rotate-45`} />
          <div className={`absolute bottom-1.5 left-1.5 w-1 h-1 ${config.stripeColor} rounded-xs rotate-45`} />
          <div className={`absolute bottom-1.5 right-1.5 w-1 h-1 ${config.stripeColor} rounded-xs rotate-45`} />
        </div>

        {/* Outer Inset Ring */}
        <div className="absolute inset-1 rounded-full border border-dashed border-white/40 pointer-events-none" />

        {/* Center Metal Inlay / Stamped Denomination Core */}
        <div
          className={`${innerSizeClasses} rounded-full bg-slate-950/90 border border-amber-400/60 flex items-center justify-center shadow-inner relative z-10`}
        >
          <span className={`font-mono font-black tracking-tighter ${config.textColor}`}>
            {config.label}
          </span>
        </div>

        {/* Specular Light Reflection Sweep */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none rounded-full" />
      </div>

      {/* Stack Count Indicator if multi-stacked */}
      {stackCount > 1 && (
        <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-mono font-black text-[9px] shadow-md border border-slate-900 z-20">
          ×{stackCount}
        </span>
      )}
    </motion.button>
  );
};
