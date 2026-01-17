export interface MediaDetails {
  id: number;
  mediaType: "movie" | "tv";

  title: string;
  overview?: string;

  posterUrl?: string;
  backdropUrl?: string;

  year?: string;
  runtime?: number;

  genres: string[];

  trailerYoutubeKey?: string;

  seasons?: {
    seasonNumber: number;
    episodeCount: number;
    episodes: {
      id: number;
      episodeNumber: number;
      name: string;
      overview?: string;
    }[];
  }[];
}
