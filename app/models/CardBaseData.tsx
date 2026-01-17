export type CardKind = "media" | "genre" | "platform";

export type MediaType = "movie" | "tv";

export type CardBaseData = {
  kind: CardKind;

  id: string;

  mediaType?: MediaType;

  title: string;
  posterUrl?: string | null;
  backdropUrl?: string | null;

  year?: string | null;
};
