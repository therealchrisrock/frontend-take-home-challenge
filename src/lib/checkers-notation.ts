import type { Move, Position, Board, Piece } from './game-logic';

/**
 * Convert a board position to standard checkers notation.
 * Standard checkers notation numbers squares from 1-32 (for 8x8 board) on dark squares only.
 * Numbering goes from top-left to bottom-right, only counting dark squares.
 */
export function positionToSquareNumber(position: Position, boardSize = 8): number {
  const { row, col } = position;
  // Calculate the square number (1-based) for dark squares only
  // Dark squares are where (row + col) % 2 === 1
  const squaresBefore = Math.floor(row * boardSize / 2);
  const squareInRow = Math.floor(col / 2);
  
  // For odd rows, dark squares are at even columns
  // For even rows, dark squares are at odd columns
  if (row % 2 === 0) {
    // Even row: dark squares at odd columns (1, 3, 5, 7)
    return squaresBefore + squareInRow + 1;
  } else {
    // Odd row: dark squares at even columns (0, 2, 4, 6)
    return squaresBefore + squareInRow + 1;
  }
}

/**
 * Convert square number back to board position
 */
export function squareNumberToPosition(squareNum: number, boardSize = 8): Position {
  const squareIndex = squareNum - 1; // Convert to 0-based
  const row = Math.floor(squareIndex / (boardSize / 2));
  const colIndex = squareIndex % (boardSize / 2);
  
  // Calculate actual column based on row parity
  let col: number;
  if (row % 2 === 0) {
    // Even row: dark squares at odd columns
    col = colIndex * 2 + 1;
  } else {
    // Odd row: dark squares at even columns
    col = colIndex * 2;
  }
  
  return { row, col };
}

export interface NotatedMove {
  notation: string;
  move: Move;
  isCapture: boolean;
  isKinging: boolean;
  capturedPieces?: Position[];
}

/**
 * Convert a move to standard checkers notation.
 * Format: "from-to" for regular moves, "fromxto" for captures
 * Multiple captures: "fromxmidxto"
 */
export function moveToNotation(
  move: Move, 
  board: Board, 
  boardSize: number,
  wasKinged = false
): NotatedMove {
  const fromSquare = positionToSquareNumber(move.from, boardSize);
  const toSquare = positionToSquareNumber(move.to, boardSize);
  const isCapture = move.captures && move.captures.length > 0;
  
  let notation: string;
  
  if (isCapture && move.path && move.path.length > 2) {
    // Multi-jump capture - show all intermediate squares
    const squares = move.path.map(pos => positionToSquareNumber(pos, boardSize));
    notation = squares.join('x');
  } else if (isCapture) {
    // Single capture
    notation = `${fromSquare}x${toSquare}`;
  } else {
    // Regular move
    notation = `${fromSquare}-${toSquare}`;
  }
  
  // Add king annotation if piece was kinged
  if (wasKinged) {
    notation += '(K)';
  }
  
  return {
    notation,
    move,
    isCapture: !!isCapture,
    isKinging: wasKinged,
    capturedPieces: move.captures
  };
}

/**
 * Parse notation string back to positions
 * Returns null if notation is invalid
 */
export function notationToMove(notation: string, boardSize = 8): Move | null {
  try {
    // Remove king annotation if present
    const cleanNotation = notation.replace('(K)', '');
    
    // Check if it's a capture (contains 'x') or regular move (contains '-')
    if (cleanNotation.includes('x')) {
      // Capture move
      const squares = cleanNotation.split('x').map(s => parseInt(s.trim()));
      if (squares.some(isNaN) || squares.length < 2) return null;
      
      const positions = squares.map(sq => squareNumberToPosition(sq, boardSize));
      const from = positions[0]!;
      const to = positions[positions.length - 1]!;
      
      // For multi-jump, include the full path
      const path = positions.length > 2 ? positions : undefined;
      
      return { from, to, path };
    } else if (cleanNotation.includes('-')) {
      // Regular move
      const [fromStr, toStr] = cleanNotation.split('-');
      const fromSquare = parseInt(fromStr!.trim());
      const toSquare = parseInt(toStr!.trim());
      
      if (isNaN(fromSquare) || isNaN(toSquare)) return null;
      
      return {
        from: squareNumberToPosition(fromSquare, boardSize),
        to: squareNumberToPosition(toSquare, boardSize)
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Format a complete game history into standard notation
 */
export interface GameHistoryEntry {
  moveNumber: number;
  redMove?: NotatedMove;
  blackMove?: NotatedMove;
}

export function formatGameHistory(moves: NotatedMove[]): GameHistoryEntry[] {
  const history: GameHistoryEntry[] = [];
  
  for (let i = 0; i < moves.length; i += 2) {
    const entry: GameHistoryEntry = {
      moveNumber: Math.floor(i / 2) + 1,
      redMove: moves[i]
    };
    
    if (i + 1 < moves.length) {
      entry.blackMove = moves[i + 1];
    }
    
    history.push(entry);
  }
  
  return history;
}

/**
 * Convert history entries back to a string format (for export/saving)
 */
export function historyToString(history: GameHistoryEntry[]): string {
  return history.map(entry => {
    const parts = [`${entry.moveNumber}.`];
    if (entry.redMove) parts.push(entry.redMove.notation);
    if (entry.blackMove) parts.push(entry.blackMove.notation);
    return parts.join(' ');
  }).join(' ');
}

/**
 * Parse a string format back to history entries
 */
export function stringToHistory(str: string, boardSize = 8): GameHistoryEntry[] {
  const history: GameHistoryEntry[] = [];
  const tokens = str.split(/\s+/).filter(t => t.length > 0);
  
  let currentEntry: GameHistoryEntry | null = null;
  let expectingRed = false;
  let expectingBlack = false;
  
  for (const token of tokens) {
    // Check if it's a move number
    if (token.endsWith('.')) {
      const moveNum = parseInt(token.slice(0, -1));
      if (!isNaN(moveNum)) {
        if (currentEntry) history.push(currentEntry);
        currentEntry = { moveNumber: moveNum };
        expectingRed = true;
        expectingBlack = false;
        continue;
      }
    }
    
    // Otherwise it should be a move notation
    const move = notationToMove(token, boardSize);
    if (move && currentEntry) {
      const notatedMove: NotatedMove = {
        notation: token,
        move,
        isCapture: token.includes('x'),
        isKinging: token.includes('(K)')
      };
      
      if (expectingRed) {
        currentEntry.redMove = notatedMove;
        expectingRed = false;
        expectingBlack = true;
      } else if (expectingBlack) {
        currentEntry.blackMove = notatedMove;
        expectingBlack = false;
      }
    }
  }
  
  if (currentEntry) history.push(currentEntry);
  
  return history;
}