import { useState } from "react";
import Card from "../components/Card";
import ScoreRing from "../components/ScoreRing";
import MetricBar from "../components/MetricBar";
import ConfirmModal from "../components/ConfirmModal";
import { ApiError, submitToPublicRating } from "../services/api";
import { useAppState } from "../state/AppStateContext";
import type { Metrics } from "../types";

interface ResultPageProps {
  onOpenGuide: (slug: string) => void;
  onRetryUpload: () => void;
}

const METRIC_LABELS: Record<keyof Metrics, string> = {
  smoothness: "Гладкость",
  hydration: "Увлажнённость",
  pinkness: "Розовина",
  overallAppearance: "Общий вид",
};

type PublishState = "idle" | "submitting" | "published" | "error";

export default function ResultPage({ onOpenGuide, onRetryUpload }: ResultPageProps) {
  const { analysisResult, analysisError } = useAppState();
  const [modalOpen, setModalOpen] = useState(false);
  const [publishState, setPublishState] = useState<PublishState>("idle");
  const [publishErrorMessage, setPublishErrorMessage] = useState<string | null>(null);

  if (analysisError) {
    return (
      <div className="screen screen--centered">
        <p className="state-message state-message--error">Не удалось нормально оценить фото</p>
        <p className="state-message state-message--muted">
          Попробуй сделать более чёткое фото при хорошем освещении.
        </p>
        <button type="button" className="btn btn--primary" onClick={onRetryUpload}>
          Загрузить другое фото
        </button>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="screen screen--centered">
        <p className="state-message state-message--muted">Пока нет результата анализа.</p>
        <button type="button" className="btn btn--primary" onClick={onRetryUpload}>
          Загрузить фото
        </button>
      </div>
    );
  }

  const { score, metrics, strength, weakness, recommendedGuideSlug } = analysisResult;

  const handleConfirmPublish = async () => {
    setPublishState("submitting");
    setPublishErrorMessage(null);
    try {
      await submitToPublicRating(analysisResult.id);
      setPublishState("published");
      setModalOpen(false);
    } catch (error) {
      setPublishState("error");
      setPublishErrorMessage(error instanceof ApiError ? error.message : "Не удалось опубликовать фото.");
    }
  };

  return (
    <div className="screen result-page">
      <h1 className="section-title">Рейтинг стоп</h1>

      <div className="result-page__ring-wrap">
        <ScoreRing score={score} />
      </div>

      <div className="metric-list">
        {(Object.keys(METRIC_LABELS) as (keyof Metrics)[]).map((key) => (
          <MetricBar key={key} label={METRIC_LABELS[key]} value={metrics[key]} />
        ))}
      </div>

      <Card className="callout-card callout-card--weakness">
        <h3 className="callout-card__title">Что снижает твой рейтинг</h3>
        <p className="callout-card__body">{weakness.summary}</p>
      </Card>

      <Card className="callout-card callout-card--strength">
        <h3 className="callout-card__title">Твоя сильная сторона</h3>
        <p className="callout-card__body">
          {strength.label} — {strength.value}/100
        </p>
      </Card>

      <button
        type="button"
        className="btn btn--primary btn--lg"
        onClick={() => onOpenGuide(recommendedGuideSlug)}
      >
        Как улучшить результат
      </button>

      <div className="result-page__publish">
        {publishState === "published" ? (
          <p className="state-message state-message--success">
            Фото опубликовано в общем рейтинге.
          </p>
        ) : (
          <>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setModalOpen(true)}
              disabled={publishState === "submitting"}
            >
              Отправить в общий рейтинг
            </button>
            <p className="result-page__publish-caption">Пусть другие оценят твои стопы.</p>
            {publishState === "error" && publishErrorMessage ? (
              <p className="state-message state-message--error">{publishErrorMessage}</p>
            ) : null}
          </>
        )}
      </div>

      <ConfirmModal
        open={modalOpen}
        title="Опубликовать фото?"
        body="Твоё фото будет опубликовано анонимно. Другие пользователи смогут оценить его."
        confirmLabel="Опубликовать"
        cancelLabel="Отмена"
        confirmDisabled={publishState === "submitting"}
        onConfirm={handleConfirmPublish}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
}
