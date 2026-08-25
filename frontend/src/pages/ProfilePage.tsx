import { useEffect, useState } from "react";
import Card from "../components/Card";
import LoadingSpinner from "../components/LoadingSpinner";
import Sparkline from "../components/Sparkline";
import { ApiError, fetchProfile } from "../services/api";
import { useAppState } from "../state/AppStateContext";
import { formatPublicRating, formatScoreOutOf100 } from "../utils/formatters";

interface ProfilePageProps {
  onUploadNew: () => void;
}

export default function ProfilePage({ onUploadNew }: ProfilePageProps) {
  const { profile, setProfile } = useAppState();
  const [loading, setLoading] = useState(!profile);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchProfile()
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Не удалось загрузить профиль.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !profile) {
    return (
      <div className="screen screen--centered">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="screen screen--centered">
        <p className="state-message state-message--error">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="screen screen--centered">
        <p className="state-message state-message--muted">Данные профиля недоступны.</p>
        <button type="button" className="btn btn--primary" onClick={onUploadNew}>
          Загрузить новое фото
        </button>
      </div>
    );
  }

  return (
    <div className="screen profile-page">
      <h1 className="section-title">Профиль</h1>

      <Card className="profile-page__score-card">
        <h3 className="profile-page__label">Мой рейтинг</h3>
        <p className="profile-page__score">{formatScoreOutOf100(profile.score)}</p>
      </Card>

      <Card>
        <h3 className="profile-page__label">История рейтинга</h3>
        <Sparkline values={profile.scoreHistory} />
      </Card>

      <Card>
        <h3 className="profile-page__label">Моя публичная оценка</h3>
        <p className="profile-page__public-rating">{formatPublicRating(profile.publicRating)}</p>
        {profile.publicVotesCount > 0 ? (
          <p className="profile-page__votes-count">Голосов: {profile.publicVotesCount}</p>
        ) : null}
      </Card>

      <button type="button" className="btn btn--primary btn--lg" onClick={onUploadNew}>
        Загрузить новое фото
      </button>
    </div>
  );
}
