"use client";

import MediaGrid from "@/app/components/Card/MediaGrid/MediaGrid";
import TopBar from "@/app/components/TopBar/TopBar";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CardBaseData } from "@/app/models/CardBaseData";
import { metadataHttp } from "@/app/services/httpClients";

export default function BrowsePage() {
  const params = useParams();

  const type = params.type as "genre" | "platform";
  const id = params.id as string;

  const [label, setLabel] = useState<string | null>(null);

  const url = useMemo(() => {
    if (type === "genre") return `/catalog?genre_id=${id}`;
    if (type === "platform") return `/catalog?platform=${id}`;
    return "";
  }, [type, id]);

const [loadedKey, setLoadedKey] = useState<string | null>(null);

useEffect(() => {
  const key = `${type}:${id}`;
  if (loadedKey === key) return;

  setLoadedKey(key);
  setLabel(null);
  const url = type === "genre" ? `/genres` : `/platforms`;

  metadataHttp.get<CardBaseData[]>(url).then((cards) => {
    const p = cards.find((c) => String(c.id) === id);
    setLabel(p?.title ?? `Plateforme ${id}`);
  });
}, [type, id, loadedKey]);


  if (!url) {
    return (
      <>
        <TopBar />
        <div style={{ padding: 40, color: "white" }}>
          Type inconnu : {type}
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar />

      <div className="browsePage">
        <h1 style={{ color: "white" }}>
          {label ?? "Chargement…"}
        </h1>

        <MediaGrid url={url} />
      </div>
    </>
  );
}
