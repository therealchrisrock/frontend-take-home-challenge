/**
 * Configuration-driven game rules engine
 * Single implementation that processes all draughts variants through configuration
 */

import type { VariantConfig } from "./rule-schema";
import type {
  Board,
  PieceColor,
  PieceType,
  Position,
  Move,
  Piece,
} from "../game/logic";
import { GameConfigLoader } from "./config-loader";
import { getPromotionRows } from "./config-utils";

/**
 * Board validator for any board size
 */
class ConfigurableBoardValidator {
  constructor(private config: VariantConfig) {}

  isValidSquare(row: number, col: number): boolean {
    return (
      row >= 0 &&
      row < this.config.board.size &&
      col >= 0 &&
      col < this.config.board.size
    );
  }

  isDarkSquare(row: number, col: number): boolean {
    return (row + col) % 2 === 1;
  }

  isStartingRow(color: PieceColor, row: number): boolean {
    const startingRows = this.config.board.startingRows;
    return color === "black"
      ? startingRows.black.includes(row)
      : startingRows.red.includes(row);
  }

  isPromotionRow(color: PieceColor, row: number): boolean {
    const promotionRows = getPromotionRows(this.config);
    return promotionRows[color].includes(row);
  }
}

/**
 * Game rules engine - handles all draughts variants through configuration
 */
export class GameRules {
  private config: VariantConfig;
  private validator: ConfigurableBoardValidator;

  constructor(
    private variantName: string,
    config?: VariantConfig,
  ) {
    if (config) {
      this.config = config;
    } else {
      // This will be resolved when initialize() is called
      this.config = null as any;
    }
    this.validator = new ConfigurableBoardValidator(this.config);
  }

  /**
   * Initialize the rules engine (now synchronous)
   */
  initialize(): void {
    if (!this.config) {
      this.config = GameConfigLoader.loadVariant(this.variantName);
      this.validator = new ConfigurableBoardValidator(this.config);
    }
  }

  /**
   * Create initial board based on configuration
   */
  createInitialBoard(): Board {
    const size = this.config.board.size;
    const board: Board = Array(size)
      .fill(null)
      .map(() => Array(size).fill(null));

    // Place black pieces
    for (const row of this.config.board.startingRows.black) {
      for (let col = 0; col < size; col++) {
        if (this.validator.isDarkSquare(row, col)) {
          this.setPiece(
            board,
            { row, col },
            { color: "black", type: "regular" },
          );
        }
      }
    }

    // Place red pieces
    for (const row of this.config.board.startingRows.red) {
      for (let col = 0; col < size; col++) {
        if (this.validator.isDarkSquare(row, col)) {
          this.setPiece(board, { row, col }, { color: "red", type: "regular" });
        }
      }
    }

    return board;
  }

  /**
   * Get valid movement directions based on configuration
   */
  getValidDirections(piece: {
    color: PieceColor;
    type: PieceType;
  }): readonly [number, number][] {
    const movement = this.config.movement;

    if (piece.type === "king") {
      // Kings always move in all diagonal directions
      return [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ] as const;
    }

    // Regular pieces - direction based on configuration
    const directions: [number, number][] = [];
    const pieceRules = movement.regularPieces;
    const colorDirection = pieceRules.directions[piece.color];

    if (colorDirection === "forward") {
      // Forward only (traditional)
      if (piece.color === "red") {
        directions.push([-1, -1], [-1, 1]); // Red moves up (toward row 0)
      } else {
        directions.push([1, -1], [1, 1]); // Black moves down
      }
    } else if (colorDirection === "backward") {
      // Backward only (rare)
      if (piece.color === "red") {
        directions.push([1, -1], [1, 1]); // Red moves down
      } else {
        directions.push([-1, -1], [-1, 1]); // Black moves up
      }
    } else {
      // All directions
      directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }

    return directions as readonly [number, number][];
  }

  /**
   * Check if piece can capture backward
   */
  canCaptureBackward(piece: { color: PieceColor; type: PieceType }): boolean {
    if (piece.type === "king") {
      return this.config.movement.kings.canCaptureBackward;
    }
    return this.config.movement.regularPieces.canCaptureBackward;
  }

  /**
   * Check if kings can fly (move multiple squares)
   */
  canFlyAsKing(): boolean {
    return this.config.movement.kings.canFly;
  }

  /**
   * Check if mandatory captures are required
   */
  isMandatoryCapture(): boolean {
    return this.config.capture.mandatory;
  }

  /**
   * Check if maximum capture rule applies
   */
  requiresMaximumCapture(): boolean {
    return this.config.capture.requireMaximum;
  }

  /**
   * Check if king priority rule applies
   */
  requiresKingPriority(): boolean {
    return this.config.capture.kingPriority;
  }

  /**
   * Get board size
   */
  getBoardSize(): number {
    return this.config.board.size;
  }

  /**
   * Get piece count per player
   */
  getPieceCount(): number {
    return this.config.board.pieceCount;
  }

  /**
   * Check if promotion should occur
   */
  shouldPromote(
    piece: { color: PieceColor; type: PieceType },
    toRow: number,
  ): boolean {
    if (piece.type === "king") return false;
    return this.validator.isPromotionRow(piece.color, toRow);
  }

  /**
   * Get promotion row for color
   */
  getPromotionRow(color: PieceColor): number {
    const rows = this.config.promotionRows[color];
    if (rows.length === 0) {
      throw new Error(`No promotion rows defined for ${color}`);
    }
    return rows[0]!; // Return primary promotion row
  }

  /**
   * Validate a move based on configuration rules
   */
  validateMove(board: Board, move: Move): boolean {
    const piece = this.getPiece(board, move.from);
    if (!piece) return false;

    // Basic position validation
    if (!this.validator.isValidSquare(move.to.row, move.to.col)) {
      return false;
    }

    // Destination must be empty
    if (this.getPiece(board, move.to)) {
      return false;
    }

    // Must be dark square
    if (!this.validator.isDarkSquare(move.to.row, move.to.col)) {
      return false;
    }

    // Check if move is a capture
    if (move.captures && move.captures.length > 0) {
      return this.validateCapture(board, move);
    }

    // Regular move validation
    return this.validateRegularMove(board, move);
  }

  /**
   * Validate capture move
   */
  validateCapture(board: Board, move: Move): boolean {
    if (!move.captures || move.captures.length === 0) {
      return false;
    }

    const piece = this.getPiece(board, move.from);
    if (!piece) return false;

    // Check if backward capture is allowed
    if (!this.canCaptureBackward(piece)) {
      const dRow = move.to.row - move.from.row;

      // For red pieces, backward means going up (negative dRow)
      // For black pieces, backward means going down (positive dRow)
      const isBackward = piece.color === "red" ? dRow < 0 : dRow > 0;

      if (isBackward) {
        return false;
      }
    }

    // Validate each captured piece
    for (const capturePos of move.captures) {
      const capturedPiece = this.getPiece(board, capturePos);
      if (!capturedPiece || capturedPiece.color === piece.color) {
        return false;
      }
    }

    // Check maximum capture rule
    if (this.requiresMaximumCapture()) {
      return this.isMaximumCaptureMove(board, move);
    }

    return true;
  }

  /**
   * Validate regular (non-capture) move
   */
  private validateRegularMove(board: Board, move: Move): boolean {
    const piece = this.getPiece(board, move.from);
    if (!piece) return false;

    const validDirections = this.getValidDirections(piece);
    const dRow = move.to.row - move.from.row;
    const dCol = move.to.col - move.from.col;

    // Check if move direction is valid
    for (const [validDRow, validDCol] of validDirections) {
      if (piece.type === "king" && this.canFlyAsKing()) {
        // Flying king - check if direction matches and path is clear
        if (this.isSameDirection(dRow, dCol, validDRow, validDCol)) {
          return this.isPathClear(board, move.from, move.to);
        }
      } else {
        // Regular piece or non-flying king - one square move
        if (dRow === validDRow && dCol === validDCol) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if two direction vectors are in the same direction
   */
  private isSameDirection(
    dRow: number,
    dCol: number,
    validDRow: number,
    validDCol: number,
  ): boolean {
    if (dRow === 0 || dCol === 0 || validDRow === 0 || validDCol === 0) {
      return false; // Not diagonal
    }

    // Normalize directions to unit vectors
    const rowSign = Math.sign(dRow);
    const colSign = Math.sign(dCol);
    const validRowSign = Math.sign(validDRow);
    const validColSign = Math.sign(validDCol);

    return rowSign === validRowSign && colSign === validColSign;
  }

  /**
   * Check if path between two positions is clear
   */
  private isPathClear(board: Board, from: Position, to: Position): boolean {
    const dRow = to.row - from.row;
    const dCol = to.col - from.col;
    const steps = Math.abs(dRow); // Should equal Math.abs(dCol) for diagonal moves

    if (steps !== Math.abs(dCol)) return false;

    const rowStep = Math.sign(dRow);
    const colStep = Math.sign(dCol);

    // Check each square in the path (excluding start and end)
    for (let i = 1; i < steps; i++) {
      const checkRow = from.row + rowStep * i;
      const checkCol = from.col + colStep * i;

      if (this.getPiece(board, { row: checkRow, col: checkCol })) {
        return false; // Path blocked
      }
    }

    return true;
  }

  /**
   * Check if capture move satisfies maximum capture rule
   */
  private isMaximumCaptureMove(board: Board, move: Move): boolean {
    const piece = this.getPiece(board, move.from);
    if (!piece) return false;

    // Find all possible capture moves for this piece
    const allCaptureMoves = this.getAllCaptureMoves(board, move.from, piece);

    if (allCaptureMoves.length === 0) return false;

    // Find maximum capture count
    const maxCaptures = Math.max(
      ...allCaptureMoves.map((m) => m.captures?.length ?? 0),
    );

    // This move must capture the maximum possible
    return (move.captures?.length ?? 0) === maxCaptures;
  }

  /**
   * Get all possible capture moves from a position
   */
  private getAllCaptureMoves(
    board: Board,
    from: Position,
    piece: Piece,
  ): Move[] {
    const moves: Move[] = [];
    const directions = this.getValidDirections(piece);

    for (const [dRow, dCol] of directions) {
      if (piece.type === "king" && this.canFlyAsKing()) {
        // Flying king captures
        moves.push(
          ...this.getFlyingKingCaptures(board, from, [dRow, dCol], piece),
        );
      } else {
        // Regular captures (one square jump)
        moves.push(
          ...this.getRegularCaptures(board, from, [dRow, dCol], piece),
        );
      }
    }

    return moves;
  }

  /**
   * Get flying king captures in a direction
   */
  private getFlyingKingCaptures(
    board: Board,
    from: Position,
    direction: [number, number],
    piece: Piece,
  ): Move[] {
    const moves: Move[] = [];
    const [dRow, dCol] = direction;
    let distance = 1;
    let foundEnemy = false;
    let enemyPos: Position | null = null;

    // Scan along the diagonal
    while (true) {
      const checkRow = from.row + dRow * distance;
      const checkCol = from.col + dCol * distance;

      if (!this.validator.isValidSquare(checkRow, checkCol)) break;

      const checkPiece = this.getPiece(board, { row: checkRow, col: checkCol });

      if (checkPiece) {
        if (!foundEnemy && checkPiece.color !== piece.color) {
          // Found enemy piece
          foundEnemy = true;
          enemyPos = { row: checkRow, col: checkCol };
        } else {
          // Found another piece (friendly or second enemy) - stop
          break;
        }
      } else if (foundEnemy && enemyPos) {
        // Empty square after enemy - valid landing spot
        const tempBoard = this.copyBoard(board);
        this.setPiece(tempBoard, { row: checkRow, col: checkCol }, piece);
        this.setPiece(tempBoard, from, null);
        this.setPiece(tempBoard, enemyPos, null);

        // Look for further captures
        const furtherCaptures = this.getAllCaptureMoves(
          tempBoard,
          { row: checkRow, col: checkCol },
          piece,
        );

        if (furtherCaptures.length > 0) {
          for (const furtherMove of furtherCaptures) {
            moves.push({
              from: from,
              to: furtherMove.to,
              captures: [enemyPos, ...(furtherMove.captures || [])],
            });
          }
        } else {
          moves.push({
            from: from,
            to: { row: checkRow, col: checkCol },
            captures: [enemyPos],
          });
        }
      }

      distance++;
    }

    return moves;
  }

  /**
   * Get regular piece captures (one square jump)
   */
  private getRegularCaptures(
    board: Board,
    from: Position,
    direction: [number, number],
    piece: Piece,
  ): Move[] {
    const moves: Move[] = [];
    const [dRow, dCol] = direction;
    const captureRow = from.row + dRow;
    const captureCol = from.col + dCol;
    const landRow = from.row + dRow * 2;
    const landCol = from.col + dCol * 2;

    if (
      this.validator.isValidSquare(landRow, landCol) &&
      this.getPiece(board, { row: captureRow, col: captureCol }) &&
      this.getPiece(board, { row: captureRow, col: captureCol })!.color !==
        piece.color &&
      !this.getPiece(board, { row: landRow, col: landCol })
    ) {
      const tempBoard = this.copyBoard(board);
      this.setPiece(tempBoard, { row: landRow, col: landCol }, piece);
      this.setPiece(tempBoard, from, null);
      this.setPiece(tempBoard, { row: captureRow, col: captureCol }, null);

      // Look for further captures
      const furtherCaptures = this.getAllCaptureMoves(
        tempBoard,
        { row: landRow, col: landCol },
        piece,
      );

      if (furtherCaptures.length > 0) {
        for (const furtherMove of furtherCaptures) {
          moves.push({
            from: from,
            to: furtherMove.to,
            captures: [
              { row: captureRow, col: captureCol },
              ...(furtherMove.captures || []),
            ],
          });
        }
      } else {
        moves.push({
          from: from,
          to: { row: landRow, col: landCol },
          captures: [{ row: captureRow, col: captureCol }],
        });
      }
    }

    return moves;
  }

  /**
   * Find all valid moves for a player
   */
  findValidMoves(board: Board, player: PieceColor): Move[] {
    const moves: Move[] = [];
    const size = this.config.board.size;

    // First check if captures are available (mandatory capture rule)
    const captures: Move[] = [];

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const piece = board[row]![col];
        if (piece && piece.color === player) {
          const position = { row, col };
          const pieceCaptures = this.getAllCaptureMoves(board, position, piece);
          captures.push(...pieceCaptures);
        }
      }
    }

    // If captures are available and mandatory, return only captures
    if (captures.length > 0 && this.isMandatoryCapture()) {
      // Apply maximum capture rule if enabled
      if (this.requiresMaximumCapture()) {
        const maxCaptures = Math.max(
          ...captures.map((m) => m.captures?.length ?? 0),
        );
        return captures.filter((m) => m.captures?.length === maxCaptures);
      }
      return captures;
    }

    // Otherwise, find regular moves
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const piece = board[row]![col];
        if (piece && piece.color === player) {
          const directions = this.getValidDirections(piece);

          for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;

            if (
              this.validator.isValidSquare(newRow, newCol) &&
              !board[newRow]![newCol]
            ) {
              const move: Move = {
                from: { row, col },
                to: { row: newRow, col: newCol },
              };

              if (this.validateMove(board, move)) {
                moves.push(move);
              }
            }

            // For flying kings
            if (piece.type === "king" && this.canFlyAsKing()) {
              for (let dist = 2; dist < size; dist++) {
                const kingRow = row + dRow * dist;
                const kingCol = col + dCol * dist;

                if (!this.validator.isValidSquare(kingRow, kingCol)) break;
                if (board[kingRow]![kingCol]) break;

                const kingMove: Move = {
                  from: { row, col },
                  to: { row: kingRow, col: kingCol },
                };

                if (this.validateMove(board, kingMove)) {
                  moves.push(kingMove);
                }
              }
            }
          }
        }
      }
    }

    return moves;
  }

  /**
   * Check for a winner
   */
  checkWinner(board: Board): PieceColor | "draw" | null {
    let redPieces = 0;
    let blackPieces = 0;
    let redHasMoves = false;
    let blackHasMoves = false;

    // Count pieces
    for (let row = 0; row < this.config.board.size; row++) {
      for (let col = 0; col < this.config.board.size; col++) {
        const piece = board[row]![col];
        if (piece) {
          if (piece.color === "red") redPieces++;
          else blackPieces++;
        }
      }
    }

    // Check if players have valid moves
    if (redPieces > 0) {
      const redMoves = this.findValidMoves(board, "red");
      redHasMoves = redMoves.length > 0;
    }

    if (blackPieces > 0) {
      const blackMoves = this.findValidMoves(board, "black");
      blackHasMoves = blackMoves.length > 0;
    }

    // Determine winner
    if (redPieces === 0 || !redHasMoves) return "black";
    if (blackPieces === 0 || !blackHasMoves) return "red";

    // Check for insufficient material
    if (
      this.config.draws.insufficientMaterial &&
      this.checkInsufficientMaterial(board)
    ) {
      return "draw";
    }

    return null;
  }

  /**
   * Check draw conditions
   */
  checkDrawCondition(
    board: Board,
    moveHistory: Move[],
    currentPlayer?: PieceColor,
  ): "draw" | null {
    const draws = this.config.draws;

    // Check stalemate (no valid moves but not in check)
    if (draws.staleMate && currentPlayer) {
      const moves = this.findValidMoves(board, currentPlayer);
      if (moves.length === 0) {
        // In checkers, if you can't move, you lose (not draw)
        // But if configured for stalemate=draw, return draw
        return "draw";
      }
    }

    // Check repetition draws
    if (this.checkRepetition(moveHistory, draws.repetitionLimit)) {
      return "draw";
    }

    // Check move-count rules
    if (draws.fortyMoveRule && this.check40MoveRule(moveHistory)) {
      return "draw";
    }

    if (draws.twentyFiveMoveRule && this.check25MoveRule(board, moveHistory)) {
      return "draw";
    }

    // Check insufficient material
    if (draws.insufficientMaterial && this.checkInsufficientMaterial(board)) {
      return "draw";
    }

    return null;
  }

  /**
   * Apply a move to the board
   */
  makeMove(board: Board, move: Move): Board {
    const newBoard = this.copyBoard(board);
    const piece = this.getPiece(newBoard, move.from);

    if (!piece) return board;

    // Move piece
    this.setPiece(newBoard, move.to, piece);
    this.setPiece(newBoard, move.from, null);

    // Remove captured pieces
    if (move.captures) {
      for (const capture of move.captures) {
        this.setPiece(newBoard, capture, null);
      }
    }

    // Check for promotion
    if (this.shouldPromote(piece, move.to.row)) {
      this.setPiece(newBoard, move.to, { ...piece, type: "king" });
    }

    return newBoard;
  }

  // Helper methods
  private getPiece(board: Board, pos: Position): Piece | null {
    if (!this.validator.isValidSquare(pos.row, pos.col)) {
      return null;
    }
    return board[pos.row]?.[pos.col] ?? null;
  }

  private setPiece(board: Board, pos: Position, piece: Piece | null): void {
    if (this.validator.isValidSquare(pos.row, pos.col)) {
      board[pos.row]![pos.col] = piece;
    }
  }

  private copyBoard(board: Board): Board {
    return board.map((row) =>
      row.map((piece) => (piece ? { ...piece } : null)),
    );
  }

  private checkRepetition(moveHistory: Move[], limit: number): boolean {
    // Simplified repetition check
    const recentMoves = moveHistory.slice(-limit * 2); // Last N moves by each player
    if (recentMoves.length < limit * 2) return false;

    // Check if pattern repeats
    for (let i = 0; i < limit; i++) {
      const move1 = recentMoves[i];
      const move2 = recentMoves[i + limit];
      if (!this.movesEqual(move1, move2)) {
        return false;
      }
    }
    return true;
  }

  private movesEqual(move1?: Move, move2?: Move): boolean {
    if (!move1 || !move2) return false;
    return (
      move1.from.row === move2.from.row &&
      move1.from.col === move2.from.col &&
      move1.to.row === move2.to.row &&
      move1.to.col === move2.to.col
    );
  }

  private check40MoveRule(moveHistory: Move[]): boolean {
    let movesWithoutCapture = 0;
    for (let i = moveHistory.length - 1; i >= 0; i--) {
      if (moveHistory[i]?.captures && moveHistory[i]!.captures!.length > 0) {
        break;
      }
      movesWithoutCapture++;
    }
    return movesWithoutCapture >= 40;
  }

  private check25MoveRule(board: Board, moveHistory: Move[]): boolean {
    // Simplified 25-move rule check for endgame
    const totalPieces = this.countPieces(board);
    if (totalPieces <= 6) {
      let movesWithoutCapture = 0;
      for (let i = moveHistory.length - 1; i >= 0; i--) {
        if (moveHistory[i]?.captures && moveHistory[i]!.captures!.length > 0) {
          break;
        }
        movesWithoutCapture++;
      }
      return movesWithoutCapture >= 25;
    }
    return false;
  }

  private checkInsufficientMaterial(board: Board): boolean {
    let totalPieces = 0;
    let kingCount = 0;

    for (let row = 0; row < this.config.board.size; row++) {
      for (let col = 0; col < this.config.board.size; col++) {
        const piece = this.getPiece(board, { row, col });
        if (piece) {
          totalPieces++;
          if (piece.type === "king") kingCount++;
        }
      }
    }

    // King vs King is insufficient
    return totalPieces === 2 && kingCount === 2;
  }

  private countPieces(board: Board): number {
    let count = 0;
    for (let row = 0; row < this.config.board.size; row++) {
      for (let col = 0; col < this.config.board.size; col++) {
        if (this.getPiece(board, { row, col })) count++;
      }
    }
    return count;
  }

  // Tournament mode methods
  enforceTouch(): boolean {
    return this.config.tournament?.touchMove ?? false;
  }

  allowUndo(): boolean {
    return !this.enforceTouch(); // Tournament mode typically disallows undo
  }

  requiresNotation(): boolean {
    return this.config.tournament?.notation.required ?? false;
  }

  get40MoveRule(): boolean {
    return this.config.draws.fortyMoveRule;
  }

  getRepetitionLimit(): number {
    return this.config.draws.repetitionLimit;
  }

  // Metadata getters
  get name(): string {
    return this.config.metadata.name;
  }

  get displayName(): string {
    return this.config.metadata.displayName;
  }

  get description(): string {
    return this.config.metadata.description;
  }
}
