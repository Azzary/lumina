import { MediaDetails } from "@/app/models/MediaDetails";
import { metadataHttp } from "../httpClients";


export class MediaDetailsService {
  static get(id: number, type: "movie" | "tv"): Promise<MediaDetails> {
    return metadataHttp.get<MediaDetails>(`/media/${type}/${id}`);
  }
}
