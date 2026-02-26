"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppConfig } from "@/app/config/app.config";
import { CardBaseData } from "@/app/models/CardBaseData";
import { MediaDetails } from "@/app/models/MediaDetails";
import { MediaDetailsService } from "@/app/services/MovieMetaData/MediaDetailsService";
import { savePlayNavigationContext } from "@/app/play/playNavigation";
import "./MediaModal.css";
import MediaFrame from "./MediaFrame";
import MediaSelector from "./MediaSelector/MediaSelector";
import Spinner from "../../core/Spinner";

type RecentItem = {
  path: string;
  title: string;
  media_title: string;
  tmdb_id: number | null;
  media_type: "movie" | "tv" | null;
  stored_title: string | null;
  position_seconds: number;
  duration_seconds: number | null;
  updated_at: string;
};

type RecentResponse = {
  username: string;
  items: RecentItem[];
};

type StreamProgress = {
  position_seconds: number;
  duration_seconds: number | null;
  updated_at: string;
};

type StreamProgressResponse = {
  path: string;
  progress: StreamProgress | null;
};

const USER_COOKIE = "lumi_username";

function readCookie(name: string): string | null {
  const cookies = document.cookie.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

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

function fallbackDetails(media: CardBaseData): MediaDetails {
  const rawId = parseInt(media.id, 10);
  return {
    id: Number.isFinite(rawId) ? rawId : 0,
    mediaType: media.mediaType ?? "movie",
    title: media.title,
    overview: "",
    posterUrl: media.posterUrl ?? undefined,
    backdropUrl: media.backdropUrl ?? undefined,
    year: media.year ?? undefined,
    genres: [],
  };
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function isResumeCandidate(item: RecentItem): boolean {
  const pos = Math.max(0, item.position_seconds ?? 0);
  const dur = item.duration_seconds;
  if (pos <= 5) return false;
  if (dur && dur > 0 && dur - pos <= 30) return false;
  return true;
}

export default function MediaModal({
  open,
  media,
  onClose,
}: {
  open: boolean;
  media: CardBaseData | null;
  onClose: () => void;
}) {
  const router = useRouter();

  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [showRequestManagement, setShowRequestManagement] =
    useState<boolean>(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [resumePath, setResumePath] = useState<string | null>(null);
  const [resumeLabel, setResumeLabel] = useState<string>("");

  useEffect(() => {
    setDetails(null);
    setResumePath(null);
    setResumeLabel("");
  }, [open, media?.id]);

  useEffect(() => {
    if (!media) return;

    let cancelled = false;

    MediaDetailsService.getMediaDetails(
      parseInt(media.id, 10),
      media.mediaType ?? "movie"
    )
      .then((data) => {
        if (!cancelled) {
          setDetails(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetails(fallbackDetails(media));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [media]);

  useEffect(() => {
    if (!open || !media) {
      return;
    }

    const username = readCookie(USER_COOKIE);
    if (!username) {
      return;
    }

    let cancelled = false;

    const loadResume = async () => {
      try {
        const tmdbId = parseInt(media.id, 10);
        const mediaType = media.mediaType ?? "movie";

        const recentRes = await fetch(
          `${AppConfig.servers.download.baseUrl}/api/stream/recent?username=${encodeURIComponent(
            username
          )}&limit=100`,
          { cache: "no-store" }
        );
        if (!recentRes.ok) {
          throw new Error("cannot load recents");
        }

        const recentData = (await recentRes.json()) as RecentResponse;
        const items = recentData.items ?? [];

        const titleKey = normalize(media.title);
        const matched = items.find((item) => {
          const byTmdb =
            Number.isFinite(tmdbId) &&
            tmdbId > 0 &&
            item.tmdb_id === tmdbId &&
            item.media_type === mediaType;
          if (byTmdb && isResumeCandidate(item)) return true;

          if (item.media_type && item.media_type !== mediaType) return false;
          const itemTitle = normalize(
            item.stored_title || item.media_title || item.title || ""
          );
          return itemTitle === titleKey && isResumeCandidate(item);
        });

        if (matched?.path) {
          if (!cancelled) {
            setResumePath(matched.path);
            setResumeLabel(formatClock(Math.max(0, matched.position_seconds ?? 0)));
          }
          return;
        }

        const availability = await MediaDetailsService.isMediaAvailableFromCard(
          media
        );
        const mediaPath = availability.path;
        if (!availability.exists || typeof mediaPath !== "string" || !mediaPath) {
          return;
        }

        const res = await fetch(
          `${AppConfig.servers.download.baseUrl}/api/stream/progress?path=${encodeURIComponent(
            mediaPath
          )}&username=${encodeURIComponent(username)}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          return;
        }

        const data = (await res.json()) as StreamProgressResponse;
        const progress = data.progress;
        if (!progress) {
          return;
        }

        const pos = Math.max(0, progress.position_seconds ?? 0);
        const dur = progress.duration_seconds;

        if (pos <= 5) {
          return;
        }

        if (dur && dur > 0 && dur - pos <= 30) {
          return;
        }

        if (!cancelled) {
          setResumePath(mediaPath);
          setResumeLabel(formatClock(pos));
        }
      } catch {
      }
    };

    void loadResume();

    return () => {
      cancelled = true;
    };
  }, [open, media]);

  const resumePlayback = () => {
    if (!media || !resumePath) {
      return;
    }

    savePlayNavigationContext(media);
    onClose();
    const q = new URLSearchParams({
      path: resumePath,
      title: media.title,
      tmdb_id: media.id,
      media_type: media.mediaType ?? "movie",
    });
    router.push(
      `/play?${q.toString()}`
    );
  };

  if (!open || !media) {
    return null;
  }

  return (
    <div className="modal__overlay" onClick={onClose}>
      <div className="modal scrollbar" onClick={(e) => e.stopPropagation()}>
        <button className="button close__button" onClick={onClose}>
          ×
        </button>

        <MediaFrame
          media={media}
          runTrailer={showTrailer}
          mediaDetail={details}
          onClose={onClose}
        />

        <div className="media__controller">
          {resumePath && (
            <button className="button" onClick={resumePlayback}>
              Reprendre {resumeLabel}
            </button>
          )}

          <button className="button" onClick={() => setShowTrailer(!showTrailer)}>
            Play Trailer
          </button>

          <button
            className="button"
            onClick={() => setShowRequestManagement(!showRequestManagement)}
          >
            Request management
          </button>
        </div>

        {showRequestManagement ? (
          <MediaSelector mediaDetail={details} />
        ) : (
          <div className="media__controller">
            {details === null ? (
              <div className="spinner__container">
                <Spinner size={70} />
              </div>
            ) : (
              <p>{details?.overview}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

