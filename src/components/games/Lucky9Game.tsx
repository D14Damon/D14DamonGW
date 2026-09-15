import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Trophy,
  Coins,
  ShieldCheck,
  HelpCircle,
  Volume2,
  VolumeX,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Crown,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { soundManager } from '../../utils/soundEffects';
import { AvatarRenderer } from '../AvatarRenderer';
import { AiGameConfig } from '../VsAiArena';
import { getSocket } from '../../services/socket';
import { Lucky9Card, Lucky9Suit, Lucky9RoundStatus, Lucky9PlayerState } from '../../types';

interface Lucky9GameProps {
  onBackToHub: () => void;
  aiConfig?: AiGameConfig | null;
}

const SUIT_SYMBOLS: Record<Lucky9Suit, { symbol: string; color: string }> = {
  spades: { symbol: '♠', color: 'text-slate-900 dark:text-slate-100' },
  hearts: { symbol: '♥', color: 'text-rose-600' },
  clubs: { symbol: '♣', color: 'text-slate-900 dark:text-slate-100' },
  diamonds: { symbol: '♦', color: 'text-blue-600' },
};

const DEFAULT_COINS = 25000;
const CHIP_VALUES = [500, 1000, 2500, 5000, 10000];

// Generate standard 52-card deck
const create52Deck = (): Lucky9Card[] => {
  const suits: Lucky9Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Lucky9Card[] = [];

  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      let value = 0;
      if (rank === 'A') value = 1;
      else if (['10', 'J', 'Q', 'K'].includes(rank)) value = 0;
      else value = parseInt(rank, 10);

      deck.push({
        id: `${suit}_${rank}_${Math.random()}`,
        suit,
        rank,
        value,
      });
    });
  });

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};

// Calculate Lucky 9 hand value: sum mod 10
export const calculateLucky9Score = (cards: Lucky9Card[]): number => {
  const total = cards.reduce((sum, c) => sum + c.value, 0);
  return total % 10;
};

// Check for Natural on 2 cards
export const checkNatural = (cards: Lucky9Card[]): 'natural_9' | 'natural_8' | null => {
  if (cards.length !== 2) return null;
  const score = calculateLucky9Score(cards);
  if (score === 9) return 'natural_9';
  if (score === 8) return 'natural_8';
  return null;
};

export const Lucky9Game: React.FC<Lucky9GameProps> = ({ onBackToHub, aiConfig }) => {
  const { user, updateStats } = useAuth();
  const { gameState: roomGameState } = useGame();

  const isMultiplayerRoom = Boolean(roomGameState && roomGameState.roomId);
  const localPlayerId = user?.id || 'player_1';
  const localPlayerName = user?.username || 'Player 1';
  const localPlayerAvatar = user?.avatar || 'avatar_classic_cat';
  const localPlayerColor = user?.color || '#4F46E5';

  // Persistent 25,000 Starting Lucky 9 Coins Wallet
  const [playerCoins, setPlayerCoins] = useState<number>(() => {
    const saved = localStorage.getItem('lucky9_coins_balance');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      return !isNaN(parsed) && parsed >= 0 ? parsed : 0;
    }
    localStorage.setItem('lucky9_coins_balance', DEFAULT_COINS.toString());
    return DEFAULT_COINS;
  });

  // Track Opponent's Coins (Bot in Solo/AI, or remote player in multiplayer)
  const [opponentCoins, setOpponentCoins] = useState<number>(() => {
    const saved = localStorage.getItem('lucky9_opponent_coins');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      return !isNaN(parsed) && parsed >= 0 ? parsed : DEFAULT_COINS;
    }
    return DEFAULT_COINS;
  });

  const [currentBet, setCurrentBet] = useState<number>(1000);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [status, setStatus] = useState<Lucky9RoundStatus>('betting');
  const [bankerMessage, setBankerMessage] = useState<string>(
    'Welcome to Lucky 9 1v1! Stakes are live: the loser forfeits their bet to the winner. Place your bet to begin!'
  );
  const [actionBanner, setActionBanner] = useState<string | null>(null);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(() => soundManager.getMuted());

  // Deck & Card Hands
  const deckRef = useRef<Lucky9Card[]>([]);
  const [playerCards, setPlayerCards] = useState<Lucky9Card[]>([]);
  const [opponentCards, setOpponentCards] = useState<Lucky9Card[]>([]);
  const [pot, setPot] = useState<number>(0);
  const [roundWinner, setRoundWinner] = useState<'player' | 'opponent' | 'tie' | null>(null);
  const [verdictReason, setVerdictReason] = useState<string>('');
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);

  // Opponent config & live bet tracking
  const [remoteOpponentName, setRemoteOpponentName] = useState<string>('');
  const [remoteOpponentAvatar, setRemoteOpponentAvatar] = useState<string>('');
  const [opponentBet, setOpponentBet] = useState<number>(1000);

  // Opponent config (Bot in Solo/AI, or remote player in multiplayer)
  const opponentName = useMemo(() => {
    if (remoteOpponentName) return remoteOpponentName;
    if (isMultiplayerRoom && roomGameState) {
      const other = roomGameState.players.find((p) => p.id !== localPlayerId);
      return other ? other.username : 'Opponent';
    }
    if (aiConfig) {
      return `AI Bot (${aiConfig.difficulty.toUpperCase()})`;
    }
    return 'D14 Bot';
  }, [remoteOpponentName, isMultiplayerRoom, roomGameState, localPlayerId, aiConfig]);

  const opponentAvatar = useMemo(() => {
    if (remoteOpponentAvatar) return remoteOpponentAvatar;
    if (isMultiplayerRoom && roomGameState) {
      const other = roomGameState.players.find((p) => p.id !== localPlayerId);
      return other ? other.avatar : 'avatar_neon_bot';
    }
    return 'avatar_cyber_fox';
  }, [remoteOpponentAvatar, isMultiplayerRoom, roomGameState, localPlayerId]);

  // Scores
  const playerScore = useMemo(() => calculateLucky9Score(playerCards), [playerCards]);
  const opponentScore = useMemo(() => calculateLucky9Score(opponentCards), [opponentCards]);

  // Save player coins locally
  useEffect(() => {
    localStorage.setItem('lucky9_coins_balance', playerCoins.toString());
  }, [playerCoins]);

  // Save opponent coins locally for Solo/AI mode
  useEffect(() => {
    if (!isMultiplayerRoom) {
      localStorage.setItem('lucky9_opponent_coins', opponentCoins.toString());
    }
  }, [opponentCoins, isMultiplayerRoom]);

  // Sound toggle
  const toggleMute = () => {
    const isNowMuted = soundManager.toggleMute();
    setSoundMuted(isNowMuted);
  };

  const triggerBanner = (msg: string) => {
    setActionBanner(msg);
    setTimeout(() => {
      setActionBanner(null);
    }, 2800);
  };

  // ==========================================
  // MULTIPLAYER SOCKET INTEGRATION (if in room)
  // ==========================================
  useEffect(() => {
    if (!isMultiplayerRoom) return;
    const socket = getSocket();

    socket.emit('lucky9:join_game');

    socket.on('lucky9:state', (data: any) => {
      if (data.status) setStatus(data.status);
      if (data.bankerMessage) setBankerMessage(data.bankerMessage);
      if (data.pot !== undefined) setPot(data.pot);
      if (data.roundNumber !== undefined) setRoundNumber(data.roundNumber);
      if (data.currentTurnPlayerId !== undefined) setCurrentTurnPlayerId(data.currentTurnPlayerId);
      if (data.actionBanner) triggerBanner(data.actionBanner);

      const me = data.players?.find((p: any) => p.id === localPlayerId);
      const opp = data.players?.find((p: any) => p.id !== localPlayerId);

      if (me) {
        setPlayerCards(me.cards || []);
        if (me.coins !== undefined) setPlayerCoins(me.coins);
        if (me.bet !== undefined) setCurrentBet(me.bet);
      }
      if (opp) {
        setOpponentCards(opp.cards || []);
        if (opp.coins !== undefined) setOpponentCoins(opp.coins);
        if (opp.bet !== undefined) setOpponentBet(opp.bet);
        if (opp.name) setRemoteOpponentName(opp.name);
        if (opp.avatar) setRemoteOpponentAvatar(opp.avatar);
      }

      if (data.winner) {
        setRoundWinner(data.winner === localPlayerId ? 'player' : data.winner === 'tie' ? 'tie' : 'opponent');
        setVerdictReason(data.winnerReason || '');
        if (data.winner === localPlayerId) {
          soundManager.playVictory();
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } else if (data.winner === 'tie') {
          soundManager.playTick();
        } else {
          soundManager.playWrong();
        }
      }
    });

    return () => {
      socket.off('lucky9:state');
    };
  }, [isMultiplayerRoom, localPlayerId]);

  // ==========================================
  // LOCAL VS AI / SOLO GAME ENGINE
  // ==========================================
  const startDealingPhase = () => {
    if (playerCoins <= 0) {
      soundManager.playWrong();
      triggerBanner('You have 0 coins left! You lost your coins in battle.');
      return;
    }

    if (playerCoins < currentBet) {
      soundManager.playWrong();
      triggerBanner(`Insufficient coins. Your balance is ${playerCoins.toLocaleString()} coins.`);
      return;
    }

    if (isMultiplayerRoom) {
      soundManager.playCardPlay();
      const socket = getSocket();
      socket.emit('lucky9:deal');
      return;
    }

    const matchBet = Math.min(currentBet, playerCoins);

    // Deduct bet from both players into the pot
    soundManager.playCardPlay();
    setPlayerCoins((prev) => Math.max(0, prev - matchBet));
    setOpponentCoins((prev) => Math.max(0, prev - matchBet));
    setOpponentBet(matchBet);
    const roundPot = matchBet * 2;
    setPot(roundPot);
    setStatus('dealing');
    setRoundWinner(null);
    setVerdictReason('');
    setBankerMessage(`Banker: Bets placed! Both players stake ${matchBet.toLocaleString()} coins (Pot: ${roundPot.toLocaleString()}). Loser will forfeit their bet!`);

    const freshDeck = create52Deck();
    deckRef.current = freshDeck;

    // Deal 2 cards to Player, 2 cards to Opponent
    const pCards = [deckRef.current.pop()!, deckRef.current.pop()!];
    const oCards = [deckRef.current.pop()!, deckRef.current.pop()!];

    setTimeout(() => {
      soundManager.playCardDraw();
      setPlayerCards([pCards[0]]);
      setOpponentCards([{ ...oCards[0], isRevealed: false }]);
    }, 400);

    setTimeout(() => {
      soundManager.playCardDraw();
      setPlayerCards(pCards);
      setOpponentCards([
        { ...oCards[0], isRevealed: false },
        { ...oCards[1], isRevealed: false },
      ]);
    }, 900);

    // Natural check after initial deal
    setTimeout(() => {
      evaluateNaturals(pCards, oCards, roundPot);
    }, 1500);
  };

  // Check for Natural 9 or Natural 8
  const evaluateNaturals = (pCards: Lucky9Card[], oCards: Lucky9Card[], totalPot: number) => {
    const pNat = checkNatural(pCards);
    const oNat = checkNatural(oCards);

    // Reveal opponent cards if a Natural occurs
    if (pNat || oNat) {
      setOpponentCards(oCards.map((c) => ({ ...c, isRevealed: true })));
      setStatus('round_over');

      if (pNat === 'natural_9' && oNat === 'natural_9') {
        // Tie Naturals
        soundManager.playTick();
        setRoundWinner('tie');
        setVerdictReason('Both players dealt Natural 9! It is a Push (Tie).');
        setBankerMessage('Banker: Miraculous! Both dealt Natural 9! Bets are refunded.');
        const refund = Math.floor(totalPot / 2);
        setPlayerCoins((prev) => prev + refund);
        setOpponentCoins((prev) => prev + refund);
      } else if (pNat === 'natural_9') {
        // Player Natural 9
        soundManager.playVictory();
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        setRoundWinner('player');
        setVerdictReason('Player dealt Natural 9! Automatic instant win!');
        const wonCoins = Math.floor(totalPot / 2);
        setBankerMessage(`Banker: Lucky 9! Player wins ${wonCoins.toLocaleString()} coins from ${opponentName} with Natural 9!`);
        setPlayerCoins((prev) => prev + totalPot);
        updateStats({ gamesPlayed: 1, wins: 1, lucky9Wins: 1, totalScore: wonCoins }, true);
      } else if (oNat === 'natural_9') {
        // Opponent Natural 9
        soundManager.playWrong();
        setRoundWinner('opponent');
        setVerdictReason(`${opponentName} dealt Natural 9! Automatic win.`);
        const lostCoins = Math.floor(totalPot / 2);
        setBankerMessage(`Banker: ${opponentName} dealt Natural 9! ${opponentName} takes your ${lostCoins.toLocaleString()} coins.`);
        setOpponentCoins((prev) => prev + totalPot);
        updateStats({ gamesPlayed: 1, totalScore: 0 }, false);
      } else if (pNat === 'natural_8' && oNat === 'natural_8') {
        // Tie Natural 8
        soundManager.playTick();
        setRoundWinner('tie');
        setVerdictReason('Both players dealt Natural 8! Push (Tie).');
        setBankerMessage('Banker: Both players hold Natural 8. It is a draw! Bets returned.');
        const refund = Math.floor(totalPot / 2);
        setPlayerCoins((prev) => prev + refund);
        setOpponentCoins((prev) => prev + refund);
      } else if (pNat === 'natural_8') {
        // Player Natural 8
        soundManager.playVictory();
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        setRoundWinner('player');
        setVerdictReason('Player wins with Natural 8!');
        const wonCoins = Math.floor(totalPot / 2);
        setBankerMessage(`Banker: Player stands on Natural 8! Won ${wonCoins.toLocaleString()} coins from ${opponentName}!`);
        setPlayerCoins((prev) => prev + totalPot);
        updateStats({ gamesPlayed: 1, wins: 1, lucky9Wins: 1, totalScore: wonCoins }, true);
      } else if (oNat === 'natural_8') {
        // Opponent Natural 8
        soundManager.playWrong();
        setRoundWinner('opponent');
        setVerdictReason(`${opponentName} wins with Natural 8.`);
        const lostCoins = Math.floor(totalPot / 2);
        setBankerMessage(`Banker: ${opponentName} holds Natural 8 and claims your ${lostCoins.toLocaleString()} coins.`);
        setOpponentCoins((prev) => prev + totalPot);
        updateStats({ gamesPlayed: 1, totalScore: 0 }, false);
      }
      return;
    }

    // No Naturals: Proceed to Drawing Phase
    // Player Acts First
    const pScore = calculateLucky9Score(pCards);
    setStatus('player_turn');

    if (pScore <= 4) {
      setBankerMessage(`Banker: Player total is ${pScore} (0-4). Official rule: You MUST Hit (Draw 3rd Card).`);
    } else if (pScore === 5) {
      setBankerMessage(`Banker: Player total is 5. Neutral rule: You may choose to Hit or Stand.`);
    } else {
      setBankerMessage(`Banker: Player total is ${pScore} (6-7). Official rule: You MUST Stand.`);
      setTimeout(() => {
        handlePlayerStand(pCards, oCards, totalPot);
      }, 1400);
    }
  };

  // Player Hits (Draws 3rd card)
  const handlePlayerHit = () => {
    if (playerCards.length >= 3) return;
    soundManager.playCardDraw();

    if (isMultiplayerRoom) {
      const socket = getSocket();
      socket.emit('lucky9:hit');
      return;
    }

    const drawn = deckRef.current.pop()!;
    const newPCards = [...playerCards, drawn];
    setPlayerCards(newPCards);

    const newScore = calculateLucky9Score(newPCards);
    triggerBanner(`Drew ${drawn.rank} of ${drawn.suit} -> Total: ${newScore}!`);
    setBankerMessage(`Banker: Player drew a 3rd card! Final total is ${newScore}. Now ${opponentName}'s turn.`);

    setTimeout(() => {
      executeOpponentTurn(newPCards, opponentCards, pot);
    }, 1500);
  };

  // Player Stands
  const handlePlayerStand = (
    currentP = playerCards,
    currentO = opponentCards,
    currentPot = pot
  ) => {
    soundManager.playTick();
    if (isMultiplayerRoom) {
      const socket = getSocket();
      socket.emit('lucky9:stand');
      return;
    }
    const curScore = calculateLucky9Score(currentP);
    triggerBanner(`You stand with ${curScore} points.`);
    setBankerMessage(`Banker: Player stands on ${curScore} points. Opponent's turn to act.`);

    setTimeout(() => {
      executeOpponentTurn(currentP, currentO, currentPot);
    }, 1200);
  };

  // Opponent (AI) Turn
  const executeOpponentTurn = (
    finalPCards: Lucky9Card[],
    curOCards: Lucky9Card[],
    currentPot: number
  ) => {
    setStatus('opponent_turn');
    const oScore = calculateLucky9Score(curOCards);

    // AI Third Card Logic according to authentic Lucky 9 rules:
    // 0-4: Must Hit
    // 5: Hit if player has high score or smart decision, Stand if moderate
    // 6-7: Must Stand
    let willHit = false;
    if (oScore <= 4) {
      willHit = true;
    } else if (oScore === 5) {
      // If AI knows player has high score or by difficulty
      willHit = Math.random() > 0.4;
    } else {
      willHit = false;
    }

    if (willHit && curOCards.length < 3) {
      setBankerMessage(`Banker: ${opponentName} holds ${oScore} points. Opponent draws a 3rd card...`);
      setTimeout(() => {
        soundManager.playCardDraw();
        const oDrawn = deckRef.current.pop()!;
        const updatedOCards = [...curOCards, { ...oDrawn, isRevealed: false }];
        setOpponentCards(updatedOCards);
        triggerBanner(`${opponentName} drew a 3rd card.`);

        setTimeout(() => {
          finalizeShowdown(finalPCards, updatedOCards, currentPot);
        }, 1200);
      }, 1100);
    } else {
      setBankerMessage(`Banker: ${opponentName} stands with 2 cards. Proceeding to showdown!`);
      setTimeout(() => {
        finalizeShowdown(finalPCards, curOCards, currentPot);
      }, 1100);
    }
  };

  // Showdown & Banker Verdict
  const finalizeShowdown = (
    pFinalCards: Lucky9Card[],
    oFinalCards: Lucky9Card[],
    currentPot: number
  ) => {
    setStatus('evaluating');
    soundManager.playCardPlay();

    // Reveal opponent cards
    const revealedOpponent = oFinalCards.map((c) => ({ ...c, isRevealed: true }));
    setOpponentCards(revealedOpponent);

    const finalP = calculateLucky9Score(pFinalCards);
    const finalO = calculateLucky9Score(revealedOpponent);

    setTimeout(() => {
      setStatus('round_over');

      const matchBet = Math.floor(currentPot / 2);
      if (finalP > finalO) {
        // Player wins
        soundManager.playVictory();
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        setRoundWinner('player');
        setVerdictReason(`Player score ${finalP} beats ${opponentName}'s score ${finalO}!`);
        setBankerMessage(
          `Banker: Official verdict: Player (${finalP} pts) beats Opponent (${finalO} pts). Won ${matchBet.toLocaleString()} coins from ${opponentName}!`
        );
        setPlayerCoins((prev) => prev + currentPot);
        updateStats({ gamesPlayed: 1, wins: 1, lucky9Wins: 1, totalScore: matchBet }, true);
      } else if (finalO > finalP) {
        // Opponent wins
        soundManager.playWrong();
        setRoundWinner('opponent');
        setVerdictReason(`${opponentName} score ${finalO} beats Player's score ${finalP}.`);
        setBankerMessage(
          `Banker: Official verdict: Opponent (${finalO} pts) beats Player (${finalP} pts). Opponent claims your ${matchBet.toLocaleString()} coins.`
        );
        setOpponentCoins((prev) => prev + currentPot);
        updateStats({ gamesPlayed: 1, totalScore: 0 }, false);
      } else {
        // Tie / Push
        soundManager.playTick();
        setRoundWinner('tie');
        setVerdictReason(`Push! Both players tied at ${finalP} points.`);
        setBankerMessage(
          `Banker: Perfect standoff! Both players scored ${finalP} points. Bets are refunded.`
        );
        setPlayerCoins((prev) => prev + matchBet);
        setOpponentCoins((prev) => prev + matchBet);
      }
    }, 1300);
  };

  // Restart next hand
  const handleNextHand = () => {
    soundManager.playTick();
    if (isMultiplayerRoom) {
      const socket = getSocket();
      socket.emit('lucky9:new_round');
      return;
    }
    setRoundNumber((prev) => prev + 1);
    setPlayerCards([]);
    setOpponentCards([]);
    setPot(0);
    setRoundWinner(null);
    setVerdictReason('');
    setStatus('betting');
    setBankerMessage('Banker: New round ready! Place your coins and click Deal Cards.');
  };

  // Card Rendering Component
  const renderCard = (card: Lucky9Card, isHidden: boolean = false) => {
    if (isHidden) {
      return (
        <motion.div
          initial={{ rotateY: 180, scale: 0.8 }}
          animate={{ rotateY: 0, scale: 1 }}
          className="w-20 sm:w-24 h-28 sm:h-36 rounded-2xl bg-gradient-to-br from-indigo-900 via-blue-950 to-slate-950 border-2 border-indigo-400/40 shadow-xl flex items-center justify-center relative overflow-hidden select-none"
        >
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-300 via-indigo-500 to-transparent" />
          <div className="w-12 h-16 rounded-xl border border-indigo-300/30 flex items-center justify-center">
            <span className="font-serif font-black text-amber-400 text-lg tracking-wider">L9</span>
          </div>
        </motion.div>
      );
    }

    const suitInfo = SUIT_SYMBOLS[card.suit];

    return (
      <motion.div
        initial={{ y: -20, opacity: 0, scale: 0.85 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="w-20 sm:w-24 h-28 sm:h-36 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-xl flex flex-col justify-between p-2 select-none relative overflow-hidden hover:scale-105 transition-transform"
      >
        <div className="flex items-center justify-between">
          <div className={`font-black text-sm sm:text-base leading-none ${suitInfo.color}`}>
            {card.rank}
          </div>
          <span className={`text-xs sm:text-sm ${suitInfo.color}`}>{suitInfo.symbol}</span>
        </div>

        {/* Center Big Suit */}
        <div className="flex flex-col items-center justify-center my-auto">
          <span className={`text-2xl sm:text-3xl font-black ${suitInfo.color}`}>
            {suitInfo.symbol}
          </span>
          <span className="text-[10px] font-mono text-slate-400 font-bold">
            {card.value} {card.value === 1 ? 'pt' : 'pts'}
          </span>
        </div>

        {/* Bottom inverted */}
        <div className="flex items-center justify-between rotate-180">
          <div className={`font-black text-sm sm:text-base leading-none ${suitInfo.color}`}>
            {card.rank}
          </div>
          <span className={`text-xs sm:text-sm ${suitInfo.color}`}>{suitInfo.symbol}</span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-[calc(100vh-80px)] w-full max-w-6xl mx-auto px-2 sm:px-4 py-2 relative">
      {/* Action Notification Banner */}
      <AnimatePresence>
        {actionBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-sm shadow-2xl flex items-center gap-2 border-2 border-amber-300"
          >
            <Sparkles className="w-4 h-4" />
            <span>{actionBanner}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules Modal */}
      <AnimatePresence>
        {showRulesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">
                    Official Lucky 9 Rules (1v1)
                  </h3>
                </div>
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs sm:text-sm space-y-2.5 text-slate-600 dark:text-slate-300 max-h-96 overflow-y-auto pr-1">
                <p>
                  <strong>Goal:</strong> Form a hand whose cards sum modulo 10 is as close to 9 as possible. Highest score (0 to 9) wins!
                </p>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                  <div className="font-bold text-amber-600 dark:text-amber-400">Card Point Values:</div>
                  <div>• Ace = 1 Point</div>
                  <div>• 2 through 9 = Face Value (2 to 9 points)</div>
                  <div>• 10, Jack, Queen, King = 0 Points</div>
                  <div className="text-[11px] text-slate-400 italic">Example: 7 + 8 = 15 ➔ Score is 5.</div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-500/20 space-y-1">
                  <div className="font-bold text-amber-600 dark:text-amber-400">Natural Wins (2 Cards):</div>
                  <div>• <strong>Natural 9:</strong> 9 points on first 2 cards. Automatic top win!</div>
                  <div>• <strong>Natural 8:</strong> 8 points on first 2 cards. Beats all except Natural 9.</div>
                </div>

                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-500/20 space-y-1">
                  <div className="font-bold text-indigo-600 dark:text-indigo-400">3rd Card Draw Rules:</div>
                  <div>• <strong>0 to 4 points:</strong> Player MUST Hit (Draw 3rd card).</div>
                  <div>• <strong>5 points:</strong> Player choice to Hit or Stand.</div>
                  <div>• <strong>6 to 7 points:</strong> Player MUST Stand (No card drawn).</div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 space-y-1">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">Battle Stakes & Coin Transfer:</div>
                  <div>• Every player starts with <strong>25,000 Free Coins</strong>.</div>
                  <div>• No instant refill! Stakes are zero-sum: when you lose, your wager is deducted and transferred directly to the winner.</div>
                  <div>• When you win, the loser's coins are added to your balance.</div>
                </div>
              </div>

              <button
                onClick={() => setShowRulesModal(false)}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg active:scale-98 transition-all"
              >
                Got It, Let's Play!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Controls Bar (Same as UNO layout) */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToHub}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Leave Game</span>
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider border border-amber-500/20">
              Lucky 9 (1v1)
            </span>
            <span className="text-xs font-mono text-slate-500">Round #{roundNumber}</span>
          </div>
        </div>

        {/* Dual-Player In-Match Bankroll Tracker in Header */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2.5 bg-slate-900/90 dark:bg-slate-950/90 border border-amber-500/30 rounded-2xl px-2.5 sm:px-3.5 py-1.5 shadow-md">
            {/* Player 1 (You) */}
            <div className="flex items-center gap-1.5" title={`${localPlayerName} Balance`}>
              <div className="w-5 h-5 rounded-full overflow-hidden border border-amber-400 shrink-0">
                <AvatarRenderer avatar={localPlayerAvatar} className="w-full h-full" />
              </div>
              <div className="flex items-center gap-1 font-mono font-black text-xs sm:text-sm text-amber-400">
                <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{playerCoins.toLocaleString()}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-sans hidden md:inline">You</span>
            </div>

            <span className="text-slate-500 text-[10px] font-black uppercase px-0.5">vs</span>

            {/* Player 2 (Opponent) */}
            <div className="flex items-center gap-1.5" title={`${opponentName} Balance`}>
              <div className="w-5 h-5 rounded-full overflow-hidden border border-indigo-400 shrink-0">
                <AvatarRenderer avatar={opponentAvatar} className="w-full h-full" />
              </div>
              <div className="flex items-center gap-1 font-mono font-black text-xs sm:text-sm text-amber-300">
                <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{opponentCoins.toLocaleString()}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-sans truncate max-w-[65px] sm:max-w-[90px] hidden md:inline">{opponentName}</span>
            </div>
          </div>

          <button
            onClick={() => setShowRulesModal(true)}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="View Rules"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={toggleMute}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={soundMuted ? 'Unmute' : 'Mute'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Table Layout with Felt & Banker on the Side */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Side: THE BANKER (Dealer Station) */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <div className="bg-gradient-to-b from-slate-900 to-indigo-950 rounded-3xl p-4 border-2 border-amber-500/30 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
            {/* Casino Light Header */}
            <div className="w-full flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] tracking-wider uppercase flex items-center gap-1">
                <Crown className="w-3 h-3" />
                The Banker
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3" />
                Fair Play
              </span>
            </div>

            {/* Banker Avatar */}
            <div className="relative my-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 p-1 shadow-2xl animate-pulse">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden border-2 border-amber-300">
                  <AvatarRenderer avatar="avatar_blaze_knight" className="w-16 h-16" />
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] shadow">
                DEALER
              </span>
            </div>

            <div className="text-white font-black text-sm">Don Santiago</div>
            <div className="text-indigo-300 text-[11px] mb-3">Impartial Table Croupier</div>

            {/* Banker Live Dialogue Speech Bubble */}
            <div className="w-full bg-slate-800/90 rounded-2xl p-3 border border-amber-500/20 text-left relative shadow-inner">
              <div className="text-[10px] font-bold uppercase text-amber-400 mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Banker Announcement:
              </div>
              <p className="text-xs text-slate-100 font-medium leading-relaxed italic">
                "{bankerMessage}"
              </p>
            </div>

            {/* Anti-Cheat Guarantee Badge */}
            <div className="mt-3 pt-2 border-t border-slate-800 w-full flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verifiably Fair • No Cheating</span>
            </div>
          </div>

          {/* Quick Hand Value Cheat Sheet on side */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm hidden lg:block text-xs space-y-1.5">
            <div className="font-black text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              Lucky 9 Logic Rules
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
              <div>• 0 to 4: <span className="font-bold text-amber-600 dark:text-amber-400">Must Hit (Draw 3rd)</span></div>
              <div>• 5 pts: <span className="font-bold text-indigo-600 dark:text-indigo-400">Player Choice</span></div>
              <div>• 6 or 7: <span className="font-bold text-emerald-600 dark:text-emerald-400">Must Stand</span></div>
              <div>• 8 or 9: <span className="font-black text-rose-600 dark:text-rose-400">Instant Natural Win!</span></div>
            </div>
          </div>
        </div>

        {/* Center & Right Table Area (Felt Table for 1v1) */}
        <div className="lg:col-span-9 flex flex-col justify-between bg-radial from-emerald-800 via-emerald-900 to-slate-950 rounded-3xl p-4 sm:p-6 border-4 border-amber-600/40 shadow-2xl relative overflow-hidden min-h-[500px]">
          {/* Table Felt Decorative Patterns */}
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-black" />
          <div className="absolute inset-4 rounded-2xl border-2 border-dashed border-amber-400/20 pointer-events-none" />

          {/* TOP: OPPONENT AREA */}
          <div className="flex flex-col items-center gap-2 z-10">
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-950/85 border border-amber-500/40 backdrop-blur-md text-white shadow-xl">
              <div className="relative">
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-amber-400 shadow">
                  <AvatarRenderer avatar={opponentAvatar} className="w-full h-full" />
                </div>
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-slate-800 text-[8px] font-mono border border-amber-400/50">
                  P2
                </span>
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs sm:text-sm text-slate-100">{opponentName}</span>
                  {status === 'round_over' && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-xs font-black">
                      Total: {opponentScore} {opponentScore === 9 ? '(Lucky 9!)' : opponentScore === 8 ? '(Natural 8)' : ''}
                    </span>
                  )}
                </div>
                {/* Live Coins & Active Wager */}
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono text-xs font-black">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>{opponentCoins.toLocaleString()} COINS</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Wager: <strong className="text-amber-400 font-bold">{opponentBet.toLocaleString()}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Opponent Cards Hand */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 min-h-[110px]">
              {opponentCards.length === 0 ? (
                <div className="text-emerald-300/40 font-mono text-xs italic tracking-wider py-6">
                  [Waiting for cards to be dealt...]
                </div>
              ) : (
                opponentCards.map((card, idx) => (
                  <React.Fragment key={card.id || idx}>
                    {renderCard(card, !card.isRevealed)}
                  </React.Fragment>
                ))
              )}
            </div>
          </div>

          {/* CENTER: THE POT & STATUS DISPLAY */}
          <div className="flex flex-col items-center justify-center my-2 sm:my-3 z-10">
            {/* Real-time Match Stakes & Coin Comparison Bar */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-2 px-3 sm:px-4 py-1.5 rounded-xl bg-slate-950/85 border border-amber-500/30 text-xs font-mono shadow-lg backdrop-blur-xs">
              <div className="flex items-center gap-1.5 text-amber-300">
                <span className="text-slate-400 font-sans text-[11px]">You:</span>
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold">{playerCoins.toLocaleString()}</span>
              </div>
              <div className="h-3 w-px bg-amber-500/30" />
              <div className="flex items-center gap-1 text-[10px] text-amber-400/90 font-sans font-bold uppercase tracking-wider">
                <span>Stakes</span>
              </div>
              <div className="h-3 w-px bg-amber-500/30" />
              <div className="flex items-center gap-1.5 text-amber-300">
                <span className="text-slate-400 font-sans text-[11px] truncate max-w-[80px]">{opponentName}:</span>
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold">{opponentCoins.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-amber-300 font-mono font-black text-sm sm:text-base shadow-xl backdrop-blur-xs">
              <Coins className="w-5 h-5 text-amber-400 animate-bounce" />
              <span>TOTAL POT: {pot > 0 ? pot.toLocaleString() : (currentBet * 2).toLocaleString()} COINS</span>
            </div>

            {/* Round Verdict Overlay */}
            <AnimatePresence>
              {status === 'round_over' && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className={`mt-2 px-6 py-2 rounded-2xl font-black text-sm sm:text-base shadow-2xl border-2 flex items-center gap-2 ${
                    roundWinner === 'player'
                      ? 'bg-emerald-500 text-slate-950 border-white'
                      : roundWinner === 'tie'
                      ? 'bg-blue-500 text-white border-blue-300'
                      : 'bg-rose-600 text-white border-rose-300'
                  }`}
                >
                  <Trophy className="w-5 h-5" />
                  <span>
                    {roundWinner === 'player'
                      ? 'YOU WON THE HAND!'
                      : roundWinner === 'tie'
                      ? 'PUSH! IT IS A TIE!'
                      : `${opponentName.toUpperCase()} WON!`}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {verdictReason && (
              <div className="text-xs text-amber-200/90 font-medium mt-1 bg-black/40 px-3 py-1 rounded-lg">
                {verdictReason}
              </div>
            )}
          </div>

          {/* BOTTOM: LOCAL PLAYER AREA */}
          <div className="flex flex-col items-center gap-2 z-10">
            {/* Player Hand of Cards */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 min-h-[120px]">
              {playerCards.length === 0 ? (
                <div className="text-emerald-300/40 font-mono text-xs italic tracking-wider py-6">
                  [Place your bet below and click "Deal Cards" to begin]
                </div>
              ) : (
                playerCards.map((card) => renderCard(card, false))
              )}
            </div>

            {/* Local Player Info & Score Pill */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-950/85 border border-indigo-500/40 backdrop-blur-md text-white shadow-xl">
              <div className="relative">
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-indigo-400 shadow">
                  <AvatarRenderer avatar={localPlayerAvatar} className="w-full h-full" />
                </div>
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[8px] font-black">
                  YOU
                </span>
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs sm:text-sm text-slate-100">{localPlayerName} (You)</span>
                  {playerCards.length > 0 && (
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-black shadow ${
                        playerScore === 9
                          ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 animate-pulse'
                          : playerScore === 8
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-indigo-600 text-white'
                      }`}
                    >
                      Score: {playerScore} {playerScore === 9 ? '★ LUCKY 9' : playerScore === 8 ? '★ Natural 8' : 'pts'}
                    </span>
                  )}
                </div>
                {/* Live Coins & Active Wager */}
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono text-xs font-black">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>{playerCoins.toLocaleString()} COINS</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Wager: <strong className="text-amber-400 font-bold">{currentBet.toLocaleString()}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* CONTROLS SECTION: BETTING & DRAW ACTIONS */}
            <div className="w-full max-w-xl bg-slate-950/90 rounded-2xl p-3 border border-amber-500/30 shadow-2xl backdrop-blur-xs mt-1">
              {status === 'betting' ? (
                /* Betting Controls */
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    <span className="text-xs font-bold text-slate-300 mr-1">Bet Chips:</span>
                    {playerCoins <= 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-rose-400 font-bold">0 Coins (Losses Deducted)</span>
                        {!isMultiplayerRoom && (
                          <button
                            onClick={() => {
                              setPlayerCoins(DEFAULT_COINS);
                              setOpponentCoins(DEFAULT_COINS);
                              setCurrentBet(1000);
                              setOpponentBet(1000);
                              triggerBanner('Bankrolls reset to 25,000 coins for both players.');
                            }}
                            className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 underline cursor-pointer"
                          >
                            Reset Solo Coins
                          </button>
                        )}
                      </div>
                    ) : (
                      CHIP_VALUES.map((chip) => (
                        <button
                          key={chip}
                          onClick={() => {
                            soundManager.playTick();
                            setCurrentBet(chip);
                            if (!isMultiplayerRoom) {
                              setOpponentBet(chip);
                            }
                            if (isMultiplayerRoom) {
                              const socket = getSocket();
                              socket.emit('lucky9:bet', { amount: chip });
                            }
                          }}
                          disabled={chip > playerCoins}
                          className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono transition-all cursor-pointer ${
                            currentBet === chip
                              ? 'bg-amber-400 text-slate-950 scale-105 shadow-md shadow-amber-400/40'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40'
                          }`}
                        >
                          {chip >= 1000 ? `${chip / 1000}k` : chip}
                        </button>
                      ))
                    )}
                    <button
                      onClick={() => {
                        soundManager.playTick();
                        setCurrentBet(playerCoins);
                        if (!isMultiplayerRoom) {
                          setOpponentBet(playerCoins);
                        }
                        if (isMultiplayerRoom) {
                          const socket = getSocket();
                          socket.emit('lucky9:bet', { amount: playerCoins });
                        }
                      }}
                      disabled={playerCoins <= 0}
                      className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase transition-all"
                    >
                      All In
                    </button>
                  </div>

                  <button
                    onClick={startDealingPhase}
                    disabled={playerCoins < currentBet || currentBet <= 0}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Deal Cards</span>
                  </button>
                </div>
              ) : status === 'player_turn' ? (
                /* Player Decision: Hit or Stand */
                isMultiplayerRoom && currentTurnPlayerId && currentTurnPlayerId !== localPlayerId ? (
                  <div className="flex items-center justify-center gap-2 py-1 text-xs text-amber-300 font-mono animate-pulse">
                    <Sparkles className="w-4 h-4" />
                    <span>Waiting for {opponentName}'s move...</span>
                  </div>
                ) : (
                <div className="flex items-center justify-center gap-3">
                  {playerScore <= 5 && playerCards.length < 3 && (
                    <button
                      onClick={handlePlayerHit}
                      className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Hit (Draw 3rd Card)</span>
                      {playerScore <= 4 && (
                        <span className="text-[10px] bg-slate-950 text-amber-300 px-1.5 py-0.5 rounded uppercase">
                          Required
                        </span>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => handlePlayerStand()}
                    className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Stand (Stay with 2 Cards)</span>
                  </button>
                </div>
                )
              ) : status === 'round_over' ? (
                /* Round Over: Next Hand / Rematch */
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handleNextHand}
                    className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Deal Next Hand</span>
                  </button>
                </div>
              ) : (
                /* Dealing / Evaluating In Progress */
                <div className="flex items-center justify-center gap-2 py-1 text-xs text-amber-300 font-mono animate-pulse">
                  <Sparkles className="w-4 h-4" />
                  <span>The Banker is examining cards and calculating official totals...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
