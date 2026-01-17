export type TorrentState =
  | "queued"
  | "downloading"
  | "completed"
  | "error";

export interface TorrentDTO {
  title: string;
  state: TorrentState;
  size: number;
  seeders: number;
  peers: number;
  progress: number;
  content_path?: string | null;
}

export interface DownloadPlanDTO {
  name: string;
  media_type: "movie" | "tv";
  season?: number | null;
  torrents: TorrentDTO[];
}
