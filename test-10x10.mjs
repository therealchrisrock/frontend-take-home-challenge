// Test script for 10x10 board
import { createInitialBoard } from './dist/lib/game-logic.js';
import { getBoardConfig } from './dist/lib/board-config.js';

const config = getBoardConfig('international');
const board = createInitialBoard(config);

console.log('International Draughts (10x10) Test:');
console.log('=====================================');
console.log(`Board size: ${board.length}x${board[0].length}`);
console.log(`Config size: ${config.size}x${config.size}`);

let blackCount = 0;
let redCount = 0;

for (let row = 0; row < board.length; row++) {
  for (let col = 0; col < board[row].length; col++) {
    const piece = board[row][col];
    if (piece) {
      if (piece.color === 'black') blackCount++;
      else if (piece.color === 'red') redCount++;
    }
  }
}

console.log(`Black pieces: ${blackCount}`);
console.log(`Red pieces: ${redCount}`);
console.log(`Total pieces: ${blackCount + redCount}`);

// Visual representation
console.log('\nBoard Layout:');
for (let row = 0; row < board.length; row++) {
  let rowStr = '';
  for (let col = 0; col < board[row].length; col++) {
    const piece = board[row][col];
    if (piece) {
      rowStr += piece.color === 'black' ? 'B' : 'R';
    } else {
      rowStr += (row + col) % 2 === 1 ? '·' : ' ';
    }
  }
  console.log(`Row ${row}: ${rowStr}`);
}