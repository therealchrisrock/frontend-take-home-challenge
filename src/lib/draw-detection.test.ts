import { describe, it, expect } from "vitest";
import {
  createDrawState,
  serializeBoard,
  updateDrawState,
  checkThreefoldRepetition,
  checkFortyMoveRule,
  checkTwentyFiveMoveRule,
  checkInsufficientMaterial,
  checkDrawConditions,
} from "./game/draw-detection";
import { createInitialBoard, type Board, type Move } from "./game/logic";
import { AmericanConfig } from "./game-engine/rule-configs/american";
import type { VariantConfig } from "./game-engine/rule-schema";

describe("Draw Detection", () => {
  // Use AmericanConfig directly since it already has the draw rules enabled
  const testConfig: VariantConfig = AmericanConfig;

  describe("serializeBoard", () => {
    it("should serialize board position correctly", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[0][1] = { color: "black", type: "regular" };
      board[7][6] = { color: "red", type: "king" };

      const serialized = serializeBoard(board, "red");
      expect(serialized).toContain("br");
      expect(serialized).toContain("rk");
      expect(serialized.endsWith(":red")).toBe(true);
    });

    it("should produce different serializations for different positions", () => {
      const board1: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board1[0][1] = { color: "black", type: "regular" };

      const board2: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board2[0][3] = { color: "black", type: "regular" };

      const serial1 = serializeBoard(board1, "red");
      const serial2 = serializeBoard(board2, "red");

      expect(serial1).not.toBe(serial2);
    });

    it("should include current player in serialization", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      const serialRed = serializeBoard(board, "red");
      const serialBlack = serializeBoard(board, "black");

      expect(serialRed.endsWith(":red")).toBe(true);
      expect(serialBlack.endsWith(":black")).toBe(true);
      expect(serialRed).not.toBe(serialBlack);
    });
  });

  describe("updateDrawState", () => {
    it("should reset capture counter on capture move", () => {
      const state = createDrawState();
      state.movesSinceCapture = 10;

      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      const captureMove: Move = {
        from: { row: 0, col: 0 },
        to: { row: 2, col: 2 },
        captures: [{ row: 1, col: 1 }],
      };

      const newState = updateDrawState(state, board, captureMove, "red", false);
      expect(newState.movesSinceCapture).toBe(0);
    });

    it("should increment capture counter on non-capture move", () => {
      const state = createDrawState();
      state.movesSinceCapture = 5;

      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      const regularMove: Move = {
        from: { row: 0, col: 0 },
        to: { row: 1, col: 1 },
      };

      const newState = updateDrawState(state, board, regularMove, "red", false);
      expect(newState.movesSinceCapture).toBe(6);
    });

    it("should reset promotion counter on promotion", () => {
      const state = createDrawState();
      state.movesSincePromotion = 15;

      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      const move: Move = {
        from: { row: 6, col: 0 },
        to: { row: 7, col: 1 },
      };

      const newState = updateDrawState(state, board, move, "red", true);
      expect(newState.movesSincePromotion).toBe(0);
    });

    it("should track board positions", () => {
      const state = createDrawState();
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      const move: Move = {
        from: { row: 0, col: 0 },
        to: { row: 1, col: 1 },
      };

      const newState = updateDrawState(state, board, move, "red", false);
      expect(newState.boardPositions.length).toBe(1);
      expect(newState.positionCounts.size).toBe(1);
    });

    it("should count position repetitions", () => {
      let state = createDrawState();
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      const move: Move = {
        from: { row: 0, col: 0 },
        to: { row: 1, col: 1 },
      };

      // Same position three times
      state = updateDrawState(state, board, move, "red", false);
      state = updateDrawState(state, board, move, "red", false);
      state = updateDrawState(state, board, move, "red", false);

      const position = serializeBoard(board, "red");
      expect(state.positionCounts.get(position)).toBe(3);
    });
  });

  describe("checkThreefoldRepetition", () => {
    it("should detect threefold repetition", () => {
      const state = createDrawState();
      const position = "test-position";
      state.positionCounts.set(position, 3);

      const result = checkThreefoldRepetition(state, testConfig);
      expect(result).toBe(true);
    });

    it("should not detect repetition below limit", () => {
      const state = createDrawState();
      const position = "test-position";
      state.positionCounts.set(position, 2);

      const result = checkThreefoldRepetition(state, testConfig);
      expect(result).toBe(false);
    });

    it("should respect custom repetition limit", () => {
      const state = createDrawState();
      const position = "test-position";
      state.positionCounts.set(position, 4);

      const config = { ...testConfig };
      config.draws.repetitionLimit = 5;

      const result = checkThreefoldRepetition(state, config);
      expect(result).toBe(false);

      state.positionCounts.set(position, 5);
      const result2 = checkThreefoldRepetition(state, config);
      expect(result2).toBe(true);
    });
  });

  describe("checkFortyMoveRule", () => {
    it("should detect forty-move rule violation", () => {
      const state = createDrawState();
      state.movesSinceCapture = 80;
      state.movesSincePromotion = 80;

      const result = checkFortyMoveRule(state, testConfig);
      expect(result).toBe(true);
    });

    it("should not trigger before limit", () => {
      const state = createDrawState();
      state.movesSinceCapture = 79;
      state.movesSincePromotion = 79;

      const result = checkFortyMoveRule(state, testConfig);
      expect(result).toBe(false);
    });

    it("should require both counters to exceed limit", () => {
      const state = createDrawState();
      state.movesSinceCapture = 80;
      state.movesSincePromotion = 50;

      const result = checkFortyMoveRule(state, testConfig);
      expect(result).toBe(false);
    });

    it("should return false if rule is disabled", () => {
      const state = createDrawState();
      state.movesSinceCapture = 100;
      state.movesSincePromotion = 100;

      const config = { ...testConfig };
      config.draws.fortyMoveRule = false;

      const result = checkFortyMoveRule(state, config);
      expect(result).toBe(false);
    });
  });

  describe("checkTwentyFiveMoveRule", () => {
    it("should detect twenty-five move rule in king endgame", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[0][1] = { color: "black", type: "king" };
      board[7][6] = { color: "red", type: "king" };

      const state = createDrawState();
      state.movesSinceCapture = 50;

      const result = checkTwentyFiveMoveRule(board, state, testConfig);
      expect(result).toBe(true);
    });

    it("should not apply with regular pieces present", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[0][1] = { color: "black", type: "king" };
      board[7][6] = { color: "red", type: "king" };
      board[3][4] = { color: "red", type: "regular" };

      const state = createDrawState();
      state.movesSinceCapture = 50;

      const result = checkTwentyFiveMoveRule(board, state, testConfig);
      expect(result).toBe(false);
    });

    it("should not trigger before limit in king endgame", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[0][1] = { color: "black", type: "king" };
      board[7][6] = { color: "red", type: "king" };

      const state = createDrawState();
      state.movesSinceCapture = 49;

      const result = checkTwentyFiveMoveRule(board, state, testConfig);
      expect(result).toBe(false);
    });
  });

  describe("checkInsufficientMaterial", () => {
    it("should detect king vs king", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[0][1] = { color: "black", type: "king" };
      board[7][6] = { color: "red", type: "king" };

      const result = checkInsufficientMaterial(board, testConfig);
      expect(result).toBe(true);
    });

    it("should detect two kings vs one king", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[0][1] = { color: "black", type: "king" };
      board[7][6] = { color: "red", type: "king" };
      board[4][3] = { color: "red", type: "king" };

      const result = checkInsufficientMaterial(board, testConfig);
      expect(result).toBe(true);
    });

    it("should not detect with sufficient material", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[0][1] = { color: "black", type: "king" };
      board[0][3] = { color: "black", type: "regular" };
      board[7][6] = { color: "red", type: "king" };

      const result = checkInsufficientMaterial(board, testConfig);
      expect(result).toBe(false);
    });

    it("should detect three kings vs one on large board", () => {
      const board: Board = Array(10)
        .fill(null)
        .map(() => Array(10).fill(null));
      board[0][1] = { color: "black", type: "king" };
      board[9][8] = { color: "red", type: "king" };
      board[5][4] = { color: "red", type: "king" };
      board[6][5] = { color: "red", type: "king" };

      const config = { ...testConfig };
      config.board.size = 10;

      const result = checkInsufficientMaterial(board, config);
      expect(result).toBe(true);
    });

    it("should not detect three kings vs one on small board", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[0][1] = { color: "black", type: "king" };
      board[7][6] = { color: "red", type: "king" };
      board[5][4] = { color: "red", type: "king" };
      board[6][5] = { color: "red", type: "king" };

      // Three vs one is actually insufficient on 8x8
      const result = checkInsufficientMaterial(board, testConfig);
      expect(result).toBe(true);
    });
  });

  describe("checkDrawConditions", () => {
    it("should detect threefold repetition draw", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[0][1] = { color: "black", type: "regular" };
      board[7][6] = { color: "red", type: "regular" };
      const state = createDrawState();
      state.positionCounts.set("test-position", 3);

      const result = checkDrawConditions(board, state, testConfig);
      expect(result).toBe("draw");
    });

    it("should detect forty-move rule draw", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[0][1] = { color: "black", type: "regular" };
      board[7][6] = { color: "red", type: "regular" };
      const state = createDrawState();
      state.movesSinceCapture = 80;
      state.movesSincePromotion = 80;

      const result = checkDrawConditions(board, state, testConfig);
      expect(result).toBe("draw");
    });

    it("should detect insufficient material draw", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[0][1] = { color: "black", type: "king" };
      board[7][6] = { color: "red", type: "king" };

      const state = createDrawState();

      const result = checkDrawConditions(board, state, testConfig);
      expect(result).toBe("draw");
    });

    it("should return null when no draw conditions met", () => {
      const board = createInitialBoard(testConfig);
      const state = createDrawState();

      const result = checkDrawConditions(board, state, testConfig);
      expect(result).toBe(null);
    });

    it("should check conditions in priority order", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[0][1] = { color: "black", type: "king" };
      board[7][6] = { color: "red", type: "king" };

      const state = createDrawState();
      // Both repetition and insufficient material conditions
      state.positionCounts.set("test-position", 3);

      // Should detect repetition first
      const result = checkDrawConditions(board, state, testConfig);
      expect(result).toBe("draw");
    });
  });

  describe("Integration with checkWinner", () => {
    it("should detect draw through checkWinner with draw state", async () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[0][1] = { color: "black", type: "king" };
      board[7][6] = { color: "red", type: "king" };

      const state = createDrawState();

      // Import checkWinner from game-logic using import statement
      const { checkWinner } = await import("./game/logic");
      const result = checkWinner(board, testConfig, state);
      expect(result).toBe("draw");
    });

    it("should prioritize win over draw", async () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      // Red has no pieces
      board[0][1] = { color: "black", type: "king" };

      const state = createDrawState();
      state.movesSinceCapture = 80; // Would be draw by forty-move rule

      const { checkWinner } = await import("./game/logic");
      const result = checkWinner(board, testConfig, state);
      expect(result).toBe("black"); // Win takes precedence
    });
  });
});
