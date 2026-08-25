import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AnalysisResult, Profile } from "../types";

interface AppState {
  uploadedPhoto: File | null;
  uploadedPhotoUrl: string | null;
  analysisResult: AnalysisResult | null;
  analysisError: string | null;
  profile: Profile | null;
}

interface AppStateContextValue extends AppState {
  setUploadedPhoto: (file: File | null) => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setAnalysisError: (message: string | null) => void;
  setProfile: (profile: Profile | null) => void;
  resetUploadFlow: () => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [uploadedPhoto, setUploadedPhotoState] = useState<File | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const setUploadedPhoto = useCallback((file: File | null) => {
    setUploadedPhotoState(file);
    setUploadedPhotoUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      return file ? URL.createObjectURL(file) : null;
    });
  }, []);

  const resetUploadFlow = useCallback(() => {
    setUploadedPhoto(null);
    setAnalysisResult(null);
    setAnalysisError(null);
  }, [setUploadedPhoto]);

  const value = useMemo<AppStateContextValue>(
    () => ({
      uploadedPhoto,
      uploadedPhotoUrl,
      analysisResult,
      analysisError,
      profile,
      setUploadedPhoto,
      setAnalysisResult,
      setAnalysisError,
      setProfile,
      resetUploadFlow,
    }),
    [uploadedPhoto, uploadedPhotoUrl, analysisResult, analysisError, profile, setUploadedPhoto, resetUploadFlow],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
