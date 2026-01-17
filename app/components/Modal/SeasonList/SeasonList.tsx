"use client";

import { useState } from "react";
import "./SeasonList.css";

type Episode = {
  id: number;
  episodeNumber: number;
  name: string;
  overview?: string;
};

type Season = {
  seasonNumber: number;
  episodeCount: number;
  episodes: Episode[];
};

type Props = {
  seasons: Season[];
};

export default function SeasonList({ seasons }: Props) {
  const [openSeason, setOpenSeason] = useState<number | null>(null);

  return (
    <div className="seasons">
      {seasons.map((season) => {
        const open = openSeason === season.seasonNumber;

        return (
          <div key={season.seasonNumber} className="season">
            <button
              className="season__header"
              onClick={() =>
                setOpenSeason(open ? null : season.seasonNumber)
              }
            >
              <div>
                <strong>Saison {season.seasonNumber}</strong>
                <span className="season__count">
                  {season.episodeCount} épisodes
                </span>
              </div>

              <span className={`season__chevron ${open ? "open" : ""}`}>
                ▾
              </span>
            </button>

            {open && (
              <div className="episodes">
                {season.episodes.map((ep) => (
                  <div key={ep.id} className="episode">
                    <div className="episode__header">
                      <span className="episode__number">
                        E{ep.episodeNumber}
                      </span>
                      <span className="episode__title">{ep.name}</span>
                    </div>

                    {ep.overview && (
                      <p className="episode__overview">{ep.overview}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
