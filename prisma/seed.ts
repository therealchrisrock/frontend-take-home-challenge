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

  // First, check if the main user exists (chris6rock@gmail.com / Grootenberg)
  let mainUser = await prisma.user.findUnique({
    where: { email: "chris6rock@gmail.com" },
  });

  if (!mainUser) {
    // Also check by username
    mainUser = await prisma.user.findUnique({
      where: { username: "Grootenberg" },
    });
  }

  if (!mainUser) {
    console.log("Creating main user (chris6rock@gmail.com / Grootenberg)...");
    const hashedPassword = await bcrypt.hash("password123", 10);
    mainUser = await prisma.user.create({
      data: {
        email: "chris6rock@gmail.com",
        username: "Grootenberg",
        name: "Chris Grootenberg",
        password: hashedPassword,
        emailVerified: new Date(),
      },
    });
  }

  console.log(`Main user found/created: ${mainUser.username} (${mainUser.id})`);

  // Create 15 test users
  const testUsers = [];
  for (let i = 1; i <= 15; i++) {
    // Special naming for testuser1
    const username = i === 1 ? "supertester" : `testuser${i}`;
    const email = i === 1 ? "supertester@example.com" : `testuser${i}@example.com`;
    const name = i === 1 ? "Super Tester" : `Test User ${i}`;
    
    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      const hashedPassword = await bcrypt.hash(`password${i}`, 10);
      
      // Half of the users (8 out of 15) get avatar images
      const avatarData = i <= 8 ? {
        image: avatarUrls[i - 1],
        avatarKey: `avatar-${username}`,
      } : {};

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

  // Create friendships between all test users and the main user
  console.log("\n🤝 Creating friendships with main user...");
  
  for (const testUser of testUsers) {
    // Check if friendship already exists (in either direction)
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: mainUser.id, receiverId: testUser.id },
          { senderId: testUser.id, receiverId: mainUser.id },
        ],
      },
    });

    if (!existingFriendship) {
      // Create accepted friendship
      await prisma.friendship.create({
        data: {
          senderId: mainUser.id,
          receiverId: testUser.id,
          status: "ACCEPTED",
        },
      });
      console.log(`✅ Created friendship: ${mainUser.username} <-> ${testUser.username}`);
    } else {
      console.log(`⏩ Friendship already exists: ${mainUser.username} <-> ${testUser.username}`);
    }
  }

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
          status: "ACCEPTED",
        },
      });
      console.log(`✅ Created friendship: ${user1.username} <-> ${user2.username}`);
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
      await prisma.friendship.create({
        data: {
          senderId: user1.id,
          receiverId: user2.id,
          status: Math.random() > 0.2 ? "ACCEPTED" : "PENDING", // 80% accepted, 20% pending
        },
      });
      console.log(`✅ Created friendship: ${user1.username} <-> ${user2.username}`);
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