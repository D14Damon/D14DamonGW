import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, Image as ImageIcon, RotateCcw, Trophy, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { getSocket } from '../../services/socket';

interface FourPicsOneWordProps {
  onBackToHub: () => void;
}

interface Puzzle {
  id: string;
  images: [string, string, string, string];
  hint: string;
}

interface PlayerScore {
  id: string;
  name: string;
  avatar: string;
  score: number;
  hasAnswered: boolean;
}

export const FourPicsOneWord: React.FC<FourPicsOneWordProps> = ({ onBackToHub }) => {
  const { gameState: roomState } = useGame();
  const { user, updateStats } = useAuth();
  const socket = getSocket();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [round, setRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(10);
  const [timeLeft, setTimeLeft] = useState(25);
  const [activeAnswererId, setActiveAnswererId] = useState<string | null>(null);
  const [status, setStatus] = useState<'playing' | 'round_end' | 'game_over'>('playing');
  const [leaderboard, setLeaderboard] = useState<PlayerScore[]>([]);
  const [banner, setBanner] = useState('');
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<{ correct: boolean; points: number; message: string } | null>(null);
  const hasRecordedResult = useRef(false);
  const currentPlayerId = user?.id;
  const isSelectedAnswerer = !activeAnswererId || activeAnswererId === currentPlayerId;

  useEffect(() => {
    socket.emit('fourpics:get_state');
    const handleState = (data: { currentIndex: number; totalRounds: number; puzzle: Puzzle; timeLeft: number; activeAnswererId: string | null; status: 'playing' | 'round_end' | 'game_over'; leaderboard: PlayerScore[]; banner?: string }) => {
      setPuzzle(data.puzzle);
      setRound(data.currentIndex);
      setTotalRounds(data.totalRounds);
      setTimeLeft(data.timeLeft);
      setActiveAnswererId(data.activeAnswererId);
      setStatus(data.status);
      setLeaderboard(data.leaderboard || []);
      setBanner(data.banner || '');
      if (data.status === 'playing') {
        hasRecordedResult.current = false;
        setAnswer('');
        setResult(null);
      }
    };
    const handleTick = ({ timeLeft: nextTime }: { timeLeft: number }) => setTimeLeft(nextTime);
    const handleResult = (data: { correct: boolean; points: number; message: string }) => setResult(data);
    socket.on('fourpics:state', handleState);
    socket.on('fourpics:tick', handleTick);
    socket.on('fourpics:answer_result', handleResult);
    return () => {
      socket.off('fourpics:state', handleState);
      socket.off('fourpics:tick', handleTick);
      socket.off('fourpics:answer_result', handleResult);
    };
  }, []);

  useEffect(() => {
    if (status !== 'game_over' || !user || hasRecordedResult.current) return;
    hasRecordedResult.current = true;
    const ownScore = leaderboard.find((player) => player.id === user.id)?.score || 0;
    const topScore = leaderboard[0]?.score || 0;
    updateStats({
      gamesPlayed: 1,
      wins: ownScore === topScore && topScore > 0 ? 1 : 0,
      losses: ownScore === topScore && topScore > 0 ? 0 : 1,
      totalScore: ownScore,
      wordsGuessed: Math.floor(ownScore / 10),
    }, ownScore === topScore && topScore > 0, '4 Pics 1 Word');
  }, [status, leaderboard, user, updateStats]);

  const submitAnswer = (event: React.FormEvent) => {
    event.preventDefault();
    if (!answer.trim() || status !== 'playing' || result || !isSelectedAnswerer) return;
    socket.emit('fourpics:answer', { answer });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-5xl space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-cyan-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3"><button type="button" onClick={onBackToHub} className="rounded-xl bg-slate-100 p-2.5 dark:bg-slate-800" title="Back"><ArrowLeft className="h-4 w-4" /></button><div><h2 className="text-lg font-black">4 Pics 1 Word</h2><p className="text-xs text-slate-500">One shared puzzle for everyone • 10 rounds</p></div></div>
        <div className="flex items-center gap-3 text-xs font-black"><span className="flex items-center gap-1 text-cyan-600"><Clock className="h-4 w-4" /> {timeLeft}s</span><span>Round {round + 1}/{totalRounds}</span></div>
      </header>

      <main className="rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-4 shadow-xl dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-cyan-950/20 sm:p-7">
        <div className="mb-5 flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400"><span className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-cyan-500" /> Guess the word</span><span>{banner}</span></div>
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:gap-4">{puzzle?.images.map((image, index) => <div key={`${puzzle.id}-${index}`} className="aspect-[4/3] overflow-hidden rounded-2xl border-4 border-white bg-slate-200 shadow-lg dark:border-slate-800"><img src={image} alt={`Clue ${index + 1}`} className="h-full w-full object-cover" loading="eager" /></div>)}</div>
        <p className="mt-5 text-center text-sm font-bold text-slate-500">Hint: {puzzle?.hint || 'Loading puzzle...'}</p>
        <form onSubmit={submitAnswer} className="mx-auto mt-4 flex max-w-md gap-2"><input value={answer} onChange={(event) => setAnswer(event.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())} disabled={Boolean(result) || status !== 'playing' || !isSelectedAnswerer} placeholder={isSelectedAnswerer ? 'Type the word' : 'Selected teammate is answering'} className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-3 text-center font-black uppercase outline-none focus:border-cyan-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900" /><button type="submit" disabled={!answer.trim() || Boolean(result) || status !== 'playing' || !isSelectedAnswerer} className="rounded-xl bg-cyan-600 px-5 py-3 text-xs font-black text-white disabled:opacity-50">Submit</button></form>
        {activeAnswererId && <p className="mt-3 text-center text-xs font-bold text-amber-600">This team round is answered by the selected teammate.</p>}
        {result && <div className={`mx-auto mt-5 flex max-w-md items-center justify-center gap-2 rounded-2xl p-3 text-sm font-black ${result.correct ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'}`}>{result.correct ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />} {result.correct ? 'Correct! Answer recorded. Points are awarded after the game.' : result.message}</div>}
        {status === 'game_over' && <div className="mt-6 text-center"><Trophy className="mx-auto h-10 w-10 text-amber-500" /><h3 className="mt-2 text-2xl font-black">Game Complete</h3><button type="button" onClick={() => socket.emit('fourpics:rematch')} className="mx-auto mt-4 flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-black text-white"><RotateCcw className="h-4 w-4" /> Rematch</button></div>}
      </main>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-black">Live Scores</h3><span className="text-xs text-slate-500">Most correct answers wins</span></div><div className="grid gap-2 sm:grid-cols-2">{leaderboard.map((player) => <div key={player.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800"><span className="font-bold">{player.name}{player.hasAnswered ? ' ✓' : ''}</span><strong>{player.score}</strong></div>)}</div></section>
    </motion.div>
  );
};
