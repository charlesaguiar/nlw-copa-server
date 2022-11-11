import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.create({
    data: {
      name: "Jonh Doe",
      email: "jonh.doe@gmail.com",
      avatarUrl: "https://github.com/charlesaguiar.png",
    },
  });

  const pool = await prisma.pool.create({
    data: {
      title: "Example Pool",
      code: "POOL12",
      ownerId: user.id,
      participants: {
        create: {
          userId: user.id,
        },
      },
    },
  });

  await prisma.game.create({
    data: {
      date: "2022-11-05T14:00:00.000Z",
      firstTeamCountryCode: "DE",
      secondTeamCountryCode: "BR",
    },
  });

  await prisma.game.create({
    data: {
      date: "2022-11-06T14:00:00.000Z",
      firstTeamCountryCode: "BR",
      secondTeamCountryCode: "AR",
      guesses: {
        create: {
          firstTeamPoints: 2,
          secondsTeamPoints: 1,
          participant: {
            connect: {
              userId_poolId: { userId: user.id, poolId: pool.id },
            },
          },
        },
      },
    },
  });
}

main();
