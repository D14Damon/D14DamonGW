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
  PlusCircle,
  Crown,
  Layers,
  CheckCircle2,
  Eye,
  Flame,
  Minus,
  Plus,
  Copy,
  Check,
  Users,
  Play,
  Share2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { soundManager } from '../../utils/soundEffects';
import { AvatarRenderer } from '../AvatarRenderer';
import { AiGameConfig } from '../VsAiArena';
import { getSocket } from '../../services/socket';
import { Lucky9Card, Lucky9Suit, Lucky9RoundStatus } from '../../types';
import { Lucky9CardView } from './lucky9/Lucky9CardView';
import { Lucky9Chip, CHIP_CONFIGS } from './lucky9/Lucky9Chip';
import { Lucky9TableFelt, FeltTheme } from './lucky9/Lucky9TableFelt';
import { Lucky9ResultBanner } from './lucky9/Lucky9ResultBanner';
import { Lucky9DealerShoe } from './lucky9/Lucky9DealerShoe';

interface Lucky9GameProps {
  onBackToHub: () => void;
  aiConfig?: AiGameConfig | null;
}

const DEFAULT_COINS = 25000;
const BET_CHIP_OPTIONS = [500, 1000, 2500, 5000, 10000];

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
  const {
    gameState: roomGameState,
    createRoom,
    joinRoom,
    quickJoin,
    leaveRoom,
    publicRooms,
  } = useGame();

  const isMultiplayerRoom = Boolean(roomGameState && roomGameState.roomId);
  const isOnlineMultiplayer = Boolean(
    isMultiplayerRoom &&
    getSocket().connected &&
    !roomGameState?.roomId?.startsWith('room_local_')
  );
  const roomCode =
    roomGameState?.roomCode ||
    (roomGameState?.roomId?.includes('_') ? roomGameState.roomId.split('_')[1].toUpperCase() : roomGameState?.roomId || '');

  const [showMultiplayerModal, setShowMultiplayerModal] = useState<boolean>(false);
  const [multiplayerTab, setMultiplayerTab] = useState<'create' | 'join' | 'tables'>('create');
  const [customRoomName, setCustomRoomName] = useState<string>('');
  const [customMinStake, setCustomMinStake] = useState<number>(1000);
  const [joinRoomCodeInput, setJoinRoomCodeInput] = useState<string>('');
  const [copiedRoomCode, setCopiedRoomCode] = useState<boolean>(false);

  const localPlayerId = user?.id || 'player_1';
  const localPlayerName = user?.username || 'Player 1';
  const localPlayerAvatar = user?.avatar || 'avatar_classic_cat';

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
  const [feltTheme, setFeltTheme] = useState<FeltTheme>('emerald');
  const [bankerMessage, setBankerMessage] = useState<string>(
    'Welcome to the Lucky 9 High Roller Table! Place your chips and click Deal Cards to challenge the table.'
  );
  const [actionBanner, setActionBanner] = useState<string | null>(null);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(() => soundManager.getMuted());
  const [isDealingAnimation, setIsDealingAnimation] = useState<boolean>(false);

  // Interactive Card Peek / Squeeze State
  const [isSqueezeMode, setIsSqueezeMode] = useState<boolean>(false);
  const [peekedCardIds, setPeekedCardIds] = useState<Set<string>>(new Set());

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

  // Floating chip gain animation on win
  const [flyingReward, setFlyingReward] = useState<number | null>(null);

  // Opponent config (Bot in Solo/AI, or remote player in multiplayer)
  const opponentName = useMemo(() => {
    if (remoteOpponentName) return remoteOpponentName;
    if (isOnlineMultiplayer && roomGameState) {
      const other = roomGameState.players.find((p) => p.id !== localPlayerId);
      return other ? other.username : 'Opponent';
    }
    if (aiConfig) {
      return `AI Bot (${aiConfig.difficulty.toUpperCase()})`;
    }
    return 'Croupier Bot';
  }, [remoteOpponentName, isOnlineMultiplayer, roomGameState, localPlayerId, aiConfig]);

  const opponentAvatar = useMemo(() => {
    if (remoteOpponentAvatar) return remoteOpponentAvatar;
    if (isOnlineMultiplayer && roomGameState) {
      const other = roomGameState.players.find((p) => p.id !== localPlayerId);
      return other ? other.avatar : 'avatar_neon_bot';
    }
    return 'avatar_cyber_fox';
  }, [remoteOpponentAvatar, isOnlineMultiplayer, roomGameState, localPlayerId]);

  // Scores
  const playerScore = useMemo(() => calculateLucky9Score(playerCards), [playerCards]);
  const opponentScore = useMemo(() => calculateLucky9Score(opponentCards), [opponentCards]);

  const playerNatural = useMemo(() => checkNatural(playerCards), [playerCards]);
  const opponentNatural = useMemo(() => checkNatural(opponentCards), [opponentCards]);

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

  // Quick Bet Adders & Multiplayer Sync
  const sendMultiplayerBet = (amount: number) => {
    if (isOnlineMultiplayer) {
      const socket = getSocket();
      socket.emit('lucky9:bet', { amount });
    }
  };

  const addBetAmount = (amount: number) => {
    const nextBet = Math.min(playerCoins, currentBet + amount);
    if (nextBet !== currentBet) {
      soundManager.playChipClink();
      setCurrentBet(nextBet);
      sendMultiplayerBet(nextBet);
      if (!isMultiplayerRoom) {
        setOpponentBet(nextBet);
      }
    }
  };

  const setChipBet = (amount: number) => {
    if (amount <= playerCoins) {
      soundManager.playChipStack();
      setCurrentBet(amount);
      sendMultiplayerBet(amount);
      if (!isMultiplayerRoom) {
        setOpponentBet(amount);
      }
    }
  };

  const doubleBet = () => {
    const doubled = Math.min(playerCoins, currentBet * 2);
    soundManager.playChipStack();
    setCurrentBet(doubled);
    sendMultiplayerBet(doubled);
    if (!isMultiplayerRoom) {
      setOpponentBet(doubled);
    }
  };

  // ==========================================
  // MULTIPLAYER SOCKET INTEGRATION (if in room)
  // ==========================================
  useEffect(() => {
    if (!isOnlineMultiplayer) return;
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
        const winnerKey = data.winner === localPlayerId ? 'player' : data.winner === 'tie' ? 'tie' : 'opponent';
        setRoundWinner(winnerKey);
        setVerdictReason(data.winnerReason || '');
        if (winnerKey === 'player') {
          soundManager.playLucky9Celebration();
          confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
          setFlyingReward(data.pot ? Math.floor(data.pot / 2) : currentBet);
        } else if (winnerKey === 'tie') {
          soundManager.playTick();
        } else {
          soundManager.playWrong();
        }
      }
    });

    return () => {
      socket.off('lucky9:state');
    };
  }, [isMultiplayerRoom, localPlayerId, currentBet]);

  // ==========================================
  // REALISTIC LOCAL DEALING SEQUENCE ENGINE
  // ==========================================
  const startDealingPhase = () => {
    if (playerCoins <= 0) {
      soundManager.playWrong();
      triggerBanner('You have 0 coins left! Reset your wallet or wait for coins.');
      return;
    }

    if (playerCoins < currentBet) {
      soundManager.playWrong();
      triggerBanner(`Insufficient coins. Your balance is ${playerCoins.toLocaleString()} coins.`);
      return;
    }

    if (isOnlineMultiplayer) {
      soundManager.playCardSlide();
      const socket = getSocket();
      socket.emit('lucky9:deal');
      return;
    }

    const matchBet = Math.min(currentBet, playerCoins);

    // Physical chip drop into pot
    soundManager.playChipStack();
    setPlayerCoins((prev) => Math.max(0, prev - matchBet));
    setOpponentCoins((prev) => Math.max(0, prev - matchBet));
    setOpponentBet(matchBet);
    const roundPot = matchBet * 2;
    setPot(roundPot);
    setStatus('dealing');
    setIsDealingAnimation(true);
    setRoundWinner(null);
    setVerdictReason('');
    setPeekedCardIds(new Set());
    setFlyingReward(null);
    setBankerMessage(
      `Banker: Bets are sealed! Stakes: ${matchBet.toLocaleString()} each (Pot: ${roundPot.toLocaleString()}). Dealing cards from the shoe...`
    );

    const freshDeck = create52Deck();
    deckRef.current = freshDeck;

    const pCards = [deckRef.current.pop()!, deckRef.current.pop()!];
    const oCards = [deckRef.current.pop()!, deckRef.current.pop()!];

    // Card 1: Player
    setTimeout(() => {
      soundManager.playCardSlide();
      setPlayerCards([pCards[0]]);
    }, 400);

    // Card 1: Opponent (face down)
    setTimeout(() => {
      soundManager.playCardSlide();
      setOpponentCards([{ ...oCards[0], isRevealed: false }]);
    }, 800);

    // Card 2: Player
    setTimeout(() => {
      soundManager.playCardSlide();
      setPlayerCards(pCards);
    }, 1200);

    // Card 2: Opponent (face down)
    setTimeout(() => {
      soundManager.playCardSlide();
      setOpponentCards([
        { ...oCards[0], isRevealed: false },
        { ...oCards[1], isRevealed: false },
      ]);
      setIsDealingAnimation(false);
    }, 1600);

    // Smooth Flip of Player's cards with snap sound
    setTimeout(() => {
      soundManager.playCardFlip();
    }, 1900);

    // Check for Naturals after initial deal
    setTimeout(() => {
      evaluateNaturals(pCards, oCards, roundPot);
    }, 2400);
  };

  // Check for Natural 9 or Natural 8
  const evaluateNaturals = (pCards: Lucky9Card[], oCards: Lucky9Card[], totalPot: number) => {
    const pNat = checkNatural(pCards);
    const oNat = checkNatural(oCards);

    // Reveal opponent cards if a Natural occurs
    if (pNat || oNat) {
      soundManager.playCardFlip();
      setOpponentCards(oCards.map((c) => ({ ...c, isRevealed: true })));
      setStatus('round_over');

      if (pNat === 'natural_9' && oNat === 'natural_9') {
        soundManager.playTick();
        setRoundWinner('tie');
        setVerdictReason('Both players dealt Natural 9! It is a Push (Tie).');
        setBankerMessage('Banker: Incredible! Double Natural 9 standoff! Bets are refunded.');
        const refund = Math.floor(totalPot / 2);
        setPlayerCoins((prev) => prev + refund);
        setOpponentCoins((prev) => prev + refund);
      } else if (pNat === 'natural_9') {
        soundManager.playLucky9Celebration();
        confetti({ particleCount: 110, spread: 85, origin: { y: 0.55 } });
        setRoundWinner('player');
        setVerdictReason('Player dealt Natural 9! Instant Automatic Victory!');
        const wonCoins = Math.floor(totalPot / 2);
        setFlyingReward(wonCoins);
        setBankerMessage(
          `Banker: ★ LUCKY 9! ★ Player dealt Natural 9! Won ${wonCoins.toLocaleString()} coins from ${opponentName}!`
        );
        setPlayerCoins((prev) => prev + totalPot);
        updateStats({ gamesPlayed: 1, wins: 1, lucky9Wins: 1, totalScore: wonCoins }, true);
      } else if (oNat === 'natural_9') {
        soundManager.playWrong();
        setRoundWinner('opponent');
        setVerdictReason(`${opponentName} dealt Natural 9! Automatic win.`);
        const lostCoins = Math.floor(totalPot / 2);
        setBankerMessage(
          `Banker: ${opponentName} reveals Natural 9! ${opponentName} claims your ${lostCoins.toLocaleString()} coins.`
        );
        setOpponentCoins((prev) => prev + totalPot);
        updateStats({ gamesPlayed: 1, totalScore: 0 }, false);
      } else if (pNat === 'natural_8' && oNat === 'natural_8') {
        soundManager.playTick();
        setRoundWinner('tie');
        setVerdictReason('Both players dealt Natural 8! Push (Tie).');
        setBankerMessage('Banker: Both players hold Natural 8. It is a draw! Bets returned.');
        const refund = Math.floor(totalPot / 2);
        setPlayerCoins((prev) => prev + refund);
        setOpponentCoins((prev) => prev + refund);
      } else if (pNat === 'natural_8') {
        soundManager.playLucky9Celebration();
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        setRoundWinner('player');
        setVerdictReason('Player wins with Natural 8!');
        const wonCoins = Math.floor(totalPot / 2);
        setFlyingReward(wonCoins);
        setBankerMessage(
          `Banker: Player stands on Natural 8! Won ${wonCoins.toLocaleString()} coins from ${opponentName}!`
        );
        setPlayerCoins((prev) => prev + totalPot);
        updateStats({ gamesPlayed: 1, wins: 1, lucky9Wins: 1, totalScore: wonCoins }, true);
      } else if (oNat === 'natural_8') {
        soundManager.playWrong();
        setRoundWinner('opponent');
        setVerdictReason(`${opponentName} wins with Natural 8.`);
        const lostCoins = Math.floor(totalPot / 2);
        setBankerMessage(
          `Banker: ${opponentName} holds Natural 8 and claims your ${lostCoins.toLocaleString()} coins.`
        );
        setOpponentCoins((prev) => prev + totalPot);
        updateStats({ gamesPlayed: 1, totalScore: 0 }, false);
      }
      return;
    }

    // No Naturals: Proceed to Drawing Phase
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
      }, 1500);
    }
  };

  // Player Hits (Draws 3rd card)
  const handlePlayerHit = () => {
    if (playerCards.length >= 3) return;
    soundManager.playCardSlide();

    if (isOnlineMultiplayer) {
      const socket = getSocket();
      socket.emit('lucky9:hit');
      return;
    }

    const drawn = deckRef.current.pop()!;
    const newPCards = [...playerCards, drawn];
    setPlayerCards(newPCards);

    setTimeout(() => {
      soundManager.playCardFlip();
    }, 450);

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
    if (isOnlineMultiplayer) {
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

    let willHit = false;
    if (oScore <= 4) {
      willHit = true;
    } else if (oScore === 5) {
      willHit = Math.random() > 0.45;
    } else {
      willHit = false;
    }

    if (willHit && curOCards.length < 3) {
      setBankerMessage(`Banker: ${opponentName} holds ${oScore} points. Opponent draws a 3rd card...`);
      setTimeout(() => {
        soundManager.playCardSlide();
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
    soundManager.playCardFlip();

    // Reveal opponent cards with tactile flip
    const revealedOpponent = oFinalCards.map((c) => ({ ...c, isRevealed: true }));
    setOpponentCards(revealedOpponent);

    const finalP = calculateLucky9Score(pFinalCards);
    const finalO = calculateLucky9Score(revealedOpponent);

    setTimeout(() => {
      setStatus('round_over');

      const matchBet = Math.floor(currentPot / 2);
      if (finalP > finalO) {
        // Player wins
        soundManager.playLucky9Celebration();
        confetti({ particleCount: 95, spread: 80, origin: { y: 0.55 } });
        setRoundWinner('player');
        setVerdictReason(`Player score ${finalP} beats ${opponentName}'s score ${finalO}!`);
        setFlyingReward(matchBet);
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
    }, 1200);
  };

  const isWaitingForOpponentInRoom = Boolean(
    isMultiplayerRoom &&
      (!remoteOpponentName && (!roomGameState?.players || roomGameState.players.filter((p) => p.isConnected).length < 2))
  );

  const lucky9PublicRooms = useMemo(() => {
    return (publicRooms || []).filter((r) => r.settings?.gameMode === 'lucky_9');
  }, [publicRooms]);

  const handleCopyRoomCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopiedRoomCode(true);
    soundManager.playTick();
    setTimeout(() => setCopiedRoomCode(false), 2000);
  };

  const handleLeaveTable = () => {
    soundManager.playButton();
    if (isMultiplayerRoom) {
      leaveRoom();
    }
    onBackToHub();
  };

  const handleCreate1v1Room = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playButton();
    const finalName = customRoomName.trim() || `${localPlayerName}'s High Roller Table`;
    createRoom(
      {
        gameMode: 'lucky_9',
        maxPlayers: 2,
        isPrivate: false,
        roundDuration: 30,
        maxRounds: 10,
        wordCategory: 'all',
        customWords: [],
        allowHints: false,
        botPlayersEnabled: false,
      },
      finalName
    );
    setShowMultiplayerModal(false);
  };

  const handleJoin1v1Room = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomCodeInput.trim()) return;
    soundManager.playButton();
    joinRoom(joinRoomCodeInput.trim().toUpperCase());
    setShowMultiplayerModal(false);
  };

  // Restart next hand
  const handleNextHand = () => {
    soundManager.playTick();
    if (isOnlineMultiplayer) {
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
    setFlyingReward(null);
    setPeekedCardIds(new Set());
    setStatus('betting');
    setBankerMessage('Banker: New hand ready! Adjust your chips and click Deal Cards.');
  };

  return (
    <div className="flex-1 flex flex-col min-h-[calc(100vh-80px)] w-full max-w-6xl mx-auto px-2 sm:px-4 py-2 relative">
      {/* Floating Action Banner */}
      <AnimatePresence>
        {actionBanner && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-sm shadow-2xl flex items-center gap-2 border-2 border-amber-200"
          >
            <Sparkles className="w-4 h-4 text-slate-950 animate-spin" />
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
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                    <Crown className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">
                    Official Lucky 9 Casino Rules
                  </h3>
                </div>
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs sm:text-sm space-y-2.5 text-slate-600 dark:text-slate-300 max-h-96 overflow-y-auto pr-1">
                <p>
                  <strong>Objective:</strong> Form a hand whose cards sum modulo 10 is as close to 9 as possible. Highest score (0 to 9) wins the pot!
                </p>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                  <div className="font-bold text-amber-600 dark:text-amber-400">Card Point Values:</div>
                  <div>• <strong>Ace:</strong> 1 Point</div>
                  <div>• <strong>2 through 9:</strong> Face Value (2 to 9 points)</div>
                  <div>• <strong>10, Jack, Queen, King:</strong> 0 Points</div>
                  <div className="text-[11px] text-slate-400 italic">Example: 7 + 8 = 15 ➔ Score is 5.</div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-500/20 space-y-1">
                  <div className="font-bold text-amber-600 dark:text-amber-400">Natural Wins (First 2 Cards):</div>
                  <div>• <strong>Natural 9 (Lucky 9):</strong> 9 points on opening deal. Instant top win!</div>
                  <div>• <strong>Natural 8:</strong> 8 points on opening deal. Beats all non-natural 9 hands.</div>
                </div>

                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-500/20 space-y-1">
                  <div className="font-bold text-indigo-600 dark:text-indigo-400">Drawing Rules:</div>
                  <div>• <strong>0 to 4 points:</strong> Player MUST Hit (Draw 3rd card).</div>
                  <div>• <strong>5 points:</strong> Player Choice (Hit or Stand).</div>
                  <div>• <strong>6 to 7 points:</strong> Player MUST Stand (Stay with 2 cards).</div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 space-y-1">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">Tactile Features:</div>
                  <div>• Real 3D physics cards flying from the dealer shoe.</div>
                  <div>• Squeeze & Peek cards before showdown.</div>
                  <div>• Interactive clay chips with tactile clink audio.</div>
                </div>
              </div>

              <button
                onClick={() => setShowRulesModal(false)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm shadow-lg active:scale-98 transition-all cursor-pointer"
              >
                Back to Table
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* 1v1 Multiplayer Arena Modal */}
        {showMultiplayerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-amber-500/40 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-slate-800 dark:text-slate-100"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Lucky 9 (1v1 Arena)
                    </h3>
                    <p className="text-xs text-slate-500">Play real-time 1v1 high roller showdowns</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMultiplayerModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setMultiplayerTab('create')}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    multiplayerTab === 'create'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Create Table
                </button>
                <button
                  type="button"
                  onClick={() => setMultiplayerTab('join')}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    multiplayerTab === 'join'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Join Code
                </button>
                <button
                  type="button"
                  onClick={() => setMultiplayerTab('tables')}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    multiplayerTab === 'tables'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Live ({lucky9PublicRooms.length})
                </button>
              </div>

              {/* Tab 1: Create Table */}
              {multiplayerTab === 'create' && (
                <form onSubmit={handleCreate1v1Room} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Table Name
                    </label>
                    <input
                      type="text"
                      value={customRoomName}
                      onChange={(e) => setCustomRoomName(e.target.value)}
                      placeholder={`${localPlayerName}'s High Stakes Table`}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Dedicated 1v1 Table</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Creates a dedicated 1v1 table. You can share your 5-letter room code with a friend to play in real-time.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:brightness-110 text-slate-950 font-black text-sm shadow-xl active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    <span>Create & Sit at Table</span>
                  </button>
                </form>
              )}

              {/* Tab 2: Join by Code */}
              {multiplayerTab === 'join' && (
                <form onSubmit={handleJoin1v1Room} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Enter 5-Letter Table Code
                    </label>
                    <input
                      type="text"
                      maxLength={5}
                      value={joinRoomCodeInput}
                      onChange={(e) => setJoinRoomCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. K9X2B"
                      className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-base font-mono font-black text-center tracking-widest text-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                    Ask your friend for their 5-letter table code to sit as Player 2.
                  </p>
                  <button
                    type="submit"
                    disabled={!joinRoomCodeInput.trim()}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-black text-sm shadow-xl active:scale-98 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    <span>Join Table</span>
                  </button>
                </form>
              )}

              {/* Tab 3: Live Public Tables */}
              {multiplayerTab === 'tables' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Open Lucky 9 Tables
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playButton();
                        quickJoin();
                        setShowMultiplayerModal(false);
                      }}
                      className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      ⚡ Quick Match
                    </button>
                  </div>

                  {lucky9PublicRooms.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-2">
                      <Users className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-500">No public Lucky 9 tables open right now.</p>
                      <button
                        type="button"
                        onClick={() => setMultiplayerTab('create')}
                        className="text-xs text-amber-500 font-bold hover:underline"
                      >
                        Create a table now →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {lucky9PublicRooms.map((r) => (
                        <div
                          key={r.code}
                          className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {r.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              #{r.code} • {r.playerCount}/{r.maxPlayers} Players
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playButton();
                              joinRoom(r.code);
                              setShowMultiplayerModal(false);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors cursor-pointer"
                          >
                            Sit Table
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Controls Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLeaveTable}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Leave Table</span>
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider border border-amber-500/20 flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" />
              Lucky 9 (1v1)
            </span>
            <span className="text-xs font-mono text-slate-500">Hand #{roundNumber}</span>
          </div>

          {/* Multiplayer Room Badge or 1v1 Multiplayer Launcher Button */}
          {isMultiplayerRoom ? (
            <div className="flex items-center gap-1.5 bg-amber-500/10 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-500/30">
              <span className="text-[11px] font-mono font-bold text-amber-500">#{roomCode}</span>
              <button
                type="button"
                onClick={handleCopyRoomCode}
                className="p-0.5 rounded text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                title="Copy Room Code"
              >
                {copiedRoomCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {isOnlineMultiplayer ? (
                isWaitingForOpponentInRoom ? (
                  <span className="hidden md:inline-block px-1.5 py-0.5 rounded bg-amber-500/20 text-[9px] font-bold text-amber-400 animate-pulse uppercase">
                    Waiting Challenger
                  </span>
                ) : (
                  <span className="hidden md:inline-block px-1.5 py-0.5 rounded bg-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase">
                    1v1 Live
                  </span>
                )
              ) : (
                <span className="hidden md:inline-block px-1.5 py-0.5 rounded bg-amber-500/20 text-[9px] font-bold text-amber-400 uppercase" title="Local 1v1 Table Session">
                  Local Table
                </span>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundManager.playButton();
                setShowMultiplayerModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer border border-amber-300"
            >
              <Users className="w-3.5 h-3.5" />
              <span>1v1 Multiplayer</span>
            </button>
          )}
        </div>

        {/* Dual Bankroll Tracker in Header */}
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
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="View Rules"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={toggleMute}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title={soundMuted ? 'Unmute' : 'Mute'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Table Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Side: THE BANKER & CROUPIER STATION */}
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
                Verified RNG
              </span>
            </div>

            {/* Banker Avatar */}
            <div className="relative my-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 p-1 shadow-2xl">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden border-2 border-amber-300">
                  <AvatarRenderer avatar="avatar_blaze_knight" className="w-16 h-16" />
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] shadow">
                CROUPIER
              </span>
            </div>

            <div className="text-white font-black text-sm">Don Santiago</div>
            <div className="text-indigo-300 text-[11px] mb-2.5">High Roller Pit Boss</div>

            {/* Dealer Shoe Box */}
            <div className="my-1">
              <Lucky9DealerShoe
                isDealing={isDealingAnimation}
                cardsRemaining={deckRef.current.length > 0 ? deckRef.current.length : 52}
              />
            </div>

            {/* Banker Live Speech Dialogue */}
            <div className="w-full bg-slate-800/90 rounded-2xl p-3 border border-amber-500/20 text-left relative shadow-inner mt-2">
              <div className="text-[10px] font-bold uppercase text-amber-400 mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Banker Proclamation:
              </div>
              <p className="text-xs text-slate-100 font-medium leading-relaxed italic">
                "{bankerMessage}"
              </p>
            </div>
          </div>

          {/* Quick Hand Value Cheat Sheet */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm hidden lg:block text-xs space-y-1.5">
            <div className="font-black text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              Standard Lucky 9 Rules
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
              <div>• 0 to 4 pts: <span className="font-bold text-amber-500">Must Hit (3rd Card)</span></div>
              <div>• 5 pts: <span className="font-bold text-indigo-400">Player Choice</span></div>
              <div>• 6 or 7 pts: <span className="font-bold text-emerald-400">Must Stand</span></div>
              <div>• 8 or 9 pts: <span className="font-black text-rose-500">Natural Instant Win!</span></div>
            </div>
          </div>
        </div>

        {/* Center Table Area (Casino Felt Table) */}
        <div className="lg:col-span-9 flex flex-col justify-between">
          <Lucky9TableFelt
            theme={feltTheme}
            potAmount={pot}
            isDealing={isDealingAnimation}
            roundStatus={status}
            roundWinner={roundWinner}
            onThemeChange={(theme) => setFeltTheme(theme)}
          >
            {/* TOP: OPPONENT / CROUPIER HAND AREA */}
            {isWaitingForOpponentInRoom ? (
              <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-3xl bg-slate-950/90 border-2 border-dashed border-amber-400/60 backdrop-blur-md text-white shadow-2xl max-w-sm w-full mx-auto my-2 text-center animate-fade-in z-10">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 mb-2 shadow-inner">
                  <Users className="w-6 h-6 animate-pulse" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[10px] font-black uppercase tracking-wider mb-1">
                  Seat #2 Open
                </span>
                <h4 className="text-sm font-black text-white">
                  Waiting for Challenger to Join
                </h4>
                <p className="text-xs text-slate-300 mt-1 max-w-xs">
                  Share this Table Code with a friend to play 1v1 showdown in real-time:
                </p>
                <div className="flex items-center gap-2 mt-3 bg-slate-900/90 px-3.5 py-2 rounded-2xl border border-amber-400/40 shadow-inner">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Code:</span>
                  <span className="font-mono font-black text-base sm:text-lg text-amber-400 tracking-widest">
                    #{roomCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRoomCode}
                    className="ml-1 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black flex items-center gap-1 shadow transition-all active:scale-95 cursor-pointer"
                  >
                    {copiedRoomCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedRoomCode ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 z-10">
                <div className="flex items-center gap-3 px-4 py-1.5 rounded-2xl bg-slate-950/85 border border-amber-500/40 backdrop-blur-md text-white shadow-xl">
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
                        <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-xs font-black">
                          Total: {opponentScore} {opponentNatural ? `(${opponentNatural.replace('_', ' ').toUpperCase()})` : ''}
                        </span>
                      )}
                    </div>
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

                {/* Opponent Cards Hand (Card Boxes & 3D Flippable Cards) */}
                <div className="flex items-center justify-center gap-2 sm:gap-4 min-h-[120px] sm:min-h-[150px] relative">
                  {opponentCards.length === 0 ? (
                    /* Empty Card Spot Indicators */
                    <div className="flex gap-3">
                      <div className="w-20 sm:w-24 md:w-28 h-28 sm:h-36 md:h-40 rounded-2xl border-2 border-dashed border-amber-400/30 flex items-center justify-center text-amber-300/30 text-xs font-mono">
                        Card 1
                      </div>
                      <div className="w-20 sm:w-24 md:w-28 h-28 sm:h-36 md:h-40 rounded-2xl border-2 border-dashed border-amber-400/30 flex items-center justify-center text-amber-300/30 text-xs font-mono">
                        Card 2
                      </div>
                    </div>
                  ) : (
                    opponentCards.map((card, idx) => (
                      <Lucky9CardView
                        key={card.id || `opp_${idx}`}
                        card={card}
                        isRevealed={card.isRevealed ?? false}
                        dealIndex={idx}
                        totalCardsInHand={opponentCards.length}
                        isWinningCard={roundWinner === 'opponent'}
                        isNatural={status === 'round_over' ? opponentNatural : null}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* CENTER: THE CHIP POT & DYNAMIC RESULT OVERLAY */}
            <div className="flex flex-col items-center justify-center my-2 sm:my-3 z-10">
              {/* Live Chip Pot Container */}
              <div className="flex flex-col items-center">
                {/* 3D Physical Chip Stacks inside the Pot */}
                <div className="relative w-36 sm:w-44 h-20 sm:h-24 rounded-full bg-black/40 border-2 border-dashed border-amber-400/40 flex items-center justify-center p-2 shadow-inner">
                  {pot > 0 ? (
                    <motion.div
                      key={pot}
                      initial={{ scale: 0.8, y: -10 }}
                      animate={{ scale: 1, y: 0 }}
                      className="flex items-center justify-center gap-1"
                    >
                      <Lucky9Chip value={currentBet >= 10000 ? 10000 : currentBet >= 5000 ? 5000 : currentBet >= 2500 ? 2500 : 1000} size="sm" />
                      <Lucky9Chip value={500} size="sm" className="-ml-3" />
                      {pot >= 5000 && <Lucky9Chip value={1000} size="sm" className="-ml-3" />}
                    </motion.div>
                  ) : (
                    <span className="text-[10px] font-mono text-amber-300/40 uppercase tracking-wider">
                      POT ZONE
                    </span>
                  )}
                </div>

                {/* Pot Value Pill */}
                <div className="flex items-center gap-2 px-5 py-1.5 -mt-3 rounded-2xl bg-slate-950/90 border-2 border-amber-400 text-amber-300 font-mono font-black text-sm sm:text-base shadow-xl backdrop-blur-xs">
                  <Coins className="w-4 h-4 text-amber-400 animate-bounce" />
                  <span>POT: {pot > 0 ? pot.toLocaleString() : (currentBet * 2).toLocaleString()} COINS</span>
                </div>
              </div>

              {/* Floating Reward Animation on Player Victory */}
              <AnimatePresence>
                {flyingReward && (
                  <motion.div
                    initial={{ y: 0, opacity: 1, scale: 0.8 }}
                    animate={{ y: -45, opacity: 0, scale: 1.2 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.8, ease: 'easeOut' }}
                    className="absolute text-amber-300 font-mono font-black text-lg sm:text-xl drop-shadow-[0_2px_10px_rgba(251,191,36,0.8)] pointer-events-none"
                  >
                    +{flyingReward.toLocaleString()} COINS!
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Result Banner with Framer Motion when round finishes */}
              <AnimatePresence>
                {status === 'round_over' && roundWinner && (
                  <Lucky9ResultBanner
                    roundWinner={roundWinner}
                    verdictReason={verdictReason}
                    payoutAmount={Math.floor(pot / 2)}
                    isNatural9={roundWinner === 'player' && playerNatural === 'natural_9'}
                    isNatural8={roundWinner === 'player' && playerNatural === 'natural_8'}
                    opponentName={opponentName}
                    onNextHand={handleNextHand}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* BOTTOM: LOCAL PLAYER HAND & INTERACTIVE CONTROLS */}
            <div className="flex flex-col items-center gap-2 z-10">
              {/* Player Cards (With 3D Flip & Interactive Squeeze/Peek support) */}
              <div className="flex items-center justify-center gap-2 sm:gap-4 min-h-[120px] sm:min-h-[150px] relative">
                {playerCards.length === 0 ? (
                  /* Empty Card Spot Indicators */
                  <div className="flex gap-3">
                    <div className="w-20 sm:w-24 md:w-28 h-28 sm:h-36 md:h-40 rounded-2xl border-2 border-dashed border-amber-400/30 flex items-center justify-center text-amber-300/30 text-xs font-mono">
                      Your Card 1
                    </div>
                    <div className="w-20 sm:w-24 md:w-28 h-28 sm:h-36 md:h-40 rounded-2xl border-2 border-dashed border-amber-400/30 flex items-center justify-center text-amber-300/30 text-xs font-mono">
                      Your Card 2
                    </div>
                  </div>
                ) : (
                  playerCards.map((card, idx) => (
                    <Lucky9CardView
                      key={card.id || `pl_${idx}`}
                      card={card}
                      isRevealed={true}
                      dealIndex={idx}
                      totalCardsInHand={playerCards.length}
                      isWinningCard={roundWinner === 'player'}
                      isNatural={playerNatural}
                    />
                  ))
                )}
              </div>

              {/* Local Player Info Bar & Score Pill */}
              <div className="flex items-center gap-3 px-4 py-1.5 rounded-2xl bg-slate-950/85 border border-indigo-500/40 backdrop-blur-md text-white shadow-xl">
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
                      <motion.span
                        key={playerScore}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className={`px-2.5 py-0.5 rounded-md text-xs font-black shadow flex items-center gap-1 ${
                          playerScore === 9
                            ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                            : playerScore === 8
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-indigo-600 text-white'
                        }`}
                      >
                        {playerScore === 9 && <Crown className="w-3.5 h-3.5" />}
                        <span>Score: {playerScore} {playerScore === 9 ? '★ LUCKY 9' : playerScore === 8 ? '★ Natural 8' : 'pts'}</span>
                      </motion.span>
                    )}
                  </div>
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

              {/* TACTILE BETTING & DRAW ACTION CONTROL PANEL */}
              <div className="w-full max-w-xl bg-slate-950/95 rounded-2xl p-3 sm:p-4 border border-amber-500/40 shadow-2xl backdrop-blur-xs mt-1">
                {status === 'betting' ? (
                  /* Betting Phase Controls */
                  <div className="space-y-3">
                    {/* Realistic Casino Chip Denominations */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-300">Select Chip:</span>
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                        {BET_CHIP_OPTIONS.map((chipVal) => (
                          <Lucky9Chip
                            key={chipVal}
                            value={chipVal}
                            size="md"
                            isSelected={currentBet === chipVal}
                            disabled={chipVal > playerCoins}
                            onClick={() => setChipBet(chipVal)}
                            animateDrop={true}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Quick Bet Buttons & Deal Trigger */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-800">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => addBetAmount(500)}
                          disabled={playerCoins < currentBet + 500}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition-all disabled:opacity-40 cursor-pointer"
                        >
                          +500
                        </button>
                        <button
                          type="button"
                          onClick={() => addBetAmount(1000)}
                          disabled={playerCoins < currentBet + 1000}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition-all disabled:opacity-40 cursor-pointer"
                        >
                          +1K
                        </button>
                        <button
                          type="button"
                          onClick={doubleBet}
                          disabled={playerCoins < currentBet * 2}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-mono font-bold transition-all disabled:opacity-40 border border-amber-500/30 cursor-pointer"
                        >
                          2× Double
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playChipStack();
                            setCurrentBet(playerCoins);
                            if (!isMultiplayerRoom) {
                              setOpponentBet(playerCoins);
                            } else {
                              sendMultiplayerBet(playerCoins);
                            }
                          }}
                          disabled={playerCoins <= 0}
                          className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-mono font-bold uppercase transition-all disabled:opacity-40 cursor-pointer"
                        >
                          All In
                        </button>
                      </div>

                      {/* Deal Button */}
                      <button
                        type="button"
                        onClick={startDealingPhase}
                        disabled={playerCoins < currentBet || currentBet <= 0 || isWaitingForOpponentInRoom}
                        className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-amber-200"
                      >
                        <Layers className="w-4 h-4" />
                        <span>
                          {isWaitingForOpponentInRoom
                            ? `Waiting for Challenger (#${roomCode})...`
                            : isMultiplayerRoom
                            ? 'Deal (1v1 Live Showdown)'
                            : 'Deal Cards'}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : status === 'player_turn' ? (
                  /* Player Turn: Hit or Stand */
                  isMultiplayerRoom && currentTurnPlayerId && currentTurnPlayerId !== localPlayerId ? (
                    <div className="flex items-center justify-center gap-2 py-1 text-xs text-amber-300 font-mono animate-pulse">
                      <Sparkles className="w-4 h-4" />
                      <span>Waiting for {opponentName}'s move...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      {playerScore <= 5 && playerCards.length < 3 && (
                        <button
                          type="button"
                          onClick={handlePlayerHit}
                          className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-amber-300"
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
                        type="button"
                        onClick={() => handlePlayerStand()}
                        className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-400"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Stand (Stay with Hand)</span>
                      </button>
                    </div>
                  )
                ) : status === 'round_over' ? (
                  /* Round Over Actions */
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleNextHand}
                      className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-200"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Deal Next Hand</span>
                    </button>
                  </div>
                ) : (
                  /* Dealing / Evaluating Progress */
                  <div className="flex items-center justify-center gap-2 py-1 text-xs text-amber-300 font-mono animate-pulse">
                    <Sparkles className="w-4 h-4" />
                    <span>The Croupier is dealing and calculating hand values...</span>
                  </div>
                )}
              </div>
            </div>
          </Lucky9TableFelt>
        </div>
      </div>
    </div>
  );
};
