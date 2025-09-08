// Quick test script for board configuration
import { createInitialBoard, isValidSquare, getValidMoves } from './src/lib/game-logic.js';
import { getBoardConfig } from './src/lib/board-config.js';

console.log('Testing board configuration system...\n');

// Test American checkers (8x8)
const americanConfig = getBoardConfig('american');
console.log('American Checkers:');
console.log(`- Size: ${americanConfig.size}x${americanConfig.size}`);
console.log(`- Piece rows: ${americanConfig.pieceRows}`);
console.log(`- Description: ${americanConfig.description}\n`);

const americanBoard = createInitialBoard(americanConfig);
console.log(`American board pieces: ${americanBoard.flat().filter(p => p !== null).length}`);

// Test International draughts (10x10)
const internationalConfig = getBoardConfig('international');
console.log('\nInternational Draughts:');
console.log(`- Size: ${internationalConfig.size}x${internationalConfig.size}`);
console.log(`- Piece rows: ${internationalConfig.pieceRows}`);
console.log(`- Description: ${internationalConfig.description}\n`);

const internationalBoard = createInitialBoard(internationalConfig);
console.log(`International board pieces: ${internationalBoard.flat().filter(p => p !== null).length}`);

// Test validity checks
console.log('\nBoard boundary tests:');
console.log(`American (7,7) valid: ${isValidSquare(7, 7, americanConfig)}`);
console.log(`American (8,8) valid: ${isValidSquare(8, 8, americanConfig)}`);
console.log(`International (9,9) valid: ${isValidSquare(9, 9, internationalConfig)}`);
console.log(`International (10,10) valid: ${isValidSquare(10, 10, internationalConfig)}`);

console.log('\nTest completed successfully!');