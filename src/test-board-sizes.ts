import { createInitialBoard } from './lib/game-logic';
import { GameConfigLoader } from './lib/game-engine/config-loader';
import { getBoardVariants } from './lib/variants';

console.log('Testing Board Configurations');
console.log('============================\n');

const variants = getBoardVariants();

for (const variant of variants) {
  const rules = GameConfigLoader.loadVariant(variant);
  const board = createInitialBoard(rules);
  
  console.log(`${rules.metadata.displayName}:`);
  console.log(`- Config Size: ${rules.board.size}×${rules.board.size}`);
  console.log(`- Board Size: ${board.length}×${board[0]?.length || 0}`);
  const pieceRows = Math.max(rules.board.startingRows.red.length, rules.board.startingRows.black.length);
  console.log(`- Piece Rows: ${pieceRows}`);
  
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
  console.log(`- Expected per side: ${Math.floor(rules.board.size * pieceRows / 2)}`);
  
  const isCorrect = board.length === rules.board.size && 
                     board[0]?.length === rules.board.size &&
                     blackCount === Math.floor(rules.board.size * pieceRows / 2) &&
                     redCount === Math.floor(rules.board.size * pieceRows / 2);
  
  console.log(`- ✅ Correct: ${isCorrect ? 'YES' : 'NO'}`);
  console.log();
}

export {};