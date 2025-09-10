import { PrismaClient } from "@prisma/client";
import type { GameVariantEnum } from "@prisma/client";

const prisma = new PrismaClient();

// Helper function to generate a realistic board state
function generateBoardState(moveCount: number, winner: string | null) {
  // Create a standard 8x8 checkers board
  const board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  if (winner) {
    // End game state - winner has more pieces
    if (winner === "red") {
      // Red wins - place more red pieces
      board[0][1] = { type: "king", color: "red" };
      board[0][3] = { type: "king", color: "red" };
      board[1][2] = { type: "regular", color: "red" };
      board[2][3] = { type: "regular", color: "red" };
      board[7][6] = { type: "regular", color: "black" };
    } else if (winner === "black") {
      // Black wins - place more black pieces
      board[7][2] = { type: "king", color: "black" };
      board[7][4] = { type: "king", color: "black" };
      board[6][3] = { type: "regular", color: "black" };
      board[5][2] = { type: "regular", color: "black" };
      board[0][1] = { type: "regular", color: "red" };
    }
  } else if (moveCount < 10) {
    // Early game - most pieces still on board
    // Red pieces (top)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          board[row][col] = { type: "regular", color: "red" };
        }
      }
    }
    // Black pieces (bottom)
    for (let row = 5; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          board[row][col] = { type: "regular", color: "black" };
        }
      }
    }
  } else {
    // Mid to late game - fewer pieces, some kings
    const positions = [
      { row: 0, col: 1, piece: { type: "king", color: "red" } },
      { row: 1, col: 2, piece: { type: "regular", color: "red" } },
      { row: 2, col: 3, piece: { type: "regular", color: "red" } },
      { row: 3, col: 4, piece: { type: "regular", color: "red" } },
      { row: 7, col: 6, piece: { type: "king", color: "black" } },
      { row: 6, col: 5, piece: { type: "regular", color: "black" } },
      { row: 5, col: 4, piece: { type: "regular", color: "black" } },
      { row: 4, col: 3, piece: { type: "regular", color: "black" } },
    ];

    // Place pieces based on move count
    const piecesToPlace = Math.max(4, 12 - Math.floor(moveCount / 10));
    for (let i = 0; i < Math.min(piecesToPlace, positions.length); i++) {
      const pos = positions[i];
      if (pos) {
        board[pos.row][pos.col] = pos.piece;
      }
    }
  }

  return JSON.stringify(board);
}

// Helper to generate game moves
function generateGameMoves(gameId: string, moveCount: number) {
  const moves = [];
  for (let i = 0; i < moveCount; i++) {
    const isRedMove = i % 2 === 0;
    const fromRow = isRedMove
      ? Math.floor(Math.random() * 3)
      : 5 + Math.floor(Math.random() * 3);
    const fromCol = Math.floor(Math.random() * 8);
    const toRow = isRedMove ? fromRow + 1 : fromRow - 1;
    const toCol = fromCol + (Math.random() > 0.5 ? 1 : -1);

    // Occasional captures
    const captures =
      Math.random() > 0.7
        ? JSON.stringify([
            { row: (fromRow + toRow) / 2, col: (fromCol + toCol) / 2 },
          ])
        : null;

    moves.push({
      gameId,
      moveIndex: i,
      fromRow: Math.max(0, Math.min(7, fromRow)),
      fromCol: Math.max(0, Math.min(7, fromCol)),
      toRow: Math.max(0, Math.min(7, toRow)),
      toCol: Math.max(0, Math.min(7, toCol)),
      captures,
    });
  }
  return moves;
}

async function main() {
  console.log("🎮 Starting game history seeding...");

  // Find supertester and testuser2
  const superTester = await prisma.user.findUnique({
    where: { email: "supertester@example.com" },
  });

  const testUser2 = await prisma.user.findUnique({
    where: { email: "testuser2@example.com" },
  });

  if (!superTester || !testUser2) {
    console.error(
      "❌ Could not find supertester or testuser2. Please run the main seed script first.",
    );
    process.exit(1);
  }

  console.log(`Found users: ${superTester.username} and ${testUser2.username}`);

  // Create PlayerRating records for both users
  const variants: GameVariantEnum[] = [
    "AMERICAN",
    "INTERNATIONAL",
    "BRAZILIAN",
  ];

  for (const variant of variants) {
    // Create rating for supertester
    const existingSuperRating = await prisma.playerRating.findUnique({
      where: {
        userId_variant_playMode: {
          userId: superTester.id,
          variant: variant,
          playMode: "CASUAL",
        },
      },
    });

    if (!existingSuperRating) {
      await prisma.playerRating.create({
        data: {
          userId: superTester.id,
          variant: variant,
          playMode: "CASUAL",
          rating: 1450 + Math.floor(Math.random() * 100), // Higher rating for super tester
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          provisional: false,
          peakRating: 1550,
        },
      });
    }

    // Create rating for testuser2
    const existingUser2Rating = await prisma.playerRating.findUnique({
      where: {
        userId_variant_playMode: {
          userId: testUser2.id,
          variant: variant,
          playMode: "CASUAL",
        },
      },
    });

    if (!existingUser2Rating) {
      await prisma.playerRating.create({
        data: {
          userId: testUser2.id,
          variant: variant,
          playMode: "CASUAL",
          rating: 1250 + Math.floor(Math.random() * 100),
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          provisional: false,
          peakRating: 1350,
        },
      });
    }
  }

  // Generate 30 games with varied outcomes
  const games = [];
  const now = new Date();

  console.log("\n📊 Creating game history...");

  for (let i = 0; i < 30; i++) {
    // Vary game outcomes:
    // - 40% supertester wins
    // - 30% testuser2 wins
    // - 20% ongoing games
    // - 10% draws
    let winner = null;
    let currentPlayer = "red";

    const rand = Math.random();
    if (rand < 0.4) {
      winner = "red"; // supertester wins (playing as red)
    } else if (rand < 0.7) {
      winner = "black"; // testuser2 wins (playing as black)
    } else if (rand < 0.8) {
      winner = "draw";
    } else {
      // Ongoing game
      winner = null;
      currentPlayer = i % 2 === 0 ? "red" : "black";
    }

    const moveCount = winner
      ? 20 + Math.floor(Math.random() * 40)
      : 10 + Math.floor(Math.random() * 20);
    const gameStartTime = new Date(
      now.getTime() - (30 - i) * 24 * 60 * 60 * 1000,
    ); // Spread over last 30 days
    const variant = variants[Math.floor(Math.random() * variants.length)];

    const game = await prisma.game.create({
      data: {
        board: generateBoardState(moveCount, winner),
        currentPlayer,
        moveCount,
        gameMode: "online",
        gameStartTime,
        winner,
        player1Id: superTester.id,
        player2Id: testUser2.id,
        variant,
        playMode: "CASUAL",
        boardSize: 8,
        gameConfig: JSON.stringify({
          variant,
          boardSize: 8,
          captureRequired: true,
          flyingKings: variant === "INTERNATIONAL",
        }),
        timeControl: JSON.stringify({
          type: "rapid",
          initialTime: 600000, // 10 minutes
          increment: 5000, // 5 second increment
        }),
        notation: JSON.stringify([]), // Would contain algebraic notation in real game
      },
    });

    // Create game moves
    const moves = generateGameMoves(game.id, moveCount);
    await prisma.gameMove.createMany({
      data: moves,
    });

    // Create some game events
    await prisma.gameEvent.create({
      data: {
        gameId: game.id,
        eventType: "GAME_STARTED",
        eventData: JSON.stringify({
          players: [superTester.username, testUser2.username],
        }),
        userId: superTester.id,
        gameVersion: 1,
      },
    });

    if (winner) {
      await prisma.gameEvent.create({
        data: {
          gameId: game.id,
          eventType: "GAME_ENDED",
          eventData: JSON.stringify({
            winner,
            reason: winner === "draw" ? "agreement" : "checkmate",
          }),
          userId: winner === "red" ? superTester.id : testUser2.id,
          gameVersion: 1,
        },
      });
    }

    games.push(game);

    const gameStatus = winner ? `${winner} wins` : "ongoing";
    console.log(
      `✅ Created game ${i + 1}/30: ${variant} - ${gameStatus} (${moveCount} moves)`,
    );
  }

  // Update player ratings based on games
  console.log("\n📈 Updating player statistics...");

  for (const variant of variants) {
    const variantGames = games.filter((g) => g.variant === variant);

    const superTesterStats = {
      wins: variantGames.filter((g) => g.winner === "red").length,
      losses: variantGames.filter((g) => g.winner === "black").length,
      draws: variantGames.filter((g) => g.winner === "draw").length,
      gamesPlayed: variantGames.filter((g) => g.winner !== null).length,
    };

    const testUser2Stats = {
      wins: variantGames.filter((g) => g.winner === "black").length,
      losses: variantGames.filter((g) => g.winner === "red").length,
      draws: variantGames.filter((g) => g.winner === "draw").length,
      gamesPlayed: variantGames.filter((g) => g.winner !== null).length,
    };

    // Update supertester rating
    await prisma.playerRating.update({
      where: {
        userId_variant_playMode: {
          userId: superTester.id,
          variant: variant,
          playMode: "CASUAL",
        },
      },
      data: {
        wins: superTesterStats.wins,
        losses: superTesterStats.losses,
        draws: superTesterStats.draws,
        gamesPlayed: superTesterStats.gamesPlayed,
        lastGameDate: now,
        rating: 1450 + superTesterStats.wins * 10 - superTesterStats.losses * 8,
      },
    });

    // Update testuser2 rating
    await prisma.playerRating.update({
      where: {
        userId_variant_playMode: {
          userId: testUser2.id,
          variant: variant,
          playMode: "CASUAL",
        },
      },
      data: {
        wins: testUser2Stats.wins,
        losses: testUser2Stats.losses,
        draws: testUser2Stats.draws,
        gamesPlayed: testUser2Stats.gamesPlayed,
        lastGameDate: now,
        rating: 1250 + testUser2Stats.wins * 10 - testUser2Stats.losses * 8,
      },
    });

    console.log(`Updated ${variant} stats:`);
    console.log(
      `  ${superTester.username}: ${superTesterStats.wins}W/${superTesterStats.losses}L/${superTesterStats.draws}D`,
    );
    console.log(
      `  ${testUser2.username}: ${testUser2Stats.wins}W/${testUser2Stats.losses}L/${testUser2Stats.draws}D`,
    );
  }

  // Create some messages between the players
  console.log("\n💬 Creating chat messages...");

  const messages = [
    "Good game!",
    "Nice move!",
    "Want to play again?",
    "That was a tough match",
    "You're getting better!",
    "I didn't see that coming",
    "Rematch?",
    "Well played!",
  ];

  for (let i = 0; i < 8; i++) {
    await prisma.message.create({
      data: {
        content: messages[i] || "GG",
        senderId: i % 2 === 0 ? superTester.id : testUser2.id,
        receiverId: i % 2 === 0 ? testUser2.id : superTester.id,
        read: true,
        createdAt: new Date(now.getTime() - (8 - i) * 2 * 60 * 60 * 1000), // Spread over last 16 hours
      },
    });
  }

  console.log("✅ Created 8 chat messages between players");

  console.log("\n🎉 Game history seeding completed successfully!");
  console.log(`\nSummary:`);
  console.log(
    `- Created 30 games between ${superTester.username} and ${testUser2.username}`,
  );
  console.log(
    `- Generated ${games.reduce((acc, g) => acc + g.moveCount, 0)} total moves`,
  );
  console.log(`- Updated player ratings for 3 variants`);
  console.log(`- Added chat history between players`);
}

main()
  .catch((e) => {
    console.error("❌ Error during game seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
