import { useEffect, useMemo, useRef, useState } from "react";
import { AppConfig } from "@/app/config/app.config";
import { CardBaseData } from "@/app/models/CardBaseData";
import { MediaDetails } from "@/app/models/MediaDetails";
import { RequestDownloadService } from "@/app/services/Donloader/RequestDownloadService";
import { SeasonPlanDTO, TorrentInfoDTO } from "@/app/services/Donloader/dto";
import { MediaAvailableResponse } from "@/app/services/MovieMetaData/MediaDetailsService";
import TvEpisode from "./TvEpisode";

type DiskEpisode = {
  episode: number;
  title: string;
  path: string;
};

type EpisodeProgress = {
  position_seconds: number;
  duration_seconds: number | null;
  updated_at: string;
};

type EpisodeProgressResponse = {
  path: string;
  progress: EpisodeProgress | null;
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

export default function TvSeason({
  season,
  mediaDetail,
  openSeason,
  setOpenSeason,
  downloadStatus,
  seasonPlan,
}: {
  mediaDetail: MediaDetails;
  season: {
    seasonNumber: number;
    episodes: {
      episodeNumber: number;
      name: string;
    }[];
  };
  openSeason: number | null;
  setOpenSeason: (v: number | null) => void;
  downloadStatus: MediaAvailableResponse;
  seasonPlan: SeasonPlanDTO | null;
}) {
  const isOpen = openSeason === season.seasonNumber;

  const packTorrent: TorrentInfoDTO | null =
    seasonPlan && "torrent" in seasonPlan.content
      ? seasonPlan.content.torrent
      : null;

  const packState = packTorrent?.active_torrent?.state;
  const packProgress =
    packTorrent?.active_torrent?.progress !== undefined
      ? Math.round(packTorrent.active_torrent.progress)
      : null;

  const isPackBlocking = !!packTorrent && packState !== "completed";
  const [locked, setLocked] = useState(false);
  const unlockTimerRef = useRef<number | null>(null);
  const [progressByPath, setProgressByPath] = useState<
    Record<string, EpisodeProgress>
  >({});

  const username = useMemo(() => readCookie(USER_COOKIE), []);
  const mediaCard = useMemo<CardBaseData>(
    () => ({
      kind: "media",
      id: String(mediaDetail.id),
      mediaType: mediaDetail.mediaType,
      title: mediaDetail.title,
      posterUrl: mediaDetail.posterUrl ?? null,
      backdropUrl: mediaDetail.backdropUrl ?? null,
      year: mediaDetail.year ?? null,
    }),
    [mediaDetail]
  );

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current) {
        window.clearTimeout(unlockTimerRef.current);
        unlockTimerRef.current = null;
      }
    };
  }, []);

  const requestSeason = () => {
    if (locked) return;

    RequestDownloadService.send({
      media_type: "tv",
      title: mediaDetail.title,
      tmdb_id: mediaDetail.id,
      year: mediaDetail.year ?? "",
      seasons: [season.seasonNumber],
    });

    setLocked(true);
    unlockTimerRef.current = window.setTimeout(() => {
      setLocked(false);
      unlockTimerRef.current = null;
    }, 5 * 60_000);
  };

  const diskSeason = useMemo(() => {
    const allSeasons = downloadStatus.seasons ?? {};
    const fromMap = allSeasons[season.seasonNumber];
    if (fromMap) return fromMap;

    const single = downloadStatus.season;
    if (single && single.season === season.seasonNumber) {
      return single;
    }

    return null;
  }, [downloadStatus, season.seasonNumber]);

  const diskEpisodes: Record<number, DiskEpisode> = useMemo(() => {
    if (!diskSeason) return {};

    const map: Record<number, DiskEpisode> = {};
    for (const ep of Object.values(diskSeason.episodes)) {
      map[ep.episode] = ep;
    }
    return map;
  }, [diskSeason]);

  const allEpisodesOnDisk = useMemo(() => {
    if (!season.episodes.length) {
      return false;
    }

    return season.episodes.every(
      (tmdbEp) => !!diskEpisodes[tmdbEp.episodeNumber]
    );
  }, [season.episodes, diskEpisodes]);

  useEffect(() => {
    if (!isOpen) return;

    const paths = Object.values(diskEpisodes)
      .map((ep) => ep.path)
      .filter(Boolean);

    if (!username || paths.length === 0) return;

    let cancelled = false;

    const load = async () => {
      const baseUrl = AppConfig.servers.download.baseUrl;

      const results = await Promise.all(
        paths.map(async (episodePath) => {
          try {
            const res = await fetch(
              `${baseUrl}/api/stream/progress?path=${encodeURIComponent(
                episodePath
              )}&username=${encodeURIComponent(username)}`,
              { cache: "no-store" }
            );

            if (!res.ok) return null;

            const data = (await res.json()) as EpisodeProgressResponse;
            return data.progress
              ? { path: episodePath, progress: data.progress }
              : null;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;

      const nextMap: Record<string, EpisodeProgress> = {};
      for (const item of results) {
        if (item) {
          nextMap[item.path] = item.progress;
        }
      }

      setProgressByPath(nextMap);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, username, diskEpisodes]);

  const episodeNumbers = useMemo(() => {
    const tmdbNums = season.episodes.map((e) => e.episodeNumber);
    const diskNums = Object.keys(diskEpisodes).map(Number);

    return Array.from(new Set([...tmdbNums, ...diskNums])).sort(
      (a, b) => a - b
    );
  }, [season.episodes, diskEpisodes]);

  return (
    <div className="tv__season">
      <div
        className="tv__season__header"
        onClick={() =>
          setOpenSeason(isOpen ? null : season.seasonNumber)
        }
      >
        <span>Season {season.seasonNumber}</span>

        {!packTorrent && !allEpisodesOnDisk && (
          <button
            className="button"
            disabled={locked}
            onClick={(e) => {
              e.stopPropagation();
              requestSeason();
            }}
          >
            Request All
          </button>
        )}

        {packTorrent && packState && (
          <span className="tv__season__progress">
            {packState === "downloading"
              ? `Downloading ${packProgress ?? 0}%`
              : packState}
          </span>
        )}
      </div>

      {isOpen && !isPackBlocking && (
        <div className="tv__season__episodes">
          {episodeNumbers.map((num) => {
            const tmdbEp = season.episodes.find(
              (e) => e.episodeNumber === num
            );
            const diskEp = diskEpisodes[num] ?? null;

            return (
              <TvEpisode
                key={num}
                episodeNumber={num}
                episodeName={
                  tmdbEp?.name ??
                  diskEp?.title ??
                  `Episode ${num}`
                }
                episodePath={diskEp?.path ?? null}
                locked={locked}
                progress={
                  diskEp?.path
                    ? progressByPath[diskEp.path] ?? null
                    : null
                }
                mediaCard={mediaCard}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
