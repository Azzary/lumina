export interface RequestDownloadPayload {
  media_type: "movie" | "tv";
  title: string;
  year: string;
  tmdb_id: number;
  seasons?: number[];
}
