"use client";

import "./NetflixPage.css";
import { useState } from "react";
import TopBar from "@/app/components/TopBar/TopBar";
import MediaRow from "@/app/components/Card/MediaRow/MediaRow";
import MediaGrid from "@/app/components/Card/MediaGrid/MediaGrid";

type Tab = "home" | "movies" | "series";

type RowConfig = {
  title: string;
  url: string;
};

const ROWS: Record<Tab, RowConfig[]> = {
  home: [
    { title: "Top 10 sur Netflix", url: "/platform/netflix/top10" },
    { title: "Nouveautés Netflix", url: "/platform/netflix/new" },
    { title: "Populaires en ce moment", url: "/platform/netflix/popular" },
  ],

  movies: [
    {
      title: "Films populaires sur Netflix",
      url: "/platform/netflix/popular?type=movie",
    },
  ],

  series: [
    {
      title: "Séries populaires sur Netflix",
      url: "/platform/netflix/popular?type=tv",
    },
  ],
};

export default function NetflixPage() {
  const [tab, setTab] = useState<Tab>("home");

  const gridUrl =
    tab === "home"
      ? "/platform/netflix/catalog"
      : `/platform/netflix/catalog?type=${tab === "movies" ? "movie" : "tv"}`;

  return (
    <>
      <TopBar />

      <div className="netflixPage">
        <nav className="netflixTabs">
          {(["home", "movies", "series"] as Tab[]).map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t === "home" ? "Accueil" : t === "movies" ? "Films" : "Séries"}
            </button>
          ))}
        </nav>

        <div className="netflixContent">
          {ROWS[tab].map((row) => (
            <MediaRow key={row.url} title={row.title} url={row.url} />
          ))}

          <MediaGrid url={gridUrl} />
        </div>
      </div>
    </>
  );
}
