"use client";
import "./MediaSelector.css";

import { MediaDetails } from "@/app/models/MediaDetails";
import Spinner from "../../../core/Spinner";
import { useEffect, useState } from "react";

import MovieSelector from "./movie/MovieSelector";
import TvSelector from "./tv/TvSelector";
import { MediaAvailableResponse, MediaDetailsService } from "@/app/services/MovieMetaData/MediaDetailsService";

export default function MediaSelector({
  mediaDetail,
}: {
  mediaDetail: MediaDetails | null;
}) {
  const [downloadStatus, setDownloadStatus] =
    useState<MediaAvailableResponse | null>(null);

  useEffect(() => {
    if (!mediaDetail) return;

    let cancelled = false;

    MediaDetailsService.isMediaAvailable(mediaDetail)
      .then((data) => {
        if (!cancelled) setDownloadStatus(data);
      })
      .catch((err) => {
        console.error("[MediaSelector]", err);
      });

    return () => {
      cancelled = true;
    };
  }, [mediaDetail]);

  if (!mediaDetail || !downloadStatus) {
    return (
      <div className="spinner__container">
        <Spinner size={70} />
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {mediaDetail.mediaType === "movie" ? (
        <MovieSelector
          mediaDetail={mediaDetail}
          downloadStatus={downloadStatus}
        />
      ) : (
        <TvSelector
          mediaDetail={mediaDetail}
          downloadStatus={downloadStatus}
        />
      )}
    </div>
  );
}
