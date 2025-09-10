import type { 
  Move, 
  Board, 
  PieceColor 
} from './game-logic';
import { 
  makeMove, 
  getValidMoves,
  getMustCapturePositions 
} from './game-logic';
import type { VariantConfig } from './game-engine/rule-schema';
import { AmericanConfig } from './game-engine/rule-configs/american';
import { CheckersAI } from './ai-engine';
import type {
  MoveCategory,
  MoveContext,
  MoveEvaluation,
  GameAnalysis,
  AnalysisConfig,
  GamePhase,
  ThreatLevel
} from './types/move-analysis';
import {
  MOVE_QUALITY_THRESHOLDS,
  DEFAULT_ANALYSIS_CONFIG
} from './types/move-analysis';

export class MoveEvaluator {
  private ai: CheckersAI;
  private rules: VariantConfig;
  private analysisCache = new Map<string, MoveEvaluation>();
  
  constructor(rules: VariantConfig = AmericanConfig, aiDifficulty: 'medium' | 'hard' | 'expert' = 'expert') {
    this.rules = rules;
    this.ai = new CheckersAI({ difficulty: aiDifficulty }, rules);
  }

  /**
   * Evaluates a single move in the context of the position
   */
  async evaluateMove(
    board: Board,
    move: Move,
    playerColor: PieceColor,
    moveIndex: number,
    config: AnalysisConfig = DEFAULT_ANALYSIS_CONFIG
  ): Promise<MoveEvaluation> {
    // Check cache if enabled
    if (config.useCache) {
      const cacheKey = this.getCacheKey(board, move, playerColor);
      const cached = this.analysisCache.get(cacheKey);
      if (cached) return cached;
    }

    // Get all legal moves for comparison
    const allMoves = this.getAllLegalMoves(board, playerColor);
    
    // Evaluate each move at the specified depth
    const moveScores = await this.evaluateAllMoves(
      board, 
      allMoves, 
      playerColor, 
      config.depth,
      config.timeLimit
    );

    // Find the best move and score
    const bestMoveData = moveScores.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    // Find the score for the actual move played
    const actualMoveData = moveScores.find(m => 
      this.movesEqual(m.move, move)
    ) || { move, score: -Infinity };

    // Calculate score differential (percentage)
    const scoreDifferential = this.calculateScoreDifferential(
      actualMoveData.score,
      bestMoveData.score
    );

    // Evaluate positions before and after the move
    const positionEvalBefore = await this.evaluatePosition(board, playerColor);
    const boardAfter = makeMove(board, move, this.rules);
    const positionEvalAfter = await this.evaluatePosition(boardAfter, playerColor);
    const swingValue = positionEvalAfter - positionEvalBefore;

    // Analyze the context
    const context = await this.analyzeContext(
      board,
      move,
      allMoves,
      moveScores,
      playerColor,
      config
    );

    // Categorize the move
    const category = this.categorizeMove(
      scoreDifferential,
      swingValue,
      context,
      actualMoveData.score === bestMoveData.score
    );

    // Generate explanation
    const explanation = this.generateExplanation(
      category,
      context,
      scoreDifferential,
      swingValue
    );

    // Prepare alternative moves if requested
    const alternativeMoves = config.includeAlternatives
      ? moveScores
          .filter(m => !this.movesEqual(m.move, move))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map(m => ({
            move: m.move,
            score: m.score,
            notation: this.moveToSimpleNotation(m.move)
          }))
      : undefined;

    const evaluation: MoveEvaluation = {
      move,
      moveIndex,
      category,
      score: actualMoveData.score,
      bestScore: bestMoveData.score,
      scoreDifferential,
      positionEvalBefore,
      positionEvalAfter,
      swingValue,
      context,
      explanation,
      alternativeMoves
    };

    // Cache the result
    if (config.useCache) {
      const cacheKey = this.getCacheKey(board, move, playerColor);
      this.analysisCache.set(cacheKey, evaluation);
    }

    return evaluation;
  }

  /**
   * Analyzes a complete game
   */
  async analyzeGame(
    moves: Move[],
    initialBoard: Board,
    config: AnalysisConfig = DEFAULT_ANALYSIS_CONFIG
  ): Promise<GameAnalysis> {
    const evaluations: MoveEvaluation[] = [];
    const turningPoints: number[] = [];
    const criticalMoments: number[] = [];
    const brilliantMoves: number[] = [];
    const blunders: number[] = [];
    const evaluationGraph: { moveIndex: number; evaluation: number }[] = [];

    let currentBoard = initialBoard;
    let currentPlayer: PieceColor = 'red';
    let previousEval = 0;

    const moveQualityCount = {
      red: this.initializeMoveQualityCount(),
      black: this.initializeMoveQualityCount()
    };

    // Analyze each move
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i]!;
      const evaluation = await this.evaluateMove(
        currentBoard,
        move,
        currentPlayer,
        i,
        config
      );

      evaluations.push(evaluation);
      
      // Track special moves
      if (evaluation.category === 'brilliant') {
        brilliantMoves.push(i);
      }
      if (evaluation.category === 'blunder') {
        blunders.push(i);
      }

      // Track critical moments
      if (evaluation.context.threatLevel === 'critical') {
        criticalMoments.push(i);
      }

      // Track turning points (large evaluation swings)
      if (Math.abs(evaluation.positionEvalAfter - previousEval) > 30) {
        turningPoints.push(i);
      }

      // Update move quality count
      moveQualityCount[currentPlayer][evaluation.category]++;

      // Add to evaluation graph
      evaluationGraph.push({
        moveIndex: i,
        evaluation: evaluation.positionEvalAfter
      });

      // Update for next iteration
      currentBoard = makeMove(currentBoard, move, this.rules);
      currentPlayer = currentPlayer === 'red' ? 'black' : 'red';
      previousEval = evaluation.positionEvalAfter;
    }

    // Calculate accuracy scores
    const averageAccuracy = {
      red: this.calculateAccuracy(moveQualityCount.red),
      black: this.calculateAccuracy(moveQualityCount.black)
    };

    // Calculate game sharpness
    const gameSharpness = this.calculateGameSharpness(evaluations);

    return {
      moves: evaluations,
      turningPoints,
      criticalMoments,
      averageAccuracy,
      moveQualityCount,
      brilliantMoves,
      blunders,
      gameSharpness,
      evaluationGraph
    };
  }

  /**
   * Categorizes a move based on its quality
   */
  private categorizeMove(
    scoreDifferential: number,
    swingValue: number,
    context: MoveContext,
    isBestMove: boolean
  ): MoveCategory {
    // Check for brilliant move
    if (this.isBrilliantMove(scoreDifferential, swingValue, context, isBestMove)) {
      return 'brilliant';
    }

    // Check for excellent move
    if (this.isExcellentMove(scoreDifferential, context, isBestMove)) {
      return 'excellent';
    }

    // Standard categorization based on score differential
    if (scoreDifferential <= MOVE_QUALITY_THRESHOLDS.best) {
      return 'best';
    }
    if (scoreDifferential <= MOVE_QUALITY_THRESHOLDS.good) {
      return 'good';
    }
    if (scoreDifferential <= MOVE_QUALITY_THRESHOLDS.inaccuracy) {
      return 'inaccuracy';
    }
    if (scoreDifferential <= MOVE_QUALITY_THRESHOLDS.mistake) {
      return 'mistake';
    }
    
    return 'blunder';
  }

  /**
   * Detects if a move qualifies as "brilliant"
   */
  private isBrilliantMove(
    scoreDifferential: number,
    swingValue: number,
    context: MoveContext,
    isBestMove: boolean
  ): boolean {
    return (
      isBestMove &&                                    // Must be the best move
      context.moveComplexity >= 4 &&                   // Requires deep calculation
      swingValue >= 30 &&                              // Significant improvement
      context.alternativesQuality.every(               // All other moves are much worse
        alt => alt < context.alternativesQuality[0]! - 20
      ) &&
      context.forcedMoveCount === 0 &&                 // Not a forced capture
      context.positionVolatility > 60                  // In a sharp position
    );
  }

  /**
   * Detects if a move qualifies as "excellent"
   */
  private isExcellentMove(
    scoreDifferential: number,
    context: MoveContext,
    isBestMove: boolean
  ): boolean {
    return (
      isBestMove &&                                    // Must be the best move
      context.threatLevel === 'critical' &&            // In a critical position
      context.isOnlyGoodMove &&                        // Only move that maintains advantage
      context.alternativesQuality.every(               // All alternatives lose
        alt => alt < context.alternativesQuality[0]! - 40
      )
    );
  }

  /**
   * Analyzes the context of a move
   */
  private async analyzeContext(
    board: Board,
    move: Move,
    allMoves: Move[],
    moveScores: { move: Move; score: number }[],
    playerColor: PieceColor,
    config: AnalysisConfig
  ): Promise<MoveContext> {
    // Determine game phase
    const gamePhase = this.determineGamePhase(board);
    
    // Assess threat level
    const threatLevel = this.assessThreatLevel(board, playerColor);
    
    // Calculate position volatility
    const positionVolatility = this.calculatePositionVolatility(
      board, 
      playerColor
    );

    // Calculate material balance
    const materialBalance = this.calculateMaterialBalance(board);

    // Get alternative move scores
    const alternativesQuality = moveScores
      .filter(m => !this.movesEqual(m.move, move))
      .map(m => m.score);

    // Determine if this is a forced move
    const mustCapture = getMustCapturePositions(board, playerColor, this.rules);
    const forcedMoveCount = mustCapture.length;

    // Check if this is the only good move
    const bestScore = Math.max(...moveScores.map(m => m.score));
    const goodMoves = moveScores.filter(m => m.score >= bestScore - 20);
    const isOnlyGoodMove = goodMoves.length === 1;

    // Estimate move complexity (simplified - in real implementation would use search depth)
    const moveComplexity = config.detectBrilliant 
      ? await this.estimateMoveComplexity(board, move, playerColor)
      : 2;

    return {
      moveComplexity,
      alternativesQuality,
      positionVolatility,
      materialBalance,
      gamePhase,
      threatLevel,
      forcedMoveCount,
      isOnlyGoodMove
    };
  }

  /**
   * Helper methods
   */
  
  private getAllLegalMoves(board: Board, color: PieceColor): Move[] {
    const moves: Move[] = [];
    for (let row = 0; row < this.rules.board.size; row++) {
      for (let col = 0; col < this.rules.board.size; col++) {
        const piece = board[row]?.[col];
        if (piece && piece.color === color) {
          const pieceMoves = getValidMoves(board, { row, col }, color, this.rules);
          moves.push(...pieceMoves);
        }
      }
    }
    return moves;
  }

  private async evaluateAllMoves(
    board: Board,
    moves: Move[],
    playerColor: PieceColor,
    depth: number,
    timeLimit: number
  ): Promise<{ move: Move; score: number }[]> {
    const results: { move: Move; score: number }[] = [];
    
    for (const move of moves) {
      const boardAfter = makeMove(board, move, this.rules);
      // Use AI to evaluate the position after the move
      const score = await this.evaluatePositionWithAI(boardAfter, playerColor, depth);
      results.push({ move, score });
    }
    
    return results;
  }

  private async evaluatePosition(board: Board, playerColor: PieceColor): Promise<number> {
    // Simplified evaluation - returns a value from -100 to +100
    // Positive = red advantage, negative = black advantage
    return this.evaluatePositionWithAI(board, playerColor, 2);
  }

  private async evaluatePositionWithAI(
    board: Board, 
    playerColor: PieceColor,
    depth: number
  ): Promise<number> {
    // Use the AI engine's analysis method
    return this.ai.analyzePosition(board, playerColor, depth);
  }

  private calculateScoreDifferential(actualScore: number, bestScore: number): number {
    if (bestScore === 0) return 0;
    const diff = Math.abs(bestScore - actualScore);
    const percentage = (diff / Math.abs(bestScore)) * 100;
    return Math.min(100, percentage);
  }

  private determineGamePhase(board: Board): GamePhase {
    let pieceCount = 0;
    for (let row = 0; row < this.rules.board.size; row++) {
      for (let col = 0; col < this.rules.board.size; col++) {
        if (board[row]?.[col]) pieceCount++;
      }
    }
    
    if (pieceCount > 20) return 'opening';
    if (pieceCount > 8) return 'midgame';
    return 'endgame';
  }

  private assessThreatLevel(board: Board, playerColor: PieceColor): ThreatLevel {
    const mustCapture = getMustCapturePositions(board, playerColor, this.rules);
    const opponentColor = playerColor === 'red' ? 'black' : 'red';
    const opponentMustCapture = getMustCapturePositions(board, opponentColor, this.rules);
    
    if (mustCapture.length > 2 || opponentMustCapture.length > 2) {
      return 'critical';
    }
    if (mustCapture.length > 0 || opponentMustCapture.length > 0) {
      return 'severe';
    }
    
    // Check for pieces under threat
    const threatenedPieces = this.countThreatenedPieces(board, playerColor);
    if (threatenedPieces > 2) return 'severe';
    if (threatenedPieces > 0) return 'mild';
    
    return 'none';
  }

  private calculatePositionVolatility(board: Board, playerColor: PieceColor): number {
    // Measure how tactical/sharp the position is (0-100)
    const captures = this.countPossibleCaptures(board);
    const multipleCaptureSequences = this.countMultiCaptureSequences(board, playerColor);
    
    // Simple heuristic: more captures = more volatile
    const volatility = Math.min(100, (captures * 10) + (multipleCaptureSequences * 20));
    return volatility;
  }

  private calculateMaterialBalance(board: Board): number {
    let balance = 0;
    for (let row = 0; row < this.rules.board.size; row++) {
      for (let col = 0; col < this.rules.board.size; col++) {
        const piece = board[row]?.[col];
        if (piece) {
          const value = piece.type === 'king' ? 3 : 2;
          balance += piece.color === 'red' ? value : -value;
        }
      }
    }
    return balance;
  }

  private async estimateMoveComplexity(
    board: Board,
    move: Move,
    playerColor: PieceColor
  ): Promise<number> {
    // Simplified complexity estimation
    // In full implementation, would measure search depth needed to find the move
    const hasCaptures = move.captures && move.captures.length > 0;
    const isMultiJump = move.path && move.path.length > 2;
    
    let complexity = 1;
    if (hasCaptures) complexity += 1;
    if (isMultiJump) complexity += 2;
    
    // Check if move creates threats
    const boardAfter = makeMove(board, move, this.rules);
    const opponentColor = playerColor === 'red' ? 'black' : 'red';
    const threatsCreated = this.countThreatenedPieces(boardAfter, opponentColor);
    complexity += threatsCreated;
    
    return Math.min(10, complexity);
  }

  private countThreatenedPieces(board: Board, playerColor: PieceColor): number {
    // Simplified threat detection
    // Count pieces that could be captured on the next move
    const opponentColor = playerColor === 'red' ? 'black' : 'red';
    const opponentMoves = this.getAllLegalMoves(board, opponentColor);
    const captureCount = opponentMoves.filter(m => m.captures && m.captures.length > 0).length;
    return captureCount;
  }

  private countPossibleCaptures(board: Board): number {
    let count = 0;
    for (const color of ['red', 'black'] as PieceColor[]) {
      const moves = this.getAllLegalMoves(board, color);
      count += moves.filter(m => m.captures && m.captures.length > 0).length;
    }
    return count;
  }

  private countMultiCaptureSequences(board: Board, playerColor: PieceColor): number {
    const moves = this.getAllLegalMoves(board, playerColor);
    return moves.filter(m => m.path && m.path.length > 2).length;
  }

  private generateExplanation(
    category: MoveCategory,
    context: MoveContext,
    scoreDifferential: number,
    swingValue: number
  ): string {
    switch (category) {
      case 'brilliant':
        return `A deep, non-obvious move that required ${context.moveComplexity}+ moves of calculation. Improves position by ${swingValue.toFixed(1)} points.`;
      case 'excellent':
        return `The only good move in this critical position. All alternatives would have lost significant advantage.`;
      case 'best':
        return `The objectively best move in this position.`;
      case 'good':
        return `A solid move, only ${scoreDifferential.toFixed(0)}% worse than the best option.`;
      case 'inaccuracy':
        return `Suboptimal move. A better option was available that would have been ${scoreDifferential.toFixed(0)}% stronger.`;
      case 'mistake':
        return `This move loses ${scoreDifferential.toFixed(0)}% of the advantage. ${context.threatLevel === 'critical' ? 'Particularly costly in this critical position.' : ''}`;
      case 'blunder':
        return `Severe error that loses ${scoreDifferential.toFixed(0)}% of position value. ${swingValue < -30 ? 'Game-changing mistake.' : 'Significant material or positional loss.'}`;
      default:
        return '';
    }
  }

  private calculateAccuracy(moveQuality: Record<MoveCategory, number>): number {
    const total = Object.values(moveQuality).reduce((sum, count) => sum + count, 0);
    if (total === 0) return 100;

    const weights = {
      brilliant: 110,  // Bonus for brilliant moves
      excellent: 105,  // Bonus for excellent moves
      best: 100,
      good: 90,
      inaccuracy: 60,
      mistake: 30,
      blunder: 0
    };

    let weightedSum = 0;
    for (const [category, count] of Object.entries(moveQuality)) {
      weightedSum += weights[category as MoveCategory] * count;
    }

    return Math.round(weightedSum / total);
  }

  private calculateGameSharpness(evaluations: MoveEvaluation[]): number {
    if (evaluations.length === 0) return 0;
    
    const volatilities = evaluations.map(e => e.context.positionVolatility);
    const average = volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length;
    
    return Math.round(average);
  }

  private initializeMoveQualityCount(): Record<MoveCategory, number> {
    return {
      brilliant: 0,
      excellent: 0,
      best: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0
    };
  }

  private movesEqual(move1: Move, move2: Move): boolean {
    return (
      move1.from.row === move2.from.row &&
      move1.from.col === move2.from.col &&
      move1.to.row === move2.to.row &&
      move1.to.col === move2.to.col
    );
  }

  private moveToSimpleNotation(move: Move): string {
    const fromSquare = `${move.from.row}-${move.from.col}`;
    const toSquare = `${move.to.row}-${move.to.col}`;
    const capture = move.captures && move.captures.length > 0 ? 'x' : '-';
    return `${fromSquare}${capture}${toSquare}`;
  }

  private getCacheKey(board: Board, move: Move, playerColor: PieceColor): string {
    let boardStr = '';
    for (let row = 0; row < this.rules.board.size; row++) {
      for (let col = 0; col < this.rules.board.size; col++) {
        const piece = board[row]?.[col];
        if (!piece) {
          boardStr += '0';
        } else {
          boardStr += piece.color === 'red' 
            ? (piece.type === 'king' ? 'R' : 'r')
            : (piece.type === 'king' ? 'B' : 'b');
        }
      }
    }
    return `${boardStr}-${move.from.row}${move.from.col}${move.to.row}${move.to.col}-${playerColor}`;
  }

  /**
   * Clear the analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
  }
}