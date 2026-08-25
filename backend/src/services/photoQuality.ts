import sharp from "sharp";

export const MIN_FILE_SIZE_BYTES = 5 * 1024; // 5 KB - anything smaller can't hold a usable photo
export const MIN_DIMENSION_PX = 200; // reject tiny thumbnails before spending a Gemini call

export interface QualityCheckResult {
  ok: boolean;
  reason?: string;
}

export async function checkPhotoQuality(buffer: Buffer): Promise<QualityCheckResult> {
  if (buffer.length < MIN_FILE_SIZE_BYTES) {
    return { ok: false, reason: "file_too_small" };
  }

  let metadata: { width?: number; height?: number };
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    return { ok: false, reason: "unreadable_image" };
  }

  const { width, height } = metadata;
  if (!width || !height) {
    return { ok: false, reason: "unreadable_image" };
  }

  if (width < MIN_DIMENSION_PX || height < MIN_DIMENSION_PX) {
    return { ok: false, reason: "dimensions_too_small" };
  }

  return { ok: true };
}
