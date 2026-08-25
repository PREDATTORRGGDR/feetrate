import { GoogleGenAI, Type } from "@google/genai";
import type { GeminiAnalysisResult } from "../types";

const SYSTEM_INSTRUCTION =
  "Проанализируй фотографию стоп с точки зрения визуальной ухоженности. " +
  "Не ставь диагнозы и не определяй медицинские состояния — не упоминай грибок, " +
  "заболевания, инфекции или любые медицинские состояния. Оцени только видимые " +
  "эстетические характеристики: гладкость кожи, визуальную увлажнённость, розовину/визуальный " +
  "тон кожи и общий внешний вид. Верни числовые оценки от 0 до 100 и краткое объяснение " +
  "факторов, которые повлияли на результат.";

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    smoothness: { type: Type.INTEGER },
    hydration: { type: Type.INTEGER },
    pinkness: { type: Type.INTEGER },
    overallAppearance: { type: Type.INTEGER },
    confidence: { type: Type.STRING, enum: ["low", "medium", "high"] },
    qualityOk: { type: Type.BOOLEAN },
    qualityIssue: {
      type: Type.STRING,
      enum: ["too_dark", "too_blurry", "feet_not_visible", "too_small", "none"],
    },
    explanation: { type: Type.STRING },
  },
  required: [
    "smoothness",
    "hydration",
    "pinkness",
    "overallAppearance",
    "confidence",
    "qualityOk",
    "qualityIssue",
    "explanation",
  ],
};

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export async function analyzeFootPhoto(
  imageBuffer: Buffer,
  mimeType: string
): Promise<GeminiAnalysisResult> {
  const ai = getClient();
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { text: SYSTEM_INSTRUCTION },
          {
            inlineData: {
              mimeType,
              data: imageBuffer.toString("base64"),
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  const parsed = JSON.parse(text) as {
    smoothness: number;
    hydration: number;
    pinkness: number;
    overallAppearance: number;
    confidence: "low" | "medium" | "high";
    qualityOk: boolean;
    qualityIssue: "too_dark" | "too_blurry" | "feet_not_visible" | "too_small" | "none";
    explanation: string;
  };

  return {
    smoothness: clamp(parsed.smoothness),
    hydration: clamp(parsed.hydration),
    pinkness: clamp(parsed.pinkness),
    overallAppearance: clamp(parsed.overallAppearance),
    confidence: parsed.confidence,
    qualityOk: parsed.qualityOk,
    qualityIssue: parsed.qualityIssue === "none" ? null : parsed.qualityIssue,
    explanation: parsed.explanation,
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
