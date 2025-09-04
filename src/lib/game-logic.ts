export type PieceColor = 'red' | 'black';
export type PieceType = 'regular' | 'king';

export interface Piece {
  color: PieceColor;
  type: PieceType;
}

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  captures?: Position[];
}

export type Board = (Piece | null)[][];

/**
 * Create an 8x8 checkers board with initial piece placement.
 * Black pieces start on rows 0-2; red pieces on rows 5-7 (dark squares).
 * @returns Board initialized for a new game.
 */
export function createInitialBoard(): Board {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Place black pieces (top)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        set(board, row, col, { color: 'black', type: 'regular' });
      }
    }
  }
  
  // Place red pieces (bottom)
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        set(board, row, col, { color: 'red', type: 'regular' });
      }
    }
  }
  
  return board;
}

/**
 * Check if a given position is inside the 8x8 board bounds.
 * @param row Row index (0-7)
 * @param col Column index (0-7)
 * @returns True if the square is on the board.
 */
export function isValidSquare(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Typed direction tuples for clarity and safety
type Direction = readonly [number, number];
const KING_DIRECTIONS: readonly Direction[] = [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const;
const RED_DIRECTIONS: readonly Direction[] = [[-1, -1], [-1, 1]] as const;
const BLACK_DIRECTIONS: readonly Direction[] = [[1, -1], [1, 1]] as const;

/**
 * Safely read a board cell. Returns null if out of bounds or empty.
 * @param board The game board
 * @param row Row index
 * @param col Column index
 * @returns The piece at the square, or null
 */
function at(board: Board, row: number, col: number): Piece | null {
  return isValidSquare(row, col) ? board[row]?.[col] ?? null : null;
}

/**
 * Safely write a value into a board cell. No-op if out of bounds.
 * @param board The game board
 * @param row Row index
 * @param col Column index
 * @param value The piece to place, or null to clear
 */
function set(board: Board, row: number, col: number, value: Piece | null): void {
  if (isValidSquare(row, col)) {
    (board[row] as (Piece | null)[])[col] = value;
  }
}

/**
 * Compute valid moves for a given piece position for the current player.
 * If any captures exist for the player, only capture moves from this
 * position are returned; otherwise, regular diagonal moves are returned.
 * @param board The game board
 * @param position Starting position
 * @param currentPlayer Player whose turn it is
 * @returns List of legal moves from the position
 */
export function getValidMoves(board: Board, position: Position, currentPlayer: PieceColor): Move[] {
  const piece = at(board, position.row, position.col);
  if (!piece || piece.color !== currentPlayer) return [];
  
  const moves: Move[] = [];
  const mustCapture = getMustCapturePositions(board, currentPlayer);
  
  if (mustCapture.length > 0) {
    // If there are mandatory captures, only return capture moves
    if (mustCapture.some(pos => pos.row === position.row && pos.col === position.col)) {
      return getCaptureMoves(board, position, piece);
    }
    return [];
  }
  
  // Regular moves
  const directions: readonly Direction[] = piece.type === 'king'
    ? KING_DIRECTIONS
    : piece.color === 'red'
      ? RED_DIRECTIONS
      : BLACK_DIRECTIONS;
  
  for (const [dRow, dCol] of directions) {
    const newRow = position.row + dRow;
    const newCol = position.col + dCol;
    
    if (isValidSquare(newRow, newCol) && at(board, newRow, newCol) === null) {
      moves.push({
        from: position,
        to: { row: newRow, col: newCol }
      });
    }
  }
  
  return moves;
}

/**
 * Generate all capture sequences (including multi-jumps) from a position.
 * Returns composite moves with an ordered list of captured squares.
 * @param board The game board
 * @param position Starting position
 * @param piece The piece to move
 * @returns List of capture moves (possibly multi-jump)
 */
export function getCaptureMoves(board: Board, position: Position, piece: Piece): Move[] {
  const moves: Move[] = [];
  // In American checkers, regular pieces can only capture forward
  // Kings can capture in all directions
  const directions: readonly Direction[] = piece.type === 'king'
    ? KING_DIRECTIONS
    : piece.color === 'red'
      ? RED_DIRECTIONS
      : BLACK_DIRECTIONS;
  
  for (const [dRow, dCol] of directions) {
    const captureRow = position.row + dRow;
    const captureCol = position.col + dCol;
    const landRow = position.row + (dRow * 2);
    const landCol = position.col + (dCol * 2);
    
    if (
      isValidSquare(landRow, landCol) &&
      at(board, captureRow, captureCol) &&
      at(board, captureRow, captureCol)!.color !== piece.color &&
      at(board, landRow, landCol) === null
    ) {
      // Check for multiple jumps
      const tempBoard = structuredClone(board);
      set(tempBoard, landRow, landCol, piece);
      set(tempBoard, position.row, position.col, null);
      set(tempBoard, captureRow, captureCol, null);
      
      const furtherCaptures = getCaptureMoves(tempBoard, { row: landRow, col: landCol }, piece);
      
      if (furtherCaptures.length > 0) {
        // Add multi-jump moves
        for (const furtherMove of furtherCaptures) {
          moves.push({
            from: position,
            to: furtherMove.to,
            captures: [{ row: captureRow, col: captureCol }, ...(furtherMove.captures || [])]
          });
        }
      } else {
        // Single capture
        moves.push({
          from: position,
          to: { row: landRow, col: landCol },
          captures: [{ row: captureRow, col: captureCol }]
        });
      }
    }
  }
  
  return moves;
}

/**
 * Find all positions for the current player that have at least one capture.
 * @param board The game board
 * @param currentPlayer Player to check
 * @returns Positions that must capture according to rules
 */
export function getMustCapturePositions(board: Board, currentPlayer: PieceColor): Position[] {
  const positions: Position[] = [];
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = at(board, row, col);
      if (piece && piece.color === currentPlayer) {
        const captures = getCaptureMoves(board, { row, col }, piece);
        if (captures.length > 0) {
          positions.push({ row, col });
        }
      }
    }
  }
  
  return positions;
}

/**
 * Apply a move to the board, removing captured pieces and promoting kings.
 * Returns a new board; does not mutate the input board.
 * @param board The current game board
 * @param move The move to apply
 * @returns A new board after the move
 */
export function makeMove(board: Board, move: Move): Board {
  const newBoard = structuredClone(board);
  const piece = at(newBoard, move.from.row, move.from.col);
  
  if (!piece) return board;
  
  // Move piece
  set(newBoard, move.to.row, move.to.col, piece);
  set(newBoard, move.from.row, move.from.col, null);
  
  // Remove captured pieces
  if (move.captures) {
    for (const capture of move.captures) {
      set(newBoard, capture.row, capture.col, null);
    }
  }
  
  // King promotion
  if (piece.type === 'regular') {
    if ((piece.color === 'red' && move.to.row === 0) ||
        (piece.color === 'black' && move.to.row === 7)) {
      set(newBoard, move.to.row, move.to.col, { ...piece, type: 'king' });
    }
  }
  
  return newBoard;
}

/**
 * Determine if the game has a winner based on pieces and legal moves.
 * @param board The game board
 * @returns 'red' or 'black' if a winner exists, 'draw' if drawn, or null
 */
export function checkWinner(board: Board): PieceColor | 'draw' | null {
  let redCount = 0;
  let blackCount = 0;
  let redHasMoves = false;
  let blackHasMoves = false;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = at(board, row, col);
      if (piece) {
        if (piece.color === 'red') {
          redCount++;
          if (!redHasMoves) {
            const moves = getValidMoves(board, { row, col }, 'red');
            if (moves.length > 0) redHasMoves = true;
          }
        } else {
          blackCount++;
          if (!blackHasMoves) {
            const moves = getValidMoves(board, { row, col }, 'black');
            if (moves.length > 0) blackHasMoves = true;
          }
        }
      }
    }
  }
  
  if (redCount === 0 || !redHasMoves) return 'black';
  if (blackCount === 0 || !blackHasMoves) return 'red';
  
  return null;
}

/**
 * Choose a simple AI move for the given color.
 * Prefers any available capture; otherwise chooses a random legal move.
 * @param board The game board
 * @param color The AI piece color
 * @returns A selected move, or null if no moves
 */
export function getRandomAIMove(board: Board, color: PieceColor): Move | null {
  const allMoves: Move[] = [];
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = at(board, row, col);
      if (piece && piece.color === color) {
        const moves = getValidMoves(board, { row, col }, color);
        allMoves.push(...moves);
      }
    }
  }
  
  if (allMoves.length === 0) return null;
  
  // Prefer captures
  const captureMoves = allMoves.filter(move => move.captures && move.captures.length > 0);
  if (captureMoves.length > 0) {
    return captureMoves[Math.floor(Math.random() * captureMoves.length)] || null;
  }
  
  return allMoves[Math.floor(Math.random() * allMoves.length)] || null;
}