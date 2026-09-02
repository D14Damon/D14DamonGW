import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Brain, CheckCircle2, Clock, Flame, RotateCcw, Trophy, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { getSocket } from '../../services/socket';
import { BUGTONG_QUESTIONS, BugtongQuestion } from '../../data/bugtongData';
import { AiGameConfig } from '../VsAiArena';

interface BugtongBugtongProps {
  onBackToHub: () => void;
  aiConfig?: AiGameConfig | null;
}

interface PublicQuestion {
  id: string;
  category: string;
  question: string;
  options: [string, string, string, string];
}

interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  color: string;
  score: number;
  hasAnswered: boolean;
}

const LETTERS = ['A', 'B', 'C', 'D'];
const ROUND_SECONDS = 20;

export const BugtongBugtong: React.FC<BugtongBugtongProps> = ({ onBackToHub, aiConfig = null }) => {
  const { user, updateStats } = useAuth();
  const { gameState: roomState } = useGame();
  const socket = getSocket();
  const isMultiplayer = Boolean(roomState?.settings.gameMode === 'bugtong_bugtong');
  const [localQuestions, setLocalQuestions] = useState<BugtongQuestion[]>([]);
  const [localIndex, setLocalIndex] = useState(0);
  const [localScore, setLocalScore] = useState(0);
  const [localStreak, setLocalStreak] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [aiStreak, setAiStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; correctIndex: number; points: number } | null>(null);
  const [localFinished, setLocalFinished] = useState(false);
  const [roomQuestion, setRoomQuestion] = useState<PublicQuestion | null>(null);
  const [roomIndex, setRoomIndex] = useState(0);
  const [roomTotal, setRoomTotal] = useState(15);
  const [roomStatus, setRoomStatus] = useState<'playing' | 'round_end' | 'game_over'>('playing');
  const [roomLeaderboard, setRoomLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [roomBanner, setRoomBanner] = useState('');
  const [roomResult, setRoomResult] = useState<{ correct: boolean; correctIndex: number; points: number } | null>(null);

  const shuffleQuestions = () => [...BUGTONG_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 15);
  const currentLocalQuestion = localQuestions[localIndex];
  const question = isMultiplayer ? roomQuestion : currentLocalQuestion;
  const currentResult = isMultiplayer ? roomResult : answerResult;
  const currentRound = isMultiplayer ? roomIndex : localIndex;
  const totalRounds = isMultiplayer ? roomTotal : localQuestions.length;
  const displayScore = isMultiplayer ? roomLeaderboard.find((entry) => entry.id === user?.id)?.score || 0 : localScore;

  useEffect(() => {
    if (isMultiplayer) {
      socket.emit('bugtong:get_state');
      const handleState = (data: { currentIndex: number; totalQuestions: number; question: PublicQuestion; timeLeft: number; status: 'playing' | 'round_end' | 'game_over'; leaderboard: LeaderboardEntry[]; banner?: string }) => {
        setRoomIndex(data.currentIndex);
        setRoomTotal(data.totalQuestions);
        setRoomQuestion(data.question);
        setTimeLeft(data.timeLeft);
        setRoomStatus(data.status);
        setRoomLeaderboard(data.leaderboard || []);
        setRoomBanner(data.banner || '');
        if (data.status === 'playing') {
          setTypedAnswer('');
          setSelectedAnswer(null);
          setRoomResult(null);
        }
      };
      const handleTick = ({ timeLeft: nextTime }: { timeLeft: number }) => setTimeLeft(nextTime);
      const handleResult = (result: { isCorrect: boolean; points: number; correctIndex: number }) => setRoomResult({ correct: result.isCorrect, points: result.points, correctIndex: result.correctIndex });
      socket.on('bugtong:state', handleState);
      socket.on('bugtong:tick', handleTick);
      socket.on('bugtong:answer_result', handleResult);
      return () => {
        socket.off('bugtong:state', handleState);
        socket.off('bugtong:tick', handleTick);
        socket.off('bugtong:answer_result', handleResult);
      };
    }
    setLocalQuestions(shuffleQuestions());
  }, [isMultiplayer]);

  useEffect(() => {
    if (isMultiplayer || localFinished || !question || currentResult) return;
    const timer = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          submitAnswer(-1);
          return ROUND_SECONDS;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isMultiplayer, localFinished, question, currentResult]);

  useEffect(() => {
    if (!aiConfig || isMultiplayer || localFinished || currentResult || !question) return;
    const accuracy = aiConfig.difficulty === 'easy' ? 0.6 : aiConfig.difficulty === 'hard' || aiConfig.difficulty === 'extreme' ? 0.9 : 0.75;
    const delay = aiConfig.difficulty === 'easy' ? 5000 : aiConfig.difficulty === 'extreme' ? 2200 : 3500;
    const timer = window.setTimeout(() => {
      const correct = Math.random() < accuracy;
      setAiScore((score) => score + (correct ? 100 + timeLeft * 5 : 0));
      setAiStreak((streak) => correct ? streak + 1 : 0);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [aiConfig, isMultiplayer, localFinished, currentResult, question, timeLeft]);

  useEffect(() => {
    if (localFinished && user) {
      updateStats({ gamesPlayed: 1, wins: localScore >= aiScore ? 1 : 0, losses: localScore < aiScore ? 1 : 0, totalScore: localScore }, localScore >= aiScore, 'Bugtong-Bugtong');
    }
  }, [localFinished]);

  const submitAnswer = (index: number) => {
    if (!question || currentResult) return;
    if (isMultiplayer) {
      socket.emit('bugtong:answer', { optionIndex: index });
      setSelectedAnswer(index >= 0 ? index : null);
      return;
    }
    const localQuestion = currentLocalQuestion;
    if (!localQuestion) return;
    const correct = index === localQuestion.correctIndex;
    const points = correct ? 100 + timeLeft * 5 + (localStreak > 0 ? localStreak * 20 : 0) : 0;
    setAnswerResult({ correct, correctIndex: localQuestion.correctIndex, points });
    setLocalScore((score) => score + points);
    setLocalStreak((streak) => correct ? streak + 1 : 0);
    setSelectedAnswer(index >= 0 ? index : null);
  };

  const submitTypedAnswer = (event: React.FormEvent) => {
    event.preventDefault();
    const index = LETTERS.indexOf(typedAnswer.trim().toUpperCase());
    if (index >= 0) submitAnswer(index);
  };

  const advanceLocal = () => {
    if (localIndex >= localQuestions.length - 1) setLocalFinished(true);
    else {
      setLocalIndex((index) => index + 1);
      setTimeLeft(ROUND_SECONDS);
      setAnswerResult(null);
      setSelectedAnswer(null);
      setTypedAnswer('');
    }
  };

  const resetLocal = () => {
    setLocalQuestions(shuffleQuestions());
    setLocalIndex(0);
    setLocalScore(0);
    setAiScore(0);
    setLocalStreak(0);
    setAiStreak(0);
    setLocalFinished(false);
    setAnswerResult(null);
    setSelectedAnswer(null);
    setTypedAnswer('');
    setTimeLeft(ROUND_SECONDS);
  };

  const restartRoom = () => socket.emit('bugtong:rematch');
  const answerOptions = useMemo(() => question?.options || [], [question]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-4xl space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-amber-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3"><button type="button" onClick={onBackToHub} className="rounded-xl bg-slate-100 p-2.5 dark:bg-slate-800" title="Back"><ArrowLeft className="h-4 w-4" /></button><div><h2 className="text-lg font-black">Bugtong-Bugtong</h2><p className="text-xs text-slate-500">Filipino classic riddles • type A, B, C, or D</p></div></div>
        <div className="flex items-center gap-3 text-xs font-black"><span className="flex items-center gap-1 text-amber-500"><Clock className="h-4 w-4" /> {timeLeft}s</span><span className="text-indigo-500">{displayScore} pts</span></div>
      </header>

      <main className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50 p-4 shadow-xl dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-rose-950/20 sm:p-7">
        <div className="mb-5 flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400"><span className="flex items-center gap-2"><Brain className="h-4 w-4 text-amber-500" /> {question?.category || 'Loading'}</span><span>Round {totalRounds ? currentRound + 1 : 0} / {totalRounds || 15}</span></div>
        <h1 className="min-h-24 text-center text-xl font-black leading-relaxed text-slate-900 dark:text-white sm:text-3xl">{question?.question || 'Inihahanda ang bugtong...'}</h1>
        <div className="mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
          {answerOptions.map((option, index) => {
            const isCorrect = currentResult?.correctIndex === index;
            const isSelected = selectedAnswer === index;
            return <button key={option} type="button" disabled={Boolean(currentResult)} onClick={() => submitAnswer(index)} className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 p-3 text-left text-sm font-bold transition-all ${isCorrect ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : isSelected && currentResult ? 'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300' : 'border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-amber-400'}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-black dark:bg-slate-800">{LETTERS[index]}</span><span>{option}</span></button>;
          })}
        </div>
        <form onSubmit={submitTypedAnswer} className="mx-auto mt-5 flex max-w-sm gap-2"><input value={typedAnswer} onChange={(event) => setTypedAnswer(event.target.value.slice(0, 1).toUpperCase())} maxLength={1} disabled={Boolean(currentResult)} placeholder="Type A, B, C, or D" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-center font-black uppercase outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900" /><button type="submit" disabled={Boolean(currentResult)} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-white disabled:opacity-50">Submit</button></form>
        {currentResult && <div className={`mx-auto mt-5 flex max-w-xl items-center justify-center gap-2 rounded-2xl p-3 text-sm font-black ${currentResult.correct ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'}`}>{currentResult.correct ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />} {currentResult.correct ? `Tama! +${currentResult.points} puntos` : `Sagot: ${answerOptions[currentResult.correctIndex]}`}</div>}
        {!isMultiplayer && currentResult && !localFinished && <button type="button" onClick={advanceLocal} className="mx-auto mt-4 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white dark:bg-white dark:text-slate-900">Next Bugtong <RotateCcw className="h-4 w-4" /></button>}
        {localFinished && <div className="mt-5 space-y-3 text-center"><Trophy className="mx-auto h-10 w-10 text-amber-500" /><h3 className="text-2xl font-black">{localScore >= aiScore ? 'Panalo ka!' : 'Mas mabilis ang AI!'}</h3><p className="text-sm text-slate-500">You {localScore} pts • AI {aiScore} pts</p><button type="button" onClick={resetLocal} className="mx-auto flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-white"><RotateCcw className="h-4 w-4" /> Shuffle Rematch</button></div>}
      </main>

      {isMultiplayer && <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-black"><Trophy className="h-4 w-4 text-amber-500" /> Live Players</h3><span className="text-xs text-slate-500">{roomBanner}</span></div><div className="grid gap-2 sm:grid-cols-2">{roomLeaderboard.map((entry) => <div key={entry.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800"><span className="font-bold">{entry.name}{entry.hasAnswered ? ' ✓' : ''}</span><strong>{entry.score}</strong></div>)}</div>{roomStatus === 'game_over' && <button type="button" onClick={restartRoom} className="mt-4 flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-white"><Flame className="h-4 w-4" /> Rematch</button>}</section>}
    </motion.div>
  );
};
