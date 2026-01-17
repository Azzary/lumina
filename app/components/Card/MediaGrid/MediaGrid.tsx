"use client";

import "./MediaGrid.css";
import { useEffect, useRef, useState } from "react";
import Card from "../Card";
import { CardBaseData } from "@/app/models/CardBaseData";
import { CardDataService } from "@/app/services/MovieMetaData/CardDataService";

type Props = {
  url: string;
};


function withPage(url: string, page: number) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}page=${page}`;
}

export default function MediaGrid({ url }: Props) {
  const [items, setItems] = useState<CardBaseData[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadedPages = useRef<Set<number>>(new Set());

  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    loadedPages.current.clear();
  }, [url]);

  useEffect(() => {
    if (loading) return;
    if (!hasMore) return;
    if (loadedPages.current.has(page)) return;

    setLoading(true);
    loadedPages.current.add(page);

    CardDataService.fromUrl(withPage(url, page))
      .then((cards) => {
        if (page === 1)
          setItems(cards);
        else 
        setItems((prev) => [...prev, ...cards]);

        if (cards.length === 0) {
          setHasMore(false);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, url, loading, hasMore]);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading && hasMore) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [loading, hasMore]);

  return (
    <>
      <div className="mediaGrid">
        {items.map((item) => (
          <Card key={`${item.kind}-${item.id}`} media={item} />
        ))}
      </div>

      <div ref={sentinelRef} style={{ height: 1 }} />

      {loading && <div className="mediaGrid__loading">Chargement…</div>}
    </>
  );
}
