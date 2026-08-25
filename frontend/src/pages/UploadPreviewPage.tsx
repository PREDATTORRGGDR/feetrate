import { IconArrowLeft } from "@tabler/icons-react";
import { useAppState } from "../state/AppStateContext";

interface UploadPreviewPageProps {
  onAnalyze: () => void;
  onBack: () => void;
}

export default function UploadPreviewPage({ onAnalyze, onBack }: UploadPreviewPageProps) {
  const { uploadedPhotoUrl } = useAppState();

  return (
    <div className="screen upload-preview-page">
      <button type="button" className="icon-back-btn" onClick={onBack} aria-label="Назад">
        <IconArrowLeft size={22} />
      </button>

      <div className="upload-preview-page__frame">
        {uploadedPhotoUrl ? (
          <img src={uploadedPhotoUrl} alt="Выбранное фото" className="upload-preview-page__image" />
        ) : (
          <div className="upload-preview-page__placeholder">Фото не выбрано</div>
        )}
      </div>

      <button type="button" className="btn btn--primary btn--lg" onClick={onAnalyze} disabled={!uploadedPhotoUrl}>
        Проанализировать
      </button>
    </div>
  );
}
