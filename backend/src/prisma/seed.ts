import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const password = await bcrypt.hash("password123", 12);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@wavechat.com" },
    update: {},
    create: {
      email: "admin@wavechat.com",
      fullName: "Admin User",
      username: "admin",
      password,
      role: "admin",
      isVerified: true,
      avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Admin",
      bio: "WaveChat Administrator",
    } as any,
  });

  // Create test users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "alice@example.com" },
      update: {},
      create: {
        email: "alice@example.com",
        fullName: "Alice Johnson",
        username: "alice",
        password,
        avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Alice",
        bio: "Hey there! I am using WaveChat",
      },
    }),
    prisma.user.upsert({
      where: { email: "bob@example.com" },
      update: {},
      create: {
        email: "bob@example.com",
        fullName: "Bob Smith",
        username: "bob",
        password,
        avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Bob",
        bio: "Hey there! I am using WaveChat",
      },
    }),
    prisma.user.upsert({
      where: { email: "charlie@example.com" },
      update: {},
      create: {
        email: "charlie@example.com",
        fullName: "Charlie Brown",
        username: "charlie",
        password,
        avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Charlie",
        bio: "Hey there! I am using WaveChat",
      },
    }),
  ]);

  // Create a group conversation
  const group = await prisma.conversation.create({
    data: {
      isGroup: true,
      groupName: "WaveChat Team",
      groupAdminId: admin.id,
      inviteCode: "wavechat",
      members: {
        create: [
          { userId: admin.id, role: "admin" },
          { userId: users[0].id, role: "member" },
          { userId: users[1].id, role: "member" },
          { userId: users[2].id, role: "member" },
        ],
      },
    },
  });

  // Create a direct conversation between admin and alice
  const dm = await prisma.conversation.create({
    data: {
      isGroup: false,
      members: {
        create: [
          { userId: admin.id, role: "admin" },
          { userId: users[0].id, role: "member" },
        ],
      },
    },
  });

  // Send some welcome messages
  await prisma.message.createMany({
    data: [
      {
        conversationId: group.id,
        senderId: admin.id,
        text: "Welcome to WaveChat! This is a real-time messaging platform built with Discord + WhatsApp in mind.",
        type: "TEXT",
      },
      {
        conversationId: group.id,
        senderId: users[0].id,
        text: "This is amazing! The real-time features work great.",
        type: "TEXT",
      },
      {
        conversationId: group.id,
        senderId: users[1].id,
        text: "Love the typing indicators and read receipts!",
        type: "TEXT",
      },
      {
        conversationId: dm.id,
        senderId: admin.id,
        text: "Hey Alice! Welcome to WaveChat. How are you liking it?",
        type: "TEXT",
      },
    ],
  });

  // Create a poll
  await prisma.poll.create({
    data: {
      conversationId: group.id,
      createdById: admin.id,
      question: "What feature should we build next?",
      options: {
        create: [
          { text: "Voice Calls" },
          { text: "Screen Sharing" },
          { text: "Channels" },
          { text: "Bots/API" },
        ],
      },
    },
  });

  console.log("✅ Database seeded successfully");
  console.log("   Admin: admin@wavechat.com / password123");
  console.log("   Users: alice@example.com, bob@example.com, charlie@example.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
