import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const avatarUrls = [
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Oliver",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Emma",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=William",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Sophia",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=James",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Isabella",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Benjamin",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Mia",
];

async function main() {
  console.log("🌱 Starting database seeding...");

  // Create or find TheRealChrisRock user (can authenticate with TheRealChrisRock:password or chris6rock@gmail.com:password)
  let chrisRockUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: "chris6rock@gmail.com" }, { username: "TheRealChrisRock" }],
    },
  });

  if (!chrisRockUser) {
    console.log("Creating TheRealChrisRock user...");
    const hashedPassword = await bcrypt.hash("password", 10);
    chrisRockUser = await prisma.user.create({
      data: {
        email: "chris6rock@gmail.com",
        username: "TheRealChrisRock",
        name: "Chris Rock",
        password: hashedPassword,
        emailVerified: new Date(),
        image: "https://api.dicebear.com/9.x/avataaars/svg?seed=ChrisRock",
        avatarKey: "avatar-chrisrock",
      },
    });
    console.log(`✅ Created TheRealChrisRock user: ${chrisRockUser.username}`);
  } else {
    // Update existing user to be TheRealChrisRock
    if (chrisRockUser.username !== "TheRealChrisRock") {
      console.log("Updating existing user to TheRealChrisRock...");
      const hashedPassword = await bcrypt.hash("password", 10);
      chrisRockUser = await prisma.user.update({
        where: { id: chrisRockUser.id },
        data: {
          username: "TheRealChrisRock",
          name: "Chris Rock",
          password: hashedPassword,
          image: "https://api.dicebear.com/9.x/avataaars/svg?seed=ChrisRock",
          avatarKey: "avatar-chrisrock",
        },
      });
      console.log(
        `✅ Updated user to TheRealChrisRock: ${chrisRockUser.username}`,
      );
    } else {
      console.log(
        `⏩ TheRealChrisRock user already exists: ${chrisRockUser.username}`,
      );
    }
  }

  // Use TheRealChrisRock as the main user for friendships
  const mainUser = chrisRockUser;

  // Create 15 test users
  const testUsers = [];
  for (let i = 1; i <= 15; i++) {
    // Special naming for testuser1
    const username = i === 1 ? "supertester" : `testuser${i}`;
    const email =
      i === 1 ? "supertester@example.com" : `testuser${i}@example.com`;
    const name = i === 1 ? "Super Tester" : `Test User ${i}`;

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      const hashedPassword = await bcrypt.hash(`password${i}`, 10);

      // Half of the users (8 out of 15) get avatar images
      const avatarData =
        i <= 8
          ? {
              image: avatarUrls[i - 1],
              avatarKey: `avatar-${username}`,
            }
          : {};

      user = await prisma.user.create({
        data: {
          email,
          username,
          name,
          password: hashedPassword,
          emailVerified: new Date(),
          ...avatarData,
        },
      });
      console.log(`✅ Created user: ${username}`);
    } else {
      console.log(`⏩ User already exists: ${username}`);
    }

    testUsers.push(user);
  }

  // Create friendships between TheRealChrisRock and all test users except testuser2
  console.log("\n🤝 Creating friendships for TheRealChrisRock...");

  // Filter out testuser2 from friendship list
  const usersToFriend = testUsers.filter(
    (user) => user.username !== "testuser2",
  );

  for (const user of usersToFriend) {
    // Check if friendship already exists (in either direction)
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: chrisRockUser.id, receiverId: user.id },
          { senderId: user.id, receiverId: chrisRockUser.id },
        ],
      },
    });

    if (!existingFriendship) {
      // Create accepted friendship (Friendship has no status field)
      await prisma.friendship.create({
        data: {
          senderId: chrisRockUser.id,
          receiverId: user.id,
        },
      });
      console.log(
        `✅ Created friendship: ${chrisRockUser.username} <-> ${user.username}`,
      );
    } else {
      console.log(
        `⏩ Friendship already exists: ${chrisRockUser.username} <-> ${user.username}`,
      );
    }
  }

  console.log(`⏩ Skipped creating friendship with testuser2 as requested`);

  // Note: Removed the original "main user" friendship creation since mainUser is now the same as chrisRockUser

  // Create some additional friendships between test users for a more realistic network
  console.log("\n🔗 Creating additional friendships between test users...");

  // Create friendships between consecutive test users
  for (let i = 0; i < testUsers.length - 1; i++) {
    const user1 = testUsers[i];
    const user2 = testUsers[i + 1];

    if (!user1 || !user2) continue;

    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: user1.id, receiverId: user2.id },
          { senderId: user2.id, receiverId: user1.id },
        ],
      },
    });

    if (!existingFriendship) {
      await prisma.friendship.create({
        data: {
          senderId: user1.id,
          receiverId: user2.id,
        },
      });
      console.log(
        `✅ Created friendship: ${user1.username} <-> ${user2.username}`,
      );
    }
  }

  // Create some random additional friendships
  for (let i = 0; i < 10; i++) {
    const randomIndex1 = Math.floor(Math.random() * testUsers.length);
    const randomIndex2 = Math.floor(Math.random() * testUsers.length);

    if (randomIndex1 === randomIndex2) continue;

    const user1 = testUsers[randomIndex1];
    const user2 = testUsers[randomIndex2];

    if (!user1 || !user2) continue;

    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: user1.id, receiverId: user2.id },
          { senderId: user2.id, receiverId: user1.id },
        ],
      },
    });

    if (!existingFriendship) {
      const createAccepted = Math.random() > 0.2; // 80% accepted, 20% pending

      if (createAccepted) {
        // Directly create friendship (accepted)
        await prisma.friendship.create({
          data: {
            senderId: user1.id,
            receiverId: user2.id,
          },
        });
      } else {
        // Create a pending friend request instead
        await prisma.friendRequest.create({
          data: {
            senderId: user1.id,
            receiverId: user2.id,
            status: "PENDING",
            message: null,
          },
        });
      }
      console.log(
        `✅ Created friendship: ${user1.username} <-> ${user2.username}`,
      );
    }
  }

  console.log("\n✅ Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
