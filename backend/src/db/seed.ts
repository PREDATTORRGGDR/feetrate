import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "./client";

const GRADIENT_COLOR_PAIRS: [string, string][] = [
  ["#ffb6c1", "#ff8fa3"],
  ["#ffc2d1", "#ff85a2"],
  ["#ffd6e8", "#ff9ebb"],
  ["#f8bbd0", "#ce93d8"],
  ["#ffb3c6", "#fb6f92"],
  ["#ffcad4", "#f4978e"],
  ["#ff8fab", "#ff477e"],
  ["#ffe0ec", "#ffa6c1"],
  ["#ffb5c5", "#ff6f9c"],
  ["#f7cad0", "#f9a1bc"],
  ["#ffd1dc", "#ff8fa3"],
  ["#fbb1bd", "#f45b69"],
];

function backgroundTint(colorEnd: string): string {
  return `${colorEnd}22`;
}

// Renders a soft stylized foot-sole silhouette (sole + five toes) in a
// pink gradient, not a real photo — used only as public-rating placeholder
// content until real published analyses fill the pool.
async function generateFootPlaceholder(colorStart: string, colorEnd: string): Promise<Buffer> {
  const width = 600;
  const height = 800;
  const gradId = `g${Math.round(Math.random() * 1e6)}`;
  const cx = width / 2;

  const toeRadii = [34, 40, 37, 32, 26];
  const toeYs = [150, 130, 138, 152, 172];
  const toeSpacing = 62;
  const toeStartX = cx - (toeSpacing * (toeRadii.length - 1)) / 2;

  const toes = toeRadii
    .map((r, i) => {
      const x = toeStartX + i * toeSpacing;
      const y = toeYs[i];
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${gradId})" stroke="#ffffff" stroke-opacity="0.5" stroke-width="2" />`;
    })
    .join("");

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${colorStart}" />
          <stop offset="100%" stop-color="${colorEnd}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="${backgroundTint(colorEnd)}" />
      <ellipse cx="${cx}" cy="480" rx="150" ry="260" fill="url(#${gradId})" stroke="#ffffff" stroke-opacity="0.5" stroke-width="3" />
      ${toes}
      <ellipse cx="${cx - 50}" cy="380" rx="34" ry="46" fill="#ffffff" opacity="0.25" />
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  const uploadsDir = path.resolve(process.env.UPLOADS_DIR || "./uploads");
  const publicDir = path.join(uploadsDir, "public");
  await mkdir(publicDir, { recursive: true });

  const voters = await Promise.all(
    Array.from({ length: 8 }).map((_, i) =>
      prisma.user.upsert({
        where: { telegramId: `seed-voter-${i}` },
        update: {},
        create: { telegramId: `seed-voter-${i}` },
      })
    )
  );

  for (let i = 0; i < GRADIENT_COLOR_PAIRS.length; i++) {
    const [start, end] = GRADIENT_COLOR_PAIRS[i];
    const buffer = await generateFootPlaceholder(start, end);

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
