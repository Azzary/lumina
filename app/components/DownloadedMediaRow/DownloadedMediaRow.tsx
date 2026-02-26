"use client";

import { useEffect, useState } from "react";
import { CardBaseData } from "@/app/models/CardBaseData";
import { downloadHttp } from "@/app/services/httpClients";
import Card from "../Card/Card";

export default function DownloadedMediaRow() {
  const [items, setItems] = useState<CardBaseData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    downloadHttp
      .get<CardBaseData[]>("/media/library")
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!items.length && !loading) {
    return null;
  }

  return (
    <section className="mediaRow">
      <h2 className="mediaRow__title">
        Ma bibliothèque
      </h2>

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
