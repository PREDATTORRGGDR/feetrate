import type {
  AnalysisResult,
  GuideDetail,
  GuideSummary,
  Profile,
  RatingFeedResponse,
  RatingSubmitResponse,
  RatingVoteResponse,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function parseErrorBody(response: Response): Promise<{ message: string; code?: string }> {
  try {
    const body = await response.json();
    if (body && typeof body.message === "string") {
      return { message: body.message, code: typeof body.error === "string" ? body.error : undefined };
    }
  } catch {
    // ignore, fall through to generic message
  }
  return { message: `Запрос не выполнен (${response.status})` };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, init);
  } catch {
    throw new ApiError("Нет соединения с сервером.", 0);
  }

  if (!response.ok) {
    const { message, code } = await parseErrorBody(response);
    throw new ApiError(message, response.status, code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function analyzePhoto(photo: File): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append("photo", photo);
  return request<AnalysisResult>("/analyze", {
    method: "POST",
    body: formData,
  });
}

export function submitToPublicRating(analysisId: string): Promise<RatingSubmitResponse> {
  return request<RatingSubmitResponse>("/rating/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysisId }),
  });
}

export function fetchRatingFeed(limit = 1): Promise<RatingFeedResponse> {
  return request<RatingFeedResponse>(`/rating/feed?limit=${limit}`);
}

export function voteOnRating(publicId: string, score: number): Promise<RatingVoteResponse> {
  return request<RatingVoteResponse>("/rating/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId, score }),
  });
}

export function fetchGuides(): Promise<GuideSummary[]> {
  return request<GuideSummary[]>("/guides");
}

export function fetchGuideDetail(slug: string): Promise<GuideDetail> {
  return request<GuideDetail>(`/guides/${slug}`);
}

export function fetchProfile(): Promise<Profile> {
  return request<Profile>("/profile");
}
