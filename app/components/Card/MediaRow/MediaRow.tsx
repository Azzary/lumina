"use client";

import "./MediaRow.css";
import { useEffect, useState } from "react";
import Card from "../Card";
import { CardBaseData } from "@/app/models/CardBaseData";
import { CardDataService } from "@/app/services/MovieMetaData/CardDataService";

type Props = {
  title: string;
  url: string;
};

export default function MediaRow({ title, url }: Props) {
  const [items, setItems] = useState<CardBaseData[]>([]);

  useEffect(() => {
    let cancelled = false;

    CardDataService.fromUrl(url)
      .then((cards) => {
        console.log(cards);
        if (!cancelled) setItems(cards);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <section className="mediaRow">
      <h2 className="mediaRow__title">{title}</h2>

      <div className="mediaRow__scroll scrollbar">
        {items.map((item) => (
          <Card key={`${item.kind}-${item.id}`} media={item} />
        ))}
      </div>
    </section>
  );
}
