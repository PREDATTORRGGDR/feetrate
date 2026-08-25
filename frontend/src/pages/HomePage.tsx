import { useRef, type ChangeEvent } from "react";
import { IconCamera } from "@tabler/icons-react";
import { useAppState } from "../state/AppStateContext";

interface HomePageProps {
  onPhotoSelected: () => void;
}

export default function HomePage({ onPhotoSelected }: HomePageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { setUploadedPhoto } = useAppState();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadedPhoto(file);
    onPhotoSelected();
    event.target.value = "";
  };

  return (
    <div className="screen screen--centered home-page">
      <div className="home-page__hero">
        <div className="home-page__badge">
          <IconCamera size={30} stroke={1.6} />
        </div>
        <h1 className="home-page__wordmark">Feetrate</h1>
        <h2 className="home-page__title">Насколько хороши твои стопы?</h2>
        <p className="home-page__subtitle">Загрузи фото и узнай свой рейтинг.</p>
      </div>
      <button type="button" className="btn btn--primary btn--lg" onClick={() => inputRef.current?.click()}>
        Загрузить фото
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="visually-hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
