import { MediaDetails } from "@/app/models/MediaDetails";
import { metadataHttp, downloadHttp } from "../httpClients";
import { CardBaseData } from "@/app/models/CardBaseData";


export interface MediaExistsRequest {
  tmdb_id: number;
  media_type: "movie" | "tv";
  year: number | null;
  title: string;
}

export interface MediaAvailableEpisode {
  episode: number;
  title: string;
  path: string;
}


export interface MediaAvailableSeason {
  season: number;
  episodes: Record<number, MediaAvailableEpisode>;
}


export interface MediaAvailableResponse {
  exists: boolean;
  tmdb_id: number;
  title: string;
  media_type: "movie" | "tv";
  path?: string | null;
  season?: MediaAvailableSeason | null;
  seasons?: Record<number, MediaAvailableSeason> | null;
}


export class MediaDetailsService {

  static getMediaDetails(
    id: number,
    type: "movie" | "tv"
  ): Promise<MediaDetails> {
    return metadataHttp.get<MediaDetails>(`/media/${type}/${id}`);
  }

  static isMediaAvailable(
    media: MediaDetails
  ): Promise<MediaAvailableResponse> {
    const payload: MediaExistsRequest = {
      tmdb_id: media.id,
      title: media.title,
      year: parseInt(media.year ?? "") || null,
      media_type: media.mediaType,
    };

    return downloadHttp.post<MediaAvailableResponse>(
      "/media/exists-on-disk",
      payload
    );
  }

  static isMediaAvailableFromCard(
    media: CardBaseData
  ): Promise<MediaAvailableResponse> {
    const rawId = parseInt(media.id, 10);
    const tmdbId = Number.isFinite(rawId) ? rawId : 0;
    const rawYear = media.year ? parseInt(media.year, 10) : NaN;
    const year = Number.isFinite(rawYear) ? rawYear : null;

    const payload: MediaExistsRequest = {
      tmdb_id: tmdbId,
      title: media.title,
      year,
      media_type: media.mediaType ?? "movie",
    };

    return downloadHttp.post<MediaAvailableResponse>(
      "/media/exists-on-disk",
      payload
    );
  }
}
