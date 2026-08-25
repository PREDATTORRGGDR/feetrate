import { useCallback, useEffect, useState } from "react";
import BottomNav from "./components/BottomNav";
import LoadingSpinner from "./components/LoadingSpinner";
import HomePage from "./pages/HomePage";
import UploadPreviewPage from "./pages/UploadPreviewPage";
import AnalyzingPage from "./pages/AnalyzingPage";
import ResultPage from "./pages/ResultPage";
import GuidesListPage from "./pages/GuidesListPage";
import GuideDetailPage from "./pages/GuideDetailPage";
import PublicRatingPage from "./pages/PublicRatingPage";
import ProfilePage from "./pages/ProfilePage";
import { useAppState } from "./state/AppStateContext";
import { initTelegramApp, openExternalLink } from "./services/telegram";
import { ApiError, fetchGuides } from "./services/api";

const REQUIRED_CHANNEL_URL = "https://t.me/GlowUpXBot";

export type TabName = "home" | "rating" | "guides" | "profile";

export type Screen =
  | { name: "home" }
  | { name: "upload-preview" }
  | { name: "analyzing" }
  | { name: "result" }
  | { name: "guides" }
  | { name: "guide-detail"; slug: string }
  | { name: "rating" }
  | { name: "profile" };

function tabForScreen(screen: Screen): TabName {
  switch (screen.name) {
    case "home":
    case "upload-preview":
    case "analyzing":
    case "result":
      return "home";
    case "guides":
    case "guide-detail":
      return "guides";
    case "rating":
      return "rating";
    case "profile":
      return "profile";
  }
}

type GateStatus = "checking" | "blocked" | "ok";

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [gateStatus, setGateStatus] = useState<GateStatus>("checking");
  const [gateChecking, setGateChecking] = useState(false);
  const { resetUploadFlow } = useAppState();

  useEffect(() => {
    initTelegramApp();
  }, []);

  const checkGate = useCallback(async () => {
    try {
      await fetchGuides();
      setGateStatus("ok");
    } catch (err) {
      if (err instanceof ApiError && err.code === "subscription_required") {
        setGateStatus("blocked");
      } else {
        // Any other failure (network, 500) shouldn't permanently lock the
        // user out behind the subscription screen — let normal per-page
        // error states handle it instead.
        setGateStatus("ok");
      }
    }
  }, []);

  useEffect(() => {
    checkGate();
  }, [checkGate]);

  const handleCheckSubscription = async () => {
    setGateChecking(true);
    await checkGate();
    setGateChecking(false);
  };

  const activeTab = tabForScreen(screen);

  const handleTabSelect = (tab: TabName) => {
    switch (tab) {
      case "home":
        resetUploadFlow();
        setScreen({ name: "home" });
        break;
      case "rating":
        setScreen({ name: "rating" });
        break;
      case "guides":
        setScreen({ name: "guides" });
        break;
      case "profile":
        setScreen({ name: "profile" });
        break;
    }
  };

  const startUploadFlow = () => {
    resetUploadFlow();
    setScreen({ name: "home" });
  };

  if (gateStatus === "checking") {
    return (
      <div className="app-shell">
        <main className="app-content">
          <div className="screen screen--centered">
            <LoadingSpinner />
          </div>
        </main>
      </div>
    );
  }

  if (gateStatus === "blocked") {
    return (
      <div className="app-shell">
        <main className="app-content">
          <div className="screen screen--centered">
            <h1 className="section-title">Подпишись на канал</h1>
            <p className="state-message state-message--muted">
              Чтобы пользоваться Feetrate, нужна подписка на Telegram-канал GlowLab.
            </p>
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={() => openExternalLink(REQUIRED_CHANNEL_URL)}
            >
              Открыть канал
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--lg"
              onClick={handleCheckSubscription}
              disabled={gateChecking}
            >
              {gateChecking ? "Проверяю..." : "Я подписался"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  let content;
  switch (screen.name) {
    case "home":
      content = <HomePage onPhotoSelected={() => setScreen({ name: "upload-preview" })} />;
      break;
    case "upload-preview":
      content = (
        <UploadPreviewPage
          onAnalyze={() => setScreen({ name: "analyzing" })}
          onBack={() => setScreen({ name: "home" })}
        />
      );
      break;
    case "analyzing":
      content = (
        <AnalyzingPage
          onDone={() => setScreen({ name: "result" })}
          onBack={() => setScreen({ name: "upload-preview" })}
        />
      );
      break;
    case "result":
      content = (
        <ResultPage
          onOpenGuide={(slug) => setScreen({ name: "guide-detail", slug })}
          onRetryUpload={startUploadFlow}
        />
      );
      break;
    case "guides":
      content = <GuidesListPage onOpenGuide={(slug) => setScreen({ name: "guide-detail", slug })} />;
      break;
    case "guide-detail":
      content = <GuideDetailPage slug={screen.slug} onBack={() => setScreen({ name: "guides" })} />;
      break;
    case "rating":
      content = <PublicRatingPage />;
      break;
    case "profile":
      content = <ProfilePage onUploadNew={startUploadFlow} />;
      break;
  }

  return (
    <div className="app-shell">
      <main className="app-content">{content}</main>
      <BottomNav activeTab={activeTab} onSelect={handleTabSelect} />
    </div>
  );
}
