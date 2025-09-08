import { createInitialBoard } from './lib/game-logic';
import { getBoardConfig, getBoardVariants } from './lib/board-config';

console.log('Testing Board Configurations');
console.log('============================\n');

const variants = getBoardVariants();

for (const variant of variants) {
  const config = getBoardConfig(variant);
  const board = createInitialBoard(config);
  
  console.log(`${config.name}:`);
  console.log(`- Config Size: ${config.size}×${config.size}`);
  console.log(`- Board Size: ${board.length}×${board[0]?.length || 0}`);
  console.log(`- Piece Rows: ${config.pieceRows}`);
  
  let blackCount = 0;
  let redCount = 0;
  
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < (board[row]?.length || 0); col++) {
      const piece = board[row]?.[col];
      if (piece) {
        if (piece.color === 'black') blackCount++;
        else if (piece.color === 'red') redCount++;
      }
    }
  }
  
  console.log(`- Black Pieces: ${blackCount}`);
  console.log(`- Red Pieces: ${redCount}`);
  console.log(`- Total: ${blackCount + redCount}`);
  console.log(`- Expected per side: ${Math.floor(config.size * config.pieceRows / 2)}`);
  
  const isCorrect = board.length === config.size && 
                     board[0]?.length === config.size &&
                     blackCount === Math.floor(config.size * config.pieceRows / 2) &&
                     redCount === Math.floor(config.size * config.pieceRows / 2);
  
  console.log(`- ✅ Correct: ${isCorrect ? 'YES' : 'NO'}`);
  console.log();
}

export {};