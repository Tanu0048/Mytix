import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const venue = await prisma.venue.findFirst();
  const artist = await prisma.artist.findFirst();
  console.log("VENUE:", venue?.id);
  console.log("ARTIST:", artist?.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
