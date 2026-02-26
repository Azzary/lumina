"use client";

import { useEffect, useState } from "react";
import { AppConfig } from "@/app/config/app.config";
import { CardBaseData } from "@/app/models/CardBaseData";
import { MediaDetailsService } from "@/app/services/MovieMetaData/MediaDetailsService";
import Card from "../Card/Card";

type RecentItem = {
  path: string;
  title: string;
  media_title: string;
  tmdb_id: number | null;
  media_type: "movie" | "tv" | null;
  stored_title: string | null;
  position_seconds: number;
  duration_seconds: number | null;
  updated_at: string;
};

type RecentResponse = {
  username: string;
  items: RecentItem[];
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

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function stableId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return String(Math.abs(hash) + 1);
}

function uniqueRecents(items: RecentItem[]): RecentItem[] {
  const out: RecentItem[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const key =
      item.tmdb_id && item.media_type
        ? `${item.media_type}:${item.tmdb_id}`
        : `title:${normalize(item.media_title || item.stored_title || item.title)}`;

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out.slice(0, 20);
}

function fallbackCard(item: RecentItem): CardBaseData {
  const mediaType =
    item.media_type === "movie" || item.media_type === "tv"
      ? item.media_type
      : "movie";

  const title =
    item.stored_title || item.media_title || item.title || "Media";

  return {
    kind: "media",
    id: item.tmdb_id ? String(item.tmdb_id) : stableId(`${mediaType}:${title}`),
    mediaType,
    title,
    posterUrl: null,
    backdropUrl: null,
    year: null,
  };
}

export default function RecentlyWatchedRow() {
  const apiBase = AppConfig.servers.download.baseUrl;

  const [username, setUsername] = useState<string | null>(null);
  const [items, setItems] = useState<CardBaseData[]>([]);

  useEffect(() => {
    setUsername(readCookie(USER_COOKIE));
  }, []);

  useEffect(() => {
    if (!username) {
      setItems([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const recentsRes = await fetch(
          `${apiBase}/api/stream/recent?username=${encodeURIComponent(
            username
          )}&limit=100`,
          { cache: "no-store" }
        );

        if (!recentsRes.ok) {
          throw new Error("cannot load recents");
        }

        const recentsData = (await recentsRes.json()) as RecentResponse;
        const unique = uniqueRecents(recentsData.items ?? []);

        const detailCards = await Promise.all(
          unique.map(async (item) => {
            if (!item.tmdb_id || !item.media_type) return null;

            try {
              const d = await MediaDetailsService.getMediaDetails(
                item.tmdb_id,
                item.media_type
              );
              return {
                key: `${item.media_type}:${item.tmdb_id}`,
                card: {
                  kind: "media" as const,
                  id: String(d.id),
                  mediaType: d.mediaType,
                  title: d.title,
                  posterUrl: d.posterUrl ?? null,
                  backdropUrl: d.backdropUrl ?? null,
                  year: d.year ?? null,
                },
              };
            } catch {
              return null;
            }
          })
        );

        const byKey = new Map<string, CardBaseData>();
        for (const row of detailCards) {
          if (!row) continue;
          byKey.set(row.key, row.card);
        }

        const cards = unique.map((item) => {
          const key =
            item.tmdb_id && item.media_type
              ? `${item.media_type}:${item.tmdb_id}`
              : "";
          return byKey.get(key) ?? fallbackCard(item);
        });

        if (!cancelled) setItems(cards);
      } catch {
        if (!cancelled) {
          setItems([]);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [apiBase, username]);

  if (!username || items.length === 0) {
    return null;
  }

  return (
    <section className="mediaRow">
      <h2 className="mediaRow__title">Derniers vus</h2>

      <div className="mediaRow__scroll scrollbar">
        {items.map((item) => (
          <Card
            key={`${item.kind}-${item.id}`}
            media={item}
          />
        ))}
      </div>
    </section>
  );
}
