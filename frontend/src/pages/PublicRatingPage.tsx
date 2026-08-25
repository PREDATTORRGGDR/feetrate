import { useCallback, useEffect, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import { ApiError, fetchRatingFeed, fetchRatingTop, voteOnRating } from "../services/api";
import { formatPublicRating } from "../utils/formatters";
import type { RatingFeedPhoto } from "../types";

const SCORES = Array.from({ length: 10 }, (_, i) => i + 1);
type Mode = "vote" | "top";

export default function PublicRatingPage() {
  const [mode, setMode] = useState<Mode>("vote");

  const [photo, setPhoto] = useState<RatingFeedPhoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);

  const [top, setTop] = useState<RatingFeedPhoto[] | null>(null);
  const [topLoading, setTopLoading] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

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

  const loadTop = useCallback(async () => {
    setTopLoading(true);
    setTopError(null);
    try {
      const { photos } = await fetchRatingTop(20);
      setTop(photos);
    } catch (err) {
      setTopError(err instanceof ApiError ? err.message : "Не удалось загрузить топ.");
    } finally {
      setTopLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === "vote") {
      loadNext();
    } else if (top === null) {
      loadTop();
    }
  }, [mode, loadNext, loadTop, top]);

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
      <div className="rating-page__tabs" role="tablist" aria-label="Режим общего рейтинга">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "vote"}
          className={`rating-page__tab${mode === "vote" ? " rating-page__tab--active" : ""}`}
          onClick={() => setMode("vote")}
        >
          Оценивать
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "top"}
          className={`rating-page__tab${mode === "top" ? " rating-page__tab--active" : ""}`}
          onClick={() => setMode("top")}
        >
          Топ красивых
        </button>
      </div>

      {mode === "vote" ? (
        <>
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
              <p className="state-message state-message--muted">
                Пока никто не опубликовал фото в общий рейтинг. Сделай анализ и стань первым —
                загляни во вкладку «Главная».
              </p>
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
        </>
      ) : (
        <>
          <h1 className="section-title">Самые красивые по мнению всех</h1>

          {topLoading ? (
            <div className="screen--centered">
              <LoadingSpinner />
            </div>
          ) : topError ? (
            <div className="screen--centered">
              <p className="state-message state-message--error">{topError}</p>
              <button type="button" className="btn btn--primary" onClick={loadTop}>
                Повторить
              </button>
            </div>
          ) : !top || top.length === 0 ? (
            <div className="screen--centered">
              <p className="state-message state-message--muted">
                Топ появится, как только у опубликованных фото наберётся достаточно оценок.
              </p>
            </div>
          ) : (
            <div className="rating-page__top-grid">
              {top.map((item, index) => (
                <div key={item.publicId} className="rating-page__top-card">
                  <img src={item.imageUrl} alt={`Место в топе ${index + 1}`} />
                  <span className="rating-page__top-rank">#{index + 1}</span>
                  <span className="rating-page__top-score">
                    {formatPublicRating(item.averageScore)} · {item.voteCount} оценок
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
