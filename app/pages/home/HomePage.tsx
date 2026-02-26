"use client";

import MediaRow from "@/app/components/Card/MediaRow/MediaRow";
import TopBar from "@/app/components/TopBar/TopBar";
import "./HomePage.css";
import DownloadedMediaRow from "@/app/components/DownloadedMediaRow/DownloadedMediaRow";
import RecentlyWatchedRow from "@/app/components/RecentlyWatchedRow/RecentlyWatchedRow";

export default function HomePage() {
  return (
    <main className="home">
      <TopBar />

      <div className="home__container">
        <br />
        <MediaRow
          title="Tendances"
          url="/trending?type=all&window=week"
        />

        <RecentlyWatchedRow />

        <MediaRow
          title="Catégories"
          url="/genres"
        />

        <MediaRow
          title="Plateformes"
          url="/platforms"
        />
      </div>
    </main>
  );
}
