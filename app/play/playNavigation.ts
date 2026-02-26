import { CardBaseData } from "@/app/models/CardBaseData";

const LAST_MEDIA_KEY = "lumi_play_last_media";
const RETURN_PATH_KEY = "lumi_play_return_path";
const PENDING_MODAL_MEDIA_KEY = "lumi_play_pending_modal_media";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function savePlayNavigationContext(media: CardBaseData): void {
  if (!isBrowser()) return;

  const returnPath = `${window.location.pathname}${window.location.search}`;
  window.sessionStorage.setItem(LAST_MEDIA_KEY, JSON.stringify(media));
  window.sessionStorage.setItem(RETURN_PATH_KEY, returnPath);
}

export function prepareModalReopenFromPlayer(): string | null {
  if (!isBrowser()) return null;

  const rawMedia = window.sessionStorage.getItem(LAST_MEDIA_KEY);
  if (rawMedia) {
    window.sessionStorage.setItem(PENDING_MODAL_MEDIA_KEY, rawMedia);
  }

  return window.sessionStorage.getItem(RETURN_PATH_KEY);
}

export function consumePendingModalMedia(): CardBaseData | null {
  if (!isBrowser()) return null;

  const raw = window.sessionStorage.getItem(PENDING_MODAL_MEDIA_KEY);
  if (!raw) return null;

  window.sessionStorage.removeItem(PENDING_MODAL_MEDIA_KEY);

  try {
    return JSON.parse(raw) as CardBaseData;
  } catch {
    return null;
  }
}
