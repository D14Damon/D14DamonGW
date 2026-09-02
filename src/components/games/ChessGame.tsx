import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Swords,
  Trophy,
  Shield,
  Zap,
  CheckCircle2,
  RefreshCw,
  Award,
  AlertTriangle,
  History,
} from 'lucide-react';
import { AiGameConfig } from '../VsAiArena';
import { useAuth } from '../../context/AuthContext';
import { soundManager } from '../../utils/soundEffects';

export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

export type Board = (ChessPiece | null)[][];

interface MoveRecord {
  from: string;
  to: string;
  piece: ChessPiece;
  captured?: ChessPiece | null;
  notation: string;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 10000,
};

// Pure vector SVG chess piece renderers with crisp pure-white and pure-black rendering
const ChessPieceIcon: React.FC<{ type: PieceType; color: PieceColor; className?: string }> = ({
  type,
  color,
  className = 'w-full h-full p-1.5',
}) => {
  const isWhite = color === 'w';

  // White pieces: Pure White fill (#FFFFFF) with crisp dark outline (#0F172A)
  // Black pieces: Pure Black fill (#050505) with crisp light outline (#E2E8F0)
  const fillColor = isWhite ? '#FFFFFF' : '#090D16';
  const strokeColor = isWhite ? '#0F172A' : '#F1F5F9';
  const accentColor = isWhite ? '#E2E8F0' : '#334155';

  const renderIcon = () => {
    switch (type) {
      case 'k':
        return (
          <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Cross */}
            <path d="M22.5 5V13M18.5 9H26.5" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            {/* Crown Head */}
            <path
              d="M11.5 30C11.5 24 15 17 22.5 14C30 17 33.5 24 33.5 30C33.5 35 30 37 22.5 37C15 37 11.5 35 11.5 30Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Jewels / Crown trim */}
            <circle cx="22.5" cy="22" r="3" fill={accentColor} stroke={strokeColor} strokeWidth="1.5" />
            <circle cx="16.5" cy="25" r="2" fill={accentColor} stroke={strokeColor} strokeWidth="1.2" />
            <circle cx="28.5" cy="25" r="2" fill={accentColor} stroke={strokeColor} strokeWidth="1.2" />
            {/* Base */}
            <path
              d="M11 37H34V40C34 41 33 42 32 42H13C12 42 11 41 11 40V37Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.2"
            />
          </svg>
        );

      case 'q':
        return (
          <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Crown peaks with circles */}
            <circle cx="7.5" cy="14" r="2" fill={accentColor} stroke={strokeColor} strokeWidth="1.5" />
            <circle cx="15" cy="10" r="2" fill={accentColor} stroke={strokeColor} strokeWidth="1.5" />
            <circle cx="22.5" cy="8.5" r="2.5" fill={accentColor} stroke={strokeColor} strokeWidth="1.5" />
            <circle cx="30" cy="10" r="2" fill={accentColor} stroke={strokeColor} strokeWidth="1.5" />
            <circle cx="37.5" cy="14" r="2" fill={accentColor} stroke={strokeColor} strokeWidth="1.5" />
            {/* Queen Body */}
            <path
              d="M9 16L12.5 28C14 34 17 36.5 22.5 36.5C28 36.5 31 34 32.5 28L36 16L29 23L22.5 12L16 23L9 16Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Waistline band */}
            <path d="M13 32C16 33.5 29 33.5 32 32" stroke={strokeColor} strokeWidth="1.8" />
            {/* Base */}
            <path
              d="M10 37H35V40C35 41 34 42 33 42H12C11 42 10 41 10 40V37Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.2"
            />
          </svg>
        );

      case 'r':
        return (
          <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Crenellations */}
            <path
              d="M12 11H17V15H20V11H25V15H28V11H33V17H12V11Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Tower Body */}
            <path
              d="M13.5 17L15.5 34H29.5L31.5 17H13.5Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Mid band & loop */}
            <line x1="14.5" y1="24" x2="30.5" y2="24" stroke={strokeColor} strokeWidth="1.5" />
            <line x1="15" y1="30" x2="30" y2="30" stroke={strokeColor} strokeWidth="1.5" />
            {/* Base */}
            <path
              d="M10.5 35H34.5V40C34.5 41 33.5 42 32.5 42H12.5C11.5 42 10.5 41 10.5 40V35Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.2"
            />
          </svg>
        );

      case 'b':
        return (
          <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Top Orb */}
            <circle cx="22.5" cy="8" r="2.2" fill={accentColor} stroke={strokeColor} strokeWidth="1.5" />
            {/* Mitre Head */}
            <path
              d="M15 28C13 22 15 13 22.5 11C30 13 32 22 30 28C28 34 17 34 15 28Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Mitre Cleft Slash */}
            <path d="M22.5 14L28 19.5" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" />
            {/* Collar */}
            <path d="M16 31C18 33 27 33 29 31" stroke={strokeColor} strokeWidth="1.8" />
            {/* Base */}
            <path
              d="M11 36H34V40C34 41 33 42 32 42H13C12 42 11 41 11 40V36Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.2"
            />
          </svg>
        );

      case 'n':
        return (
          <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Knight Horse Profile */}
            <path
              d="M32 37C32 37 34 26 29 19C26 15 23 10 23 8C20.5 9 17 12 16.5 14C14.5 14 11 16 10 20C9.5 22 10.5 24 12 24C14 24 16 22 16.5 22C14 26 14 31 16 37H32Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Eye */}
            <circle cx="16" cy="17" r="1.8" fill={isWhite ? '#0F172A' : '#F8FAFC'} />
            {/* Mane Detail */}
            <path d="M25 14C23 18 24 22 27 26" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" />
            {/* Base */}
            <path
              d="M11.5 37H33.5V40C33.5 41 32.5 42 31.5 42H13.5C12.5 42 11.5 41 11.5 40V37Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.2"
            />
          </svg>
        );

      case 'p':
      default:
        return (
          <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Head Ball */}
            <circle cx="22.5" cy="13.5" r="5.5" fill={fillColor} stroke={strokeColor} strokeWidth="2.2" />
            {/* Neck & Body */}
            <path
              d="M19 19C17 21 16 25 15.5 32H29.5C29 25 28 21 26 19H19Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Collar */}
            <path d="M17.5 21H27.5" stroke={strokeColor} strokeWidth="1.8" />
            {/* Base */}
            <path
              d="M12 34H33V39C33 40.5 32 41.5 30.5 41.5H14.5C13 41.5 12 40.5 12 39V34Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.2"
            />
          </svg>
        );
    }
  };

  return (
    <div
      className={`relative flex items-center justify-center filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.35)] transition-transform select-none`}
    >
      {renderIcon()}
    </div>
  );
};

const createStandardBoard = (): Board => {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));

  // Row 0 = Rank 8 (Black Major Pieces)
  const blackMajor: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  blackMajor.forEach((type, col) => {
    board[0][col] = { type, color: 'b' };
  });

  // Row 1 = Rank 7 (Black Pawns)
  for (let col = 0; col < 8; col += 1) {
    board[1][col] = { type: 'p', color: 'b' };
  }

  // Row 6 = Rank 2 (White Pawns)
  for (let col = 0; col < 8; col += 1) {
    board[6][col] = { type: 'p', color: 'w' };
  }

  // Row 7 = Rank 1 (White Major Pieces)
  const whiteMajor: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  whiteMajor.forEach((type, col) => {
    board[7][col] = { type, color: 'w' };
  });

  return board;
};

const coordsToSquare = (row: number, col: number) => `${FILES[col]}${8 - row}`;
const squareToCoords = (square: string) => {
  const file = FILES.indexOf(square[0]);
  const row = 8 - Number(square[1]);
  return { row, col: file };
};

const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

const cloneBoard = (b: Board): Board => b.map((row) => row.map((cell) => (cell ? { ...cell } : null)));

// Valid moves generator for a piece
const getMovesForSquare = (board: Board, row: number, col: number): string[] => {
  const piece = board[row][col];
  if (!piece) return [];

  const moves: string[] = [];
  const { type, color } = piece;
  const enemyColor: PieceColor = color === 'w' ? 'b' : 'w';

  if (type === 'p') {
    // White moves upwards (-1 row), Black moves downwards (+1 row)
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;

    // 1 step forward
    const oneRow = row + dir;
    if (inBounds(oneRow, col) && !board[oneRow][col]) {
      moves.push(coordsToSquare(oneRow, col));
      // 2 steps forward from starting rank
      const twoRow = row + dir * 2;
      if (row === startRow && inBounds(twoRow, col) && !board[twoRow][col]) {
        moves.push(coordsToSquare(twoRow, col));
      }
    }

    // Diagonal captures
    [-1, 1].forEach((dc) => {
      const targetCol = col + dc;
      if (inBounds(oneRow, targetCol)) {
        const target = board[oneRow][targetCol];
        if (target && target.color === enemyColor) {
          moves.push(coordsToSquare(oneRow, targetCol));
        }
      }
    });
  } else if (type === 'n') {
    const jumps = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    jumps.forEach(([dr, dc]) => {
      const nr = row + dr;
      const nc = col + dc;
      if (inBounds(nr, nc)) {
        const target = board[nr][nc];
        if (!target || target.color === enemyColor) {
          moves.push(coordsToSquare(nr, nc));
        }
      }
    });
  } else if (type === 'b' || type === 'r' || type === 'q') {
    const directions: Array<[number, number]> = [];
    if (type === 'r' || type === 'q') {
      directions.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    }
    if (type === 'b' || type === 'q') {
      directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }

    directions.forEach(([dr, dc]) => {
      let nr = row + dr;
      let nc = col + dc;
      while (inBounds(nr, nc)) {
        const target = board[nr][nc];
        if (!target) {
          moves.push(coordsToSquare(nr, nc));
        } else {
          if (target.color === enemyColor) {
            moves.push(coordsToSquare(nr, nc));
          }
          break; // ray blocked
        }
        nr += dr;
        nc += dc;
      }
    });
  } else if (type === 'k') {
    const deltas = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1],
    ];
    deltas.forEach(([dr, dc]) => {
      const nr = row + dr;
      const nc = col + dc;
      if (inBounds(nr, nc)) {
        const target = board[nr][nc];
        if (!target || target.color === enemyColor) {
          moves.push(coordsToSquare(nr, nc));
        }
      }
    });
  }

  return moves;
};

// Find King position
const findKing = (board: Board, color: PieceColor): { row: number; col: number } | null => {
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const cell = board[r][c];
      if (cell && cell.type === 'k' && cell.color === color) {
        return { row: r, col: c };
      }
    }
  }
  return null;
};

// Check if a color is currently in check
const isKingInCheck = (board: Board, color: PieceColor): boolean => {
  const kingPos = findKing(board, color);
  if (!kingPos) return true; // King was captured

  const enemyColor: PieceColor = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = board[r][c];
      if (piece && piece.color === enemyColor) {
        const moves = getMovesForSquare(board, r, c);
        const kingSq = coordsToSquare(kingPos.row, kingPos.col);
        if (moves.includes(kingSq)) {
          return true;
        }
      }
    }
  }
  return false;
};

// Collect all legal moves for a player that don't leave king in check
const getAllLegalMoves = (board: Board, color: PieceColor) => {
  const allMoves: Array<{ from: string; to: string; piece: ChessPiece; score: number }> = [];

  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        const targets = getMovesForSquare(board, r, c);
        const fromSq = coordsToSquare(r, c);

        targets.forEach((toSq) => {
          const { row: tr, col: tc } = squareToCoords(toSq);
          const targetPiece = board[tr][tc];

          // Simulate move to ensure King is not in check
          const simulated = cloneBoard(board);
          simulated[tr][tc] = piece;
          simulated[r][c] = null;

          if (!isKingInCheck(simulated, color)) {
            // Heuristic scoring for AI
            let moveScore = 0;
            if (targetPiece) {
              moveScore += PIECE_VALUES[targetPiece.type] * 10 - PIECE_VALUES[piece.type];
            }
            // Center control bonus (d4, d5, e4, e5)
            if ((tr === 3 || tr === 4) && (tc === 3 || tc === 4)) {
              moveScore += 25;
            }
            // Advance pawns
            if (piece.type === 'p') {
              moveScore += color === 'w' ? (7 - tr) * 4 : tr * 4;
            }

            allMoves.push({
              from: fromSq,
              to: toSq,
              piece,
              score: moveScore + Math.floor(Math.random() * 8),
            });
          }
        });
      }
    }
  }

  return allMoves;
};

export const ChessGame: React.FC<{
  onBackToHub: () => void;
  aiConfig?: AiGameConfig | null;
}> = ({ onBackToHub, aiConfig }) => {
  const { updateStats } = useAuth();

  // Match and Color state: switches each game for the user!
  const [gameCount, setGameCount] = useState<number>(1);
  const [userColor, setUserColor] = useState<PieceColor>('w'); // Alternates 'w' <-> 'b'
  const [board, setBoard] = useState<Board>(() => createStandardBoard());
  const [turn, setTurn] = useState<PieceColor>('w'); // White always moves first
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [capturedByWhite, setCapturedByWhite] = useState<ChessPiece[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<ChessPiece[]>([]);
  const [gameState, setGameState] = useState<'playing' | 'checkmate' | 'draw' | 'king_lost'>('playing');
  const [winner, setWinner] = useState<PieceColor | null>(null);
  const hasRecordedStatsRef = useRef(false);

  const enemyColor: PieceColor = userColor === 'w' ? 'b' : 'w';
  const isAiTurn = Boolean(aiConfig && turn === enemyColor && gameState === 'playing');

  // Compute legal moves for current selection
  const legalMovesForSelected = useMemo(() => {
    if (!selectedSquare || gameState !== 'playing') return [];
    const { row, col } = squareToCoords(selectedSquare);
    const piece = board[row][col];
    if (!piece || piece.color !== turn) return [];

    const rawMoves = getMovesForSquare(board, row, col);
    // Filter moves that would leave king in check
    return rawMoves.filter((toSq) => {
      const { row: tr, col: tc } = squareToCoords(toSq);
      const simulated = cloneBoard(board);
      simulated[tr][tc] = piece;
      simulated[row][col] = null;
      return !isKingInCheck(simulated, turn);
    });
  }, [board, selectedSquare, turn, gameState]);

  // Check state
  const inCheck = useMemo(() => {
    return isKingInCheck(board, turn);
  }, [board, turn]);

  // Material evaluation
  const materialAdvantage = useMemo(() => {
    let whiteScore = 0;
    let blackScore = 0;
    board.forEach((r) =>
      r.forEach((c) => {
        if (c) {
          if (c.color === 'w') whiteScore += PIECE_VALUES[c.type];
          else blackScore += PIECE_VALUES[c.type];
        }
      })
    );
    const diff = whiteScore - blackScore;
    return {
      whiteLead: diff > 0 ? Math.round(diff / 100) : 0,
      blackLead: diff < 0 ? Math.round(Math.abs(diff) / 100) : 0,
    };
  }, [board]);

  // Perform move
  const executeMove = useCallback(
    (fromSq: string, toSq: string) => {
      const { row: fr, col: fc } = squareToCoords(fromSq);
      const { row: tr, col: tc } = squareToCoords(toSq);
      const piece = board[fr][fc];
      if (!piece) return;

      const capturedPiece = board[tr][tc];
      const nextBoard = cloneBoard(board);

      // Place moving piece
      nextBoard[tr][tc] = piece;
      nextBoard[fr][fc] = null;

      // Pawn promotion (auto-promote to Queen on back rank)
      if (piece.type === 'p' && (tr === 0 || tr === 7)) {
        nextBoard[tr][tc] = { type: 'q', color: piece.color };
      }

      // Track captured pieces
      if (capturedPiece) {
        if (piece.color === 'w') {
          setCapturedByWhite((prev) => [...prev, capturedPiece]);
        } else {
          setCapturedByBlack((prev) => [...prev, capturedPiece]);
        }
        soundManager.playPop();
      } else {
        soundManager.playButton();
      }

      // Record move
      const notation = `${piece.type.toUpperCase()}${fromSq}→${toSq}${capturedPiece ? ' (x)' : ''}`;
      setMoveHistory((prev) => [
        ...prev,
        {
          from: fromSq,
          to: toSq,
          piece,
          captured: capturedPiece,
          notation,
        },
      ]);

      const nextTurn: PieceColor = turn === 'w' ? 'b' : 'w';
      setBoard(nextBoard);
      setSelectedSquare(null);
      setLastMove({ from: fromSq, to: toSq });

      // Check game-ending conditions for the next player
      const opponentLegalMoves = getAllLegalMoves(nextBoard, nextTurn);
      const opponentInCheck = isKingInCheck(nextBoard, nextTurn);
      const opponentKingFound = findKing(nextBoard, nextTurn);

      if (!opponentKingFound) {
        setGameState('king_lost');
        setWinner(piece.color);
      } else if (opponentLegalMoves.length === 0) {
        if (opponentInCheck) {
          setGameState('checkmate');
          setWinner(piece.color);
        } else {
          setGameState('draw');
        }
      } else {
        setTurn(nextTurn);
      }
    },
    [board, turn]
  );

  // Handle cell clicks
  const handleCellClick = (sq: string) => {
    if (gameState !== 'playing' || (aiConfig && turn === enemyColor)) return;

    const { row, col } = squareToCoords(sq);
    const cell = board[row][col];

    if (selectedSquare) {
      if (legalMovesForSelected.includes(sq)) {
        executeMove(selectedSquare, sq);
        return;
      }
      if (cell && cell.color === turn) {
        setSelectedSquare(sq);
        return;
      }
      setSelectedSquare(null);
      return;
    }

    if (cell && cell.color === turn) {
      setSelectedSquare(sq);
      soundManager.playTick();
    }
  };

  // AI response move
  useEffect(() => {
    if (!isAiTurn || gameState !== 'playing') return;

    const timer = window.setTimeout(() => {
      const aiLegalMoves = getAllLegalMoves(board, enemyColor);
      if (aiLegalMoves.length === 0) {
        if (isKingInCheck(board, enemyColor)) {
          setGameState('checkmate');
          setWinner(userColor);
        } else {
          setGameState('draw');
        }
        return;
      }

      // Sort by best score descending
      aiLegalMoves.sort((a, b) => b.score - a.score);
      const bestMove = aiLegalMoves[0];
      executeMove(bestMove.from, bestMove.to);
    }, 550);

    return () => window.clearTimeout(timer);
  }, [isAiTurn, board, enemyColor, userColor, gameState, executeMove]);

  // Handle stat persistence on game over
  useEffect(() => {
    if (gameState !== 'playing' && !hasRecordedStatsRef.current) {
      hasRecordedStatsRef.current = true;
      const userWon = winner === userColor;
      const isDraw = gameState === 'draw';
      const earnedScore = userWon ? 350 : isDraw ? 150 : 60;

      if (userWon) {
        soundManager.playVictory();
        confetti({
          particleCount: 130,
          spread: 85,
          origin: { y: 0.6 },
        });
      } else {
        soundManager.playGameOver();
      }

      updateStats(
        {
          gamesPlayed: 1,
          wins: userWon ? 1 : 0,
          losses: !userWon && !isDraw ? 1 : 0,
          totalScore: earnedScore,
        },
        userWon,
        'Chess'
      );
    }
  }, [gameState, winner, userColor, updateStats]);

  // Restart match and auto-switch color for the next game!
  const handleNewGame = (switchSides: boolean = true) => {
    const nextColor: PieceColor = switchSides ? (userColor === 'w' ? 'b' : 'w') : userColor;
    setUserColor(nextColor);
    setGameCount((prev) => prev + 1);
    setBoard(createStandardBoard());
    setTurn('w'); // White always moves first in standard chess
    setSelectedSquare(null);
    setLastMove(null);
    setMoveHistory([]);
    setCapturedByWhite([]);
    setCapturedByBlack([]);
    setGameState('playing');
    setWinner(null);
    hasRecordedStatsRef.current = false;
    soundManager.playTurnStart();
  };

  // Toggle user color / Flip Board perspective
  const toggleUserColor = () => {
    handleNewGame(true);
  };

  // Build 8x8 squares oriented for the user's color
  // When user is White: Rows 0..7 (Row 7/Rank 1 at bottom) and Cols 0..7 (a to h)
  // When user is Black: Rows 7..0 (Row 0/Rank 8 at bottom) and Cols 7..0 (h to a)
  const renderedSquares = useMemo(() => {
    const rows = userColor === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    const cols = userColor === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

    return rows.map((r) =>
      cols.map((c) => {
        const sq = coordsToSquare(r, c);
        const cell = board[r][c];
        const isSelected = selectedSquare === sq;
        const isLegal = legalMovesForSelected.includes(sq);
        const isLastMove = lastMove?.from === sq || lastMove?.to === sq;
        // Standard chess board coloring: (row + col) % 2 === 1 is dark square
        const isDark = (r + c) % 2 === 1;
        const isKingInDanger = cell && cell.type === 'k' && cell.color === turn && inCheck;

        return {
          sq,
          row: r,
          col: c,
          cell,
          isSelected,
          isLegal,
          isLastMove,
          isDark,
          isKingInDanger,
        };
      })
    );
  }, [board, userColor, selectedSquare, legalMovesForSelected, lastMove, turn, inCheck]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-6xl mx-auto space-y-4 font-sans"
    >
      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0f172a] p-3.5 sm:p-4 rounded-[26px] border border-slate-700 shadow-[0_18px_40px_rgba(15,23,42,0.4)]">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBackToHub}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-700 flex items-center justify-center border border-violet-400/40 shadow-md">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">Grandmaster Chess</h2>
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-violet-500/20 text-violet-300 border border-violet-400/40">
                  Game #{gameCount} • {aiConfig ? 'VS AI' : '1v1 Match'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Pure black & pure white pieces • Auto side-switching per game • Live checkmate engine
              </p>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold">
          <button
            onClick={toggleUserColor}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-sm hover:border-violet-500/50"
            title="Switch sides between Pure White and Pure Black"
          >
            <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
            <span>Switch Sides</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 shadow-sm">
            <span
              className={`w-3 h-3 rounded-full border ${
                turn === 'w' ? 'bg-white border-slate-900 ring-2 ring-white/50' : 'bg-black border-slate-400 ring-2 ring-black/50'
              }`}
            />
            <span className="capitalize">{turn === userColor ? 'Your Turn' : aiConfig ? 'AI Thinking...' : 'Opponent Turn'}</span>
            {inCheck && gameState === 'playing' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-500/25 text-rose-300 border border-rose-500/40 animate-pulse">
                CHECK!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Chess Arena Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
        {/* Left Column: Board & Captured Trays */}
        <div className="rounded-[28px] border border-slate-700/90 bg-[#0f172a] p-3.5 sm:p-5 shadow-[0_20px_45px_rgba(15,23,42,0.45)] space-y-3">
          {/* Top Enemy Status Bar */}
          <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs font-bold">
            <div className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full border ${
                  enemyColor === 'w' ? 'bg-white border-slate-950 ring-1 ring-white/60' : 'bg-black border-slate-500 ring-1 ring-slate-800'
                }`}
              />
              <span className="text-slate-200">{aiConfig ? 'AI Engine (Opponent)' : 'Opponent'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                Playing as {enemyColor === 'w' ? 'Pure White' : 'Pure Black'}
              </span>
            </div>

            {/* Captured Pieces by Opponent */}
            <div className="flex items-center gap-1">
              {(enemyColor === 'w' ? capturedByWhite : capturedByBlack).map((p, idx) => (
                <div key={`enemy-cap-${idx}`} className="w-5 h-5 -ml-1">
                  <ChessPieceIcon type={p.type} color={p.color} className="w-full h-full p-0" />
                </div>
              ))}
              {(enemyColor === 'w' ? materialAdvantage.whiteLead : materialAdvantage.blackLead) > 0 && (
                <span className="text-[10px] font-black text-amber-400 ml-1">
                  +{(enemyColor === 'w' ? materialAdvantage.whiteLead : materialAdvantage.blackLead)}
                </span>
              )}
            </div>
          </div>

          {/* Precision 8x8 Chess Board */}
          <div className="relative mx-auto max-w-[620px] w-full aspect-square overflow-hidden rounded-[20px] border-[10px] border-[#2d2218] bg-[#1a130e] shadow-[0_16px_36px_rgba(0,0,0,0.6),inset_0_0_15px_rgba(0,0,0,0.8)]">
            <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
              {renderedSquares.flat().map((sqData) => {
                const { sq, cell, isSelected, isLegal, isLastMove, isDark, isKingInDanger } = sqData;

                // Precision tournament board coloring: Classic high-contrast Birch / Walnut
                const squareBg = isDark ? 'bg-[#769656]' : 'bg-[#eeeed2]';
                const textColor = isDark ? 'text-[#eeeed2]' : 'text-[#769656]';

                return (
                  <button
                    key={sq}
                    onClick={() => handleCellClick(sq)}
                    className={`relative flex items-center justify-center p-0 transition-all select-none focus:outline-none ${squareBg} ${
                      isSelected ? 'ring-4 ring-amber-400/90 z-20 shadow-lg' : ''
                    } ${isLastMove && !isSelected ? 'bg-amber-300/30' : ''} ${
                      isKingInDanger ? 'bg-rose-500/60 ring-4 ring-rose-500 animate-pulse z-10' : ''
                    }`}
                  >
                    {/* Rank Indicator on File a / leftmost column */}
                    {(userColor === 'w' ? sq[0] === 'a' : sq[0] === 'h') && (
                      <span className={`absolute top-0.5 left-1 text-[9px] font-black leading-none opacity-60 ${textColor}`}>
                        {sq[1]}
                      </span>
                    )}

                    {/* File Indicator on Rank 1 / bottom row */}
                    {(userColor === 'w' ? sq[1] === '1' : sq[1] === '8') && (
                      <span className={`absolute bottom-0.5 right-1 text-[9px] font-black leading-none opacity-60 ${textColor}`}>
                        {sq[0]}
                      </span>
                    )}

                    {/* Legal Move Dot (Empty Square) */}
                    {isLegal && !cell && (
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-700/70 ring-2 ring-white/50 z-20 shadow-sm pointer-events-none" />
                    )}

                    {/* Legal Capture Target Ring (Occupied Square) */}
                    {isLegal && cell && (
                      <span className="absolute inset-1 rounded-full border-4 border-rose-500/80 bg-rose-500/20 ring-1 ring-white/50 z-20 pointer-events-none" />
                    )}

                    {/* Chess Piece Vector Icon */}
                    {cell && (
                      <motion.div
                        layout
                        initial={{ scale: 0.9, opacity: 0.8 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: cell.color === turn ? 1.08 : 1 }}
                        whileTap={{ scale: cell.color === turn ? 0.94 : 1 }}
                        className="w-full h-full flex items-center justify-center relative z-10 cursor-pointer"
                      >
                        <ChessPieceIcon type={cell.type} color={cell.color} />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Game Over Banner Overlay */}
            <AnimatePresence>
              {gameState !== 'playing' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 space-y-4"
                >
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-xl ${
                      winner === userColor
                        ? 'bg-gradient-to-tr from-amber-400 to-amber-600 border-amber-300 text-slate-950'
                        : gameState === 'draw'
                        ? 'bg-slate-700 border-slate-500 text-white'
                        : 'bg-gradient-to-tr from-rose-600 to-red-700 border-rose-400 text-white'
                    }`}
                  >
                    {winner === userColor ? <Trophy className="w-8 h-8" /> : <Shield className="w-8 h-8" />}
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-white">
                      {winner === userColor
                        ? 'Checkmate! Victory!'
                        : gameState === 'draw'
                        ? 'Draw / Stalemate!'
                        : 'Defeat — Checkmated'}
                    </h3>
                    <p className="text-sm text-slate-300 font-medium mt-1">
                      {winner === userColor
                        ? `You defeated ${aiConfig ? 'the AI' : 'Opponent'} as ${userColor === 'w' ? 'White' : 'Black'}! (+350 PTS)`
                        : gameState === 'draw'
                        ? 'Both players fought to a standstill (+150 PTS)'
                        : `Opponent secured checkmate victory. (+60 PTS)`}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleNewGame(true)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-violet-600/30 flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Next Game (Switch to {userColor === 'w' ? 'Black' : 'White'})
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Player Status Bar */}
          <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs font-bold">
            <div className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full border ${
                  userColor === 'w' ? 'bg-white border-slate-950 ring-1 ring-white/60' : 'bg-black border-slate-500 ring-1 ring-slate-800'
                }`}
              />
              <span className="text-white font-black">You (Player)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-400/40">
                Playing as {userColor === 'w' ? 'Pure White' : 'Pure Black'}
              </span>
            </div>

            {/* Captured Pieces by User */}
            <div className="flex items-center gap-1">
              {(userColor === 'w' ? capturedByWhite : capturedByBlack).map((p, idx) => (
                <div key={`user-cap-${idx}`} className="w-5 h-5 -ml-1">
                  <ChessPieceIcon type={p.type} color={p.color} className="w-full h-full p-0" />
                </div>
              ))}
              {(userColor === 'w' ? materialAdvantage.whiteLead : materialAdvantage.blackLead) > 0 && (
                <span className="text-[10px] font-black text-amber-400 ml-1">
                  +{(userColor === 'w' ? materialAdvantage.whiteLead : materialAdvantage.blackLead)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Controls, Match Status & Move History */}
        <div className="space-y-4">
          {/* Action Card */}
          <div className="rounded-[28px] border border-slate-700/90 bg-[#0f172a] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.4)] space-y-3">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-violet-400" /> Match Controls
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleNewGame(false)}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
                Reset Match
              </button>
              <button
                onClick={toggleUserColor}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-200 text-xs font-bold border border-violet-500/40 transition-all shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 text-violet-300" />
                Switch Side
              </button>
            </div>

            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-400">Current Turn:</span>
                <span className="text-white capitalize font-black">
                  {turn === 'w' ? 'Pure White' : 'Pure Black'}
                </span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-400">Game Session:</span>
                <span className="text-amber-400 font-black">#{gameCount}</span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-400">Side Rule:</span>
                <span className="text-slate-300 text-[11px]">Alternates every game</span>
              </div>
            </div>
          </div>

          {/* Move History Log */}
          <div className="rounded-[28px] border border-slate-700/90 bg-[#0f172a] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.4)] space-y-3">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-amber-400" /> Move Transcript
            </h3>

            <div className="h-44 overflow-y-auto space-y-1.5 pr-1 text-xs font-mono scrollbar-thin">
              {moveHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center text-xs">
                  <span>No moves played yet.</span>
                  <span className="text-[10px] text-slate-600">White moves first</span>
                </div>
              ) : (
                moveHistory.map((mv, idx) => (
                  <div
                    key={`mv-${idx}`}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-200"
                  >
                    <span className="text-slate-500 font-bold">#{idx + 1}</span>
                    <span className="font-bold flex items-center gap-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          mv.piece.color === 'w' ? 'bg-white' : 'bg-black border border-slate-600'
                        }`}
                      />
                      {mv.notation}
                    </span>
                    {mv.captured && (
                      <span className="text-[10px] text-rose-400 font-black uppercase">
                        +x{mv.captured.type.toUpperCase()}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
