import { CardBaseData } from "@/app/models/CardBaseData";
import { metadataHttp } from "../httpClients";

type MediaCardApi = {
  id: number;
  media_type: "movie" | "tv" | "platform" | "genre";
  title: string;
  year?: string | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
};

type CardListResponse =
  | MediaCardApi[]
  | { results: MediaCardApi[] };

function normalize(data: CardListResponse): MediaCardApi[] {
  return Array.isArray(data) ? data : data.results ?? [];
}

export class CardDataService {
  static async fromUrl(url: string): Promise<CardBaseData[]> {
    console.log("[CardDataService] fetch", url);

    const data = await metadataHttp.get<CardListResponse>(url);
    const items = normalize(data);

    return items.map((m) => ({
      kind:
        m.media_type === "platform"
          ? "platform"
          : m.media_type === "genre"
          ? "genre"
          : "media",

      id: String(m.id),

      mediaType:
        m.media_type === "tv" || m.media_type === "movie"
          ? m.media_type
          : undefined,

      title: m.title,
      posterUrl: m.poster_url ?? null,
      backdropUrl: m.backdrop_url ?? null,
      year: m.year ?? null,
    }));
  }
}
