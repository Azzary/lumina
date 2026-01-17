"use client";

import MediaRow from "@/app/components/Card/MediaRow/MediaRow";
import TopBar from "@/app/components/TopBar/TopBar";
import "./HomePage.css";

export default function HomePage() {

  return (
    <main className="home">
      <TopBar />

      <div className="home__container">
        <MediaRow title="Tendances" url="/trending?type=all&window=week" />
        <MediaRow title="Catégories" url="/genres" />
        <MediaRow title="Plateformes" url="/platforms" />
      </div>
    </main>
  );
}
