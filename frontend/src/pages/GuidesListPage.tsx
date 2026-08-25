import { useEffect, useState } from "react";
import Card from "../components/Card";
import LoadingSpinner from "../components/LoadingSpinner";
import { ApiError, fetchGuides } from "../services/api";
import { useAppState } from "../state/AppStateContext";
import type { GuideSummary } from "../types";

interface GuidesListPageProps {
  onOpenGuide: (slug: string) => void;
}

export default function GuidesListPage({ onOpenGuide }: GuidesListPageProps) {
  const { analysisResult } = useAppState();
  const [guides, setGuides] = useState<GuideSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchGuides()
      .then((data) => {
        if (!cancelled) setGuides(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Не удалось загрузить гайды.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recommendedSlug = analysisResult?.recommendedGuideSlug ?? null;

  return (
    <div className="screen guides-page">
      <h1 className="section-title">Гайды</h1>

      {loading ? (
        <div className="screen--centered">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="screen--centered">
          <p className="state-message state-message--error">{error}</p>
        </div>
      ) : (
        <div className="guides-page__list">
          {guides?.map((guide) => (
            <Card key={guide.slug} className="guide-card">
              {guide.slug === recommendedSlug ? (
                <span className="guide-card__badge">Тебе особенно пригодится этот гайд</span>
              ) : null}
              <h3 className="guide-card__title">{guide.title}</h3>
              <p className="guide-card__description">{guide.shortDescription}</p>
              <button type="button" className="btn btn--secondary" onClick={() => onOpenGuide(guide.slug)}>
                Открыть гайд
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
