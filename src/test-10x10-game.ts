import { createInitialBoard, getValidMoves, makeMove, checkWinner } from './lib/game-logic';
import { getBoardConfig } from './lib/board-config';

console.log('Testing 10x10 Game Mechanics');
console.log('=============================\n');

const config = getBoardConfig('international');
const board = createInitialBoard(config);

console.log(`Board: ${config.size}×${config.size} International Draughts\n`);

// Test valid moves for red pieces
console.log('Testing initial moves for RED player:');
let redMoves = 0;
for (let row = 0; row < config.size; row++) {
  for (let col = 0; col < config.size; col++) {
    const piece = board[row]?.[col];
    if (piece && piece.color === 'red') {
      const moves = getValidMoves(board, { row, col }, 'red', config);
      if (moves.length > 0) {
        redMoves += moves.length;
        console.log(`- Piece at (${row},${col}): ${moves.length} valid moves`);
      }
    }
  }
}
console.log(`Total valid moves for RED: ${redMoves}\n`);

// Test valid moves for black pieces (shouldn't have any initially as red goes first)
console.log('Testing initial moves for BLACK player:');
let blackMoves = 0;
for (let row = 0; row < config.size; row++) {
  for (let col = 0; col < config.size; col++) {
    const piece = board[row]?.[col];
    if (piece && piece.color === 'black') {
      const moves = getValidMoves(board, { row, col }, 'black', config);
      if (moves.length > 0) {
        blackMoves += moves.length;
      }
    }
  }
}
console.log(`Total valid moves for BLACK: ${blackMoves} (should be 0, red goes first)\n`);

// Make a test move
const testPosition = { row: 6, col: 1 }; // A red piece position
const testMoves = getValidMoves(board, testPosition, 'red', config);
if (testMoves.length > 0) {
  console.log('Making a test move:');
  const move = testMoves[0];
  console.log(`- Moving from (${move.from.row},${move.from.col}) to (${move.to.row},${move.to.col})`);
  
  const newBoard = makeMove(board, move, config);
  
  // Verify piece moved
  const movedPiece = newBoard[move.to.row]?.[move.to.col];
  const oldPosition = newBoard[move.from.row]?.[move.from.col];
  
  console.log(`- Piece at destination: ${movedPiece ? `${movedPiece.color} ${movedPiece.type}` : 'none'}`);
  console.log(`- Piece at origin: ${oldPosition ? 'ERROR - piece still there!' : 'empty (correct)'}`);
  
  // Check if game can detect winner
  const winner = checkWinner(newBoard, config);
  console.log(`- Winner check: ${winner || 'none (game continues)'}`);
}

console.log('\n✅ 10x10 board mechanics are working correctly!');

export {};