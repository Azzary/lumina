"use client";
import "./MovieSelector.css";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppConfig } from "@/app/config/app.config";

import { MediaDetails } from "@/app/models/MediaDetails";
import { CardBaseData } from "@/app/models/CardBaseData";

import { RequestDownloadService } from "@/app/services/Donloader/RequestDownloadService";
import DownloadStatusService from "@/app/services/Donloader/DownloadStatusService";
import {
  DownloadPlanDTO,
  isMoviePlanDTO,
} from "@/app/services/Donloader/dto";
import { useMediaModal } from "../../../MediaModalContext/MediaModalContext";
import { downloadHttp } from "@/app/services/httpClients";
import {
  MediaAvailableResponse,
  MediaDetailsService,
} from "@/app/services/MovieMetaData/MediaDetailsService";
import { savePlayNavigationContext } from "@/app/play/playNavigation";

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

export default function MovieSelector({
  mediaDetail,
  downloadStatus,
}: {
  mediaDetail: MediaDetails;
  downloadStatus: MediaAvailableResponse;
}) {
  const router = useRouter();
  const { close } = useMediaModal();

  const [plan, setPlan] = useState<DownloadPlanDTO | null>(null);
  const [diskInfo, setDiskInfo] =
    useState<MediaAvailableResponse | null>(downloadStatus);
  const [username, setUsername] = useState<string | null>(null);
  const [resumeProgress, setResumeProgress] = useState<StreamProgress | null>(
    null
  );

  const [lockUntil, setLockUntil] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setUsername(readCookie(USER_COOKIE));
  }, []);

  useEffect(() => {
    setDiskInfo(downloadStatus);
  }, [downloadStatus]);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const p = await DownloadStatusService.getMovieDownload(mediaDetail.id);

        if (cancelled) return;

        setPlan(p);

        const torrent = p && isMoviePlanDTO(p) ? p.target.torrent : null;

        const shouldCheckDisk =
          !diskInfo?.exists &&
          (!torrent || torrent.active_torrent?.state === "completed");

        if (shouldCheckDisk) {
          const res = await MediaDetailsService.isMediaAvailable(mediaDetail);
          if (!cancelled) {
            setDiskInfo(res);
          }
        }
      } catch (err) {
        console.error("[MovieSelector]", err);
      }
    };

    tick();
    const interval = setInterval(tick, 1500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [mediaDetail.id, diskInfo?.exists]);

  useEffect(() => {
    if (
      !username ||
      !diskInfo?.exists ||
      typeof diskInfo.path !== "string" ||
      !diskInfo.path
    ) {
      setResumeProgress(null);
      return;
    }

    const mediaPath = diskInfo.path;

    let cancelled = false;

    const load = async () => {
      try {
        const baseUrl = AppConfig.servers.download.baseUrl;
        const res = await fetch(
          `${baseUrl}/api/stream/progress?path=${encodeURIComponent(
            mediaPath
          )}&username=${encodeURIComponent(username)}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          throw new Error("cannot load progress");
        }

        const data = (await res.json()) as StreamProgressResponse;
        if (!cancelled) {
          setResumeProgress(data.progress ?? null);
        }
      } catch {
        if (!cancelled) {
          setResumeProgress(null);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [diskInfo?.exists, diskInfo?.path, username]);

  const requestMovie = () => {
    if (Date.now() < lockUntil) return;

    RequestDownloadService.send({
      media_type: "movie",
      title: mediaDetail.title,
      year: mediaDetail.year ?? "",
      tmdb_id: mediaDetail.id,
    });

    setLockUntil(Date.now() + 10_000);
  };

  const playMovie = () => {
    if (!diskInfo?.path) return;

    const mediaCard: CardBaseData = {
      kind: "media",
      id: String(mediaDetail.id),
      mediaType: mediaDetail.mediaType,
      title: mediaDetail.title,
      posterUrl: mediaDetail.posterUrl ?? null,
      backdropUrl: mediaDetail.backdropUrl ?? null,
      year: mediaDetail.year ?? null,
    };

    savePlayNavigationContext(mediaCard);
    close();
    const q = new URLSearchParams({
      path: diskInfo.path,
      title: mediaDetail.title,
      tmdb_id: String(mediaDetail.id),
      media_type: mediaDetail.mediaType,
    });
    router.push(
      `/play?${q.toString()}`
    );
  };

  const deleteMovie = async () => {
    if (!diskInfo?.path) return;

    await downloadHttp.post("/media/delete", {
      path: diskInfo.path,
    });

    setDiskInfo({
      ...diskInfo,
      exists: false,
      path: null,
    });
    setConfirmDelete(false);
  };

  const torrent =
    plan && isMoviePlanDTO(plan) ? plan.target.torrent : null;

  const progress =
    torrent?.active_torrent?.progress !== undefined
      ? Math.round(torrent.active_torrent.progress)
      : null;

  const resumePos = Math.max(0, resumeProgress?.position_seconds ?? 0);
  const resumeDur = resumeProgress?.duration_seconds ?? null;
  const canResume =
    resumePos > 5 &&
    (!resumeDur || (resumeDur > 0 && resumeDur - resumePos > 30));

  let label = "Request";

  if (diskInfo?.exists) {
    label = canResume ? `Reprendre ${formatClock(resumePos)}` : "Play";
  } else if (torrent?.active_torrent?.state === "downloading") {
    label = `Downloading ${progress ?? 0}%`;
  } else if (torrent?.active_torrent?.state === "queued") {
    label = "Queued";
  } else if (torrent?.active_torrent?.state === "completed") {
    label = "Finalizing...";
  }

  return (
    <div className="movie__selector">
      <button
        className="movie__button"
        disabled={!diskInfo?.exists && Date.now() < lockUntil}
        onClick={diskInfo?.exists ? playMovie : requestMovie}
      >
        {label}
      </button>

      {diskInfo?.exists && (
        <>
          {!confirmDelete ? (
            <button
              className="movie__button movie__button--danger"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </button>
          ) : (
            <div className="movie__confirm">
              <span>Delete this movie?</span>
              <button
                className="movie__button--danger"
                onClick={deleteMovie}
              >
                Yes
              </button>
              <button
                className="movie__button"
                onClick={() => setConfirmDelete(false)}
              >
                No
              </button>
            </div>
          )}
        </>
      )}

      {progress !== null && !diskInfo?.exists && (
        <div className="movie__progress">
          <div
            className="movie__progress__bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
