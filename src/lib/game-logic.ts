import { type BoardConfig, getBoardConfig } from './board-config';

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
  path?: Position[]; // Full path for multi-jump sequences, including from and to
}

export type Board = (Piece | null)[][];

/**
 * Create a checkers board with initial piece placement based on configuration.
 * Black pieces start at the top; red pieces at the bottom (dark squares only).
 * @param config Board configuration (defaults to American checkers)
 * @returns Board initialized for a new game.
 */
export function createInitialBoard(config: BoardConfig = getBoardConfig('american')): Board {
  const board: Board = Array(config.size).fill(null).map(() => Array(config.size).fill(null));
  
  // Place black pieces (top)
  for (let row = 0; row < config.pieceRows; row++) {
    for (let col = 0; col < config.size; col++) {
      if ((row + col) % 2 === 1) {
        set(board, row, col, { color: 'black', type: 'regular' }, config);
      }
    }
  }
  
  // Place red pieces (bottom)
  const redStartRow = config.size - config.pieceRows;
  for (let row = redStartRow; row < config.size; row++) {
    for (let col = 0; col < config.size; col++) {
      if ((row + col) % 2 === 1) {
        set(board, row, col, { color: 'red', type: 'regular' }, config);
      }
    }
  }
  
  return board;
}

/**
 * Check if a given position is inside the board bounds.
 * @param row Row index
 * @param col Column index
 * @param config Board configuration (defaults to American checkers)
 * @returns True if the square is on the board.
 */
export function isValidSquare(row: number, col: number, config: BoardConfig = getBoardConfig('american')): boolean {
  return row >= 0 && row < config.size && col >= 0 && col < config.size;
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
 * @param config Board configuration (defaults to American checkers)
 * @returns The piece at the square, or null
 */
function at(board: Board, row: number, col: number, config: BoardConfig = getBoardConfig('american')): Piece | null {
  return isValidSquare(row, col, config) ? board[row]?.[col] ?? null : null;
}

/**
 * Safely write a value into a board cell. No-op if out of bounds.
 * @param board The game board
 * @param row Row index
 * @param col Column index
 * @param value The piece to place, or null to clear
 * @param config Board configuration (defaults to American checkers)
 */
function set(board: Board, row: number, col: number, value: Piece | null, config: BoardConfig = getBoardConfig('american')): void {
  if (isValidSquare(row, col, config)) {
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
 * @param config Board configuration (defaults to American checkers)
 * @returns List of legal moves from the position
 */
export function getValidMoves(board: Board, position: Position, currentPlayer: PieceColor, config: BoardConfig = getBoardConfig('american')): Move[] {
  const piece = at(board, position.row, position.col, config);
  if (!piece || piece.color !== currentPlayer) return [];
  
  const moves: Move[] = [];
  const mustCapture = getMustCapturePositions(board, currentPlayer, config);
  
  if (mustCapture.length > 0) {
    // If there are mandatory captures, only return capture moves
    if (mustCapture.some(pos => pos.row === position.row && pos.col === position.col)) {
      return getCaptureMoves(board, position, piece, config);
    }
    return [];
  }
  
  // Regular moves
  const directions: readonly Direction[] = piece.type === 'king'
    ? KING_DIRECTIONS
    : piece.color === 'red'
      ? RED_DIRECTIONS
      : BLACK_DIRECTIONS;
  
  if (piece.type === 'king' && config.flyingKings) {
    // Flying kings can move multiple squares in a diagonal
    for (const [dRow, dCol] of directions) {
      let distance = 1;
      while (true) {
        const newRow = position.row + (dRow * distance);
        const newCol = position.col + (dCol * distance);
        
        if (!isValidSquare(newRow, newCol, config)) break;
        
        const targetSquare = at(board, newRow, newCol, config);
        if (targetSquare === null) {
          moves.push({
            from: position,
            to: { row: newRow, col: newCol }
          });
          distance++;
        } else {
          // Can't move through pieces
          break;
        }
      }
    }
  } else {
    // Regular movement (one square only)
    for (const [dRow, dCol] of directions) {
      const newRow = position.row + dRow;
      const newCol = position.col + dCol;
      
      if (isValidSquare(newRow, newCol, config) && at(board, newRow, newCol, config) === null) {
        moves.push({
          from: position,
          to: { row: newRow, col: newCol }
        });
      }
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
 * @param config Board configuration (defaults to American checkers)
 * @returns List of capture moves (possibly multi-jump)
 */
export function getCaptureMoves(board: Board, position: Position, piece: Piece, config: BoardConfig = getBoardConfig('american')): Move[] {
  const moves: Move[] = [];
  // In American checkers, regular pieces can only capture forward
  // Kings can capture in all directions
  const directions: readonly Direction[] = piece.type === 'king'
    ? KING_DIRECTIONS
    : piece.color === 'red'
      ? RED_DIRECTIONS
      : BLACK_DIRECTIONS;
  
  if (piece.type === 'king' && config.flyingKings) {
    // Flying kings can capture at any distance along a diagonal
    for (const [dRow, dCol] of directions) {
      let captureDistance = 1;
      let capturedPiece: Position | null = null;
      
      // Find the first opponent piece in this direction
      while (true) {
        const checkRow = position.row + (dRow * captureDistance);
        const checkCol = position.col + (dCol * captureDistance);
        
        if (!isValidSquare(checkRow, checkCol, config)) break;
        
        const pieceAtSquare = at(board, checkRow, checkCol, config);
        if (pieceAtSquare) {
          if (pieceAtSquare.color !== piece.color && !capturedPiece) {
            // Found an opponent piece to capture
            capturedPiece = { row: checkRow, col: checkCol };
            captureDistance++;
            break;
          } else {
            // Can't capture own piece or jump over multiple pieces
            break;
          }
        }
        captureDistance++;
      }
      
      // If we found a piece to capture, check landing squares
      if (capturedPiece) {
        let landDistance = captureDistance;
        while (true) {
          const landRow = position.row + (dRow * landDistance);
          const landCol = position.col + (dCol * landDistance);
          
          if (!isValidSquare(landRow, landCol, config)) break;
          
          const landingSquare = at(board, landRow, landCol, config);
          if (landingSquare === null) {
            // Valid landing square
            const tempBoard = structuredClone(board);
            set(tempBoard, landRow, landCol, piece, config);
            set(tempBoard, position.row, position.col, null, config);
            set(tempBoard, capturedPiece.row, capturedPiece.col, null, config);
            
            const furtherCaptures = getCaptureMoves(tempBoard, { row: landRow, col: landCol }, piece, config);
            
            if (furtherCaptures.length > 0) {
              // Add multi-jump moves
              for (const furtherMove of furtherCaptures) {
                moves.push({
                  from: position,
                  to: furtherMove.to,
                  captures: [capturedPiece, ...(furtherMove.captures || [])],
                  path: [position, { row: landRow, col: landCol }, ...(furtherMove.path?.slice(1) || [furtherMove.to])]
                });
              }
            } else {
              // Single capture
              moves.push({
                from: position,
                to: { row: landRow, col: landCol },
                captures: [capturedPiece],
                path: [position, { row: landRow, col: landCol }]
              });
            }
            landDistance++;
          } else {
            // Can't land on occupied square
            break;
          }
        }
      }
    }
  } else {
    // Regular capture (adjacent squares only)
    for (const [dRow, dCol] of directions) {
      const captureRow = position.row + dRow;
      const captureCol = position.col + dCol;
      const landRow = position.row + (dRow * 2);
      const landCol = position.col + (dCol * 2);
      
      if (
        isValidSquare(landRow, landCol, config) &&
        at(board, captureRow, captureCol, config) &&
        at(board, captureRow, captureCol, config)!.color !== piece.color &&
        at(board, landRow, landCol, config) === null
      ) {
        // Check for multiple jumps
        const tempBoard = structuredClone(board);
        set(tempBoard, landRow, landCol, piece, config);
        set(tempBoard, position.row, position.col, null, config);
        set(tempBoard, captureRow, captureCol, null, config);
        
        const furtherCaptures = getCaptureMoves(tempBoard, { row: landRow, col: landCol }, piece, config);
        
        if (furtherCaptures.length > 0) {
          // Add multi-jump moves
          for (const furtherMove of furtherCaptures) {
            moves.push({
              from: position,
              to: furtherMove.to,
              captures: [{ row: captureRow, col: captureCol }, ...(furtherMove.captures || [])],
              path: [position, { row: landRow, col: landCol }, ...(furtherMove.path?.slice(1) || [furtherMove.to])]
            });
          }
        } else {
          // Single capture
          moves.push({
            from: position,
            to: { row: landRow, col: landCol },
            captures: [{ row: captureRow, col: captureCol }],
            path: [position, { row: landRow, col: landCol }]
          });
        }
      }
    }
  }
  
  return moves;
}

/**
 * Find all positions for the current player that have at least one capture.
 * @param board The game board
 * @param currentPlayer Player to check
 * @param config Board configuration (defaults to American checkers)
 * @returns Positions that must capture according to rules
 */
export function getMustCapturePositions(board: Board, currentPlayer: PieceColor, config: BoardConfig = getBoardConfig('american')): Position[] {
  const positions: Position[] = [];
  
  for (let row = 0; row < config.size; row++) {
    for (let col = 0; col < config.size; col++) {
      const piece = at(board, row, col, config);
      if (piece && piece.color === currentPlayer) {
        const captures = getCaptureMoves(board, { row, col }, piece, config);
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
 * @param config Board configuration (defaults to American checkers)
 * @returns A new board after the move
 */
export function makeMove(board: Board, move: Move, config: BoardConfig = getBoardConfig('american')): Board {
  const newBoard = structuredClone(board);
  const piece = at(newBoard, move.from.row, move.from.col, config);
  
  if (!piece) return board;
  
  // Move piece
  set(newBoard, move.to.row, move.to.col, piece, config);
  set(newBoard, move.from.row, move.from.col, null, config);
  
  // Remove captured pieces
  if (move.captures) {
    for (const capture of move.captures) {
      set(newBoard, capture.row, capture.col, null, config);
    }
  }
  
  // King promotion
  if (piece.type === 'regular') {
    if ((piece.color === 'red' && move.to.row === config.redKingRow) ||
        (piece.color === 'black' && move.to.row === config.blackKingRow)) {
      set(newBoard, move.to.row, move.to.col, { ...piece, type: 'king' }, config);
    }
  }
  
  return newBoard;
}

/**
 * Determine if the game has a winner based on pieces and legal moves.
 * @param board The game board
 * @param config Board configuration (defaults to American checkers)
 * @returns 'red' or 'black' if a winner exists, 'draw' if drawn, or null
 */
export function checkWinner(board: Board, config: BoardConfig = getBoardConfig('american')): PieceColor | 'draw' | null {
  let redCount = 0;
  let blackCount = 0;
  let redHasMoves = false;
  let blackHasMoves = false;
  
  for (let row = 0; row < config.size; row++) {
    for (let col = 0; col < config.size; col++) {
      const piece = at(board, row, col, config);
      if (piece) {
        if (piece.color === 'red') {
          redCount++;
          if (!redHasMoves) {
            const moves = getValidMoves(board, { row, col }, 'red', config);
            if (moves.length > 0) redHasMoves = true;
          }
        } else {
          blackCount++;
          if (!blackHasMoves) {
            const moves = getValidMoves(board, { row, col }, 'black', config);
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
 * @param config Board configuration (defaults to American checkers)
 * @returns A selected move, or null if no moves
 */
export function getRandomAIMove(board: Board, color: PieceColor, config: BoardConfig = getBoardConfig('american')): Move | null {
  const allMoves: Move[] = [];
  
  for (let row = 0; row < config.size; row++) {
    for (let col = 0; col < config.size; col++) {
      const piece = at(board, row, col, config);
      if (piece && piece.color === color) {
        const moves = getValidMoves(board, { row, col }, color, config);
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