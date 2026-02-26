import "./TvEpisode.css";
import { CardBaseData } from "@/app/models/CardBaseData";
import { useRouter } from "next/navigation";
import { useMediaModal } from "../../../MediaModalContext/MediaModalContext";
import { savePlayNavigationContext } from "@/app/play/playNavigation";

type EpisodeProgress = {
  position_seconds: number;
  duration_seconds: number | null;
  updated_at: string;
};

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }

  return `${mm}:${ss}`;
}

export default function TvEpisode({
  episodeNumber,
  episodeName,
  episodePath,
  locked,
  progress,
  mediaCard,
}: {
  episodeNumber: number;
  episodeName: string;
  episodePath: string | null;
  locked: boolean;
  progress: EpisodeProgress | null;
  mediaCard: CardBaseData;
}) {
  const router = useRouter();
  const { close } = useMediaModal();

  const playEpisode = () => {
    if (!episodePath) return;

    savePlayNavigationContext(mediaCard);
    close();
    const q = new URLSearchParams({
      path: episodePath,
      title: episodeName,
      tmdb_id: mediaCard.id,
      media_type: mediaCard.mediaType ?? "tv",
    });
    router.push(
      `/play?${q.toString()}`
    );
  };

  const canResume = (() => {
    if (!progress || !episodePath) return false;

    const pos = Math.max(0, progress.position_seconds ?? 0);
    const dur = progress.duration_seconds;

    if (pos < 5) return false;
    if (dur && dur > 0 && dur - pos <= 30) return false;

    return true;
  })();

  const renderProgress = () => {
    if (!progress || !episodePath) return null;

    const pos = Math.max(0, progress.position_seconds ?? 0);
    const dur = progress.duration_seconds;

    if (dur && dur > 0) {
      const remain = dur - pos;
      if (remain <= 30) {
        return <span className="tv__episode__meta">Vu</span>;
      }
    }

    if (pos < 5) return null;

    return (
      <span className="tv__episode__meta">
        Reprendre {formatClock(pos)}
      </span>
    );
  };

  return (
    <div className="tv__episode">
      <div className="tv__episode__left">
        <span>
          E{episodeNumber} - {episodeName}
        </span>
        {renderProgress()}
      </div>

      <button
        className="button"
        disabled={!episodePath || locked}
        onClick={episodePath ? playEpisode : undefined}
      >
        {episodePath ? (canResume ? "Reprendre" : "Play") : "Request"}
      </button>
    </div>
  );
}
