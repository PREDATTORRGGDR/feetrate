import { useCallback, useEffect, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import { ApiError, analyzePhoto } from "../services/api";
import { useAppState } from "../state/AppStateContext";

interface AnalyzingPageProps {
  onDone: () => void;
  onBack: () => void;
}

export default function AnalyzingPage({ onDone, onBack }: AnalyzingPageProps) {
  const { uploadedPhoto, setAnalysisResult, setAnalysisError } = useAppState();
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const runAnalysis = useCallback(async () => {
    if (!uploadedPhoto) {
      onBack();
      return;
    }
    setNetworkError(null);
    try {
      const result = await analyzePhoto(uploadedPhoto);
      setAnalysisResult(result);
      setAnalysisError(null);
      onDone();
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        setAnalysisResult(null);
        setAnalysisError(error.message || "Не удалось нормально оценить фото");
        onDone();
        return;
      }
      const message =
        error instanceof ApiError ? error.message : "Не удалось связаться с сервером.";
      setNetworkError(message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedPhoto, attempt]);

  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  if (networkError) {
    return (
      <div className="screen screen--centered">
        <p className="state-message state-message--error">{networkError}</p>
        <div className="stacked-actions">
          <button type="button" className="btn btn--primary" onClick={() => setAttempt((n) => n + 1)}>
            Повторить
          </button>
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen screen--centered">
      <LoadingSpinner label="Анализируем фото..." />
    </div>
  );
}
