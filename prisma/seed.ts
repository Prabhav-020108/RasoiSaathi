import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../src/lib/seed-db";

const prisma = new PrismaClient();

async function main() {
  const force = process.argv.includes("--force");
  const result = await seedDatabase(prisma, { force });
  console.log("Seed result:", result);
}

main()
  .catch((err) => {
    console.error("Failed to seed database:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
