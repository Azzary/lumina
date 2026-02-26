"use client";
import "./TvSelector.css";

import { useEffect, useState, useMemo } from "react";
import { MediaDetails } from "@/app/models/MediaDetails";
import DownloadStatusService from "@/app/services/Donloader/DownloadStatusService";
import { SeasonPlanDTO } from "@/app/services/Donloader/dto";
import TvSeason from "./TvSeason";
import { MediaAvailableResponse } from "@/app/services/MovieMetaData/MediaDetailsService";

export default function TvSelector({
  mediaDetail,
  downloadStatus,
}: {
  mediaDetail: MediaDetails;
  downloadStatus: MediaAvailableResponse;
}) {
  const [seasonPlans, setSeasonPlans] = useState<
    Record<number, SeasonPlanDTO>
  >({});
  const [openSeason, setOpenSeason] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const seasons =
          await DownloadStatusService.getTvDownloads(
            mediaDetail.id
          );

        if (cancelled) return;

        const map: Record<number, SeasonPlanDTO> = {};
        for (const s of seasons) {
          map[s.season] = s;
        }

        setSeasonPlans(map);
      } catch (e) {
        console.error("[TvSelector]", e);
      }
    };

    tick();
    const i = setInterval(tick, 1500);

    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, [mediaDetail.id]);

  if (!mediaDetail.seasons?.length) return null;

  return (
    <div className="tv__selector">
      {mediaDetail.seasons.map((season) => (
        <TvSeason
          key={season.seasonNumber}
          season={season}
          mediaDetail={mediaDetail}
          openSeason={openSeason}
          setOpenSeason={setOpenSeason}
          downloadStatus={downloadStatus}
          seasonPlan={
            seasonPlans[season.seasonNumber] ?? null
          }
        />
      ))}
    </div>
  );
}
