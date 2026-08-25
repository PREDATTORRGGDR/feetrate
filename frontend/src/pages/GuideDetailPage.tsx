import { useEffect, useState } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import LoadingSpinner from "../components/LoadingSpinner";
import { ApiError, fetchGuideDetail } from "../services/api";
import type { GuideDetail } from "../types";

interface GuideDetailPageProps {
  slug: string;
  onBack: () => void;
}

export default function GuideDetailPage({ slug, onBack }: GuideDetailPageProps) {
  const [guide, setGuide] = useState<GuideDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setGuide(null);
    fetchGuideDetail(slug)
      .then((data) => {
        if (!cancelled) setGuide(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Не удалось загрузить гайд.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="screen guide-detail-page">
      <button type="button" className="icon-back-btn" onClick={onBack} aria-label="Назад к гайдам">
        <IconArrowLeft size={22} />
      </button>

      {loading ? (
        <div className="screen--centered">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="screen--centered">
          <p className="state-message state-message--error">{error}</p>
        </div>
      ) : guide ? (
        <>
          <h1 className="section-title">{guide.title}</h1>
          <div className="guide-detail-page__sections">
            {guide.sections.map((section, index) => (
              <div key={index} className="guide-detail-page__section">
                <h3>{section.heading}</h3>
                <p>{section.body}</p>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
