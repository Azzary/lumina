import { downloadHttp } from "../httpClients";
import { DownloadPlanDTO, isTvPlanDTO, SeasonPlanDTO } from "./dto";

export default class DownloadStatusService {


  static async getDownloadStatus(): Promise<DownloadPlanDTO[]> {
    return downloadHttp.get<DownloadPlanDTO[]>(
      "/media/get-downloads-status"
    );
  }

  static async getMovieDownload(
    tmdbId: number
  ): Promise<DownloadPlanDTO | null> {
    const plans = await this.getDownloadStatus();

    return (
      plans.find(
        (p) =>
          p.media_type === "movie" &&
          p.media.tmdb_id === tmdbId
      ) ?? null
    );
  }

  static async getTvDownloads(
    tmdbId: number
  ): Promise<SeasonPlanDTO[]> {
    const plans = await this.getDownloadStatus();

    return plans
      .filter(
        (p) =>
          p.media_type === "tv" &&
          p.media.tmdb_id === tmdbId
      )
      .flatMap((p) =>
        isTvPlanDTO(p)
          ? Object.values(p.target.seasons)
          : []
      );
  }

}
