import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function pictureFromIdToken(idToken: string): string | null {
  try {
    const payload = JSON.parse(
      Buffer.from(idToken.split(".")[1], "base64url").toString("utf-8"),
    );
    return typeof payload.picture === "string" ? payload.picture : null;
  } catch {
    return null;
  }
}

const accounts = await prisma.account.findMany({
  where: { providerId: "google" },
  include: { user: { select: { id: true, email: true, image: true } } },
});

let updated = 0;
let skipped = 0;
for (const acc of accounts) {
  if (acc.user.image) {
    skipped++;
    continue;
  }
  if (!acc.idToken) {
    console.log(`SKIP  ${acc.user.email} — no idToken stored`);
    continue;
  }
  const picture = pictureFromIdToken(acc.idToken);
  if (!picture) {
    console.log(`SKIP  ${acc.user.email} — no picture in idToken`);
    continue;
  }
  await prisma.user.update({
    where: { id: acc.user.id },
    data: { image: picture },
  });
  console.log(`FILL  ${acc.user.email}  <-  ${picture}`);
  updated++;
}

console.log(
  `\nDone: ${updated} user(s) backfilled, ${skipped} already had an image.`,
);
await prisma.$disconnect();
