
export type TorrentState =
  | "queued"
  | "downloading"
  | "completed"
  | "error";


export interface EpisodeRefDTO {
  season: number;
  episode: number;
}

export interface ActiveTorrentDTO {
  uid: string;
  display_name: string;
  progress: number;
  state: TorrentState;
  qb_hash: string | null;

  added_at: number;
  last_state_change_at: number;

  retries: number;
  content_path: string | null;
  no_sources_since: number | null;
}

export interface TorrentInfoDTO {
  indexer_id: number;
  indexer_name: string;
  title: string;
  size: number;
  seeders: number;
  peers: number;
  download_url: string;

  active_torrent: ActiveTorrentDTO | null;
}


export interface MediaDownloadRequestDTO {
  media_type: "movie" | "tv";
  title: string;
  tmdb_id: number;
  year: number | null;

  seasons: number[] | null;
  episodes: EpisodeRefDTO[] | null;
}


export interface SeasonPackDTO {
  torrent: TorrentInfoDTO;
}

export interface EpisodeSetDTO {
  episodes: Record<number, TorrentInfoDTO>;
}

export interface SeasonPlanDTO {
  season: number;
  content: SeasonPackDTO | EpisodeSetDTO;
}

export interface TvPlanDTO {
  seasons: Record<number, SeasonPlanDTO>;
}


export interface MoviePlanDTO {
  torrent: TorrentInfoDTO;
}


export interface DownloadPlanDTO {
  name: string;
  media_type: "movie" | "tv";

  media: MediaDownloadRequestDTO;
  target: MoviePlanDTO | TvPlanDTO;
}


export function isMoviePlanDTO(
  plan: DownloadPlanDTO
): plan is DownloadPlanDTO & { target: MoviePlanDTO } {
  return plan.media_type === "movie";
}

export function isTvPlanDTO(
  plan: DownloadPlanDTO
): plan is DownloadPlanDTO & { target: TvPlanDTO } {
  return plan.media_type === "tv";
}
