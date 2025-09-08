import { 
  type Board, 
  type Move, 
  type PieceColor, 
  type Position,
  type Piece,
  getValidMoves,
  makeMove,
  checkWinner,
  getMustCapturePositions,
  getCaptureMoves
} from './game-logic';
import { type BoardConfig, getBoardConfig } from './board-config';

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface AIConfig {
  difficulty: AIDifficulty;
  maxDepth?: number;
  timeLimit?: number; // milliseconds
  useOpeningBook?: boolean;
  useEndgameDatabase?: boolean;
  evaluationWeights?: EvaluationWeights;
}

export interface EvaluationWeights {
  piece: number;
  king: number;
  backRow: number;
  centerControl: number;
  mobility: number;
  forwardPosition: number;
  protection: number;
  tempo: number;
}

const DEFAULT_WEIGHTS: EvaluationWeights = {
  piece: 100,
  king: 150,
  backRow: 10,
  centerControl: 5,
  mobility: 2,
  forwardPosition: 3,
  protection: 5,
  tempo: 1
};

// Difficulty presets
const DIFFICULTY_CONFIGS: Record<AIDifficulty, Partial<AIConfig>> = {
  random: {
    maxDepth: 0
  },
  easy: {
    maxDepth: 2,
    timeLimit: 500,
    evaluationWeights: {
      ...DEFAULT_WEIGHTS,
      piece: 100,
      king: 120,
      centerControl: 2,
      mobility: 1
    }
  },
  medium: {
    maxDepth: 4,
    timeLimit: 2000,
    evaluationWeights: {
      ...DEFAULT_WEIGHTS,
      piece: 100,
      king: 150,
      centerControl: 5,
      mobility: 3
    }
  },
  hard: {
    maxDepth: 6,
    timeLimit: 5000,
    useOpeningBook: true,
    evaluationWeights: {
      ...DEFAULT_WEIGHTS,
      piece: 100,
      king: 175,
      centerControl: 8,
      mobility: 4,
      protection: 7
    }
  },
  expert: {
    maxDepth: 8,
    timeLimit: 10000,
    useOpeningBook: true,
    useEndgameDatabase: true,
    evaluationWeights: {
      ...DEFAULT_WEIGHTS,
      piece: 100,
      king: 200,
      centerControl: 10,
      mobility: 5,
      protection: 10,
      tempo: 2
    }
  }
};

// Opening book - common strong opening moves
const OPENING_BOOK: Map<string, Move[]> = new Map([
  // Standard opening positions
  ['initial', [
    { from: { row: 5, col: 0 }, to: { row: 4, col: 1 } },
    { from: { row: 5, col: 2 }, to: { row: 4, col: 3 } },
    { from: { row: 5, col: 2 }, to: { row: 4, col: 1 } }
  ]]
]);

export class CheckersAI {
  private config: AIConfig;
  private boardConfig: BoardConfig;
  private nodesEvaluated: number = 0;
  private startTime: number = 0;
  private timeLimit: number;
  private transpositionTable: Map<string, { score: number; depth: number; bestMove?: Move }> = new Map();

  constructor(config: Partial<AIConfig> = {}, boardConfig: BoardConfig = getBoardConfig('american')) {
    const difficultyConfig = config.difficulty ? DIFFICULTY_CONFIGS[config.difficulty] : {};
    this.config = {
      difficulty: 'medium',
      maxDepth: 4,
      timeLimit: 5000,
      useOpeningBook: false,
      useEndgameDatabase: false,
      evaluationWeights: DEFAULT_WEIGHTS,
      ...difficultyConfig,
      ...config
    };
    this.boardConfig = boardConfig;
    this.timeLimit = this.config.timeLimit || 5000;
  }

  public async getBestMove(board: Board, color: PieceColor, moveNumber: number = 0): Promise<Move | null> {
    this.nodesEvaluated = 0;
    this.startTime = Date.now();
    this.transpositionTable.clear();

    // Random difficulty - just return a random move
    if (this.config.difficulty === 'random') {
      return this.getRandomMove(board, color);
    }

    // Check opening book for early game
    if (this.config.useOpeningBook && moveNumber < 6) {
      const bookMove = this.getOpeningBookMove(board, color, moveNumber);
      if (bookMove) return bookMove;
    }

    // Check endgame database for late game
    if (this.config.useEndgameDatabase) {
      const endgameMove = this.getEndgameMove(board, color);
      if (endgameMove) return endgameMove;
    }

    // Use iterative deepening for better time management
    let bestMove: Move | null = null;
    let bestScore = -Infinity;

    for (let depth = 1; depth <= (this.config.maxDepth || 4); depth++) {
      if (this.isTimeUp()) break;

      const result = this.minimax(
        board, 
        depth, 
        -Infinity, 
        Infinity, 
        true, 
        color
      );

      if (result.move && !this.isTimeUp()) {
        bestMove = result.move;
        bestScore = result.score;
      }
    }

    console.log(`AI evaluated ${this.nodesEvaluated} nodes in ${Date.now() - this.startTime}ms`);
    return bestMove;
  }

  private minimax(
    board: Board,
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean,
    playerColor: PieceColor
  ): { score: number; move?: Move } {
    this.nodesEvaluated++;

    // Check for timeout
    if (this.isTimeUp()) {
      return { score: this.evaluatePosition(board, playerColor) };
    }

    // Check transposition table
    const boardKey = this.getBoardKey(board);
    const cached = this.transpositionTable.get(boardKey);
    if (cached && cached.depth >= depth) {
      return { score: cached.score, move: cached.bestMove };
    }

    // Terminal node checks
    const winner = checkWinner(board, this.boardConfig);
    if (winner) {
      const score = winner === playerColor ? 10000 : winner === 'draw' ? 0 : -10000;
      return { score: score * (depth + 1) }; // Prefer quicker wins
    }

    if (depth === 0) {
      return { score: this.evaluatePosition(board, playerColor) };
    }

    const currentColor = maximizingPlayer ? playerColor : (playerColor === 'red' ? 'black' : 'red');
    const moves = this.getAllMoves(board, currentColor);

    if (moves.length === 0) {
      return { score: maximizingPlayer ? -10000 : 10000 };
    }

    // Move ordering - evaluate captures first
    moves.sort((a, b) => {
      const aCaptures = a.captures?.length || 0;
      const bCaptures = b.captures?.length || 0;
      return bCaptures - aCaptures;
    });

    let bestMove: Move | undefined;
    let bestScore = maximizingPlayer ? -Infinity : Infinity;

    for (const move of moves) {
      const newBoard = makeMove(board, move, this.boardConfig);
      const result = this.minimax(
        newBoard,
        depth - 1,
        alpha,
        beta,
        !maximizingPlayer,
        playerColor
      );

      if (maximizingPlayer) {
        if (result.score > bestScore) {
          bestScore = result.score;
          bestMove = move;
        }
        alpha = Math.max(alpha, bestScore);
      } else {
        if (result.score < bestScore) {
          bestScore = result.score;
          bestMove = move;
        }
        beta = Math.min(beta, bestScore);
      }

      if (beta <= alpha) {
        break; // Alpha-beta pruning
      }
    }

    // Store in transposition table
    this.transpositionTable.set(boardKey, {
      score: bestScore,
      depth,
      bestMove
    });

    return { score: bestScore, move: bestMove };
  }

  private evaluatePosition(board: Board, playerColor: PieceColor): number {
    const weights = this.config.evaluationWeights || DEFAULT_WEIGHTS;
    let score = 0;

    const opponentColor = playerColor === 'red' ? 'black' : 'red';
    
    // Material and positional evaluation
    for (let row = 0; row < this.boardConfig.size; row++) {
      for (let col = 0; col < this.boardConfig.size; col++) {
        const piece = board[row]?.[col];
        if (!piece) continue;

        const isPlayer = piece.color === playerColor;
        const multiplier = isPlayer ? 1 : -1;

        // Material value
        score += multiplier * (piece.type === 'king' ? weights.king : weights.piece);

        // Positional bonuses
        if (piece.type === 'regular') {
          // Forward position bonus (encourage advancement)
          const advanceBonus = piece.color === 'red' 
            ? (this.boardConfig.size - 1 - row) 
            : row;
          score += multiplier * weights.forwardPosition * advanceBonus;

          // Back row protection
          if ((piece.color === 'red' && row === this.boardConfig.size - 1) ||
              (piece.color === 'black' && row === 0)) {
            score += multiplier * weights.backRow;
          }
        }

        // Center control bonus
        const centerDistance = Math.abs(row - 3.5) + Math.abs(col - 3.5);
        score += multiplier * weights.centerControl * (7 - centerDistance);

        // Protection bonus (pieces protected by back row or other pieces)
        if (this.isPieceProtected(board, { row, col }, piece)) {
          score += multiplier * weights.protection;
        }
      }
    }

    // Mobility evaluation
    const playerMoves = this.getAllMoves(board, playerColor).length;
    const opponentMoves = this.getAllMoves(board, opponentColor).length;
    score += weights.mobility * (playerMoves - opponentMoves);

    // Tempo (whose turn it is)
    score += weights.tempo;

    return score;
  }

  private isPieceProtected(board: Board, position: Position, piece: Piece): boolean {
    // Check if piece is on back row
    if ((piece.color === 'red' && position.row === this.boardConfig.size - 1) ||
        (piece.color === 'black' && position.row === 0)) {
      return true;
    }

    // Check if piece has friendly pieces behind it
    const behindRow = piece.color === 'red' ? position.row + 1 : position.row - 1;
    if (behindRow >= 0 && behindRow < this.boardConfig.size) {
      for (const colOffset of [-1, 1]) {
        const checkCol = position.col + colOffset;
        if (checkCol >= 0 && checkCol < this.boardConfig.size) {
          const behindPiece = board[behindRow]?.[checkCol];
          if (behindPiece && behindPiece.color === piece.color) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private getAllMoves(board: Board, color: PieceColor): Move[] {
    const moves: Move[] = [];
    
    for (let row = 0; row < this.boardConfig.size; row++) {
      for (let col = 0; col < this.boardConfig.size; col++) {
        const piece = board[row]?.[col];
        if (piece && piece.color === color) {
          const pieceMoves = getValidMoves(board, { row, col }, color, this.boardConfig);
          moves.push(...pieceMoves);
        }
      }
    }
    
    return moves;
  }

  private getRandomMove(board: Board, color: PieceColor): Move | null {
    const moves = this.getAllMoves(board, color);
    if (moves.length === 0) return null;
    
    // Prefer captures even in random mode
    const captures = moves.filter(m => m.captures && m.captures.length > 0);
    if (captures.length > 0) {
      return captures[Math.floor(Math.random() * captures.length)] || null;
    }
    
    return moves[Math.floor(Math.random() * moves.length)] || null;
  }

  private getOpeningBookMove(board: Board, color: PieceColor, moveNumber: number): Move | null {
    // Simple opening book - just return null for now
    // In a full implementation, this would have a database of strong openings
    return null;
  }

  private getEndgameMove(board: Board, color: PieceColor): Move | null {
    // Count pieces to determine if we're in endgame
    let pieceCount = 0;
    for (let row = 0; row < this.boardConfig.size; row++) {
      for (let col = 0; col < this.boardConfig.size; col++) {
        if (board[row]?.[col]) pieceCount++;
      }
    }

    // Only use endgame database if we have 6 or fewer pieces
    if (pieceCount > 6) return null;

    // In a full implementation, this would query a precomputed endgame database
    // For now, just return null and let minimax handle it
    return null;
  }

  private getBoardKey(board: Board): string {
    // Create a unique string representation of the board for caching
    let key = '';
    for (let row = 0; row < this.boardConfig.size; row++) {
      for (let col = 0; col < this.boardConfig.size; col++) {
        const piece = board[row]?.[col];
        if (!piece) {
          key += '0';
        } else {
          key += piece.color === 'red' ? (piece.type === 'king' ? 'R' : 'r') : (piece.type === 'king' ? 'B' : 'b');
        }
      }
    }
    return key;
  }

  private isTimeUp(): boolean {
    return Date.now() - this.startTime > this.timeLimit;
  }

  public setDifficulty(difficulty: AIDifficulty): void {
    const difficultyConfig = DIFFICULTY_CONFIGS[difficulty];
    this.config = {
      ...this.config,
      difficulty,
      ...difficultyConfig
    };
  }

  public getConfig(): AIConfig {
    return { ...this.config };
  }

  /**
   * Public method for position analysis
   * Returns a normalized score from -100 to +100
   */
  public async analyzePosition(
    board: Board, 
    playerColor: PieceColor,
    depth: number = 4
  ): Promise<number> {
    const result = this.minimax(
      board,
      depth,
      -Infinity,
      Infinity,
      true,
      playerColor
    );
    
    // Normalize score to -100 to +100 range
    // Positive = red advantage, negative = black advantage
    const normalizedScore = Math.max(-100, Math.min(100, result.score / 100));
    return playerColor === 'red' ? normalizedScore : -normalizedScore;
  }

  /**
   * Get the top N moves with their evaluations
   */
  public async getTopMoves(
    board: Board,
    color: PieceColor,
    topN: number = 5,
    depth: number = 4
  ): Promise<Array<{ move: Move; score: number; evaluation: number }>> {
    const moves = this.getAllMoves(board, color);
    const evaluatedMoves: Array<{ move: Move; score: number }> = [];

    for (const move of moves) {
      const newBoard = makeMove(board, move, this.boardConfig);
      const result = this.minimax(
        newBoard,
        depth - 1,
        -Infinity,
        Infinity,
        false,
        color
      );
      evaluatedMoves.push({ move, score: result.score });
    }

    // Sort by score and take top N
    evaluatedMoves.sort((a, b) => b.score - a.score);
    const topMoves = evaluatedMoves.slice(0, topN);

    // Add normalized evaluation
    return topMoves.map(({ move, score }) => ({
      move,
      score,
      evaluation: Math.max(-100, Math.min(100, score / 100))
    }));
  }

  /**
   * Compare two moves and return the score difference
   */
  public async compareMoves(
    board: Board,
    move1: Move,
    move2: Move,
    playerColor: PieceColor,
    depth: number = 4
  ): Promise<{ 
    move1Score: number; 
    move2Score: number; 
    difference: number;
    betterMove: Move;
  }> {
    const board1 = makeMove(board, move1, this.boardConfig);
    const result1 = this.minimax(
      board1,
      depth - 1,
      -Infinity,
      Infinity,
      false,
      playerColor
    );

    const board2 = makeMove(board, move2, this.boardConfig);
    const result2 = this.minimax(
      board2,
      depth - 1,
      -Infinity,
      Infinity,
      false,
      playerColor
    );

    return {
      move1Score: result1.score,
      move2Score: result2.score,
      difference: Math.abs(result1.score - result2.score),
      betterMove: result1.score > result2.score ? move1 : move2
    };
  }

  /**
   * Evaluate a position and return detailed analysis
   */
  public evaluatePositionDetailed(board: Board, playerColor: PieceColor): {
    totalScore: number;
    material: number;
    position: number;
    mobility: number;
    protection: number;
  } {
    const weights = this.config.evaluationWeights || DEFAULT_WEIGHTS;
    const opponentColor = playerColor === 'red' ? 'black' : 'red';
    
    let material = 0;
    let position = 0;
    let protection = 0;

    // Material and positional evaluation
    for (let row = 0; row < this.boardConfig.size; row++) {
      for (let col = 0; col < this.boardConfig.size; col++) {
        const piece = board[row]?.[col];
        if (!piece) continue;

        const isPlayer = piece.color === playerColor;
        const multiplier = isPlayer ? 1 : -1;

        // Material value
        material += multiplier * (piece.type === 'king' ? weights.king : weights.piece);

        // Positional value
        if (piece.type === 'regular') {
          const advanceBonus = piece.color === 'red' 
            ? (this.boardConfig.size - 1 - row) 
            : row;
          position += multiplier * weights.forwardPosition * advanceBonus;

          if ((piece.color === 'red' && row === this.boardConfig.size - 1) ||
              (piece.color === 'black' && row === 0)) {
            position += multiplier * weights.backRow;
          }
        }

        // Center control
        const centerDistance = Math.abs(row - 3.5) + Math.abs(col - 3.5);
        position += multiplier * weights.centerControl * (7 - centerDistance);

        // Protection
        if (this.isPieceProtected(board, { row, col }, piece)) {
          protection += multiplier * weights.protection;
        }
      }
    }

    // Mobility
    const playerMoves = this.getAllMoves(board, playerColor).length;
    const opponentMoves = this.getAllMoves(board, opponentColor).length;
    const mobility = weights.mobility * (playerMoves - opponentMoves);

    const totalScore = material + position + mobility + protection;

    return {
      totalScore,
      material,
      position,
      mobility,
      protection
    };
  }
}