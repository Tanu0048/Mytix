import argon2 from "argon2";
import { prisma } from "../src/lib/prisma.js";
import { logger } from "../src/lib/logger.js";

async function main() {
  logger.info("Starting database seed script execution");

  // 1. Seed Admin User
  const adminEmail = "admin@mytix.example.com";
  let admin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!admin) {
    const passwordHash = await argon2.hash("AdminSecurePassword123!", {
      type: argon2.argon2id
    });

    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Platform Administrator",
        passwordHash,
        role: "ADMIN"
      }
    });
    logger.info("Created primary admin user", { email: admin.email, id: admin.id });
  } else {
    logger.info("Admin user already exists, skipping creation", { id: admin.id });
  }

  // 2. Seed Default Organiser User
  const organiserEmail = "promoter@mytix.example.com";
  let organiserUser = await prisma.user.findUnique({
    where: { email: organiserEmail }
  });

  if (!organiserUser) {
    const passwordHash = await argon2.hash("PromoterSecurePassword123!", {
      type: argon2.argon2id
    });

    organiserUser = await prisma.user.create({
      data: {
        email: organiserEmail,
        name: "Apex Touring Events",
        passwordHash,
        role: "ORGANISER",
        organiser: {
          create: {
            businessName: "Apex Touring Pty Ltd",
            abn: "12345678901",
            contactEmail: organiserEmail,
            contactPhone: "+61400112233",
            status: "APPROVED",
            payoutDetails: {
              accountName: "Apex Touring Pty Ltd",
              bsb: "082-001",
              accountNumber: "987654321"
            }
          }
        }
      },
      include: { organiser: true }
    });
    logger.info("Created test organiser profile", { organiserId: organiserUser.organiser.id });
  } else {
    organiserUser = await prisma.user.findUnique({
      where: { email: organiserEmail },
      include: { organiser: true }
    });
  }

  // 3. Seed Venues
  const venueSydney = await prisma.venue.upsert({
    where: { slug: "qudos-bank-arena-sydney" },
    update: {},
    create: {
      name: "Qudos Bank Arena",
      slug: "qudos-bank-arena-sydney",
      address: "19 Edwin Flack Ave, Sydney Olympic Park NSW 2127",
      city: "Sydney",
      state: "NSW",
      capacity: 21000,
      timezone: "Australia/Sydney"
    }
  });

  const venueMelbourne = await prisma.venue.upsert({
    where: { slug: "forum-melbourne" },
    update: {},
    create: {
      name: "Forum Melbourne",
      slug: "forum-melbourne",
      address: "154 Flinders Ln, Melbourne VIC 3000",
      city: "Melbourne",
      state: "VIC",
      capacity: 2000,
      timezone: "Australia/Melbourne"
    }
  });

  // 4. Seed Artists
  const artistDiljit = await prisma.artist.upsert({
    where: { slug: "diljit-dosanjh" },
    update: {},
    create: {
      name: "Diljit Dosanjh",
      slug: "diljit-dosanjh",
      bio: "Global Punjabi superstar, actor, and international touring sensation."
    }
  });

  const artistZakir = await prisma.artist.upsert({
    where: { slug: "zakir-khan" },
    update: {},
    create: {
      name: "Zakir Khan",
      slug: "zakir-khan",
      bio: "Acclaimed Indian stand-up comedian and storyteller."
    }
  });

  // 6. Seed Platform Settings
  await prisma.platformSettings.upsert({
    where: { key: "stripe_config" },
    update: {},
    create: {
      key: "stripe_config",
      value: {
        buyerPaysStripeFee: true,
        domesticPercent: 0.017,
        domesticFixedCents: 30,
        internationalPercent: 0.035,
        internationalFixedCents: 30
      }
    }
  });

  // 7. Seed Sample Homepage Hero Banner
  const existingBanner = await prisma.banner.findFirst();
  if (!existingBanner) {
    await prisma.banner.create({
      data: {
        title: "Coldplay: Music of the Spheres World Tour - Sydney",
        imageUrl: "https://kfcocpzuzxpinqgnzhsq.supabase.co/storage/v1/object/public/event-images/banners/coldplay-hero-banner.webp",
        targetUrl: "/events",
        eventId: null,
        displayOrder: 1,
        isActive: true
      }
    });
    logger.info("Created sample homepage hero banner");
  }

  logger.info("Database seed completed successfully", {
    adminId: admin.id,
    venuesCount: 2,
    artistsCount: 2
  });
}

main()
  .catch((e) => {
    logger.error("Database seed failed", { error: e.message, stack: e.stack });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
