"use client";

import "./SearchOverlay.css";
import { useEffect } from "react";
import { useSearch } from "./SearchContext";
import MediaGrid from "@/app/components/Card/MediaGrid/MediaGrid";

export default function SearchOverlay() {
  const { query, setQuery } = useSearch();

  useEffect(() => {
    if (!query) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQuery("");
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [query]);

  if (!query) return null;

  return (
    <div className="searchOverlay" onClick={() => setQuery("")}>
      <div
        className="searchOverlay__content"
        onClick={(e) => e.stopPropagation()}
      >
        <MediaGrid url={`/search?q=${encodeURIComponent(query)}`} />
      </div>
    </div>
  );
}
