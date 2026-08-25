import { useCallback, useEffect, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import { ApiError, fetchRatingFeed, voteOnRating } from "../services/api";
import type { RatingFeedPhoto } from "../types";

const SCORES = Array.from({ length: 10 }, (_, i) => i + 1);

export default function PublicRatingPage() {
  const [photo, setPhoto] = useState<RatingFeedPhoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);

  const loadNext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { photos } = await fetchRatingFeed(1);
      if (photos.length === 0) {
        setPhoto(null);
        setExhausted(true);
      } else {
        setPhoto(photos[0]);
        setExhausted(false);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить фото.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNext();
  }, [loadNext]);

  const handleVote = async (score: number) => {
    if (!photo || voting) return;
    setVoting(true);
    setError(null);
    try {
      await voteOnRating(photo.publicId, score);
      await loadNext();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось отправить оценку.");
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="screen rating-page">
      <h1 className="section-title">Насколько привлекательны эти стопы?</h1>

      {loading ? (
        <div className="screen--centered">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="screen--centered">
          <p className="state-message state-message--error">{error}</p>
          <button type="button" className="btn btn--primary" onClick={loadNext}>
            Повторить
          </button>
        </div>
      ) : exhausted || !photo ? (
        <div className="screen--centered">
          <p className="state-message state-message--muted">Новых фото пока нет. Загляни позже.</p>
        </div>
      ) : (
        <>
          <div className="rating-page__frame">
            <img src={photo.imageUrl} alt="Фото на оценку" className="rating-page__image" />
          </div>
          <div className="rating-page__scale" role="group" aria-label="Оценка от 1 до 10">
            {SCORES.map((score) => (
              <button
                key={score}
                type="button"
                className="rating-page__score-btn"
                onClick={() => handleVote(score)}
                disabled={voting}
              >
                {score}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
