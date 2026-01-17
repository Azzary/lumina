"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { CardBaseData } from "@/app/models/CardBaseData";
import { MediaDetails } from "@/app/models/MediaDetails";
import { DownloadPlanDTO, TorrentDTO } from "@/app/models/DownloadDTO";

import { MediaDetailsService } from "@/app/services/MovieMetaData/MediaDetailsService";
import { RequestDownloadService } from "@/app/services/Donloader/RequestDownloadService";
import { downloadHttp } from "@/app/services/httpClients";

import "./MediaModal.css";


type Props = {
  open: boolean;
  media: CardBaseData | null;
  onClose: () => void;
};

type MediaExistsResponse = {
  exists: boolean;
  path?: string | null;
};

type DownloadStatus = {
  state: "queued" | "downloading" | "completed" | "error";
  progress: number;
  torrents: TorrentDTO[];
};


function computeGlobalStatus(
  torrents: TorrentDTO[]
): DownloadStatus {
  if (torrents.length === 0) {
    return { state: "queued", progress: 0, torrents };
  }

  let completed = 0;
  let downloading = 0;
  let totalProgress = 0;

  for (const t of torrents) {
    totalProgress += t.progress ?? 0;
    if (t.state === "completed") completed++;
    if (t.state === "downloading") downloading++;
  }

  const progress = Math.round(totalProgress / torrents.length);

  if (completed === torrents.length) {
    return { state: "completed", progress: 100, torrents };
  }

  if (downloading > 0) {
    return { state: "downloading", progress, torrents };
  }

  return { state: "queued", progress, torrents };
}


export default function MediaModal({ open, media, onClose }: Props) {
  const router = useRouter();
  const pollTimer = useRef<number | null>(null);

  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [mediaExists, setMediaExists] = useState<MediaExistsResponse | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus | null>(null);

  const [showTrailer, setShowTrailer] = useState(false);
  const [lockDownloadBtn, setLockDownloadBtn] = useState(false);


  const checkMediaExists = (payload: {
    media_type: "movie" | "tv";
    title: string;
  }) =>
    downloadHttp.post<MediaExistsResponse>(
      "/media/exists-on-disk",
      payload
    );

  const fetchDownloadStatus = async (
    title: string
  ): Promise<DownloadStatus | null> => {
    const plans = await downloadHttp.get<DownloadPlanDTO[]>("/media/get-downloads-status");
    const titleNorm = title.toLowerCase();

    for (const plan of plans) {
      if (!plan.name.toLowerCase().includes(titleNorm)) continue;
      return computeGlobalStatus(plan.torrents);
    }

    return null;
  };


  const playMedia = (path?: string | null) => {
    if (!path || !details) return;

    router.push(
      `/play?` +
        new URLSearchParams({
          path,
          mediaType: details.mediaType,
          title: details.title,
          year: details.year ?? "",
        }).toString()
    );

    onClose();
  };


  useEffect(() => {
    if (!open || !media || media.kind !== "media") return;

    setDetails(null);
    setMediaExists(null);
    setDownloadStatus(null);
    setShowTrailer(false);

    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }

    MediaDetailsService
      .get(Number(media.id), media.mediaType!)
      .then(async (d) => {
        setDetails(d);

        const exists = await checkMediaExists({
          media_type: d.mediaType,
          title: d.title,
        });

        setMediaExists(exists);

        if (!exists.exists) {
          const dl = await fetchDownloadStatus(d.title);
          if (dl) setDownloadStatus(dl);
        }
      });
  }, [open, media]);


  useEffect(() => {
    if (!details || !downloadStatus) return;
    if (downloadStatus.state === "completed") return;

    pollTimer.current = window.setInterval(async () => {
      const dl = await fetchDownloadStatus(details.title);
      if (!dl) return;

      setDownloadStatus(dl);

      if (dl.state === "completed") {
        clearInterval(pollTimer.current!);
        pollTimer.current = null;

        const exists = await checkMediaExists({
          media_type: details.mediaType,
          title: details.title,
        });

        setMediaExists(exists);
      }
    }, 1000);

    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [downloadStatus, details]);


  const handleMainButtonClick = async () => {
    if (!details || !mediaExists) return;

    if (mediaExists.exists) {
      playMedia(mediaExists.path);
      return;
    }

    if (downloadStatus) return;

    setLockDownloadBtn(true);
    setTimeout(() => setLockDownloadBtn(false), 5000);

    await RequestDownloadService.send({
      media_type: details.mediaType,
      title: details.title,
      year: details.year ?? "",
      tmdb_id: details.id,
    });

    setDownloadStatus({
      state: "queued",
      progress: 0,
      torrents: [],
    });
  };


  const mainButtonLabel = (() => {
    if (!mediaExists) return "…";
    if (mediaExists.exists) return "Lire";

    if (downloadStatus) {
      if (downloadStatus.state === "queued") return "Initialisation…";
      if (downloadStatus.state === "downloading")
        return `Téléchargement ${downloadStatus.progress}%`;
    }

    return "Demander";
  })();

  const buttonDisabled =
    lockDownloadBtn ||
    downloadStatus?.state === "queued" ||
    downloadStatus?.state === "downloading";

  if (!open) return null;


  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modal scrollbar" onClick={(e) => e.stopPropagation()}>

        <div className="modal__hero">
          {details?.backdropUrl ? (
            <img className="modal__heroMedia" src={details.backdropUrl} />
          ) : (
            <div className="modal__heroMedia skeleton" />
          )}

          {showTrailer && details?.trailerYoutubeKey && (
            <iframe
              className="modal__trailer"
              src={`https://www.youtube.com/embed/${details.trailerYoutubeKey}?autoplay=1`}
              allow="autoplay"
              allowFullScreen
            />
          )}

          <div className="modal__heroOverlay" />
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="modal__actions">
          <button
            className="modal__primaryBtn"
            disabled={buttonDisabled}
            onClick={handleMainButtonClick}
          >
            {mainButtonLabel}
          </button>

          {details?.trailerYoutubeKey && (
            <button
              className="modal__secondaryBtn"
              onClick={() => setShowTrailer(v => !v)}
            >
              {showTrailer ? "Fermer la bande-annonce" : "Bande-annonce"}
            </button>
          )}
        </div>

        <div className="modal__content">
          <h1 className="modal__title">{details?.title}</h1>

          {details && (
            <>
              <div className="modal__meta">
                {details.year && <span>{details.year}</span>}
                {details.runtime && <span>{details.runtime} min</span>}
                {details.genres.length > 0 && (
                  <span>{details.genres.join(" • ")}</span>
                )}
              </div>

              {details.overview && (
                <p className="modal__overview">{details.overview}</p>
              )}
            </>
          )}

          {downloadStatus?.torrents.length ? (
            <div className="torrentList">
              {downloadStatus.torrents.map((t, i) => (
                <div key={i} className="torrentRow">
                  <div className="torrentTitle">{t.title}</div>
                  <div className="torrentProgress">
                    {t.state} • {t.progress}%
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
