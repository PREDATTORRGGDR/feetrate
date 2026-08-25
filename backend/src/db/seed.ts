import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "./client";

const GRADIENT_COLOR_PAIRS: [string, string][] = [
  ["#ffb6c1", "#ff8fa3"],
  ["#a0e7e5", "#54c1c4"],
  ["#ffe0b2", "#ffb74d"],
  ["#c5cae9", "#7986cb"],
  ["#d0f0c0", "#81c784"],
  ["#f8bbd0", "#ce93d8"],
];

async function generateGradientPng(colorStart: string, colorEnd: string): Promise<Buffer> {
  const width = 600;
  const height = 800;
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${colorStart}" />
          <stop offset="100%" stop-color="${colorEnd}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)" />
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  const uploadsDir = path.resolve(process.env.UPLOADS_DIR || "./uploads");
  const publicDir = path.join(uploadsDir, "public");
  await mkdir(publicDir, { recursive: true });

  const voters = await Promise.all(
    Array.from({ length: 4 }).map((_, i) =>
      prisma.user.upsert({
        where: { telegramId: `seed-voter-${i}` },
        update: {},
        create: { telegramId: `seed-voter-${i}` },
      })
    )
  );

  for (let i = 0; i < GRADIENT_COLOR_PAIRS.length; i++) {
    const [start, end] = GRADIENT_COLOR_PAIRS[i];
    const buffer = await generateGradientPng(start, end);

    const publicId = randomUUID();
    const fileName = `${publicId}.png`;
    await writeFile(path.join(publicDir, fileName), buffer);

    const publicPhoto = await prisma.publicPhoto.create({
      data: {
        id: publicId,
        analysisId: null,
        imagePath: `public/${fileName}`,
      },
    });

    // Give the first few photos some votes so the feed isn't empty on first run.
    const voteCount = i % 3; // 0, 1, 2, 0, 1, 2 votes across the seeded photos
    for (let v = 0; v < voteCount; v++) {
      const voter = voters[v % voters.length];
      const score = 5 + ((i + v) % 6); // varied scores between 5 and 10
      await prisma.vote.create({
        data: {
          publicPhotoId: publicPhoto.id,
          voterUserId: voter.id,
          score,
        },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
