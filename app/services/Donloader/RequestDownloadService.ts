import { RequestDownloadPayload } from "@/app/models/RequestDonloadMovie";
import { downloadHttp } from "@/app/services/httpClients";

export class RequestDownloadService {
  static send(payload: RequestDownloadPayload): Promise<void> {
    return downloadHttp.post<void>("/torrent/request", payload);
  }
}
