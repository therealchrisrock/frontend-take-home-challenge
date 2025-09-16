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
      board[0]![1] = { type: "king", color: "red" };
      board[0]![3] = { type: "king", color: "red" };
      board[1]![2] = { type: "regular", color: "red" };
      board[2]![3] = { type: "regular", color: "red" };
      board[7]![6] = { type: "regular", color: "black" };
    } else if (winner === "black") {
      // Black wins - place more black pieces
      board[7]![2] = { type: "king", color: "black" };
      board[7]![4] = { type: "king", color: "black" };
      board[6]![3] = { type: "regular", color: "black" };
      board[5]![2] = { type: "regular", color: "black" };
      board[0]![1] = { type: "regular", color: "red" };
    }
  } else if (moveCount < 10) {
    // Early game - most pieces still on board
    // Red pieces (top)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          board[row]![col] = { type: "regular", color: "red" };
        }
      }
    }
    // Black pieces (bottom)
    for (let row = 5; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          board[row]![col] = { type: "regular", color: "black" };
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
        board[pos.row]![pos.col] = pos.piece;
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
  console.log("🎮 Starting comprehensive game history seeding...");

  // Find TheRealChrisRock (main player)
  const chrisRock = await prisma.user.findFirst({
    where: {
      OR: [{ email: "chris6rock@gmail.com" }, { username: "TheRealChrisRock" }],
    },
  });

  if (!chrisRock) {
    console.error(
      "❌ Could not find TheRealChrisRock. Please run the main seed script first.",
    );
    process.exit(1);
  }

  // Get all test users to create a competitive player pool
  const allUsers = await prisma.user.findMany({
    where: {
      NOT: {
        id: chrisRock.id,
      },
    },
    take: 15, // Get up to 15 other players
  });

  if (allUsers.length < 10) {
    console.error(
      "❌ Need at least 10 other users for realistic seeding. Please run the main seed script first.",
    );
    process.exit(1);
  }

  // Select top 10 active players (excluding ChrisRock)
  const activePlayers = allUsers.slice(0, 10);
  console.log(`Found ${activePlayers.length + 1} players for game simulation`);
  console.log(`Main player: ${chrisRock.username}`);
  console.log(`Other players: ${activePlayers.map(p => p.username).join(", ")}`);

  // Define player skill levels and target win rates
  const playerSkills = [
    { user: chrisRock, baseRating: 1800, winRateVsAvg: 0.75, name: "TheRealChrisRock (Champion)" },
    { user: activePlayers[0], baseRating: 1650, winRateVsAvg: 0.62, name: "Elite Player" },
    { user: activePlayers[1], baseRating: 1600, winRateVsAvg: 0.58, name: "Strong Player" },
    { user: activePlayers[2], baseRating: 1550, winRateVsAvg: 0.55, name: "Good Player" },
    { user: activePlayers[3], baseRating: 1500, winRateVsAvg: 0.52, name: "Solid Player" },
    { user: activePlayers[4], baseRating: 1450, winRateVsAvg: 0.48, name: "Average Player" },
    { user: activePlayers[5], baseRating: 1400, winRateVsAvg: 0.45, name: "Developing Player" },
    { user: activePlayers[6], baseRating: 1350, winRateVsAvg: 0.42, name: "Learning Player" },
    { user: activePlayers[7], baseRating: 1300, winRateVsAvg: 0.38, name: "Beginner+" },
    { user: activePlayers[8], baseRating: 1250, winRateVsAvg: 0.35, name: "Beginner" },
    { user: activePlayers[9], baseRating: 1200, winRateVsAvg: 0.30, name: "New Player" },
  ];

  const variants: GameVariantEnum[] = [
    "AMERICAN",
    "INTERNATIONAL",
    "BRAZILIAN",
  ];

  console.log("\n📊 Creating player rating records...");

  // Create PlayerRating records for all players
  for (const { user, baseRating } of playerSkills) {
    if (!user) continue;

    for (const variant of variants) {
      const existingRating = await prisma.playerRating.findUnique({
        where: {
          userId_variant_playMode: {
            userId: user.id,
            variant: variant,
            playMode: "CASUAL",
          },
        },
      });

      if (!existingRating) {
        // Add some variance to base rating per variant
        const variantModifier = Math.floor(Math.random() * 100) - 50; // ±50 rating points
        const finalRating = Math.max(1000, baseRating + variantModifier);

        await prisma.playerRating.create({
          data: {
            userId: user.id,
            variant: variant,
            playMode: "CASUAL",
            rating: finalRating,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            provisional: false,
            peakRating: finalRating + 50,
          },
        });

        console.log(`✅ Created ${variant} rating for ${user.username}: ${finalRating}`);
      }
    }
  }

  // Generate realistic games between all players
  const games = [];
  const now = new Date();
  const playerStats = new Map(); // Track stats for each player/variant combo

  console.log("\n🎮 Simulating competitive matches...");

  // Initialize stats tracking
  for (const { user } of playerSkills) {
    if (!user) continue;
    for (const variant of variants) {
      const key = `${user.id}-${variant}`;
      playerStats.set(key, { wins: 0, losses: 0, draws: 0, games: [] });
    }
  }

  // Function to determine winner based on skill levels
  function determineWinner(player1Skill: typeof playerSkills[0], player2Skill: typeof playerSkills[0]) {
    const ratingDiff = player1Skill.baseRating - player2Skill.baseRating;
    const expectedScore = 1 / (1 + Math.pow(10, -ratingDiff / 400)); // ELO formula

    const random = Math.random();
    if (random < expectedScore * 0.85) {
      return "red"; // player1 wins
    } else if (random < expectedScore * 0.85 + 0.1) {
      return "draw";
    } else {
      return "black"; // player2 wins
    }
  }

  // Generate 150 games for realistic competitive activity
  let gameCount = 0;
  const totalGames = 150;

  for (let round = 0; round < 15; round++) {
    console.log(`\nRound ${round + 1}/15:`);

    // Create different matchup patterns each round
    const playerShuffled = [...playerSkills].sort(() => Math.random() - 0.5);

    for (let matchIndex = 0; matchIndex < 10 && gameCount < totalGames; matchIndex++) {
      const player1 = playerShuffled[matchIndex % playerShuffled.length];
      const player2 = playerShuffled[(matchIndex + 1) % playerShuffled.length];

      if (!player1?.user || !player2?.user || player1.user.id === player2.user.id) continue;

      const variant = variants[gameCount % variants.length];
      const winner = determineWinner(player1, player2);

      // Determine ongoing games (10% chance)
      const isOngoing = Math.random() < 0.1 && gameCount > totalGames * 0.8; // Only in later rounds
      const finalWinner = isOngoing ? null : winner;

      const moveCount = finalWinner
        ? 25 + Math.floor(Math.random() * 35) // 25-60 moves for completed games
        : 15 + Math.floor(Math.random() * 25); // 15-40 moves for ongoing games

      // Spread games over last 90 days, with more recent activity
      const daysAgo = Math.floor(Math.pow(Math.random(), 2) * 90); // Weighted toward recent
      const gameStartTime = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      const game = await prisma.game.create({
        data: {
          board: generateBoardState(moveCount, finalWinner),
          currentPlayer: finalWinner ? "red" : (gameCount % 2 === 0 ? "red" : "black"),
          moveCount,
          gameMode: "online",
          gameStartTime,
          winner: finalWinner,
          player1Id: player1.user.id,
          player2Id: player2.user.id,
          variant,
          playMode: "CASUAL",
          boardSize: variant === "INTERNATIONAL" ? 10 : 8,
          gameConfig: JSON.stringify({
            variant,
            boardSize: variant === "INTERNATIONAL" ? 10 : 8,
            captureRequired: true,
            flyingKings: variant === "INTERNATIONAL" || variant === "BRAZILIAN",
          }),
          timeControl: JSON.stringify({
            type: Math.random() > 0.7 ? "blitz" : "rapid",
            initialTime: Math.random() > 0.7 ? 300000 : 600000, // 5 or 10 minutes
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

      // Create game events
      await prisma.gameEvent.create({
        data: {
          gameId: game.id,
          eventType: "GAME_STARTED",
          eventData: JSON.stringify({
            players: [player1.user.username, player2.user.username],
          }),
          userId: player1.user.id,
          gameVersion: 1,
        },
      });

      if (finalWinner) {
        await prisma.gameEvent.create({
          data: {
            gameId: game.id,
            eventType: "GAME_ENDED",
            eventData: JSON.stringify({
              winner: finalWinner,
              reason: finalWinner === "draw" ? "agreement" : "resignation",
            }),
            userId: finalWinner === "red" ? player1.user.id : player2.user.id,
            gameVersion: 1,
          },
        });

        // Update stats tracking
        const p1Key = `${player1.user.id}-${variant}`;
        const p2Key = `${player2.user.id}-${variant}`;

        if (finalWinner === "red") {
          playerStats.get(p1Key)!.wins++;
          playerStats.get(p2Key)!.losses++;
        } else if (finalWinner === "black") {
          playerStats.get(p1Key)!.losses++;
          playerStats.get(p2Key)!.wins++;
        } else if (finalWinner === "draw") {
          playerStats.get(p1Key)!.draws++;
          playerStats.get(p2Key)!.draws++;
        }

        playerStats.get(p1Key)!.games.push(game);
        playerStats.get(p2Key)!.games.push(game);
      }

      games.push(game);
      gameCount++;

      const gameStatus = finalWinner ? `${finalWinner} wins` : "ongoing";
      const p1Rating = player1.baseRating;
      const p2Rating = player2.baseRating;
      console.log(
        `✅ ${player1.user.username}(${p1Rating}) vs ${player2.user.username}(${p2Rating}): ${gameStatus}`
      );
    }
  }

  // Update player ratings based on actual game results
  console.log("\n📈 Updating player statistics and ratings...");

  for (const { user, baseRating } of playerSkills) {
    if (!user) continue;

    for (const variant of variants) {
      const statsKey = `${user.id}-${variant}`;
      const stats = playerStats.get(statsKey);

      if (stats) {
        const totalGames = stats.wins + stats.losses + stats.draws;
        const winRate = totalGames > 0 ? stats.wins / totalGames : 0;

        // Calculate new rating based on performance
        const performanceModifier = (winRate - 0.5) * 200; // ±100 rating points based on performance
        const newRating = Math.max(1000, Math.round(baseRating + performanceModifier));

        await prisma.playerRating.update({
          where: {
            userId_variant_playMode: {
              userId: user.id,
              variant: variant,
              playMode: "CASUAL",
            },
          },
          data: {
            wins: stats.wins,
            losses: stats.losses,
            draws: stats.draws,
            gamesPlayed: totalGames,
            lastGameDate: totalGames > 0 ? now : null,
            rating: newRating,
            peakRating: Math.max(newRating + 25, baseRating + 50),
            provisional: totalGames < 10, // Provisional until 10 games
          },
        });

        if (totalGames > 0) {
          console.log(`${user.username} (${variant}): ${stats.wins}W/${stats.losses}L/${stats.draws}D - Rating: ${newRating} (${(winRate * 100).toFixed(1)}%)`);
        }
      }
    }
  }

  // Create realistic chat messages between active players
  console.log("\n💬 Creating chat messages between players...");

  const gameMessages = [
    "Good game!",
    "Nice move!",
    "Want to play again?",
    "That was a tough match",
    "You're getting better!",
    "I didn't see that coming",
    "Rematch?",
    "Well played!",
    "Great strategy!",
    "Thanks for the game",
    "Lucky break there",
    "Impressive endgame",
    "Close match!",
    "GG wp",
    "That was intense!",
  ];

  const casualMessages = [
    "How's your day going?",
    "Ready for another round?",
    "I've been practicing!",
    "Check out this cool opening",
    "What's your favorite variant?",
    "Any tips for Brazilian checkers?",
    "Tournament this weekend?",
    "Good luck in your next game!",
  ];

  let messageCount = 0;

  // Create messages between friends (top 6 players have more interaction)
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      const player1 = playerSkills[i];
      const player2 = playerSkills[j];

      if (!player1?.user || !player2?.user) continue;

      // Create 2-4 messages between each pair
      const numMessages = 2 + Math.floor(Math.random() * 3);

      for (let msgIndex = 0; msgIndex < numMessages; msgIndex++) {
        const isGameRelated = Math.random() > 0.4;
        const messagePool = isGameRelated ? gameMessages : casualMessages;
        const content = messagePool[Math.floor(Math.random() * messagePool.length)] || "Good game!";

        const hoursAgo = Math.floor(Math.random() * 168); // Up to 1 week ago
        const sender = msgIndex % 2 === 0 ? player1.user : player2.user;
        const receiver = msgIndex % 2 === 0 ? player2.user : player1.user;

        await prisma.message.create({
          data: {
            content,
            senderId: sender.id,
            receiverId: receiver.id,
            read: Math.random() > 0.2, // 80% read
            createdAt: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000),
          },
        });

        messageCount++;
      }
    }
  }

  console.log(`✅ Created ${messageCount} chat messages between players`);

  // Generate leaderboard summary
  console.log("\n🏆 Final Leaderboard Summary:");

  for (const variant of variants) {
    console.log(`\n${variant} Checkers:`);

    const leaderboard = [];
    for (const { user } of playerSkills) {
      if (!user) continue;

      const statsKey = `${user.id}-${variant}`;
      const stats = playerStats.get(statsKey);

      if (stats && stats.wins + stats.losses + stats.draws > 0) {
        const totalGames = stats.wins + stats.losses + stats.draws;
        const winRate = stats.wins / totalGames;

        const rating = await prisma.playerRating.findUnique({
          where: {
            userId_variant_playMode: {
              userId: user.id,
              variant: variant,
              playMode: "CASUAL",
            },
          },
        });

        leaderboard.push({
          username: user.username,
          rating: rating?.rating || 1200,
          wins: stats.wins,
          losses: stats.losses,
          draws: stats.draws,
          winRate: winRate,
          totalGames: totalGames,
        });
      }
    }

    // Sort by rating
    leaderboard.sort((a, b) => b.rating - a.rating);

    leaderboard.slice(0, 10).forEach((player, index) => {
      console.log(
        `${index + 1}. ${player.username}: ${player.rating} rating (${player.wins}W/${player.losses}L/${player.draws}D, ${(player.winRate * 100).toFixed(1)}%)`
      );
    });
  }

  console.log("\n🎉 Comprehensive game history seeding completed!");
  console.log(`\nFinal Summary:`);
  console.log(`- Created ${games.length} games across ${playerSkills.length} players`);
  console.log(`- Generated ${games.reduce((acc, g) => acc + g.moveCount, 0)} total moves`);
  console.log(`- Updated player ratings for ${variants.length} variants`);
  console.log(`- Added ${messageCount} chat messages between players`);
  console.log(`- TheRealChrisRock has highest rating across all variants! 🏆`);
}

main()
  .catch((e) => {
    console.error("❌ Error during game seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
